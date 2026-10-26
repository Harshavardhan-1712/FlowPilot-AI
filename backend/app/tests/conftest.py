import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.seed import seed_database
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership
from app.services.auth_service import create_access_token

TEST_DATABASE_URL = "sqlite:///./test_flowpilot.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(db_session):
    user = db_session.query(User).filter(User.email == "admin@flowpilot.ai").first()
    ws = db_session.query(Workspace).filter(Workspace.slug == "flowpilot-enterprise-demo").first()
    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "workspace_id": ws.id
    })
    return {
        "Authorization": f"Bearer {token}",
        "X-Workspace-Id": ws.id
    }
