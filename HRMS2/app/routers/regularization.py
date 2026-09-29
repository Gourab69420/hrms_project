from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, notify, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import can_review, report_ids

router = APIRouter(prefix="/regularization", tags=["Regularization"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.post("/", response_model=schemas.RegularizationOut, status_code=201)
def request_reg(
    body: schemas.RegularizationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    if not body.req_check_in and not body.req_check_out:
        raise HTTPException(status_code=400, detail="Provide at least a check-in or check-out time")
    obj = models.Regularization(employee_id=current_user.employee_id, **body.model_dump())
    db.add(obj)
    db.flush()
    log(db, "regularization.request", "regularization", obj.id, current_user.id, str(body.date))
    db.commit()
    db.refresh(obj)
    notify.notify_managers_of(
        db, current_user.employee_id, "Regularization request",
        f"Employee #{current_user.employee_id} requested correction for {body.date}",
        {"type": "regularization", "id": obj.id},
    )
    return obj


@router.get("/my", response_model=List[schemas.RegularizationOut])
def my_regs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Regularization)
        .filter(models.Regularization.employee_id == current_user.employee_id)
        .order_by(models.Regularization.id.desc()).all()
    )


@router.get("/team", response_model=List[schemas.RegularizationOut])
def team_regs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ids = report_ids(db, current_user)
    if not ids:
        raise HTTPException(status_code=403, detail="No direct reports")
    return (
        db.query(models.Regularization)
        .filter(
            models.Regularization.employee_id.in_(ids),
            models.Regularization.status == models.LeaveStatusEnum.pending,
        )
        .order_by(models.Regularization.id.desc()).all()
    )


@router.get("/", response_model=List[schemas.RegularizationOut], dependencies=[Depends(hr_admin)])
def list_all(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return db.query(models.Regularization).order_by(models.Regularization.id.desc()).offset(skip).limit(min(limit, 1000)).all()


@router.patch("/{rid}/status", response_model=schemas.RegularizationOut)
def decide_reg(
    rid: int,
    update: schemas.LeaveUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reg = db.query(models.Regularization).filter(models.Regularization.id == rid).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Not found")
    if not can_review(db, current_user, reg.employee_id):
        raise HTTPException(status_code=403, detail="Only admins, HR or the reporting manager can review")
    reg.status = update.status
    reg.reviewed_by = current_user.id
    if update.status == models.LeaveStatusEnum.approved:
        # Apply corrected times onto the attendance record (create if missing)
        att = (
            db.query(models.Attendance)
            .filter(models.Attendance.employee_id == reg.employee_id, models.Attendance.date == reg.date)
            .first()
        )
        if not att:
            att = models.Attendance(employee_id=reg.employee_id, date=reg.date)
            db.add(att)
        if reg.req_check_in:
            att.check_in = reg.req_check_in
        if reg.req_check_out:
            att.check_out = reg.req_check_out
        att.status = models.AttendanceStatusEnum.present
        if att.check_in and att.check_out:
            att.work_hours = round((att.check_out - att.check_in).total_seconds() / 3600, 2)
    db.flush()
    log(db, f"regularization.{update.status}", "regularization", rid, current_user.id)
    db.commit()
    db.refresh(reg)
    notify.notify_employee(
        db, reg.employee_id, f"Regularization {update.status}",
        f"Your correction request for {reg.date} was {update.status}",
        {"type": "regularization", "id": rid},
    )
    return reg
