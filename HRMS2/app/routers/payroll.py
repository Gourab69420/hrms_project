from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/payroll", tags=["Payroll"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.post("/", response_model=schemas.PayrollOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_payroll(payroll: schemas.PayrollCreate, db: Session = Depends(get_db)):
    net = payroll.basic_salary + payroll.bonuses - payroll.deductions
    obj = models.Payroll(**payroll.model_dump(), net_salary=net)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/employee/{emp_id}", response_model=List[schemas.PayrollOut])
def get_employee_payroll(emp_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Payroll).filter(models.Payroll.employee_id == emp_id).all()


@router.get("/", response_model=List[schemas.PayrollOut], dependencies=[Depends(hr_admin)])
def list_all_payrolls(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    return db.query(models.Payroll).order_by(models.Payroll.id.desc()).offset(skip).limit(min(limit, 1000)).all()


@router.delete("/{payroll_id}", status_code=204, dependencies=[Depends(require_roles(RoleEnum.admin))])
def delete_payroll(payroll_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Payroll).filter(models.Payroll.id == payroll_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    db.delete(p)
    db.commit()
