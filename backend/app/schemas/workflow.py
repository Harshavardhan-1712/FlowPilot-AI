from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict


class NodePosition(BaseModel):
    x: float
    y: float


class WorkflowNode(BaseModel):
    id: str
    type: str  # e.g., "manualTrigger", "ragSearch", "llmPrompt", "conditionalBranch", "humanApproval", etc.
    position: NodePosition
    data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    label: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class WorkflowDefinition(BaseModel):
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    viewport: Optional[Dict[str, Any]] = None


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    definition: Optional[WorkflowDefinition] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(draft|active|archived)$")
    definition: Optional[WorkflowDefinition] = None
    changelog: Optional[str] = None


class WorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    status: str
    current_version: int
    created_at: datetime
    updated_at: datetime


class WorkflowDetailResponse(WorkflowResponse):
    definition: WorkflowDefinition
    total_executions: int = 0
    last_execution_status: Optional[str] = None
    last_execution_at: Optional[datetime] = None


class WorkflowValidationIssue(BaseModel):
    type: str  # "error", "warning"
    node_id: Optional[str] = None
    message: str


class WorkflowValidationResult(BaseModel):
    is_valid: bool
    issues: List[WorkflowValidationIssue] = Field(default_factory=list)


class WorkflowGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, description="Natural language description of desired workflow")
    constraints: Optional[Dict[str, Any]] = None


class WorkflowGenerateResponse(BaseModel):
    suggested_name: str
    suggested_description: str
    explanation: str
    definition: WorkflowDefinition
    is_valid: bool
    validation_issues: List[WorkflowValidationIssue] = Field(default_factory=list)
