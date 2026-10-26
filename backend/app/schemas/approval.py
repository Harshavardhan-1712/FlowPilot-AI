from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    execution_id: str
    node_id: str
    action_name: str
    action_summary: str
    proposed_payload: Dict[str, Any]
    status: str
    reviewed_by_user_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    workflow_id: Optional[str] = None
    workflow_name: Optional[str] = None


class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(approved|rejected)$")
    reviewer_notes: Optional[str] = None
