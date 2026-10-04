from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import List
import csv
import io

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


TEMPLATE = "Date,Name,Reason,Type,Year\r\n2026-01-26,Republic Day,National holiday,National,2026\r\n"


@router.get("/template", response_class=PlainTextResponse)
def download_template(_=Depends(get_current_user)):
    """Blank CSV template (with one example row) for the admin upload."""
    return PlainTextResponse(TEMPLATE, media_type="text/csv", headers={
        "Content-Disposition": 'attachment; filename="holidays_template.csv"',
    })


@router.post("/upload", dependencies=[Depends(hr_admin)])
def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Replace the ENTIRE local holiday set with the uploaded CSV.
    Re-uploading replaces the previous set — old rows are removed.
    Expected headers (flexible): Date, Name, Reason, Type, Year."""
    raw = file.file.read()
    try:
        text = raw.decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="File must be UTF-8 CSV")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="Empty CSV — download the template first")
    rows = [r for r in (appsheet.normalize(dict(row)) for row in reader) if r]
    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No valid rows found. Need Date + Name columns (YYYY-MM-DD).",
        )
    # De-duplicate inside the file (last row wins per date)
    by_date: dict[str, dict] = {}
    for r in rows:
        by_date[r["date"]] = r
    from datetime import date as _date
    db.query(models.Holiday).delete(synchronize_session=False)
    for r in by_date.values():
        db.add(models.Holiday(
            date=_date.fromisoformat(r["date"]), name=r["name"], description=r["description"],
        ))
    log(db, "holiday.upload_replace", "holiday", None, current_user.id,
        f"file={file.filename} replaced_with={len(by_date)} skipped={len(rows) - len(by_date)}")
    db.commit()
    appsheet.clear_cache()
    return {"replaced_with": len(by_date), "source": "csv_upload"}


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
