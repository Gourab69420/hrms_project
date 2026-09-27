from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/leaves", tags=["Leaves"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.post("/", response_model=schemas.LeaveOut, status_code=201)
def apply_leave(leave: schemas.LeaveCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    obj = models.Leave(employee_id=current_user.employee_id, **leave.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/my", response_model=List[schemas.LeaveOut])
def my_leaves(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Leave).filter(models.Leave.employee_id == current_user.employee_id).all()


@router.get("/", response_model=List[schemas.LeaveOut], dependencies=[Depends(hr_admin)])
def list_all_leaves(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    return db.query(models.Leave).order_by(models.Leave.id.desc()).offset(skip).limit(min(limit, 1000)).all()


@router.delete("/{leave_id}", status_code=204)
def cancel_leave(leave_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    leave = db.query(models.Leave).filter(models.Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if leave.employee_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Not your leave application")
    if leave.status != models.LeaveStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Cannot delete a leave that has already been reviewed")
    db.delete(leave)
    db.commit()


@router.patch("/{leave_id}/status", response_model=schemas.LeaveOut, dependencies=[Depends(hr_admin)])
def update_leave_status(leave_id: int, update: schemas.LeaveUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    leave = db.query(models.Leave).filter(models.Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = update.status
    leave.reviewed_by = current_user.id
    db.commit()
    db.refresh(leave)
    return leave
