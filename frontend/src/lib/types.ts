export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: string;
  created_at: string;
}

export interface AuthSession {
  token: string;
  user: User;
  activeWorkspaceId: string | null;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string | null;
  data?: Record<string, any> | null;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: Record<string, any> | null;
}

export interface Workflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  current_version: number;
  created_at: string;
  updated_at: string;
  definition?: WorkflowDefinition;
  total_executions?: number;
  last_execution_status?: string | null;
  last_execution_at?: string | null;
}

export interface WorkflowValidationIssue {
  type: 'error' | 'warning';
  node_id?: string | null;
  message: string;
}

export interface WorkflowValidationResult {
  is_valid: boolean;
  issues: WorkflowValidationIssue[];
}

export interface WorkflowGenerateResponse {
  suggested_name: string;
  suggested_description: string;
  explanation: string;
  definition: WorkflowDefinition;
  is_valid: boolean;
  validation_issues: WorkflowValidationIssue[];
}

export interface NodeExecution {
  id: string;
  node_id: string;
  node_type: string;
  node_name?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting_for_approval';
  inputs?: Record<string, any> | null;
  outputs?: Record<string, any> | null;
  error_message?: string | null;
  retry_count: number;
  duration_ms: number;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface WorkflowExecution {
  id: string;
  workspace_id: string;
  workflow_id: string;
  workflow_name?: string;
  workflow_version_id?: string | null;
  status: 'pending' | 'running' | 'waiting_for_approval' | 'completed' | 'failed' | 'cancelled';
  trigger_type: string;
  trigger_data: Record<string, any>;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number | null;
  error_message?: string | null;
  total_tokens: number;
  cost_estimate: number;
  trace_id: string;
  created_at: string;
  node_executions: NodeExecution[];
}

export interface KnowledgeDocument {
  id: string;
  workspace_id: string;
  title: string;
  filename: string;
  content_type: string;
  file_size: number;
  status: 'processing' | 'indexed' | 'failed';
  chunk_count: number;
  error_message?: string | null;
  created_at: string;
}

export interface DocumentSearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  score: number;
  chunk_index: number;
}

export interface ApprovalRequest {
  id: string;
  workspace_id: string;
  execution_id: string;
  node_id: string;
  action_name: string;
  action_summary: string;
  proposed_payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewed_by_user_id?: string | null;
  reviewer_notes?: string | null;
  expires_at?: string | null;
  created_at: string;
  workflow_id?: string | null;
  workflow_name?: string | null;
}

export interface DashboardMetrics {
  total_workflows: number;
  active_workflows: number;
  executions_today: number;
  successful_executions: number;
  failed_executions: number;
  avg_duration_seconds: number;
  pending_approvals: number;
  activity_timeline: Array<{
    date: string;
    total: number;
    successful: number;
    failed: number;
  }>;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details: Record<string, any>;
  ip_address?: string | null;
  timestamp: string;
}
