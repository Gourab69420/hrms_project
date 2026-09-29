from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, notify, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import is_privileged

router = APIRouter(tags=["Tickets & Exits"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


# ---- tickets ----
@router.post("/tickets/", response_model=schemas.TicketOut, status_code=201)
def open_ticket(
    body: schemas.TicketCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    obj = models.Ticket(employee_id=current_user.employee_id, **body.model_dump())
    db.add(obj)
    db.flush()
    log(db, "ticket.open", "ticket", obj.id, current_user.id, body.subject)
    db.commit()
    db.refresh(obj)
    notify.notify_managers_of(
        db, current_user.employee_id, "New helpdesk ticket", body.subject,
        {"type": "ticket", "id": obj.id},
    )
    return obj


@router.get("/tickets/my", response_model=List[schemas.TicketOut])
def my_tickets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Ticket).filter(models.Ticket.employee_id == current_user.employee_id).order_by(models.Ticket.id.desc()).all()


@router.get("/tickets/", response_model=List[schemas.TicketOut], dependencies=[Depends(hr_admin)])
def all_tickets(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return db.query(models.Ticket).order_by(models.Ticket.id.desc()).offset(skip).limit(min(limit, 1000)).all()


@router.patch("/tickets/{tid}", response_model=schemas.TicketOut, dependencies=[Depends(hr_admin)])
def set_ticket_status(
    tid: int,
    body: schemas.TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = db.query(models.Ticket).filter(models.Ticket.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        t.status = models.TicketStatusEnum(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    if t.status == models.TicketStatusEnum.closed:
        t.closed_at = datetime.now(timezone.utc)
    db.flush()
    log(db, f"ticket.{body.status}", "ticket", tid, current_user.id)
    db.commit()
    db.refresh(t)
    notify.notify_employee(
        db, t.employee_id, f"Ticket {body.status}", t.subject,
        {"type": "ticket", "id": tid},
    )
    return t


# ---- exits ----
@router.post("/exits/", response_model=schemas.ExitOut, status_code=201)
def resign(
    body: schemas.ExitCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    if db.query(models.Exit).filter(models.Exit.employee_id == current_user.employee_id).first():
        raise HTTPException(status_code=400, detail="Resignation already submitted")
    obj = models.Exit(employee_id=current_user.employee_id, **body.model_dump())
    db.add(obj)
    db.flush()
    log(db, "exit.resign", "exit", obj.id, current_user.id)
    db.commit()
    db.refresh(obj)
    notify.notify_managers_of(
        db, current_user.employee_id, "Resignation submitted",
        f"Employee #{current_user.employee_id} resigned",
        {"type": "exit", "id": obj.id},
    )
    return obj


@router.get("/exits/my", response_model=schemas.ExitOut)
def my_exit(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    obj = db.query(models.Exit).filter(models.Exit.employee_id == current_user.employee_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="No resignation on file")
    return obj


@router.get("/exits/", response_model=List[schemas.ExitOut], dependencies=[Depends(hr_admin)])
def all_exits(db: Session = Depends(get_db)):
    return db.query(models.Exit).order_by(models.Exit.id.desc()).all()


@router.patch("/exits/{eid}", response_model=schemas.ExitOut, dependencies=[Depends(hr_admin)])
def review_exit(
    eid: int,
    body: schemas.ExitReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Exit).filter(models.Exit.id == eid).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status:
        try:
            new_status = models.ExitStatusEnum(body.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
        if new_status == models.ExitStatusEnum.completed and current_user.role != models.RoleEnum.admin:
            raise HTTPException(status_code=403, detail="Only admins can complete exits (deactivates employee)")
        obj.status = new_status
    if body.fnf_amount is not None:
        obj.fnf_amount = body.fnf_amount
    if body.notes is not None:
        obj.notes = body.notes
    if obj.status == models.ExitStatusEnum.completed:
        emp = db.query(models.Employee).filter(models.Employee.id == obj.employee_id).first()
        if emp:
            emp.is_active = False
    db.flush()
    log(db, "exit.review", "exit", eid, current_user.id, f"status={obj.status}")
    db.commit()
    db.refresh(obj)
    notify.notify_employee(
        db, obj.employee_id, f"Exit {obj.status}", f"Your exit process is now {obj.status}",
        {"type": "exit", "id": eid},
    )
    return obj
