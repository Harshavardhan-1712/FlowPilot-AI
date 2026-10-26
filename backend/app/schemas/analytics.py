from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class DailyExecutionStat(BaseModel):
    date: str
    total: int
    successful: int
    failed: int


class DashboardMetricsResponse(BaseModel):
    total_workflows: int
    active_workflows: int
    executions_today: int
    successful_executions: int
    failed_executions: int
    avg_duration_seconds: float
    pending_approvals: int
    activity_timeline: List[DailyExecutionStat] = []


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    timestamp: datetime
