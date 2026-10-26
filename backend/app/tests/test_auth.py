from app.seed import DEMO_USER_EMAIL, DEMO_USER_PASSWORD


def test_health_check(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "FlowPilot AI"


def test_login_success(client):
    res = client.post("/api/v1/auth/login", json={
        "email": DEMO_USER_EMAIL,
        "password": DEMO_USER_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["email"] == DEMO_USER_EMAIL
    assert data["active_workspace_id"] is not None


def test_login_invalid_password(client):
    res = client.post("/api/v1/auth/login", json={
        "email": DEMO_USER_EMAIL,
        "password": "wrong_password_123"
    })
    assert res.status_code == 401


def test_user_registration(client):
    new_email = "developer@enterprise.io"
    res = client.post("/api/v1/auth/register", json={
        "email": new_email,
        "password": "ComplexPassword2026!",
        "full_name": "Test Engineer",
        "workspace_name": "Engineering Workspace"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == new_email
    assert "access_token" in data
    assert data["active_workspace_id"] is not None


def test_get_current_user(client, auth_headers):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == DEMO_USER_EMAIL
    assert len(data["workspaces"]) >= 1
