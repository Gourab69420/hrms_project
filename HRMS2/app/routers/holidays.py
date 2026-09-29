from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/holidays", tags=["Holidays"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.get("/", response_model=List[schemas.HolidayOut])
def list_holidays(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Holiday).order_by(models.Holiday.date).all()


@router.post("/", response_model=schemas.HolidayOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_holiday(
    body: schemas.HolidayCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if db.query(models.Holiday).filter(models.Holiday.date == body.date).first():
        raise HTTPException(status_code=400, detail="Holiday already exists on this date")
    obj = models.Holiday(**body.model_dump())
    db.add(obj)
    db.flush()
    log(db, "holiday.create", "holiday", obj.id, current_user.id, body.name)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{hid}", status_code=204, dependencies=[Depends(hr_admin)])
def delete_holiday(
    hid: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Holiday).filter(models.Holiday.id == hid).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Holiday not found")
    log(db, "holiday.delete", "holiday", hid, current_user.id, obj.name)
    db.delete(obj)
    db.commit()
