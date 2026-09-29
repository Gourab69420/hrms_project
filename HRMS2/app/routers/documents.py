import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.audit import log
from app.auth import get_current_user, require_roles
from app.models import RoleEnum
from app.permissions import is_privileged

router = APIRouter(prefix="/documents", tags=["Documents"])
hr_admin = require_roles(RoleEnum.admin, RoleEnum.hr)

STORE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "docs")
os.makedirs(STORE, exist_ok=True)

ALLOWED = {"pdf", "jpg", "jpeg", "png", "doc", "docx"}


@router.post("/employee/{emp_id}", response_model=schemas.DocumentOut, status_code=201)
def upload_doc(
    emp_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not is_privileged(current_user) and emp_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"Allowed: {', '.join(sorted(ALLOWED))}")
    name = f"{emp_id}_{uuid.uuid4().hex}.{ext}"
    path = os.path.join(STORE, name)
    with open(path, "wb") as f:
        f.write(file.file.read())
    obj = models.Document(
        employee_id=emp_id, doc_type=doc_type, file_name=file.filename or name,
        file_path=path, uploaded_by=current_user.id,
    )
    db.add(obj)
    db.flush()
    log(db, "document.upload", "document", obj.id, current_user.id, f"emp={emp_id} type={doc_type}")
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/employee/{emp_id}", response_model=List[schemas.DocumentOut])
def list_docs(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not is_privileged(current_user) and emp_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return db.query(models.Document).filter(models.Document.employee_id == emp_id).order_by(models.Document.id.desc()).all()


@router.get("/{doc_id}/download")
def download_doc(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Document not found")
    if not is_privileged(current_user) and obj.employee_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return FileResponse(obj.file_path, filename=obj.file_name)


@router.delete("/{doc_id}", status_code=204, dependencies=[Depends(hr_admin)])
def delete_doc(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    obj = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        os.remove(obj.file_path)
    except OSError:
        pass
    log(db, "document.delete", "document", doc_id, current_user.id)
    db.delete(obj)
    db.commit()
