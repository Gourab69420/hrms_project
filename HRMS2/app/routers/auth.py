import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import hash_password, verify_password, create_access_token, get_current_user, require_roles

router = APIRouter(prefix="/auth", tags=["Auth"])

REFRESH_DAYS = 30


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = models.User(
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
        employee_id=user_in.employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log(db, "user.register", "user", user.id, user.id, f"username={user.username} role={user.role}")
    db.commit()
    return user


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    token = create_access_token({"sub": user.username, "role": user.role})
    refresh = secrets.token_urlsafe(48)
    db.add(
        models.RefreshToken(
            user_id=user.id,
            token_hash=_hash(refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        )
    )
    log(db, "auth.login", "user", user.id, user.id)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "refresh_token": refresh}


@router.post("/refresh")
def refresh(body: schemas.RefreshIn, db: Session = Depends(get_db)):
    """Rotate: old refresh token is revoked, a new pair is issued."""
    h = _hash(body.refresh_token)
    row = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == h).first()
    if not row or row.revoked or row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(models.User).filter(models.User.id == row.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Account unavailable")
    row.revoked = True
    token = create_access_token({"sub": user.username, "role": user.role})
    refresh = secrets.token_urlsafe(48)
    db.add(
        models.RefreshToken(
            user_id=user.id,
            token_hash=_hash(refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        )
    )
    db.commit()
    return {"access_token": token, "token_type": "bearer", "refresh_token": refresh}


@router.post("/logout", status_code=204)
def logout(
    body: schemas.RefreshIn | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body:
        row = (
            db.query(models.RefreshToken)
            .filter(models.RefreshToken.token_hash == _hash(body.refresh_token))
            .first()
        )
        if row:
            row.revoked = True
    else:
        db.query(models.RefreshToken).filter(
            models.RefreshToken.user_id == current_user.id,
            models.RefreshToken.revoked.is_(False),
        ).update({"revoked": True})
    log(db, "auth.logout", "user", current_user.id, current_user.id)
    db.commit()


@router.post("/push-token", status_code=201)
def register_push_token(
    body: schemas.PushTokenIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not body.expo_push_token.startswith("ExponentPushToken["):
        raise HTTPException(status_code=400, detail="Invalid Expo push token")
    exists = (
        db.query(models.PushToken)
        .filter(
            models.PushToken.user_id == current_user.id,
            models.PushToken.expo_push_token == body.expo_push_token,
        )
        .first()
    )
    if not exists:
        db.add(models.PushToken(user_id=current_user.id, expo_push_token=body.expo_push_token))
        db.commit()
    return {"ok": True}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user