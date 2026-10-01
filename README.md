# HRMS — Human Resource Management System

Mobile-first HRMS for small/medium businesses in India: **Expo React Native app + FastAPI backend + PostgreSQL**, secured with JWT + RBAC.

Employees punch in/out, apply for leave, view payslips, and raise tickets from their phone. HR/Admins manage staff, attendance, leaves, payroll, loans, exits, announcements, and audit — from a separate Admin portal in the same app.

```
┌──────────────────────────────┐
│  hrms-mobile/ (Expo Router)  │
│  Admin portal + Employee     │
│  portal, TypeScript          │
└──────────────┬───────────────┘
               │ REST + JWT (access + rotating refresh)
               ▼
┌──────────────────────────────┐     ┌──────────────────┐
│  HRMS2/ (FastAPI, 17+        │────▶│  PostgreSQL      │
│  routers, RBAC server-side)  │ SQL │  database "HRMS" │
└──────────────────────────────┘     └──────────────────┘
```

No mocks — every mobile screen reads the live API with loading / error / empty states.

---

## Table of contents

- [Repository layout](#repository-layout)
- [Tech stack](#tech-stack)
- [Roles & access control](#roles--access-control)
- [Features](#features)
- [Backend — HRMS2](#backend--hrms2)
- [Mobile app — hrms-mobile](#mobile-app--hrms-mobile)
- [Database models](#database-models)
- [Security model](#security-model)
- [Notifications](#notifications)
- [Quickstart (end to end)](#quickstart-end-to-end)
- [Environment variables](#environment-variables)
- [Development commands](#development-commands)
- [Troubleshooting](#troubleshooting)
- [Design references](#design-references)
- [Sub-readmes](#sub-readmes)

---

## Repository layout

```
hrmsv1/
├── README.md            ← you are here (whole-project overview)
├── HRMS2/               ← FastAPI backend
│   ├── main.py          ← app entry, mounts 17 routers, auto-creates tables
│   ├── requirements.txt
│   ├── .env.example
│   ├── README.md        ← backend-only setup + endpoint table
│   └── app/
│       ├── models.py    ← 20+ SQLAlchemy tables (users, employees, attendance…)
│       ├── schemas.py
│       ├── database.py  ← engine/session (psycopg v3 driver)
│       ├── auth.py      ← bcrypt + JWT login/refresh/logout
│       ├── permissions.py ← admin/hr privileged, manager can_review
│       ├── audit.py     ← audit_logs writer
│       ├── notify.py    ← Expo Push via stdlib
│       ├── routers/     ← auth, departments, employees, attendance, leaves,
│       │                   leave_types, holidays, shifts, documents, comms
│       │                   (announcements+polls), regularization, loans
│       │                   (loans+salary-structures), tickets, payroll,
│       │                   dashboard, audits, alerts
│       └── storage/     ← uploaded employee documents on disk
├── hrms-mobile/         ← Expo Router app (Admin + Employee portals)
│   ├── app.json         ← expo config, biometric + notification plugins
│   ├── package.json     ← Expo SDK 57, React 19, RN 0.86
│   ├── .env.example
│   ├── README.md        ← mobile-only setup + screens
│   └── src/
│       ├── app/         ← file-system routes
│       │   ├── index.tsx            ← role chooser
│       │   ├── admin-login.tsx / employee-login.tsx
│       │   ├── (admin)/  ← dashboard, staff, clock, leaves, payroll,
│       │   │               staff/add, staff/[id], payroll/run, approvals,
│       │   │               regs, tickets, exits, holidays, announcements,
│       │   │               audit, comp (loans+salary), shifts, leave-types,
│       │   │               departments, profile
│       │   └── (employee)/ ← home, attendance (punch), leaves, payroll
│       │                     (+PDF payslip), profile, apply-leave,
│       │                     announcements (+polls), holidays,
│       │                     regularization, loans, tickets, exit,
│       │                     documents, team (manager inbox)
│       ├── services/
│       │   ├── api.ts          ← axios instance, JWT inject, 401→refresh retry
│       │   ├── useHrms.ts      ← TanStack Query hooks per screen
│       │   ├── config.ts       ← API URL resolution (LAN IP / emulator)
│       │   ├── push.ts         ← Expo Push registration + tap routing
│       │   ├── offlineQueue.ts ← offline punch queue (SecureStore)
│       │   └── applock.ts      ← opt-in biometric app lock
│       ├── store/AuthContext.tsx ← session restore, sign in/out, role
│       ├── components/         ← LoginForm, shared ui primitives
│       └── theme.ts            ← design system (navy #1E3A8A, Sora + Plex Sans)
├── Stich_admin/         ← original Admin UI reference mockups (Stitch)
└── stich_Employee/      ← original Employee UI reference mockups (Stitch)
```

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile | Expo SDK 57, Expo Router, TypeScript, React 19, React Native 0.86 | File-system routing in `src/app/`; dev builds for native features |
| State / data | TanStack Query 5 + axios | `useHrms.ts` hooks; mutations invalidate related queries |
| Native modules | expo-notifications, expo-local-authentication, expo-secure-store, expo-document-picker, expo-file-system, expo-print + expo-sharing, expo-font, NetInfo, datetimepicker | Push, biometric lock, offline queue, uploads, on-device PDF payslips, Sora/IBM Plex Sans fonts |
| Backend | FastAPI 0.111, Uvicorn (standard), SQLAlchemy ≥2.0, psycopg (binary) v3, python-jose + bcrypt, python-multipart, python-dotenv, Alembic, email-validator | 17 routers mounted in `main.py`; `Base.metadata.create_all()` on boot |
| Auth | JWT access (short-lived) + hashed refresh tokens with rotation | `/auth/login` → access+refresh; `/auth/refresh` revokes old; `/auth/logout` revokes |
| DB | PostgreSQL, database name `HRMS` | SQLAlchemy ORM; phase-1 migration = `ADD COLUMN IF NOT EXISTS` + seeds |
| Push transport | Expo Push via Python stdlib (`app/notify.py`) | No extra push dependency |
| Fonts / theme | Sora (headings/emphasis) + IBM Plex Sans (body) | Loaded behind splash; `src/theme.ts` is single source of truth |

---

## Roles & access control

The **backend is the sole enforcer**. The app only routes by `GET /auth/me` role — guards in `(admin)/_layout.tsx` and `(employee)/_layout.tsx` redirect (no token → login, wrong portal → correct portal), but every endpoint re-checks server-side.

| Role | Portal | Access |
|---|---|---|
| `admin` | Admin | Everything: all CRUD, deletes, full employee wipe (`DELETE /employees/{id}/full`), audit log (`GET /audit-logs/`), exit completion (deactivates employee) |
| `hr` | Admin | Everything **except** audit log, deactivation UI, and exit completion |
| `employee` | Employee | Own data only (`/me`, `/my` endpoints) **plus** team approvals if `employees.manager_id` points to them (`GET /leaves/team`, `GET /regularization/team`, `can_review`) |

Privileged check lives in `HRMS2/app/permissions.py`. Managers are regular employees with direct reports — they get approve/reject on their reports' leaves and regularizations.

---

## Features

### People & org
- Staff directory with search (`?search&skip&limit`), departments, designations via `position`, shifts, manager links (`manager_id`), team views.
- Employee detail: call/email actions, deactivate, documents tab, full wipe (login + attendance + leaves + payroll + docs) — admin-only.
- Onboarding documents: upload (`POST /documents/employee/{id}?doc_type=`), list, download, delete (admin/HR).

### Attendance
- One-tap self punch in/out (`POST /attendance/punch`); manual entries by admin/HR (`POST /attendance/`).
- Shift-aware late flagging (`late_after` grace per shift), work-hours auto-stamp, statuses: `present / absent / late / half_day`.
- Missed-punch **regularization**: employee requests corrected times → manager/HR approves → writes back into `attendances`.
- Admin roster with paging + CSV export, per-employee history.
- Absentee alerts to managers (`POST /alerts/absentee`): post-10:30 check, skips weekly offs / holidays / approved leave.

### Leave
- Quota-based types seeded: **casual 12/yr, sick 10/yr, earned 15/yr (paid), unpaid unlimited**.
- Live balances: `remaining = entitled − (approved + pending days)`; over-quota applies rejected with balance.
- Employee: apply, view mine, withdraw own pending (`DELETE /leaves/{id}`).
- Manager + HR/Admin: team inbox (`GET /leaves/team`), approve/reject (`PATCH /leaves/{id}/status`), full paged list.
- Leave types CRUD (admin/HR), per-employee balance view.

### Payroll (India / West Bengal) — backend-only math
Clients never send `net`. `POST /payroll/` computes:

```
gross = basic + hra + conveyance + special_allowance + bonuses
  (from latest salary_structure if set, else manual basic_salary)
deductions = manual
  + PF  12% of min(basic, 15000)            (if pf_applicable)
  + ESI 0.75% if gross ≤ 21000             (if esi_applicable)
  + WB PT slabs: ≤10k→0, ≤15k→110, ≤25k→130, ≤40k→150, else 200
  + TDS new-regime estimate
  + active loan EMI: min(installment, remaining), auto-closes at 0
net = gross − deductions
```

- Salary structures per employee (`basic/hra/conveyance/special`, pf/esi flags, `effective_from`); payroll auto-uses latest.
- Loans & advances: create (admin/HR), auto-deducted each payroll run.
- Payroll history per employee + paged list, delete (admin), on-device **PDF payslip** (expo-print + sharing) with statutory breakdown.

### Loans, helpdesk, exit
- **Loans**: principal + monthly installment + remaining; `active/closed`.
- **Tickets** (helpdesk): payslip correction, letter requests… `open → in_progress → closed`; mine + full queue.
- **Exit** (resignation + full-and-final): employee resigns (`POST /exits/` with resignation + last-working dates); HR views; **admin-only completion** with `fnf_amount` → deactivates employee.

### Comms & calendar
- Announcements (`GET/POST /announcements/`, admin/HR delete).
- Polls with voting (`GET/POST /polls/`, `POST /polls/{id}/vote`, close); one vote per employee (`uq_vote_poll_emp`).
- Holiday calendar (unique date, admin/HR manage).
- Shifts: morning/evening/night with `start/end/late_after/weekly_offs`; delete blocked while assigned.

### Platform / mobile-only
- Role-choose login (Admin vs Employee portals), refresh-token rotation with auto-retry on 401.
- Expo Push notifications (leave decisions, payroll posted, ticket updates, exit updates, requests to manager chain + admin/HR).
- **Offline punch queue**: taps made offline are queued in SecureStore and flushed on reconnect (NetInfo).
- **Biometric app lock**: opt-in FaceID/fingerprint when returning to app.
- HR/Admin UI split via `backendRole`; Sora + IBM Plex Sans typography; navy `#1E3A8A` / royal `#2563EB` theme.
- Every screen has loading / error / empty states. `USE_MOCK = false` — live API is primary.

### Audit
- `audit_logs` records who did what on every significant mutation (register, leave apply/decide, payroll run, employee changes…). Admin-only viewer in app.

---

## Backend — HRMS2

Full detail: [`HRMS2/README.md`](HRMS2/README.md).

**Setup:**

```powershell
cd HRMS2
pip install -r requirements.txt
copy .env.example .env   # set DATABASE_URL password + SECRET_KEY
python -m uvicorn main:app --host 0.0.0.0 --port 8000
# API docs: http://<host>:8000/docs
```

`--host 0.0.0.0` is required so a physical phone on the same Wi-Fi can reach it. `Base.metadata.create_all(bind=engine)` creates new tables on boot; column additions for existing tables + seeds (leave quotas, 3 shifts) use the re-runnable Phase-1 approach: `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, then insert seeds.

**How it works:**

- `app/auth.py` + `routers/auth.py` — bcrypt passwords, short JWT, `/auth/login` → access+refresh, `/auth/refresh` rotates (old revoked), `/auth/logout` revokes, `/auth/push-token` registers Expo tokens, `GET /auth/me` drives app routing.
- `app/permissions.py` — privileged = admin/hr; everyone else scoped to own `employee_id`; managers may review direct reports (`can_review`).
- `app/audit.py` — `log()` writes actor/action/entity to `audit_logs`.
- `app/notify.py` — Expo Push fan-out to employee + manager chain + admin/HR.
- `app/database.py` — `DATABASE_URL` with `postgresql+psycopg://` driver, `SessionLocal`, `get_db` dependency.

**Endpoints (who can call):**

| Area | Method & Path | Who |
|---|---|---|
| Auth | `POST /auth/register, /login, /refresh, /logout, /push-token`, `GET /auth/me` | public / self |
| Departments | `POST /`, `GET /`, `GET /{id}`, `DELETE /{id}` | admin,hr write / all-auth read |
| Employees | `POST /`, `GET / (?search&skip&limit)`, `GET /me`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `DELETE /{id}/full` | admin,hr / self / admin-delete+wipe |
| Attendance | `POST /` (manual), `POST /punch` (self), `GET /employee/{id}`, `GET /` (paged), `DELETE /{id}` | admin,hr / self+punch / admin |
| Leaves | `POST /` (quota-enforced), `GET /my`, `GET /team`, `GET /` (paged), `DELETE /{id}` (own pending), `PATCH /{id}/status` | self / manager+ |
| Leave types | `GET /leave-types/`, `POST /leave-types/` | auth / admin,hr |
| Balances | `GET /leave-balances/me`, `GET /leave-balances/employee/{id}` | self / privileged+self |
| Holidays | `GET/POST /`, `DELETE /{id}` | auth / admin,hr write |
| Shifts | `GET/POST /`, `DELETE /{id}` (blocked while assigned) | auth / admin,hr write |
| Dashboard | `GET /dashboard/stats` (headcount, turnout, pending, on-leave) | admin,hr |
| Documents | `POST /documents/employee/{id} (?doc_type)`, `GET /documents/employee/{id}`, `GET /{id}/download`, `DELETE /{id}` | self+ / admin,hr-delete |
| Announcements | `GET/POST /announcements/`, `DELETE /{id}` | auth / admin,hr write |
| Polls | `GET/POST /polls/`, `POST /polls/{id}/vote`, `PATCH /polls/{id}/close` | auth / admin,hr-manage |
| Regularization | `POST /`, `GET /my`, `GET /team`, `GET /` (paged), `PATCH /{id}/status` (approve writes attendance) | self / manager+ |
| Loans | `POST /loans/`, `GET /loans/my`, `GET /loans/employee/{id}` | admin,hr-create / self |
| Salary | `POST /salary-structures/`, `GET /salary-structures/employee/{id}` | admin,hr / self+ |
| Tickets | `POST /tickets/`, `GET /tickets/my`, `GET /tickets/`, `PATCH /tickets/{id}` | self / admin,hr-manage |
| Exits | `POST /exits/` (resign), `GET /exits/my`, `GET /exits/`, `PATCH /exits/{id}` (complete→deactivate, admin-only) | self / admin,hr |
| Payroll | `POST /` (statutory engine), `GET /employee/{id}`, `GET /` (paged), `DELETE /{id}` | admin,hr-create / self / admin-delete |
| Audit/Inbox | `GET /audit-logs/` (admin), `GET /approvals/inbox` | admin / auth |
| Alerts | `POST /alerts/absentee` (post-10:30, skips offs/holidays/leave) | admin,hr |

---

## Mobile app — hrms-mobile

Full detail: [`hrms-mobile/README.md`](hrms-mobile/README.md).

**Setup:**

```powershell
cd hrms-mobile
npm install --legacy-peer-deps
copy .env.example .env   # EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:8000
npx expo start           # scan with Expo Go (same Wi-Fi)
```

Native features (push, biometrics, doc upload) need a dev build, not Expo Go:

```powershell
npx expo run:android   # needs Android Studio + JDK 17 (paths pinned in android/)
```

Cloud builds / OTA: `npx eas-cli@latest login|init|build`.

**How it works:**

- `src/services/api.ts` — single axios instance, JWT injection, **401 → refresh-token retry**, then all endpoint functions (auth, people, leave, payroll, comms…).
- `src/services/useHrms.ts` — React Query hooks per screen; mutations invalidate related queries so lists refresh.
- `src/store/AuthContext.tsx` — session restore, sign in/out (server-revoked), exposes `role` (admin/employee portal) + `backendRole` (admin/hr/employee UI splits).
- `src/services/push.ts` — Expo Push registration + tap routing.
- `src/services/offlineQueue.ts` — offline punches queued in SecureStore, flushed on reconnect.
- `src/services/applock.ts` — opt-in biometric lock on foreground.
- `src/services/config.ts` — URL resolution: `EXPO_PUBLIC_API_URL` wins; Android emulator → `http://10.0.2.2:8000`; iOS simulator/web → `http://127.0.0.1:8000`.
- Guards in `(admin)/_layout.tsx`, `(employee)/_layout.tsx`.

**Screens:**

- **Entry:** role chooser `/`, `/admin-login`, `/employee-login`.
- **Admin tabs** — Dashboard (+Manage grid), Staff, Clock, Leaves, Payroll. Hidden: `staff/add`, `staff/[id]`, `payroll/run`, `approvals`, `regs`, `tickets`, `exits`, `holidays`, `announcements`, `audit` (admin-only), `comp` (loans + salary), `shifts`, `leave-types`, `departments`, `profile`.
- **Employee tabs** — Home (+Services grid), Attendance (one-button punch), Leaves (balances + withdraw), Payroll (breakdown + PDF), Profile (live data, sign-out, app-lock toggle). Hidden: `apply-leave` (date pickers, quota-aware), `announcements` (+poll voting), `holidays`, `regularization`, `loans`, `tickets`, `exit`, `documents`, `team` (manager approvals).

---

## Database models

From `HRMS2/app/models.py` (PostgreSQL via SQLAlchemy):

| Table | Purpose |
|---|---|
| `users` | login (`username`, bcrypt hash, `role: admin/hr/employee`, optional `employee_id` link) |
| `employees` | profile (`first/last/email/phone/position/hire_date/is_active`, `department_id`, `manager_id`, `shift_id`) |
| `departments` | org units (unique name) |
| `shifts` | `name/start/end/late_after/weekly_offs` |
| `attendances` | `employee/date/check_in/check_out/work_hours/status/notes` |
| `regularizations` | missed-punch correction requests + review |
| `leaves` | `employee/leave_type/dates/reason/status/reviewed_by` |
| `leave_types` | master quotas (`name/yearly_quota/paid`) |
| `leave_balances` | yearly entitlement snapshot (`uq_balance_emp_type_year`) |
| `holidays` | company calendar (unique date) |
| `payrolls` | computed slip (`basic/bonuses/hra/conveyance/special/pf/esi/pt/tds/loan_deduction/deductions/net_salary`) |
| `salary_structures` | active split per employee (`basic/hra/conveyance/special`, pf/esi flags, `effective_from`) |
| `loans` | `principal/monthly_installment/remaining/status` |
| `documents` | onboarding/HR file metadata (files under `app/storage/`) |
| `announcements` / `polls` / `poll_options` / `poll_votes` | comms + voting (one vote per employee) |
| `tickets` | helpdesk (`category/subject/body/status/closed_at`) |
| `exits` | resignation + FnF (`resignation/last_working/status/fnf_amount`) |
| `audit_logs` | who/what/when for mutations |
| `refresh_tokens` | hashed rotating refresh tokens (`revoked/expires_at`) |
| `push_tokens` | Expo tokens per user (`uq_push_user_token`) |

Enums: `RoleEnum`, `LeaveStatusEnum (pending/approved/rejected)`, `TicketStatusEnum (open/in_progress/closed)`, `ExitStatusEnum (pending/approved/completed)`, `LoanStatusEnum (active/closed)`, `AttendanceStatusEnum (present/absent/late/half_day)`.

---

## Security model

- Passwords bcrypt-hashed; never returned.
- Short-lived JWT access + long refresh; refresh **rotates** (old token revoked on use); logout revokes server-side.
- Axios interceptor retries once on 401 after refresh; session restore via SecureStore.
- Payroll math backend-only; clients cannot submit `net`.
- Leave quota enforced at apply-time, not just UI.
- Deletes/wipe, audit, exit-completion are admin-gated server-side.
- `.env` files (DB password, `SECRET_KEY`, API URL) are never committed — only `.env.example`.

---

## Notifications

Expo Push events (via `app/notify.py`):

- Employee: leave approved/rejected, regularization decided, payroll posted, ticket updated, exit updated.
- Manager chain + admin/HR: new leave request, regularization request, absentee alert, ticket raised, resignation.

Mobile registers the token via `POST /auth/push-token` (`src/services/push.ts`) and routes taps to the relevant screen.

---

## Quickstart (end to end)

**1. Database** — install PostgreSQL, create database `HRMS`:

```powershell
cd HRMS2
copy .env.example .env   # set DB password + SECRET_KEY
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Tables auto-create on boot. Verify: `http://localhost:8000/docs`.

**2. Master admin** — create the first login:

```http
POST /auth/register
{ "username": "...", "password": "...", "role": "admin" }
```

Optionally link `employee_id` after creating the employee profile. Then use **Admin Login** in the app.

**3. Mobile app:**

```powershell
cd hrms-mobile
copy .env.example .env   # EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:8000
npx expo start           # Expo Go (UI only)
npx expo run:android     # dev build for push/biometrics/uploads
```

**4. Phone on same Wi-Fi** — backend must bind `0.0.0.0` (localhost is PC-only). Verify from phone browser: `http://<PC-IP>:8000/docs`. Find your PC LAN IP with `ipconfig` (Windows) and put it in the mobile `.env`.

Recommended seed order: departments → shifts → employees (+ link logins via `employee_id`) → leave types/quotas → holidays → salary structures → attendance/leave/payroll flows.

---

## Environment variables

Backend (`HRMS2/.env`, see `.env.example`):

| Var | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy URL (psycopg v3) | `postgresql://postgres:<password>@localhost:5432/HRMS` |
| `SECRET_KEY` | JWT signing key — change in production | `change_me_in_production` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | access token lifetime | `60` |

Mobile (`hrms-mobile/.env`, see `.env.example`):

| Var | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL. Android emulator → `http://10.0.2.2:8000` (auto); physical phone → `http://<PC-LAN-IP>:8000` |

---

## Development commands

```powershell
# backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# mobile
npm install --legacy-peer-deps
npx expo start
npx expo run:android
npx tsc --noEmit        # typecheck
npx expo lint           # lint
npx expo-doctor         # diagnose
npx expo install --fix  # fix SDK version skew
```

Notes: use `npx expo install <package>` (not plain npm add) for SDK-compatible native modules. `ios/` + `android/` are generated (Continuous Native Generation) — configure native behavior in `app.json`, don't hand-edit unless you own the workflow (this repo pins `org.gradle.java.home` + `sdk.dir` for local Android builds). After adding a native library, rebuild the dev build — Expo Go won't include it.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Phone can't reach API | Backend must run with `--host 0.0.0.0`; phone + PC on same Wi-Fi; use PC LAN IP, not `localhost`; check firewall; open `http://<PC-IP>:8000/docs` in phone browser |
| Android emulator can't reach API | Use `http://10.0.2.2:8000` (auto-default in `config.ts`) |
| 401 loops / logged out | Refresh token expired or revoked — sign in again; check `SECRET_KEY` didn't change between restarts |
| Push not received | Needs dev build (`expo run:android`), not Expo Go; register token via `/auth/push-token`; physical device only |
| Biometrics / uploads fail in Expo Go | Same — needs dev build |
| Tables missing after pull | Restart uvicorn (auto-create runs on boot); for existing-table column adds use the Phase-1 `ADD COLUMN IF NOT EXISTS` + seed approach |
| Native build fails | `npx expo-doctor`, `npx expo install --fix`, verify JDK 17 + Android SDK paths |

---

## Design references

`Stich_admin/` and `stich_Employee/` hold the original Stitch UI mockups the mobile theme was extracted from (navy `#1E3A8A`, royal `#2563EB`, slate canvas, Sora + IBM Plex Sans). They are **references only** — the shipped app in `hrms-mobile/` is the source of truth. `src/theme.ts` documents the mapping (`executive_mobile_hrms/DESIGN.md` origin).

---

## Sub-readmes

- Backend setup + full endpoint table: [`HRMS2/README.md`](HRMS2/README.md)
- Mobile setup + screens + architecture: [`hrms-mobile/README.md`](hrms-mobile/README.md)
