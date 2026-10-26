from datetime import datetime, timedelta, timezone
from typing import List, Tuple
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.workspace import Workspace
from app.models.workflow import Workflow
from app.models.execution import WorkflowExecution
from app.models.approval import ApprovalRequest
from app.models.audit import AuditLog
from app.schemas.analytics import (
    DashboardMetricsResponse,
    DailyExecutionStat,
    AuditLogResponse,
)
from app.api.deps import get_current_workspace

router = APIRouter(prefix="/analytics", tags=["Analytics & Governance"])


@router.get("/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_wf = db.query(Workflow).filter(Workflow.workspace_id == ws.id).count()
    active_wf = db.query(Workflow).filter(Workflow.workspace_id == ws.id, Workflow.status == "active").count()

    today_execs = db.query(WorkflowExecution).filter(
        WorkflowExecution.workspace_id == ws.id,
        WorkflowExecution.created_at >= today_start
    ).count()

    success_execs = db.query(WorkflowExecution).filter(
        WorkflowExecution.workspace_id == ws.id,
        WorkflowExecution.status == "completed"
    ).count()

    failed_execs = db.query(WorkflowExecution).filter(
        WorkflowExecution.workspace_id == ws.id,
        WorkflowExecution.status == "failed"
    ).count()

    avg_duration_row = db.query(func.avg(WorkflowExecution.duration_seconds)).filter(
        WorkflowExecution.workspace_id == ws.id,
        WorkflowExecution.duration_seconds.isnot(None)
    ).scalar()
    avg_duration = round(float(avg_duration_row), 2) if avg_duration_row else 0.0

    pending_approvals = db.query(ApprovalRequest).filter(
        ApprovalRequest.workspace_id == ws.id,
        ApprovalRequest.status == "pending"
    ).count()

    # Calculate past 7 days activity timeline
    timeline = []
    for day_offset in range(6, -1, -1):
        day_date = (now - timedelta(days=day_offset)).date()
        start = datetime(day_date.year, day_date.month, day_date.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)

        total_d = db.query(WorkflowExecution).filter(
            WorkflowExecution.workspace_id == ws.id,
            WorkflowExecution.created_at >= start,
            WorkflowExecution.created_at < end
        ).count()

        success_d = db.query(WorkflowExecution).filter(
            WorkflowExecution.workspace_id == ws.id,
            WorkflowExecution.status == "completed",
            WorkflowExecution.created_at >= start,
            WorkflowExecution.created_at < end
        ).count()

        failed_d = db.query(WorkflowExecution).filter(
            WorkflowExecution.workspace_id == ws.id,
            WorkflowExecution.status == "failed",
            WorkflowExecution.created_at >= start,
            WorkflowExecution.created_at < end
        ).count()

        timeline.append(DailyExecutionStat(
            date=day_date.strftime("%b %d"),
            total=total_d,
            successful=success_d,
            failed=failed_d
        ))

    return DashboardMetricsResponse(
        total_workflows=total_wf,
        active_workflows=active_wf,
        executions_today=today_execs,
        successful_executions=success_execs,
        failed_executions=failed_execs,
        avg_duration_seconds=avg_duration,
        pending_approvals=pending_approvals,
        activity_timeline=timeline
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    logs = db.query(AuditLog).filter(
        AuditLog.workspace_id == ws.id
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
