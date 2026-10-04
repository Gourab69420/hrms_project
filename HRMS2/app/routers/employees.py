from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import report_ids

router = APIRouter(prefix="/employees", tags=["Employees"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.post("/", response_model=schemas.EmployeeOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    if db.query(models.Employee).filter(models.Employee.email == emp.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    obj = models.Employee(**emp.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/", response_model=List[schemas.EmployeePresenceOut], dependencies=[Depends(hr_admin)])
def list_employees(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query("", max_length=100),
):
    from datetime import date as _date
    q = db.query(models.Employee)
    if search.strip():
        like = f"%{search.strip()}%"
        q = q.filter(
            models.Employee.first_name.ilike(like)
            | models.Employee.last_name.ilike(like)
            | models.Employee.email.ilike(like)
        )
    emps = q.order_by(models.Employee.id).offset(skip).limit(limit).all()
    today = _date.today()
    ids = [e.id for e in emps]
    att = {
        a.employee_id: a
        for a in db.query(models.Attendance)
        .filter(models.Attendance.employee_id.in_(ids), models.Attendance.date == today)
        .all()
    } if ids else {}
    on_leave = {
        r[0]
        for r in db.query(models.Leave.employee_id)
        .filter(
            models.Leave.employee_id.in_(ids),
            models.Leave.status == models.LeaveStatusEnum.approved,
            models.Leave.start_date <= today,
            models.Leave.end_date >= today,
        ).all()
    } if ids else set()
    out = []
    for e in emps:
        a = att.get(e.id)
        ci = a.check_in.strftime("%H:%M") if a and a.check_in else None
        co = a.check_out.strftime("%H:%M") if a and a.check_out else None
        out.append({
            "id": e.id, "first_name": e.first_name, "last_name": e.last_name,
            "email": e.email, "phone": e.phone, "position": e.position,
            "hire_date": e.hire_date, "department_id": e.department_id,
            "manager_id": e.manager_id, "shift_id": e.shift_id,
            "is_active": e.is_active, "created_at": e.created_at,
            "present_today": bool(a and a.check_in and not a.check_out),
            "worked_today": bool(a and a.check_in),
            "on_leave_today": e.id in on_leave,
            "today_check_in": ci,
            "today_check_out": co,
        })
    return out


@router.get("/me", response_model=schemas.EmployeeOut)
def get_my_employee(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    emp = db.query(models.Employee).filter(models.Employee.id == current_user.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.get("/team", response_model=List[schemas.EmployeeOut])
def my_team(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Direct reports of the logged-in employee (their actual team members)."""
    ids = report_ids(db, current_user)
    if not ids:
        return []
    return db.query(models.Employee).filter(models.Employee.id.in_(ids)).order_by(models.Employee.id).all()


@router.get("/{emp_id}", response_model=schemas.EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.patch("/{emp_id}", response_model=schemas.EmployeeOut, dependencies=[Depends(hr_admin)])
def update_employee(
    emp_id: int,
    updates: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if updates.manager_id == emp_id:
        raise HTTPException(status_code=400, detail="An employee cannot manage themselves")
    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    db.flush()
    log(db, "employee.update", "employee", emp_id, current_user.id, ",".join(updates.model_dump(exclude_none=True).keys()))
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{emp_id}", status_code=204, dependencies=[Depends(require_roles(RoleEnum.admin))])
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    log(db, "employee.delete", "employee", emp_id, current_user.id, emp.email)
    db.delete(emp)
    db.commit()


@router.delete("/{emp_id}/full")
def delete_employee_full(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(RoleEnum.admin)),
):
    """Irreversible: removes the employee AND every row tied to them
    (login, attendance, leaves, payroll, loans, tickets, exits, docs, votes…)."""
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if emp_id == current_user.employee_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    email = emp.email
    removed: dict[str, int] = {}

    uids = [u.id for u in db.query(models.User).filter(models.User.employee_id == emp_id).all()]
    db.query(models.Leave).filter(models.Leave.reviewed_by.in_(uids)).update(
        {models.Leave.reviewed_by: None}, synchronize_session=False)
    db.query(models.Regularization).filter(models.Regularization.reviewed_by.in_(uids)).update(
        {models.Regularization.reviewed_by: None}, synchronize_session=False)
    db.query(models.AuditLog).filter(models.AuditLog.actor_user_id.in_(uids)).update(
        {models.AuditLog.actor_user_id: None}, synchronize_session=False)
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id.in_(uids)).delete(synchronize_session=False)
    db.query(models.PushToken).filter(models.PushToken.user_id.in_(uids)).delete(synchronize_session=False)
    removed["users"] = db.query(models.User).filter(models.User.employee_id == emp_id).delete(synchronize_session=False)

    for model in (
        models.Leave, models.Regularization, models.Attendance, models.Payroll,
        models.Loan, models.SalaryStructure, models.Ticket, models.Exit,
        models.LeaveBalance, models.PollVote, models.Document,
    ):
        removed[model.__tablename__] = (
            db.query(model).filter(model.employee_id == emp_id).delete(synchronize_session=False)
        )

    # Reports of this employee lose their manager link (not deleted)
    db.query(models.Employee).filter(models.Employee.manager_id == emp_id).update(
        {models.Employee.manager_id: None}, synchronize_session=False)

    db.delete(emp)
    log(db, "employee.full_delete", "employee", emp_id, current_user.id, f"{email} removed={removed}")
    db.commit()
    return {"deleted": email, "removed": removed}
