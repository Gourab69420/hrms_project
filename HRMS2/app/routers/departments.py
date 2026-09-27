from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/departments", tags=["Departments"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.post("/", response_model=schemas.DepartmentOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_department(dept: schemas.DepartmentCreate, db: Session = Depends(get_db)):
    if db.query(models.Department).filter(models.Department.name == dept.name).first():
        raise HTTPException(status_code=400, detail="Department already exists")
    obj = models.Department(**dept.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/", response_model=List[schemas.DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()


@router.get("/{dept_id}", response_model=schemas.DepartmentOut)
def get_department(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.delete("/{dept_id}", status_code=204, dependencies=[Depends(hr_admin)])
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
