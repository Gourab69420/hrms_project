"""Expo Push sender (stdlib only). Absentee alerts + decision/payroll notifications."""
import json
import urllib.request
from sqlalchemy.orm import Session
from app import models

EXPO_URL = "https://exp.host/--/api/v2/push/send"


def user_tokens(db: Session, user_id: int) -> list[str]:
    return [
        r[0]
        for r in db.query(models.PushToken.expo_push_token)
        .filter(models.PushToken.user_id == user_id)
        .all()
    ]


def employee_user_id(db: Session, employee_id: int) -> int | None:
    u = db.query(models.User).filter(models.User.employee_id == employee_id).first()
    return u.id if u else None


def send(db: Session, user_id: int, title: str, body: str, data: dict | None = None) -> int:
    tokens = user_tokens(db, user_id)
    if not tokens:
        return 0
    sent = 0
    for tok in tokens:
        payload = json.dumps(
            {"to": tok, "title": title, "body": body, "data": data or {}}
        ).encode()
        req = urllib.request.Request(EXPO_URL, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=10):
                sent += 1
        except Exception:
            continue
    return sent


def notify_employee(db: Session, employee_id: int, title: str, body: str, data: dict | None = None) -> int:
    uid = employee_user_id(db, employee_id)
    return send(db, uid, title, body, data) if uid else 0


def notify_managers_of(db: Session, employee_id: int, title: str, body: str, data: dict | None = None) -> int:
    """Manager chain: direct manager + all admins/hr users."""
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    uids: set[int] = set()
    if emp and emp.manager_id:
        mid = employee_user_id(db, emp.manager_id)
        if mid:
            uids.add(mid)
    for u in db.query(models.User).filter(
        models.User.role.in_([models.RoleEnum.admin, models.RoleEnum.hr]),
        models.User.is_active.is_(True),
    ).all():
        uids.add(u.id)
    return sum(send(db, uid, title, body, data) for uid in uids)
