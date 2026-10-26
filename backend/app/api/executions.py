import asyncio
import json
from typing import List, Tuple, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.workspace import Workspace
from app.models.workflow import Workflow
from app.models.execution import WorkflowExecution, NodeExecution
from app.schemas.execution import (
    ExecutionResponse,
    ExecutionSummaryResponse,
    NodeExecutionResponse,
)
from app.api.deps import get_current_workspace

router = APIRouter(prefix="/executions", tags=["Executions"])


@router.get("", response_model=List[ExecutionSummaryResponse])
def list_executions(
    workflow_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    query = db.query(
        WorkflowExecution, Workflow.name.label("workflow_name")
    ).join(Workflow, Workflow.id == WorkflowExecution.workflow_id).filter(
        WorkflowExecution.workspace_id == ws.id
    )

    if workflow_id:
        query = query.filter(WorkflowExecution.workflow_id == workflow_id)
    if status_filter:
        query = query.filter(WorkflowExecution.status == status_filter)

    records = query.order_by(WorkflowExecution.created_at.desc()).limit(limit).all()

    results = []
    for exec_record, wf_name in records:
        results.append(ExecutionSummaryResponse(
            id=exec_record.id,
            workspace_id=exec_record.workspace_id,
            workflow_id=exec_record.workflow_id,
            workflow_name=wf_name,
            status=exec_record.status,
            trigger_type=exec_record.trigger_type,
            started_at=exec_record.started_at,
            completed_at=exec_record.completed_at,
            duration_seconds=exec_record.duration_seconds,
            error_message=exec_record.error_message,
            total_tokens=exec_record.total_tokens,
            created_at=exec_record.created_at
        ))
    return results


@router.get("/{execution_id}", response_model=ExecutionResponse)
def get_execution_detail(
    execution_id: str,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    exec_record = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.workspace_id == ws.id
    ).first()

    if not exec_record:
        raise HTTPException(status_code=404, detail="Execution not found")

    return exec_record


@router.post("/{execution_id}/cancel", response_model=ExecutionResponse)
def cancel_execution(
    execution_id: str,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    exec_record = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.workspace_id == ws.id
    ).first()

    if not exec_record:
        raise HTTPException(status_code=404, detail="Execution not found")

    if exec_record.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel execution in '{exec_record.status}' state.")

    exec_record.status = "cancelled"
    exec_record.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(exec_record)
    return exec_record


@router.get("/{execution_id}/stream")
async def stream_execution_updates(
    execution_id: str,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace)
):
    """Server-Sent Events endpoint streaming real-time execution status."""
    ws, _ = ws_role

    async def event_generator():
        last_status = None
        for _ in range(30):  # poll up to 30 seconds
            db = SessionLocal()
            try:
                exec_record = db.query(WorkflowExecution).filter(
                    WorkflowExecution.id == execution_id,
                    WorkflowExecution.workspace_id == ws.id
                ).first()

                if not exec_record:
                    yield f"data: {json.dumps({'error': 'Execution not found'})}\n\n"
                    break

                nodes = [
                    {
                        "node_id": ne.node_id,
                        "node_name": ne.node_name,
                        "status": ne.status,
                        "duration_ms": ne.duration_ms,
                        "outputs": ne.outputs
                    }
                    for ne in exec_record.node_executions
                ]

                payload = {
                    "execution_id": exec_record.id,
                    "status": exec_record.status,
                    "duration_seconds": exec_record.duration_seconds,
                    "nodes": nodes
                }

                yield f"data: {json.dumps(payload)}\n\n"

                if exec_record.status in ("completed", "failed", "cancelled"):
                    break
            finally:
                db.close()

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
