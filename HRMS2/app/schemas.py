from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from app.models import RoleEnum, LeaveStatusEnum, AttendanceStatusEnum


# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    role: RoleEnum = RoleEnum.employee
    employee_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    username: str
    role: RoleEnum
    is_active: bool
    employee_id: Optional[int]
    class Config:
        from_attributes = True


# --- Department ---
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentOut(DepartmentCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- Employee ---
class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    department_id: Optional[int] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None

class EmployeeOut(EmployeeCreate):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# --- Attendance ---
class AttendanceCreate(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatusEnum = AttendanceStatusEnum.present
    notes: Optional[str] = None

class AttendanceOut(AttendanceCreate):
    id: int
    class Config:
        from_attributes = True


# --- Leave ---
class LeaveCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveUpdate(BaseModel):
    status: LeaveStatusEnum

class LeaveOut(BaseModel):
    id: int
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str]
    status: LeaveStatusEnum
    created_at: datetime
    class Config:
        from_attributes = True


# --- Payroll ---
class PayrollCreate(BaseModel):
    employee_id: int
    month: int
    year: int
    basic_salary: float
    bonuses: float = 0.0
    deductions: float = 0.0

class PayrollOut(PayrollCreate):
    id: int
    net_salary: float
    paid_at: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True
