"""Admin dashboard aggregates — single cheap call instead of full table scans on device."""
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.get("/stats", dependencies=[Depends(hr_admin)])
def stats(db: Session = Depends(get_db)):
    today = date.today()
    total_staff = db.query(models.Employee).filter(models.Employee.is_active.is_(True)).count()
    present_today = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.date == today,
            models.Attendance.status.in_(
                [models.AttendanceStatusEnum.present, models.AttendanceStatusEnum.late]
            ),
        )
        .count()
    )
    pending_leaves = (
        db.query(models.Leave)
        .filter(models.Leave.status == models.LeaveStatusEnum.pending)
        .count()
    )
    on_leave_today = (
        db.query(models.Leave)
        .filter(
            models.Leave.status == models.LeaveStatusEnum.approved,
            models.Leave.start_date <= today,
            models.Leave.end_date >= today,
        )
        .count()
    )
    return {
        "total_staff": total_staff,
        "present_today": present_today,
        "turnout_pct": round((present_today / total_staff * 100) if total_staff else 0, 1),
        "pending_leaves": pending_leaves,
        "on_leave_today": on_leave_today,
        "date": today.isoformat(),
    }
