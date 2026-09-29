from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import is_privileged

router = APIRouter(tags=["Loans & Salary"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


# ---- loans ----
@router.post("/loans/", response_model=schemas.LoanOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_loan(
    body: schemas.LoanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body.principal <= 0 or body.monthly_installment <= 0:
        raise HTTPException(status_code=400, detail="Amounts must be positive")
    obj = models.Loan(
        employee_id=body.employee_id, principal=body.principal,
        monthly_installment=body.monthly_installment, remaining=body.principal,
    )
    db.add(obj)
    db.flush()
    log(db, "loan.create", "loan", obj.id, current_user.id, f"emp={body.employee_id} principal={body.principal}")
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/loans/my", response_model=List[schemas.LoanOut])
def my_loans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Loan).filter(models.Loan.employee_id == current_user.employee_id).order_by(models.Loan.id.desc()).all()


@router.get("/loans/employee/{emp_id}", response_model=List[schemas.LoanOut], dependencies=[Depends(hr_admin)])
def employee_loans(emp_id: int, db: Session = Depends(get_db)):
    return db.query(models.Loan).filter(models.Loan.employee_id == emp_id).order_by(models.Loan.id.desc()).all()


# ---- salary structures ----
@router.post("/salary-structures/", response_model=schemas.SalaryStructureOut, status_code=201, dependencies=[Depends(hr_admin)])
def set_structure(
    body: schemas.SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = models.SalaryStructure(**body.model_dump())
    db.add(obj)
    db.flush()
    log(db, "salary.set", "salary_structure", obj.id, current_user.id, f"emp={body.employee_id} basic={body.basic}")
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/salary-structures/employee/{emp_id}", response_model=List[schemas.SalaryStructureOut])
def get_structures(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not is_privileged(current_user) and emp_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return (
        db.query(models.SalaryStructure)
        .filter(models.SalaryStructure.employee_id == emp_id)
        .order_by(models.SalaryStructure.effective_from.desc()).all()
    )
