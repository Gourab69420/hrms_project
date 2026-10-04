"""AppSheet holiday source (Google Sheet -> AppSheet -> HRMS backend).

Config (env, never leaves the backend):
  APPSHEET_APP_ID      AppSheet app id
  APPSHEET_APP_KEY      Application Access Key
  APPSHEET_REGION      default "www.appsheet.com"
  APPSHEET_HOLIDAY_TABLE  default "Holidays"

The sheet is the source of truth; the local DB is a fallback cache.
Frontend never talks to AppSheet — only to HRMS endpoints.
"""
import json
import os
import time
import urllib.request
from datetime import date, datetime

APP_ID = os.getenv("APPSHEET_APP_ID", "")
APP_KEY = os.getenv("APPSHEET_APP_KEY", "")
REGION = os.getenv("APPSHEET_REGION", "www.appsheet.com")
TABLE = os.getenv("APPSHEET_HOLIDAY_TABLE", "Holidays")

_CACHE: dict = {"at": 0.0, "rows": []}
TTL = 15 * 60


class AppSheetError(Exception):
    pass


def configured() -> bool:
    return bool(APP_ID and APP_KEY)


def _pick(row: dict, *names: str):
    lowered = {str(k).strip().lower(): v for k, v in row.items()}
    for n in names:
        if n in lowered and lowered[n] not in (None, ""):
            return lowered[n]
    return None


def _parse_date(v) -> date | None:
    if v is None:
        return None
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s.split("T")[0], fmt).date()
        except ValueError:
            continue
    return None


def normalize(row: dict) -> dict | None:
    d = _parse_date(_pick(row, "date", "holiday date", "day", "holidaydate"))
    name = _pick(row, "name", "holiday", "holiday name", "title", "holidayname")
    if not d or not name:
        return None
    year = _pick(row, "year")
    try:
        year = int(str(year)[:4]) if year else d.year
    except ValueError:
        year = d.year
    return {
        "date": d.isoformat(),
        "name": str(name).strip(),
        "description": str(_pick(row, "reason", "description", "details", "detail", "remarks") or "").strip() or None,
        "type": str(_pick(row, "type", "holiday type", "category", "kind") or "").strip() or None,
        "year": year,
    }


def fetch_external() -> list[dict]:
    """Normalized holiday rows from AppSheet. Raises AppSheetError on any failure."""
    if not configured():
        raise AppSheetError("AppSheet not configured (APPSHEET_APP_ID / APPSHEET_APP_KEY)")
    if time.time() - _CACHE["at"] < TTL and _CACHE["rows"]:
        return _CACHE["rows"]
    url = f"https://{REGION}/api/v2/apps/{APP_ID}/tables/{TABLE}/Action"
    payload = json.dumps({
        "Action": "Find",
        "Properties": {"Locale": "en-US", "Timezone": "Asia/Kolkata"},
        "Rows": [],
    }).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={"ApplicationAccessKey": APP_KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read().decode())
    except Exception as e:
        raise AppSheetError(f"AppSheet request failed: {e}")
    if not isinstance(raw, list):
        raise AppSheetError("AppSheet returned an unexpected shape (expected a row list)")
    rows = [n for r in raw if isinstance(r, dict) and (n := normalize(r))]
    _CACHE.update(at=time.time(), rows=rows)
    return rows


def clear_cache() -> None:
    _CACHE.update(at=0.0, rows=[])
