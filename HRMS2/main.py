from fastapi import FastAPI
from app.database import engine, Base
from app.routers import auth, departments, employees, attendance, leaves, payroll, dashboard
from app.routers import leave_types, holidays, shifts, documents, comms, regularization, loans, tickets, audits
from app.routers import alerts

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HRMS API", version="1.0.0")

app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(leaves.router)
app.include_router(payroll.router)
app.include_router(dashboard.router)
app.include_router(leave_types.router)
app.include_router(holidays.router)
app.include_router(shifts.router)
app.include_router(documents.router)
app.include_router(comms.router)
app.include_router(regularization.router)
app.include_router(loans.router)
app.include_router(tickets.router)
app.include_router(audits.router)
app.include_router(alerts.router)


@app.get("/")
def root():
    return {"message": "HRMS API is running"}
