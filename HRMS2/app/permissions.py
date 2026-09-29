"""Team-permission helpers: admin/hr have full rights; otherwise only via manager link."""
from sqlalchemy.orm import Session
from app import models


def is_privileged(user: models.User) -> bool:
    return user.role in (models.RoleEnum.admin, models.RoleEnum.hr)


def report_ids(db: Session, user: models.User) -> list[int]:
    """Employee ids reporting (directly) to this user. Empty unless linked + someone reports."""
    if not user.employee_id:
        return []
    rows = (
        db.query(models.Employee.id)
        .filter(models.Employee.manager_id == user.employee_id)
        .all()
    )
    return [r[0] for r in rows]


def can_review(db: Session, reviewer: models.User, employee_id: int) -> bool:
    if is_privileged(reviewer):
        return True
    return employee_id in report_ids(db, reviewer)
