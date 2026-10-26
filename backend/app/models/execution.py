from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class WorkflowExecution(Base, TimestampMixin):
    __tablename__ = "workflow_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_id = Column(String(36), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_version_id = Column(String(36), ForeignKey("workflow_versions.id", ondelete="SET NULL"), nullable=True)
    
    # Status: pending, running, waiting_for_approval, completed, failed, cancelled
    status = Column(String(50), default="pending", nullable=False, index=True)
    trigger_type = Column(String(50), default="manual", nullable=False)
    trigger_data = Column(JSON, default=dict, nullable=False)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    total_tokens = Column(Integer, default=0, nullable=False)
    cost_estimate = Column(Float, default=0.0, nullable=False)
    trace_id = Column(String(64), default=generate_uuid, index=True, nullable=False)

    workspace = relationship("Workspace", back_populates="executions")
    workflow = relationship("Workflow", back_populates="executions")
    node_executions = relationship("NodeExecution", back_populates="execution", cascade="all, delete-orphan", order_by="NodeExecution.started_at")
    approvals = relationship("ApprovalRequest", back_populates="execution", cascade="all, delete-orphan")


class NodeExecution(Base, TimestampMixin):
    __tablename__ = "node_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    execution_id = Column(String(36), ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(100), nullable=False)  # Node ID in graph (e.g. "node-1")
    node_type = Column(String(100), nullable=False)
    node_name = Column(String(255), nullable=True)

    # Status: pending, running, completed, failed, skipped, waiting_for_approval
    status = Column(String(50), default="pending", nullable=False)
    inputs = Column(JSON, default=dict, nullable=True)
    outputs = Column(JSON, default=dict, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    duration_ms = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    execution = relationship("WorkflowExecution", back_populates="node_executions")
