"""Payroll with India/WB statutory math. Backend is the ONLY calculator — clients never send net."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, notify, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/payroll", tags=["Payroll"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


def wb_pt(gross: float) -> float:
    if gross <= 10000:
        return 0.0
    if gross <= 15000:
        return 110.0
    if gross <= 25000:
        return 130.0
    if gross <= 40000:
        return 150.0
    return 200.0


def pf_employee(basic: float) -> float:
    return round(min(basic, 15000.0) * 0.12, 2)


def esi_employee(gross: float) -> float:
    return round(gross * 0.0075, 2) if gross <= 21000 else 0.0


def tds_estimate(gross_monthly: float) -> float:
    """Rough new-regime monthly TDS from annualized gross minus 50k std deduction. Estimate only."""
    annual = gross_monthly * 12 - 50000
    if annual <= 300000:
        return 0.0
    slabs = [(300000, 0.05), (300000, 0.10), (300000, 0.15), (300000, 0.20), (float("inf"), 0.30)]
    tax, lower = 0.0, 300000
    remaining = annual - 300000
    for width, rate in slabs:
        chunk = min(remaining, width)
        tax += chunk * rate
        remaining -= chunk
        lower += width
        if remaining <= 0:
            break
    return round(tax / 12, 2)


@router.post("/", response_model=schemas.PayrollOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_payroll(
    payroll: schemas.PayrollCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not 1 <= payroll.month <= 12:
        raise HTTPException(status_code=400, detail="Invalid month")
    if db.query(models.Payroll).filter(
        models.Payroll.employee_id == payroll.employee_id,
        models.Payroll.month == payroll.month,
        models.Payroll.year == payroll.year,
    ).first():
        raise HTTPException(status_code=400, detail="Payroll already exists for this month")

    struct = (
        db.query(models.SalaryStructure)
        .filter(models.SalaryStructure.employee_id == payroll.employee_id)
        .order_by(models.SalaryStructure.effective_from.desc())
        .first()
    )
    if struct:
        basic, hra = struct.basic, struct.hra
        conveyance, special = struct.conveyance, struct.special_allowance
        pf_on, esi_on = struct.pf_applicable, struct.esi_applicable
    else:
        basic, hra, conveyance, special = payroll.basic_salary, 0.0, 0.0, 0.0
        pf_on, esi_on = True, True

    bonuses = payroll.bonuses or 0.0
    gross = basic + hra + conveyance + special + bonuses
    pf = pf_employee(basic) if pf_on else 0.0
    esi = esi_employee(gross) if esi_on else 0.0
    pt = wb_pt(gross)
    tds = tds_estimate(gross)

    loan_cut = 0.0
    loan = (
        db.query(models.Loan)
        .filter(models.Loan.employee_id == payroll.employee_id, models.Loan.status == models.LoanStatusEnum.active)
        .order_by(models.Loan.id)
        .first()
    )
    if loan:
        loan_cut = min(loan.monthly_installment, loan.remaining)
        loan.remaining = round(loan.remaining - loan_cut, 2)
        if loan.remaining <= 0:
            loan.status = models.LoanStatusEnum.closed

    manual = payroll.deductions or 0.0
    total_ded = manual + pf + esi + pt + tds + loan_cut
    net = round(gross - total_ded, 2)

    obj = models.Payroll(
        employee_id=payroll.employee_id, month=payroll.month, year=payroll.year,
        basic_salary=basic, bonuses=bonuses, deductions=total_ded,
        hra=hra, conveyance=conveyance, special_allowance=special,
        pf_amount=pf, esi_amount=esi, pt_amount=pt, tds_amount=tds,
        loan_deduction=loan_cut, net_salary=net,
    )
    db.add(obj)
    db.flush()
    log(db, "payroll.run", "payroll", obj.id, current_user.id, f"emp={payroll.employee_id} {payroll.month}/{payroll.year} net={net}")
    db.commit()
    db.refresh(obj)
    notify.notify_employee(
        db, payroll.employee_id, "Payslip released",
        f"Your {payroll.month}/{payroll.year} payroll of Rs.{net:,.0f} is processed",
        {"type": "payroll", "id": obj.id},
    )
    return obj


@router.get("/employee/{emp_id}", response_model=List[schemas.PayrollOut])
def get_employee_payroll(emp_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return (
        db.query(models.Payroll)
        .filter(models.Payroll.employee_id == emp_id)
        .order_by(models.Payroll.year.desc(), models.Payroll.month.desc())
        .all()
    )


@router.get("/", response_model=List[schemas.PayrollOut], dependencies=[Depends(hr_admin)])
def list_all_payrolls(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    return db.query(models.Payroll).order_by(models.Payroll.id.desc()).offset(skip).limit(min(limit, 1000)).all()


@router.delete("/{payroll_id}", status_code=204, dependencies=[Depends(require_roles(RoleEnum.admin))])
def delete_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = db.query(models.Payroll).filter(models.Payroll.id == payroll_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    log(db, "payroll.delete", "payroll", payroll_id, current_user.id)
    db.delete(p)
    db.commit()
