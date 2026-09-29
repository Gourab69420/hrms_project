from datetime import time as dtime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/shifts", tags=["Shifts"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


def _t(v: str) -> dtime:
    try:
        h, m = v.split(":")
        return dtime(int(h), int(m))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid time '{v}', use HH:MM")


def _out(s: models.Shift) -> dict:
    return {
        "id": s.id, "name": s.name,
        "start_time": s.start_time.strftime("%H:%M"),
        "end_time": s.end_time.strftime("%H:%M"),
        "late_after": s.late_after.strftime("%H:%M"),
        "weekly_offs": s.weekly_offs, "description": s.description,
    }


@router.get("/", response_model=List[schemas.ShiftOut])
def list_shifts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_out(s) for s in db.query(models.Shift).order_by(models.Shift.id).all()]


@router.post("/", response_model=schemas.ShiftOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_shift(
    body: schemas.ShiftCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if db.query(models.Shift).filter(models.Shift.name.ilike(body.name)).first():
        raise HTTPException(status_code=400, detail="Shift already exists")
    obj = models.Shift(
        name=body.name, start_time=_t(body.start_time), end_time=_t(body.end_time),
        late_after=_t(body.late_after), weekly_offs=body.weekly_offs, description=body.description,
    )
    db.add(obj)
    db.flush()
    log(db, "shift.create", "shift", obj.id, current_user.id, body.name)
    db.commit()
    db.refresh(obj)
    return _out(obj)


@router.delete("/{sid}", status_code=204, dependencies=[Depends(hr_admin)])
def delete_shift(
    sid: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Shift).filter(models.Shift.id == sid).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Shift not found")
    if db.query(models.Employee).filter(models.Employee.shift_id == sid).count():
        raise HTTPException(status_code=400, detail="Shift is assigned to employees")
    log(db, "shift.delete", "shift", sid, current_user.id, obj.name)
    db.delete(obj)
    db.commit()
