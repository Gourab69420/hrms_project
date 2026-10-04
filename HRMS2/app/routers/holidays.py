from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import appsheet
from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum

router = APIRouter(prefix="/holidays", tags=["Holidays"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)


def _external_as_out() -> List[dict]:
    rows = appsheet.fetch_external()
    return [
        {
            "id": -(i + 1),
            "date": r["date"],
            "name": r["name"],
            "description": r["description"],
            "source": "appsheet",
        }
        for i, r in enumerate(rows)
    ]


@router.get("/", response_model=List[schemas.HolidayOut])
def list_holidays(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Sheet-first: AppSheet rows when configured+reachable, otherwise local DB rows."""
    if appsheet.configured():
        try:
            return _external_as_out()
        except appsheet.AppSheetError:
            pass
    return [
        {
            "id": h.id, "date": h.date.isoformat(), "name": h.name,
            "description": h.description, "source": "local",
        }
        for h in db.query(models.Holiday).order_by(models.Holiday.date).all()
    ]


@router.get("/external/status")
def external_status(_=Depends(get_current_user)):
    return {
        "configured": appsheet.configured(),
        "table": appsheet.TABLE,
        "hint": None if appsheet.configured() else "Set APPSHEET_APP_ID and APPSHEET_APP_KEY on the backend",
    }


@router.get("/external/preview")
def external_preview(db: Session = Depends(get_db), _=Depends(get_current_user)):
    try:
        rows = appsheet.fetch_external()
    except appsheet.AppSheetError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"count": len(rows), "rows": rows, "source": "appsheet"}


@router.post("/sync", dependencies=[Depends(hr_admin)])
def sync_from_sheet(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """One-tap import: upsert sheet rows into the local table (offline fallback copy)."""
    try:
        rows = appsheet.fetch_external()
    except appsheet.AppSheetError as e:
        raise HTTPException(status_code=502, detail=str(e))
    added, updated = 0, 0
    for r in rows:
        day = __import__("datetime").date.fromisoformat(r["date"])
        obj = db.query(models.Holiday).filter(models.Holiday.date == day).first()
        if obj:
            obj.name, obj.description = r["name"], r["description"]
            updated += 1
        else:
            db.add(models.Holiday(date=day, name=r["name"], description=r["description"]))
            added += 1
    log(db, "holiday.sync", "holiday", None, current_user.id, f"added={added} updated={updated}")
    db.commit()
    appsheet.clear_cache()
    return {"added": added, "updated": updated, "source": "appsheet"}


@router.post("/", response_model=schemas.HolidayOut, status_code=201, dependencies=[Depends(hr_admin)])
def create_holiday(
    body: schemas.HolidayCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if db.query(models.Holiday).filter(models.Holiday.date == body.date).first():
        raise HTTPException(status_code=400, detail="Holiday already exists on this date")
    obj = models.Holiday(**body.model_dump())
    db.add(obj)
    db.flush()
    log(db, "holiday.create", "holiday", obj.id, current_user.id, body.name)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{hid}", status_code=204, dependencies=[Depends(hr_admin)])
def delete_holiday(
    hid: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Holiday).filter(models.Holiday.id == hid).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Holiday not found")
    log(db, "holiday.delete", "holiday", hid, current_user.id, obj.name)
    db.delete(obj)
    db.commit()
