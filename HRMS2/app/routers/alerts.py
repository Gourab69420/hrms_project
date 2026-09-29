"""Manual-trigger absentee alerts (wire to cron/scheduler in production)."""
from datetime import date, datetime, time as dtime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, notify
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(tags=["Alerts"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.post("/alerts/absentee", dependencies=[Depends(hr_admin)])
def absentee_alert(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Notify managers of active staff with no punch today (skips holidays, weekly offs, approved leave)."""
    today = date.today()
    if db.query(models.Holiday).filter(models.Holiday.date == today).first():
        return {"skipped": "holiday", "notified": 0}

    punched = {
        r[0]
        for r in db.query(models.Attendance.employee_id)
        .filter(models.Attendance.date == today).all()
    }
    on_leave = {
        r[0]
        for r in db.query(models.Leave.employee_id)
        .filter(
            models.Leave.status == models.LeaveStatusEnum.approved,
            models.Leave.start_date <= today,
            models.Leave.end_date >= today,
        ).all()
    }
    weekday = today.strftime("%a").lower()
    missing: list[int] = []
    for emp in db.query(models.Employee).filter(models.Employee.is_active.is_(True)).all():
        if emp.id in punched or emp.id in on_leave:
            continue
        offs = ""
        if emp.shift_id:
            shift = db.query(models.Shift).filter(models.Shift.id == emp.shift_id).first()
            offs = (shift.weekly_offs or "").lower() if shift else ""
        if weekday in [o.strip() for o in offs.split(",") if o.strip()]:
            continue
        # Only flag after 10:30 local
        if datetime.now().time() < dtime(10, 30):
            continue
        missing.append(emp.id)

    notified = 0
    for eid in missing:
        notified += 1 if notify.notify_managers_of(
            db, eid, "Absentee alert",
            f"EMP-{eid:04d} has no punch-in today ({today.isoformat()})",
            {"type": "absentee", "employee_id": eid},
        ) else 0
    return {"missing": len(missing), "notified": notified, "date": today.isoformat()}
