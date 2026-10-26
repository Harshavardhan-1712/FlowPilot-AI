import time
from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership
from app.schemas.auth import (
    WorkspaceResponse,
    WorkspaceCreate,
    WorkspaceMemberAdd,
    WorkspaceMemberResponse,
)
from app.api.deps import get_current_user, get_current_workspace, require_admin

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
def list_user_workspaces(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(WorkspaceMembership).filter(WorkspaceMembership.user_id == user.id).all()
    results = []
    for m in memberships:
        ws = db.query(Workspace).filter(Workspace.id == m.workspace_id).first()
        if ws:
            results.append(WorkspaceResponse(
                id=ws.id,
                name=ws.name,
                slug=ws.slug,
                description=ws.description,
                role=m.role,
                created_at=ws.created_at
            ))
    return results


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    req: WorkspaceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    base_slug = (req.slug or req.name).lower().replace(" ", "-").replace("'", "")
    slug = f"{base_slug}-{int(time.time())}"

    ws = Workspace(name=req.name, slug=slug, description=req.description)
    db.add(ws)
    db.flush()

    membership = WorkspaceMembership(
        workspace_id=ws.id,
        user_id=user.id,
        role="admin"
    )
    db.add(membership)
    db.commit()
    db.refresh(ws)

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        description=ws.description,
        role="admin",
        created_at=ws.created_at
    )


@router.get("/current", response_model=WorkspaceResponse)
def get_active_workspace(
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace)
):
    ws, role = ws_role
    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        description=ws.description,
        role=role,
        created_at=ws.created_at
    )


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
def list_workspace_members(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify caller is a member
    caller_m = db.query(WorkspaceMembership).filter(
        WorkspaceMembership.workspace_id == workspace_id,
        WorkspaceMembership.user_id == user.id
    ).first()
    if not caller_m:
        raise HTTPException(status_code=403, detail="Access denied")

    memberships = db.query(WorkspaceMembership).filter(
        WorkspaceMembership.workspace_id == workspace_id
    ).all()

    out = []
    for m in memberships:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            out.append(WorkspaceMemberResponse(
                id=m.id,
                user_id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=m.role,
                created_at=m.created_at
            ))
    return out


@router.post("/{workspace_id}/members", status_code=status.HTTP_201_CREATED)
def add_workspace_member(
    workspace_id: str,
    req: WorkspaceMemberAdd,
    admin_check: Tuple[Workspace, str] = Depends(require_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.email == req.email.lower()).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found")

    existing = db.query(WorkspaceMembership).filter(
        WorkspaceMembership.workspace_id == workspace_id,
        WorkspaceMembership.user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    new_m = WorkspaceMembership(
        workspace_id=workspace_id,
        user_id=target_user.id,
        role=req.role
    )
    db.add(new_m)
    db.commit()
    return {"message": "Member added successfully", "user_id": target_user.id, "role": req.role}
