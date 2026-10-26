import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import bcrypt
import jwt
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def register_user_with_workspace(
    db: Session, email: str, password: str, full_name: Optional[str] = None, workspace_name: Optional[str] = None
) -> Tuple[User, Workspace]:
    # Check if user already exists
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise ValueError("User with this email already exists")

    # Create user
    user = User(
        email=email.lower(),
        hashed_password=hash_password(password),
        full_name=full_name or email.split("@")[0].capitalize(),
    )
    db.add(user)
    db.flush()

    # Create default workspace
    ws_name = workspace_name or f"{user.full_name}'s Workspace"
    base_slug = ws_name.lower().replace(" ", "-").replace("'", "")
    slug = f"{base_slug}-{int(time.time())}"
    
    workspace = Workspace(
        name=ws_name,
        slug=slug,
        description="Default workspace for agentic workflows",
    )
    db.add(workspace)
    db.flush()

    # Create admin membership
    membership = WorkspaceMembership(
        workspace_id=workspace.id,
        user_id=user.id,
        role="admin"
    )
    db.add(membership)
    db.commit()
    db.refresh(user)
    db.refresh(workspace)

    return user, workspace
