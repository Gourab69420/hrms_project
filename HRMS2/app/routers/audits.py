from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import report_ids

router = APIRouter(tags=["Audit & Inbox"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


@router.get("/audit-logs/", response_model=List[schemas.AuditOut], dependencies=[Depends(hr_admin)])
def list_audit(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return db.query(models.AuditLog).order_by(models.AuditLog.id.desc()).offset(skip).limit(min(limit, 1000)).all()


@router.get("/approvals/inbox")
def inbox(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Unified pending-approval counts + items for managers (team) or admin/HR (all)."""
    privileged = current_user.role in (models.RoleEnum.admin, models.RoleEnum.hr)
    if privileged:
        leaves = db.query(models.Leave).filter(models.Leave.status == models.LeaveStatusEnum.pending).count()
        regs = db.query(models.Regularization).filter(models.Regularization.status == models.LeaveStatusEnum.pending).count()
        tickets = db.query(models.Ticket).filter(models.Ticket.status == models.TicketStatusEnum.open).count()
        exits = db.query(models.Exit).filter(models.Exit.status == models.ExitStatusEnum.pending).count()
    else:
        ids = report_ids(db, current_user)
        if not ids:
            return {"leaves": 0, "regularizations": 0, "tickets": 0, "exits": 0, "items": []}
        leaves = db.query(models.Leave).filter(
            models.Leave.employee_id.in_(ids), models.Leave.status == models.LeaveStatusEnum.pending
        ).count()
        regs = db.query(models.Regularization).filter(
            models.Regularization.employee_id.in_(ids),
            models.Regularization.status == models.LeaveStatusEnum.pending,
        ).count()
        tickets = 0
        exits = 0
    return {"leaves": leaves, "regularizations": regs, "tickets": tickets, "exits": exits}
