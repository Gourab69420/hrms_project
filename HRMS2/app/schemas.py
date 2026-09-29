from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from app.models import RoleEnum, LeaveStatusEnum, AttendanceStatusEnum


# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

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
    manager_id: Optional[int] = None
    shift_id: Optional[int] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    shift_id: Optional[int] = None
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
    hra: float = 0.0
    conveyance: float = 0.0
    special_allowance: float = 0.0
    pf_amount: float = 0.0
    esi_amount: float = 0.0
    pt_amount: float = 0.0
    tds_amount: float = 0.0
    loan_deduction: float = 0.0
    paid_at: Optional[datetime]
    created_at: datetime
    class Config:
        from_attributes = True


# --- Leave types & balances ---
class LeaveTypeCreate(BaseModel):
    name: str
    yearly_quota: int = 0
    paid: bool = True
    description: Optional[str] = None

class LeaveTypeOut(LeaveTypeCreate):
    id: int
    class Config:
        from_attributes = True

class BalanceOut(BaseModel):
    leave_type: str
    year: int
    entitled: int
    used: int
    remaining: int
    paid: bool


# --- Holidays ---
class HolidayCreate(BaseModel):
    date: date
    name: str
    description: Optional[str] = None

class HolidayOut(HolidayCreate):
    id: int
    class Config:
        from_attributes = True


# --- Shifts ---
class ShiftCreate(BaseModel):
    name: str
    start_time: str
    end_time: str
    late_after: str
    weekly_offs: str = "sun"
    description: Optional[str] = None

class ShiftOut(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str
    late_after: str
    weekly_offs: str
    description: Optional[str]
    class Config:
        from_attributes = True


# --- Documents ---
class DocumentOut(BaseModel):
    id: int
    employee_id: int
    doc_type: str
    file_name: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Announcements & polls ---
class AnnouncementCreate(BaseModel):
    title: str
    body: str
    audience: str = "all"

class AnnouncementOut(AnnouncementCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PollCreate(BaseModel):
    question: str
    options: list[str]

class PollOptionOut(BaseModel):
    id: int
    text: str
    votes: int = 0
    class Config:
        from_attributes = True

class PollOut(BaseModel):
    id: int
    question: str
    active: bool
    my_vote: Optional[int] = None
    options: list[PollOptionOut]
    created_at: datetime
    class Config:
        from_attributes = True

class VoteCreate(BaseModel):
    option_id: int


# --- Regularization ---
class RegularizationCreate(BaseModel):
    date: date
    req_check_in: Optional[datetime] = None
    req_check_out: Optional[datetime] = None
    reason: Optional[str] = None

class RegularizationOut(BaseModel):
    id: int
    employee_id: int
    date: date
    req_check_in: Optional[datetime]
    req_check_out: Optional[datetime]
    reason: Optional[str]
    status: LeaveStatusEnum
    created_at: datetime
    class Config:
        from_attributes = True


# --- Loans ---
class LoanCreate(BaseModel):
    employee_id: int
    principal: float
    monthly_installment: float

class LoanOut(BaseModel):
    id: int
    employee_id: int
    principal: float
    monthly_installment: float
    remaining: float
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Salary structure ---
class SalaryStructureCreate(BaseModel):
    employee_id: int
    basic: float
    hra: float = 0.0
    conveyance: float = 0.0
    special_allowance: float = 0.0
    pf_applicable: bool = True
    esi_applicable: bool = True
    effective_from: date

class SalaryStructureOut(SalaryStructureCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- Tickets ---
class TicketCreate(BaseModel):
    category: str
    subject: str
    body: Optional[str] = None

class TicketStatusUpdate(BaseModel):
    status: str

class TicketOut(BaseModel):
    id: int
    employee_id: int
    category: str
    subject: str
    body: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Exits ---
class ExitCreate(BaseModel):
    resignation_date: date
    last_working_date: date
    notes: Optional[str] = None

class ExitReview(BaseModel):
    status: Optional[str] = None
    fnf_amount: Optional[float] = None
    notes: Optional[str] = None

class ExitOut(BaseModel):
    id: int
    employee_id: int
    resignation_date: date
    last_working_date: date
    status: str
    fnf_amount: Optional[float]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# --- Audit ---
class AuditOut(BaseModel):
    id: int
    actor_user_id: Optional[int]
    action: str
    entity: str
    entity_id: Optional[int]
    detail: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# --- Auth extras ---
class RefreshIn(BaseModel):
    refresh_token: str

class PushTokenIn(BaseModel):
    expo_push_token: str
