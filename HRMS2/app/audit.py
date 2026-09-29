"""Central audit trail writer. Call after every significant mutation."""
from sqlalchemy.orm import Session
from app import models


def log(
    db: Session,
    action: str,
    entity: str,
    entity_id: int | None = None,
    actor_user_id: int | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        models.AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            detail=detail,
        )
    )
