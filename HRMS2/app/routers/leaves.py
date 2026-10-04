from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, notify, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import can_review, is_privileged, report_ids
from app.routers.leave_types import balance_for

router = APIRouter(prefix="/leaves", tags=["Leaves"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


def _days(start: date, end: date) -> int:
    return (end - start).days + 1


@router.post("/", response_model=schemas.LeaveOut, status_code=201)
def apply_leave(
    leave: schemas.LeaveCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    if leave.end_date < leave.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date")
    # Balance enforcement against yearly quota (unpaid types always allowed)
    lt = (
        db.query(models.LeaveType)
        .filter(models.LeaveType.name.ilike(leave.leave_type.strip()))
        .first()
    )
    if lt and lt.paid:
        bals = {b.leave_type.lower(): b for b in balance_for(db, current_user.employee_id, date.today().year)}
        bal = bals.get(lt.name.lower())
        need = _days(leave.start_date, leave.end_date)
        if bal and need > bal.remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient {lt.name} balance: {bal.remaining} day(s) left, requested {need}",
            )
    obj = models.Leave(employee_id=current_user.employee_id, **leave.model_dump())
    db.add(obj)
    db.flush()
    log(db, "leave.apply", "leave", obj.id, current_user.id, f"{leave.leave_type} {leave.start_date}..{leave.end_date}")
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/my", response_model=List[schemas.LeaveOut])
def my_leaves(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Leave).filter(models.Leave.employee_id == current_user.employee_id).order_by(models.Leave.id.desc()).all()


@router.get("/", response_model=List[schemas.LeaveOut], dependencies=[Depends(hr_admin)])
def list_all_leaves(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    return db.query(models.Leave).order_by(models.Leave.id.desc()).offset(skip).limit(min(limit, 1000)).all()


@router.get("/team", response_model=List[schemas.LeaveOut])
def team_leaves(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Pending leaves of direct reports. Managers only — plain employees get 403."""
    if not is_privileged(current_user) and not report_ids(db, current_user):
        raise HTTPException(status_code=403, detail="Leave approvals are restricted to admins and managers")
    ids = list({*report_ids(db, current_user), *([current_user.employee_id] if current_user.employee_id else [])})
    if not ids:
        return []
    return (
        db.query(models.Leave)
        .filter(models.Leave.employee_id.in_(ids), models.Leave.status == models.LeaveStatusEnum.pending)
        .order_by(models.Leave.id.desc())
        .all()
    )


@router.delete("/{leave_id}", status_code=204)
def cancel_leave(leave_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    leave = db.query(models.Leave).filter(models.Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if leave.employee_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Not your leave application")
    if leave.status != models.LeaveStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Cannot delete a leave that has already been reviewed")
    log(db, "leave.cancel", "leave", leave_id, current_user.id)
    db.delete(leave)
    db.commit()


@router.patch("/{leave_id}/status", response_model=schemas.LeaveOut)
def update_leave_status(
    leave_id: int,
    update: schemas.LeaveUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    leave = db.query(models.Leave).filter(models.Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if not can_review(db, current_user, leave.employee_id):
        raise HTTPException(status_code=403, detail="Only admins, HR or the reporting manager can review")
    leave.status = update.status
    leave.reviewed_by = current_user.id
    db.flush()
    log(
        db, f"leave.{update.status}", "leave", leave_id, current_user.id,
        f"reviewer_role={current_user.role}",
    )
    db.commit()
    db.refresh(leave)
    notify.notify_employee(
        db, leave.employee_id, f"Leave {update.status}",
        f"Your {leave.leave_type} leave ({leave.start_date}..{leave.end_date}) was {update.status}",
        {"type": "leave", "id": leave_id},
    )
    return leave
