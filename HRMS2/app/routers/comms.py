from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app import models, notify, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(tags=["Comms"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


# ---- announcements ----
@router.get("/announcements/", response_model=List[schemas.AnnouncementOut])
def list_announcements(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Announcement).order_by(models.Announcement.id.desc()).limit(100).all()


@router.post("/announcements/", response_model=schemas.AnnouncementOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_announcement(
    body: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = models.Announcement(title=body.title, body=body.body, audience=body.audience, created_by=current_user.id)
    db.add(obj)
    db.flush()
    log(db, "announcement.create", "announcement", obj.id, current_user.id, body.title)
    db.commit()
    db.refresh(obj)
    # Visible to everyone (including the sender) + push to all registered devices
    for (uid,) in db.query(models.PushToken.user_id).distinct().all():
        notify.send(db, uid, f"📢 {body.title}", body.body[:180], {"type": "announcement", "id": obj.id})
    return obj


@router.delete("/announcements/{aid}", status_code=204, dependencies=[Depends(hr_admin)])
def delete_announcement(aid: int, db: Session = Depends(get_db)):
    obj = db.query(models.Announcement).filter(models.Announcement.id == aid).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(obj)
    db.commit()


# ---- polls ----
def _poll_out(db: Session, p: models.Poll, emp_id: int | None) -> dict:
    counts = dict(
        db.query(models.PollVote.option_id, func.count(models.PollVote.id))
        .filter(models.PollVote.poll_id == p.id)
        .group_by(models.PollVote.option_id)
        .all()
    )
    my = None
    if emp_id:
        v = (
            db.query(models.PollVote)
            .filter(models.PollVote.poll_id == p.id, models.PollVote.employee_id == emp_id)
            .first()
        )
        my = v.option_id if v else None
    return {
        "id": p.id, "question": p.question, "active": p.active,
        "my_vote": my,
        "options": [{"id": o.id, "text": o.text, "votes": counts.get(o.id, 0)} for o in p.options],
        "created_at": p.created_at,
    }


@router.get("/polls/", response_model=List[schemas.PollOut])
def list_polls(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    polls = db.query(models.Poll).order_by(models.Poll.id.desc()).limit(50).all()
    return [_poll_out(db, p, current_user.employee_id) for p in polls]


@router.post("/polls/", response_model=schemas.PollOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_poll(
    body: schemas.PollCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not body.options or len(body.options) < 2:
        raise HTTPException(status_code=400, detail="At least 2 options required")
    p = models.Poll(question=body.question, created_by=current_user.id)
    db.add(p)
    db.flush()
    for t in body.options[:6]:
        db.add(models.PollOption(poll_id=p.id, text=t))
    log(db, "poll.create", "poll", p.id, current_user.id, body.question)
    db.commit()
    db.refresh(p)
    return _poll_out(db, p, current_user.employee_id)


@router.post("/polls/{pid}/vote", response_model=schemas.PollOut)
def vote(
    pid: int,
    body: schemas.VoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User has no linked employee profile")
    p = db.query(models.Poll).filter(models.Poll.id == pid).first()
    if not p or not p.active:
        raise HTTPException(status_code=400, detail="Poll is not active")
    opt = db.query(models.PollOption).filter(
        models.PollOption.id == body.option_id, models.PollOption.poll_id == pid
    ).first()
    if not opt:
        raise HTTPException(status_code=400, detail="Invalid option")
    existing = (
        db.query(models.PollVote)
        .filter(models.PollVote.poll_id == pid, models.PollVote.employee_id == current_user.employee_id)
        .first()
    )
    if existing:
        existing.option_id = opt.id
    else:
        db.add(models.PollVote(poll_id=pid, option_id=opt.id, employee_id=current_user.employee_id))
    db.commit()
    return _poll_out(db, p, current_user.employee_id)


@router.patch("/polls/{pid}/close", dependencies=[Depends(hr_admin)])
def close_poll(pid: int, db: Session = Depends(get_db)):
    p = db.query(models.Poll).filter(models.Poll.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    p.active = False
    db.commit()
    return {"ok": True}
