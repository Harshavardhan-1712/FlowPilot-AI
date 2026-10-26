from app.models.workflow import Workflow
from app.models.approval import ApprovalRequest


def test_workflow_execution_and_approval_cycle(client, auth_headers, db_session):
    # 1. Fetch demo workflow
    wf = db_session.query(Workflow).filter(Workflow.name == "Customer Feedback Intelligence").first()
    assert wf is not None

    # 2. Trigger workflow execution
    trigger_payload = {
        "trigger_data": {
            "ticket_text": "Customer was double billed for $1,200 on invoice #INV-999. Immediate refund requested."
        }
    }
    exec_res = client.post(f"/api/v1/workflows/{wf.id}/execute", json=trigger_payload, headers=auth_headers)
    assert exec_res.status_code == 201
    exec_data = exec_res.json()
    exec_id = exec_data["id"]

    # 3. Verify execution paused at Human Approval Gate
    assert exec_data["status"] == "waiting_for_approval"

    # Verify node executions exist and approval node is waiting
    node_execs = exec_data["node_executions"]
    assert len(node_execs) >= 4
    approval_node = next(ne for ne in node_execs if ne["node_type"] == "humanApproval")
    assert approval_node["status"] == "waiting_for_approval"

    # 4. Check approval queue
    app_res = client.get("/api/v1/approvals", headers=auth_headers)
    assert app_res.status_code == 200
    approvals = app_res.json()
    assert len(approvals) >= 1
    target_approval = next(a for a in approvals if a["execution_id"] == exec_id)
    assert target_approval["status"] == "pending"

    # 5. Approve the action
    decision_res = client.post(
        f"/api/v1/approvals/{target_approval['id']}/decision",
        json={"decision": "approved", "reviewer_notes": "Verified billing discrepancy and approved refund."},
        headers=auth_headers
    )
    assert decision_res.status_code == 200
    decided_app = decision_res.json()
    assert decided_app["status"] == "approved"

    # 6. Verify execution resumed and completed!
    resumed_res = client.get(f"/api/v1/executions/{exec_id}", headers=auth_headers)
    assert resumed_res.status_code == 200
    resumed_data = resumed_res.json()
    assert resumed_data["status"] == "completed"
    assert resumed_data["duration_seconds"] is not None
    assert resumed_data["total_tokens"] > 0
