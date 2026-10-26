from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership
from app.services.auth_service import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_current_workspace(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id")
) -> Tuple[Workspace, str]:
    """
    Resolves the active workspace and verifies membership.
    Returns (Workspace, role). Enforces strict tenant isolation!
    """
    if x_workspace_id:
        membership = db.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == x_workspace_id,
            WorkspaceMembership.user_id == user.id
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have access to this workspace."
            )
        workspace = db.query(Workspace).filter(Workspace.id == x_workspace_id).first()
        return workspace, membership.role

    # Default to user's first workspace
    first_membership = db.query(WorkspaceMembership).filter(
        WorkspaceMembership.user_id == user.id
    ).first()

    if not first_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No workspace associated with this user."
        )

    workspace = db.query(Workspace).filter(Workspace.id == first_membership.workspace_id).first()
    return workspace, first_membership.role


def require_admin(
    workspace_and_role: Tuple[Workspace, str] = Depends(get_current_workspace)
) -> Tuple[Workspace, str]:
    workspace, role = workspace_and_role
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required in this workspace."
        )
    return workspace, role
