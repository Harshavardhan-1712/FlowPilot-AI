from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.workspace import WorkspaceMembership, Workspace
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    WorkspaceResponse,
)
from app.services.auth_service import (
    verify_password,
    create_access_token,
    register_user_with_workspace,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(req: UserRegister, db: Session = Depends(get_db)):
    try:
        user, workspace = register_user_with_workspace(
            db=db,
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            workspace_name=req.workspace_name
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "workspace_id": workspace.id
    })

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        active_workspace_id=workspace.id,
    )


@router.post("/login", response_model=Token)
def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    # Get user's primary workspace
    membership = db.query(WorkspaceMembership).filter(WorkspaceMembership.user_id == user.id).first()
    active_workspace_id = membership.workspace_id if membership else None

    access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "workspace_id": active_workspace_id
    })

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        active_workspace_id=active_workspace_id,
    )


@router.get("/me")
def get_current_user_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(WorkspaceMembership).filter(WorkspaceMembership.user_id == user.id).all()
    workspaces = []
    for m in memberships:
        ws = db.query(Workspace).filter(Workspace.id == m.workspace_id).first()
        if ws:
            workspaces.append({
                "id": ws.id,
                "name": ws.name,
                "slug": ws.slug,
                "description": ws.description,
                "role": m.role,
                "created_at": ws.created_at
            })

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "created_at": user.created_at
        },
        "workspaces": workspaces
    }
