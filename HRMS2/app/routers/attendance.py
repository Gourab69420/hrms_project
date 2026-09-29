from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/attendance", tags=["Attendance"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.post("/", response_model=schemas.AttendanceOut, status_code=201, dependencies=[Depends(hr_admin)])
def record_attendance(att: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    obj = models.Attendance(**att.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/punch", response_model=schemas.AttendanceOut)
def punch(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Self-service punch: first tap punches in, second tap punches out (same day)."""
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    today = date.today()
    rec = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.employee_id == current_user.employee_id,
            models.Attendance.date == today,
        )
        .order_by(models.Attendance.id.desc())
        .first()
    )
    now = datetime.now()
    if rec and rec.check_out is None:
        rec.check_out = now
        if rec.check_in:
            rec.work_hours = round((now - rec.check_in).total_seconds() / 3600, 2)
            late_mark(rec, rec.check_in, db)
        db.commit()
        db.refresh(rec)
        return rec
    if rec and rec.check_out is not None:
        raise HTTPException(status_code=400, detail="Already punched out for today")
    obj = models.Attendance(
        employee_id=current_user.employee_id,
        date=today,
        check_in=now,
        status=models.AttendanceStatusEnum.present,
    )
    late_mark(obj, now, db)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def late_mark(rec: models.Attendance, check_in: datetime, db: Session) -> None:
    """Late if past the employee's shift grace time (default 09:30)."""
    emp = db.query(models.Employee).filter(models.Employee.id == rec.employee_id).first()
    grace = None
    if emp and emp.shift_id:
        shift = db.query(models.Shift).filter(models.Shift.id == emp.shift_id).first()
        if shift:
            grace = shift.late_after
    if grace is None:
        from datetime import time as dtime
        grace = dtime(9, 30)
    if (check_in.hour, check_in.minute) >= (grace.hour, grace.minute):
        rec.status = models.AttendanceStatusEnum.late


@router.get("/employee/{emp_id}", response_model=List[schemas.AttendanceOut])
def get_employee_attendance(emp_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Attendance).filter(models.Attendance.employee_id == emp_id).all()


@router.get("/", response_model=List[schemas.AttendanceOut], dependencies=[Depends(hr_admin)])
def list_all_attendance(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    return db.query(models.Attendance).order_by(models.Attendance.date.desc()).offset(skip).limit(limit).all()


@router.delete("/{att_id}", status_code=204, dependencies=[Depends(hr_admin)])
def delete_attendance(att_id: int, db: Session = Depends(get_db)):
    att = db.query(models.Attendance).filter(models.Attendance.id == att_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(att)
    db.commit()
