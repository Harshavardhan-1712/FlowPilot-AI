from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ExecutionTriggerRequest(BaseModel):
    trigger_data: Dict[str, Any] = Field(default_factory=dict)


class NodeExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    node_id: str
    node_type: str
    node_name: Optional[str] = None
    status: str
    inputs: Optional[Dict[str, Any]] = None
    outputs: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    retry_count: int
    duration_ms: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    workflow_id: str
    workflow_version_id: Optional[str] = None
    status: str
    trigger_type: str
    trigger_data: Dict[str, Any]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    total_tokens: int
    cost_estimate: float
    trace_id: str
    created_at: datetime
    node_executions: List[NodeExecutionResponse] = Field(default_factory=list)


class ExecutionSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    workflow_id: str
    workflow_name: str
    status: str
    trigger_type: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    total_tokens: int
    created_at: datetime
