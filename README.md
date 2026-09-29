# HRMS — Human Resource Management System

Mobile-first HRMS for small/medium businesses: **React Native (Expo) app + FastAPI backend + PostgreSQL**, secured with JWT.

```
hrms-mobile/  (Expo Router app — Admin + Employee portals)
     ↕  REST + JWT (access rotation via refresh tokens)
HRMS2/        (FastAPI — 17 routers, RBAC enforced server-side)
     ↕  SQLAlchemy
PostgreSQL    (database "HRMS")
```

## Features

**People & org** — staff directory with search/filter, departments, designations via positions, shifts (morning/evening/night with per-shift late rules), manager links (`manager_id`), onboarding documents (upload/download), org visibility through directory + team views.

**Attendance** — one-tap punch in/out (self-service), shift-aware late flagging, work-hours auto-stamp, missed-punch **regularization** with manager approval that writes back into attendance, admin roster with CSV export, absentee alerts to managers (post-10:30, skips holidays/offs/leave).

**Leave** — quota-based types (casual 12, sick 10, earned 15, unpaid), live balances, balance enforcement at apply-time, employee apply/withdraw, **manager + HR/admin approvals**, team inbox for managers.

**Payroll (India/WB)** — salary structures (basic/HRA/conveyance/special), backend-only math: PF 12% (₹15k cap), ESI 0.75% (≤₹21k), West Bengal PT slabs, TDS estimate (new regime), automatic loan-EMI deduction, on-device PDF payslips, payroll history.

**Workflows** — loans & advances, helpdesk tickets, resignation + full-and-final settlement (completion deactivates employee, admin-only), announcements + polls with voting, holiday calendar, audit log of every mutation.

**Platform** — role-choose login (Admin/Employee portals), refresh-token rotation with auto-retry, Expo Push notifications (leave decisions, payroll, tickets, alerts), offline punch queue (syncs on reconnect), biometric app lock, HR/Admin UI split, Sora + IBM Plex Sans typography.

## Roles

| Role | Access |
|---|---|
| `admin` | Everything, incl. audit log, exit completion, deletes |
| `hr` | Everything except audit log, deactivation UI, exit completion |
| `employee` | Own data only + team approvals if they manage reports |

Backend is the sole enforcer; the app routes purely by `/auth/me` role.

## Quickstart

**1. Database** — create PostgreSQL database `HRMS`, then:
```
cd HRMS2
copy .env.example .env   # set DB password + SECRET_KEY
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Tables auto-create on boot. Phase migrations in `HRMS2/README.md`.

**2. Master admin** — `POST /auth/register` `{username, password, role: "admin"}` (or link `employee_id`), then Admin Login in the app.

**3. Mobile app**
```
cd hrms-mobile
copy .env.example .env   # EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:8000
npx expo start            # Expo Go (UI only; native features need a dev build)
npx expo run:android      # local dev build (needs Android Studio + JDK 17)
```

**4. Phone on same Wi-Fi** — backend must bind `0.0.0.0` (localhost is PC-only). Verify from phone browser: `http://<PC-IP>:8000/docs`.

## Layout

```
HRMS2/          backend — app/{models,schemas,auth,permissions,audit,notify,routers/}, main.py
hrms-mobile/    app — src/{app/{(admin),(employee)},components,services,store,theme.ts}
Stich_admin/    original admin UI reference mockups
stich_Employee/ original employee UI reference mockups
```

Details: [backend](HRMS2/README.md) · [mobile app](hrms-mobile/README.md)
