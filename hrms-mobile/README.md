# HRMS Mobile — Expo App

Expo Router + TypeScript + TanStack Query. Two portals (Admin, Employee) driven purely
by the backend role from `/auth/me`. No mocks — every screen reads live API with
loading/error/empty states.

## Setup

```
cd hrms-mobile
npm install --legacy-peer-deps
copy .env.example .env     # EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:8000
npx expo start             # scan with Expo Go (same Wi-Fi)
```

- **Dev build (native features: push, biometrics, doc upload):**
  `npx expo run:android` — needs Android Studio, JDK 17 (`org.gradle.java.home` +
  `sdk.dir` are pinned in `android/`), phone on USB debugging.
- **Cloud builds / OTA:** `npx eas-cli@latest login|init|build`.
- Typecheck: `npx tsc --noEmit`. Fonts: Sora (headings/emphasis) + IBM Plex Sans (body),
  loaded at startup behind the splash (`src/theme.ts` → `fonts`).

## How it works

- `src/services/api.ts` — single axios instance, JWT injection, **401 → refresh-token
  retry**, then all endpoint functions (auth, people, leave, payroll, comms…).
- `src/services/useHrms.ts` — React Query hooks per screen; mutations invalidate
  related queries so lists refresh themselves.
- `src/store/AuthContext.tsx` — session restore, sign in/out (server-revoked),
  exposes `role` (admin/employee portal) + `backendRole` (admin/hr/employee for UI splits).
- `src/services/push.ts` — Expo Push registration + tap routing.
- `src/services/offlineQueue.ts` — punch taps made offline are queued in SecureStore
  and flushed on reconnect.
- `src/services/applock.ts` — opt-in biometric lock when returning to the app.
- Guards live in `(admin)/_layout.tsx` and `(employee)/_layout.tsx` (no token → login,
  wrong portal → routed by role). Backend still enforces everything.

## Screens

**Entry:** role chooser `/`, `/admin-login`, `/employee-login`.

**Admin tabs** — Dashboard (+Manage grid), Staff, Clock, Leaves, Payroll.
Hidden routes: `staff/add`, `staff/[id]` (call/email/deactivate/documents),
`payroll/run`, `approvals`, `regs`, `tickets`, `exits`, `holidays`, `announcements`,
`audit` (admin-only), `comp` (loans + salary), `shifts`, `leave-types`.

**Employee tabs** — Home (+Services grid), Attendance (one-button punch), Leaves
(balances + withdraw), Payroll (statutory breakdown + PDF payslip), Profile
(live data, sign-out, app-lock toggle).
Hidden routes: `apply-leave` (real date pickers, quota-aware types), `announcements`
(+poll voting), `holidays`, `regularization`, `loans`, `tickets`, `exit`, `documents`,
`team` (manager approvals for direct reports).

## Environment

| Var | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL. Android emulator → `http://10.0.2.2:8000` (auto); physical phone → `http://<PC-LAN-IP>:8000` (via `.env`) |
