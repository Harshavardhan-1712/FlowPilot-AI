from app.models.workspace import Workspace
from app.services.auth_service import register_user_with_workspace, create_access_token


def test_cross_workspace_access_denial(client, db_session):
    # Create two separate users with distinct workspaces
    u1, ws1 = register_user_with_workspace(
        db=db_session,
        email="tenant1@example.com",
        password="Password123456!",
        full_name="Tenant One"
    )
    u2, ws2 = register_user_with_workspace(
        db=db_session,
        email="tenant2@example.com",
        password="Password123456!",
        full_name="Tenant Two"
    )

    # Token for Tenant 1
    t1_token = create_access_token({"sub": u1.id, "email": u1.email, "workspace_id": ws1.id})

    # Tenant 1 attempts to query with Tenant 2's workspace ID in header
    malicious_headers = {
        "Authorization": f"Bearer {t1_token}",
        "X-Workspace-Id": ws2.id  # Trying to access Tenant 2's workspace!
    }

    res = client.get("/api/v1/workflows", headers=malicious_headers)
    # Must be rejected with 403 Forbidden!
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_list_user_workspaces(client, auth_headers):
    res = client.get("/api/v1/workspaces", headers=auth_headers)
    assert res.status_code == 200
    workspaces = res.json()
    assert len(workspaces) >= 1
    assert any(w["slug"] == "flowpilot-enterprise-demo" for w in workspaces)
