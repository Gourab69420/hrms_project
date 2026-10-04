# HRMS2 — FastAPI Backend

17 routers, JWT auth with refresh rotation, RBAC enforced on every endpoint, PostgreSQL via SQLAlchemy.

## Setup

```
cd HRMS2
pip install -r requirements.txt
copy .env.example .env        # DATABASE_URL, SECRET_KEY, ALGORITHM, TOKEN_EXPIRY
python -m uvicorn main:app --host 0.0.0.0 --port 8000   # --host 0.0.0.0 for phone access
```

`Base.metadata.create_all()` creates new tables on boot. Column additions for existing
tables + seeds (leave quotas, 3 shifts) live in the Phase-1 migration approach:
`ALTER TABLE … ADD COLUMN IF NOT EXISTS` then insert seeds — re-runnable safely.
API docs: `http://<host>:8000/docs`.

## How it works

- **Auth** (`app/auth.py`, `routers/auth.py`) — bcrypt passwords, short-lived JWT
  (`/auth/login` → access + refresh), `/auth/refresh` rotates (old token revoked),
  `/auth/logout` revokes, `/auth/push-token` registers Expo Push tokens.
- **Permissions** (`app/permissions.py`) — `admin`/`hr` are privileged; everyone else
  acts only on their own `employee_id`, except **managers** (`employees.manager_id`)
  who may review their direct reports' leaves/regularization (`can_review`).
- **Audit** (`app/audit.py`) — `log()` writes who did what to `audit_logs` on every
  significant mutation (register, leave apply/decide, payroll, employee changes…).
- **Notify** (`app/notify.py`) — Expo Push via stdlib: decision/payroll/ticket/exit
  updates to the employee, requests/alerts to the manager chain + admin/HR.

## Endpoints

| Area | Method & Path | Who |
|---|---|---|
| Auth | `POST /auth/register, /login, /refresh, /logout, /push-token`, `GET /auth/me` | public / self |
| Departments | `POST/GET /, GET /{id}, DELETE /{id}` | admin,hr / all-auth |
| Employees | `POST /, GET / (?search&skip&limit), GET /me, GET /team (direct reports), GET /{id}, PATCH /{id}, DELETE /{id}, DELETE /{id}/full (wipes login, attendance, leaves, payroll, docs…)` | admin,hr / self / admin-delete |
| Attendance | `POST / (manual), POST /punch (self in/out), POST /auto-punch-out (close past-shift sessions, idempotent), GET /employee/{id}, GET / (paged), DELETE /{id}` | admin,hr / self+punch / admin |
| Leaves | `POST / (quota-enforced), GET /my, GET /team (managers only, 403 otherwise), GET / (paged), DELETE /{id} (own pending), PATCH /{id}/status (manager+)` | self / manager+ |
| Leave types | `GET /leave-types/, POST /leave-types/` | auth / admin,hr |
| Balances | `GET /leave-balances/me, /leave-balances/employee/{id}` | self / privileged+self |
| Holidays | `GET / (sheet-first, falls back to DB), GET /external/status, GET /external/preview, POST /sync (import), POST /, DELETE /{id}` | auth / admin,hr-manage |
| Shifts | `GET/POST /, DELETE /{id}` (delete blocked while assigned) | auth / admin,hr |
| Dashboard | `GET /dashboard/stats` (headcount, turnout, pending, on-leave) | admin,hr |
| Documents | `POST /documents/employee/{id} (?doc_type), GET /documents/employee/{id}, GET /{id}/download, DELETE /{id}` | self+ / admin,hr-delete |
| Announcements | `GET/POST /announcements/, DELETE /{id}` | auth / admin,hr |
| Polls | `GET/POST /polls/, POST /polls/{id}/vote, PATCH /polls/{id}/close` | auth / admin,hr-manage |
| Regularization | `POST /, GET /my, GET /team, GET / (paged), GET /pending/count, PATCH /{id}/status` (approve writes attendance) | self / manager+ |
| Loans | `POST /loans/, GET /loans/my, GET /loans/employee/{id}` | admin,hr-create / self |
| Salary | `POST /salary-structures/, GET /salary-structures/employee/{id}` | admin,hr / self+ |
| Tickets | `POST /tickets/, GET /tickets/my, GET /tickets/, PATCH /tickets/{id}` | self / admin,hr-manage |
| Exits | `POST /exits/ (resign), GET /exits/my, GET /exits/, PATCH /exits/{id}` (complete→deactivate, admin-only) | self / admin,hr |
| Payroll | `POST / (statutory engine), GET /employee/{id}, GET / (paged), DELETE /{id}` | admin,hr-create / self / admin-delete |
| Audit/Inbox | `GET /audit-logs/ (admin), GET /approvals/inbox` | admin / auth |
| Alerts | `POST /alerts/absentee` (post-10:30, skips offs/holidays/leave) | admin,hr |

## Payroll math (backend-only, clients never send `net`)

`gross = basic + hra + conveyance + special + bonuses` (from latest salary structure if set,
else manual `basic_salary`). Deductions: manual + **PF** 12% of min(basic, 15000) +
**ESI** 0.75% if gross ≤ 21000 + **WB PT** slabs (≤10k: 0, ≤15k: 110, ≤25k: 130,
≤40k: 150, else 200) + **TDS** new-regime estimate + active **loan EMI**
(min(installment, remaining), auto-closes at 0). `net = gross − deductions`.

## Leave quotas (seeded)

casual 12/yr, sick 10/yr, earned 15/yr (paid), unpaid unlimited. `remaining =
entitled − (approved + pending days)`; over-quota applies are rejected with the balance.

## Google Sheet holidays (AppSheet)

`app/appsheet.py` talks to the AppSheet API (credentials in backend env only:
`APPSHEET_APP_ID`, `APPSHEET_APP_KEY`, optional `APPSHEET_REGION`,
`APPSHEET_HOLIDAY_TABLE`). `GET /holidays/` serves sheet rows first and falls back to
the local table when unconfigured/unreachable; `POST /holidays/sync` imports the sheet
into the DB; `GET /holidays/external/status|preview` expose config state and raw rows.
The frontend only ever calls HRMS endpoints and shows an "official sheet" badge.
