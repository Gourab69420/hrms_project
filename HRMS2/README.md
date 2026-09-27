# HRMS2 — Human Resource Management System API

A backend REST API built with **FastAPI** and **PostgreSQL** with JWT authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Database | PostgreSQL (port 5433) |
| ORM | SQLAlchemy |
| Auth | JWT (python-jose) |
| Password Hashing | bcrypt |
| Server | Uvicorn |

---

## Project Structure

```
HRMS2/
├── main.py                  # App entry point, registers all routers
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
└── app/
    ├── database.py          # DB connection and session
    ├── models.py            # SQLAlchemy table models
    ├── schemas.py           # Pydantic request/response schemas
    ├── auth.py              # JWT logic, password hashing, role guards
    └── routers/
        ├── auth.py          # Register, login, me
        ├── departments.py   # Department CRUD
        ├── employees.py     # Employee CRUD
        ├── attendance.py    # Attendance tracking
        ├── leaves.py        # Leave management
        └── payroll.py       # Payroll management
```

---

## Database Tables

| Table | Description |
|---|---|
| `users` | Login accounts with roles |
| `employees` | Employee profiles |
| `departments` | Company departments |
| `attendances` | Daily attendance records |
| `leaves` | Leave applications |
| `payrolls` | Monthly payroll records |

---

## Roles & Permissions

| Role | Permissions |
|---|---|
| `admin` | Full access to everything |
| `hr` | Full access except delete employee/payroll |
| `employee` | View own data, apply/cancel own leaves |

---

## Environment Variables (`.env`)

```
DATABASE_URL=postgresql+psycopg://postgres:1234@localhost:5433/HRMS
SECRET_KEY=supersecretkey_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

## How to Run

```bash
cd /Users/Vexthorn/Desktop/HRMS2
source venv/bin/activate
python3 -m uvicorn main:app --reload
```

API docs available at: `http://127.0.0.1:8000/docs`

---

## API Endpoints

### Auth — `/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login and get JWT token |
| GET | `/auth/me` | Authenticated | Get current logged-in user |

**Register body:**
```json
{
  "username": "Diptokrit",
  "password": "1234",
  "role": "admin",
  "employee_id": null
}
```

---

### Departments — `/departments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/departments/` | admin, hr | Create department |
| GET | `/departments/` | Public | List all departments |
| GET | `/departments/{id}` | Public | Get department by ID |
| DELETE | `/departments/{id}` | admin, hr | Delete department |

**Create body:**
```json
{
  "name": "Engineering",
  "description": "Software team"
}
```

---

### Employees — `/employees`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/employees/` | admin, hr | Create employee |
| GET | `/employees/` | admin, hr | List all employees |
| GET | `/employees/{id}` | Authenticated | Get employee by ID |
| PATCH | `/employees/{id}` | admin, hr | Update employee |
| DELETE | `/employees/{id}` | admin only | Delete employee |

**Create body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "01700000000",
  "position": "Developer",
  "hire_date": "2024-01-01",
  "department_id": 1
}
```

---

### Attendance — `/attendance`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/attendance/` | admin, hr | Record attendance |
| GET | `/attendance/` | admin, hr | List all attendance |
| GET | `/attendance/employee/{id}` | Authenticated | Get employee attendance |
| DELETE | `/attendance/{id}` | admin, hr | Delete record |

**Create body:**
```json
{
  "employee_id": 1,
  "date": "2024-01-15",
  "check_in": "2024-01-15T09:00:00",
  "check_out": "2024-01-15T17:00:00",
  "status": "present",
  "notes": ""
}
```

Attendance status options: `present`, `absent`, `late`, `half_day`

---

### Leaves — `/leaves`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/leaves/` | Authenticated | Apply for leave |
| GET | `/leaves/my` | Authenticated | View own leaves |
| GET | `/leaves/` | admin, hr | List all leaves |
| DELETE | `/leaves/{id}` | Authenticated | Cancel own pending leave |
| PATCH | `/leaves/{id}/status` | admin, hr | Approve or reject leave |

**Apply body:**
```json
{
  "leave_type": "sick",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "reason": "Fever"
}
```

**Approve/Reject body:**
```json
{
  "status": "approved"
}
```

Leave status options: `pending`, `approved`, `rejected`

> Employees can only cancel leaves that are still `pending`. Once reviewed, deletion is blocked.

---

### Payroll — `/payroll`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/payroll/` | admin, hr | Create payroll record |
| GET | `/payroll/` | admin, hr | List all payrolls |
| GET | `/payroll/employee/{id}` | Authenticated | Get employee payroll |
| DELETE | `/payroll/{id}` | admin only | Delete payroll record |

**Create body:**
```json
{
  "employee_id": 1,
  "month": 1,
  "year": 2024,
  "basic_salary": 50000,
  "bonuses": 5000,
  "deductions": 2000
}
```

> `net_salary` is auto-calculated as `basic_salary + bonuses - deductions`

---

## Correct Usage Order

1. Register an `admin` user (no `employee_id`)
2. Login and authorize in Swagger (🔒 button)
3. Create a department
4. Create an employee (linked to department)
5. Register employee users with their `employee_id`
6. Record attendance, manage leaves, generate payroll

---

## Dependencies (`requirements.txt`)

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy>=2.0.36
psycopg[binary]>=3.2.10
python-jose[cryptography]==3.3.0
bcrypt==4.0.1
python-multipart==0.0.9
python-dotenv==1.0.1
alembic==1.13.1
email-validator==2.1.1
```
