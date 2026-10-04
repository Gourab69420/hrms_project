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


def _decode_csv(raw: bytes) -> tuple[str, str]:
    """Excel/phone-saved CSVs are rarely clean UTF-8. Try BOM/encodings in order."""
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return raw.decode("utf-16"), "utf-16"
    if b"\x00" in raw:
        try:
            return raw.decode("utf-16"), "utf-16"
        except Exception:
            pass
    for enc in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            return raw.decode(enc), enc
        except Exception:
            continue
    return raw.decode("latin-1"), "latin-1"


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
    if not raw or not raw.strip():
        raise HTTPException(status_code=400, detail="File is empty — download the template first")
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 2 MB)")
    text, encoding = _decode_csv(raw)
    try:
        reader = csv.DictReader(io.StringIO(text), skipinitialspace=True)
        if not reader.fieldnames:
            raise ValueError("no header row")
        # Normalize headers: stray BOM/whitespace/quotes from spreadsheet exports
        reader.fieldnames = [h.strip().strip('"').strip("'").lstrip("﻿") for h in reader.fieldnames]
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read CSV headers — download the template first")
    rows, bad = [], 0
    for record in reader:
        clean = {(k.strip() if k else ""): (v.strip() if isinstance(v, str) else v) for k, v in record.items()}
        norm = appsheet.normalize(clean)
        if norm:
            rows.append(norm)
        elif any((v or "").strip() for v in clean.values()):
            bad += 1
    if not rows:
        raise HTTPException(
            status_code=400,
            detail=f"No valid rows (columns seen: {', '.join(reader.fieldnames)}). Need Date (YYYY-MM-DD) + Name.",
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
        f"file={file.filename} enc={encoding} replaced_with={len(by_date)} skipped_invalid={bad}")
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
