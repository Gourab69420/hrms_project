from fastapi import FastAPI
from app.database import engine, Base
from app.routers import auth, departments, employees, attendance, leaves, payroll, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HRMS API", version="1.0.0")

app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(leaves.router)
app.include_router(payroll.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"message": "HRMS API is running"}
