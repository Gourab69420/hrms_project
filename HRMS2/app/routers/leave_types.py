from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import is_privileged

router = APIRouter(tags=["Leave Types"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


def _days(start: date, end: date) -> int:
    return (end - start).days + 1


def balance_for(db: Session, employee_id: int, year: int) -> List[schemas.BalanceOut]:
    types = db.query(models.LeaveType).all()
    snaps = {
        (b.leave_type_id): b
        for b in db.query(models.LeaveBalance).filter(
            models.LeaveBalance.employee_id == employee_id,
            models.LeaveBalance.year == year,
        ).all()
    }
    leaves = db.query(models.Leave).filter(
        models.Leave.employee_id == employee_id,
        models.Leave.status.in_([models.LeaveStatusEnum.pending, models.LeaveStatusEnum.approved]),
    ).all()
    out: List[schemas.BalanceOut] = []
    for t in types:
        snap = snaps.get(t.id)
        entitled = t.yearly_quota + (snap.carried_forward if snap else 0)
        used = 0
        for l in leaves:
            if l.leave_type.strip().lower() == t.name.strip().lower() and l.start_date.year == year:
                used += _days(l.start_date, l.end_date)
        out.append(
            schemas.BalanceOut(
                leave_type=t.name, year=year, entitled=entitled,
                used=used, remaining=entitled - used, paid=t.paid,
            )
        )
    return out


@router.get("/leave-types/", response_model=List[schemas.LeaveTypeOut])
def list_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.LeaveType).order_by(models.LeaveType.id).all()


@router.post("/leave-types/", response_model=schemas.LeaveTypeOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_type(
    body: schemas.LeaveTypeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if db.query(models.LeaveType).filter(models.LeaveType.name.ilike(body.name)).first():
        raise HTTPException(status_code=400, detail="Leave type already exists")
    obj = models.LeaveType(**body.model_dump())
    db.add(obj)
    db.flush()
    log(db, "leavetype.create", "leave_type", obj.id, current_user.id, body.name)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/leave-balances/me", response_model=List[schemas.BalanceOut])
def my_balances(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    return balance_for(db, current_user.employee_id, date.today().year)


@router.get("/leave-balances/employee/{emp_id}", response_model=List[schemas.BalanceOut])
def employee_balances(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not is_privileged(current_user) and emp_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return balance_for(db, emp_id, date.today().year)
