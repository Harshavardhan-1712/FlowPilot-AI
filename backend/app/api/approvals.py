from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workflow import Workflow
from app.models.execution import WorkflowExecution
from app.models.approval import ApprovalRequest
from app.schemas.approval import ApprovalResponse, ApprovalDecisionRequest
from app.api.deps import get_current_user, get_current_workspace
from app.services.approval_service import decide_approval
from app.services.workflow_executor import WorkflowExecutionEngine

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("", response_model=List[ApprovalResponse])
def list_approvals(
    status_filter: str = "pending",
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    query = db.query(ApprovalRequest).filter(
        ApprovalRequest.workspace_id == ws.id
    )
    if status_filter:
        query = query.filter(ApprovalRequest.status == status_filter)

    approvals = query.order_by(ApprovalRequest.created_at.desc()).all()

    results = []
    for app in approvals:
        wf_name = None
        wf_id = None
        if app.execution:
            wf_id = app.execution.workflow_id
            wf = db.query(Workflow).filter(Workflow.id == wf_id).first()
            if wf:
                wf_name = wf.name

        results.append(ApprovalResponse(
            id=app.id,
            workspace_id=app.workspace_id,
            execution_id=app.execution_id,
            node_id=app.node_id,
            action_name=app.action_name,
            action_summary=app.action_summary,
            proposed_payload=app.proposed_payload,
            status=app.status,
            reviewed_by_user_id=app.reviewed_by_user_id,
            reviewer_notes=app.reviewer_notes,
            expires_at=app.expires_at,
            created_at=app.created_at,
            workflow_id=wf_id,
            workflow_name=wf_name
        ))
    return results


@router.post("/{approval_id}/decision", response_model=ApprovalResponse)
def submit_approval_decision(
    approval_id: str,
    req: ApprovalDecisionRequest,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws, role = ws_role
    if role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot approve or reject actions.")

    try:
        approval, execution = decide_approval(
            db=db,
            approval_id=approval_id,
            workspace_id=ws.id,
            user_id=user.id,
            decision=req.decision,
            reviewer_notes=req.reviewer_notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # If approved, resume the execution state machine!
    if req.decision == "approved" and execution:
        engine = WorkflowExecutionEngine(db=db, execution_id=execution.id)
        engine.run(resume_node_id=approval.node_id)
        db.refresh(approval)

    return ApprovalResponse(
        id=approval.id,
        workspace_id=approval.workspace_id,
        execution_id=approval.execution_id,
        node_id=approval.node_id,
        action_name=approval.action_name,
        action_summary=approval.action_summary,
        proposed_payload=approval.proposed_payload,
        status=approval.status,
        reviewed_by_user_id=approval.reviewed_by_user_id,
        reviewer_notes=approval.reviewer_notes,
        expires_at=approval.expires_at,
        created_at=approval.created_at
    )
