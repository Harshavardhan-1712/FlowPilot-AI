from sqlalchemy import Column, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ApprovalRequest(Base, TimestampMixin):
    __tablename__ = "approval_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    execution_id = Column(String(36), ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(100), nullable=False)
    action_name = Column(String(255), nullable=False)
    action_summary = Column(Text, nullable=False)
    proposed_payload = Column(JSON, default=dict, nullable=False)

    # Status: pending, approved, rejected, expired
    status = Column(String(50), default="pending", nullable=False, index=True)
    reviewed_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    workspace = relationship("Workspace", back_populates="approvals")
    execution = relationship("WorkflowExecution", back_populates="approvals")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id])
