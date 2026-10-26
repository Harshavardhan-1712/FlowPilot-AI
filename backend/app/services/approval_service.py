from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.approval import ApprovalRequest
from app.models.execution import WorkflowExecution, NodeExecution


def create_approval_request(
    db: Session,
    workspace_id: str,
    execution_id: str,
    node_id: str,
    action_name: str,
    action_summary: str,
    proposed_payload: Dict[str, Any]
) -> ApprovalRequest:
    approval = ApprovalRequest(
        workspace_id=workspace_id,
        execution_id=execution_id,
        node_id=node_id,
        action_name=action_name,
        action_summary=action_summary,
        proposed_payload=proposed_payload,
        status="pending"
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval


def decide_approval(
    db: Session,
    approval_id: str,
    workspace_id: str,
    user_id: str,
    decision: str,  # "approved" or "rejected"
    reviewer_notes: Optional[str] = None
) -> Tuple[ApprovalRequest, WorkflowExecution]:
    approval = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == approval_id,
        ApprovalRequest.workspace_id == workspace_id
    ).first()

    if not approval:
        raise ValueError("Approval request not found.")

    if approval.status != "pending":
        raise ValueError(f"Approval request is already in '{approval.status}' state.")

    approval.status = decision
    approval.reviewed_by_user_id = user_id
    approval.reviewer_notes = reviewer_notes
    approval.updated_at = datetime.now(timezone.utc)

    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == approval.execution_id
    ).first()

    if not execution:
        db.commit()
        return approval, None

    if decision == "rejected":
        execution.status = "failed"
        execution.error_message = f"Execution rejected by reviewer: {reviewer_notes or 'No reason provided'}"
        execution.completed_at = datetime.now(timezone.utc)
        
        node_exec = db.query(NodeExecution).filter(
            NodeExecution.execution_id == execution.id,
            NodeExecution.node_id == approval.node_id
        ).first()
        if node_exec:
            node_exec.status = "failed"
            node_exec.error_message = "Rejected by human reviewer"
            node_exec.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(approval)
    db.refresh(execution)
    return approval, execution
