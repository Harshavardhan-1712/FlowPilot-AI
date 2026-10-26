from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.workspace import Workspace
from app.models.knowledge import KnowledgeDocument
from app.schemas.knowledge import (
    DocumentResponse,
    DocumentSearchRequest,
    DocumentSearchResult,
)
from app.api.deps import get_current_workspace
from app.services.retrieval_service import (
    ingest_document,
    search_knowledge_base,
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])


@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    docs = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.workspace_id == ws.id
    ).order_by(KnowledgeDocument.created_at.desc()).all()
    return docs


@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(None),
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, role = ws_role
    if role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot upload documents.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="File exceeds 20MB maximum size limit.")

    doc_title = title or file.filename or "Untitled Document"

    try:
        doc = ingest_document(
            db=db,
            workspace_id=ws.id,
            title=doc_title,
            filename=file.filename or "unnamed",
            content_bytes=content,
            content_type=file.content_type or "text/plain"
        )
        return doc
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to ingest document: {str(e)}")


@router.post("/search", response_model=List[DocumentSearchResult])
def search_documents(
    req: DocumentSearchRequest,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    results = search_knowledge_base(
        db=db,
        workspace_id=ws.id,
        query=req.query,
        top_k=req.top_k,
        min_score=req.min_score
    )
    return results


@router.delete("/documents/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: str,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, role = ws_role
    if role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete documents.")

    doc = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.id == document_id,
        KnowledgeDocument.workspace_id == ws.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
