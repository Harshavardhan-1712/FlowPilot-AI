import {
  User,
  Workspace,
  Workflow,
  WorkflowDefinition,
  WorkflowValidationResult,
  WorkflowGenerateResponse,
  WorkflowExecution,
  KnowledgeDocument,
  DocumentSearchResult,
  ApprovalRequest,
  DashboardMetrics,
  AuditLog
} from './types';

const API_BASE = '/api/v1';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('flowpilot_token');
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('flowpilot_token', token);
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('flowpilot_token');
  localStorage.removeItem('flowpilot_active_workspace');
}

export function getStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('flowpilot_active_workspace');
}

export function setStoredWorkspaceId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('flowpilot_active_workspace', id);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const wsId = getStoredWorkspaceId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (wsId) {
    headers['X-Workspace-Id'] = wsId;
  }

  // Handle FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearStoredToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

// Auth API
export const api = {
  // Authentication
  login: (email: string, password: string) =>
    request<{ access_token: string; email: string; user_id: string; active_workspace_id: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  register: (data: { email: string; password: string; full_name?: string; workspace_name?: string }) =>
    request<{ access_token: string; email: string; user_id: string; active_workspace_id: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  getMe: () => request<{ user: User; workspaces: Workspace[] }>('/auth/me'),

  // Workspaces
  listWorkspaces: () => request<Workspace[]>('/workspaces'),
  createWorkspace: (data: { name: string; description?: string }) =>
    request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentWorkspace: () => request<Workspace>('/workspaces/current'),
  listWorkspaceMembers: (workspaceId: string) =>
    request<Array<{ id: string; user_id: string; email: string; full_name: string | null; role: string; created_at: string }>>(
      `/workspaces/${workspaceId}/members`
    ),
  addWorkspaceMember: (workspaceId: string, email: string, role: string) =>
    request<{ message: string }>(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  // Workflows
  listWorkflows: () => request<Workflow[]>('/workflows'),
  getWorkflow: (id: string) => request<Workflow>(`/workflows/${id}`),
  createWorkflow: (data: { name: string; description?: string; definition?: WorkflowDefinition }) =>
    request<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkflow: (
    id: string,
    data: { name?: string; description?: string; status?: string; definition?: WorkflowDefinition; changelog?: string }
  ) => request<Workflow>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkflow: (id: string) => request<{ message: string }>(`/workflows/${id}`, { method: 'DELETE' }),
  validateWorkflow: (definition: WorkflowDefinition) =>
    request<WorkflowValidationResult>('/workflows/validate', { method: 'POST', body: JSON.stringify(definition) }),
  generateWorkflowPlan: (prompt: string, constraints?: Record<string, any>) =>
    request<WorkflowGenerateResponse>('/workflows/generate-plan', {
      method: 'POST',
      body: JSON.stringify({ prompt, constraints }),
    }),
  executeWorkflow: (workflowId: string, triggerData: Record<string, any> = {}) =>
    request<WorkflowExecution>(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ trigger_data: triggerData }),
    }),

  // Executions
  listExecutions: (workflowId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (workflowId) params.append('workflow_id', workflowId);
    if (status) params.append('status', status);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request<WorkflowExecution[]>(`/executions${q}`);
  },
  getExecution: (id: string) => request<WorkflowExecution>(`/executions/${id}`),
  cancelExecution: (id: string) => request<WorkflowExecution>(`/executions/${id}/cancel`, { method: 'POST' }),

  // Approvals
  listApprovals: (status: string = 'pending') =>
    request<ApprovalRequest[]>(`/approvals?status_filter=${status}`),
  submitApprovalDecision: (approvalId: string, decision: 'approved' | 'rejected', reviewerNotes?: string) =>
    request<ApprovalRequest>(`/approvals/${approvalId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reviewer_notes: reviewerNotes }),
    }),

  // Knowledge Base
  listDocuments: () => request<KnowledgeDocument[]>('/knowledge/documents'),
  uploadDocument: (file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    return request<KnowledgeDocument>('/knowledge/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },
  searchKnowledgeBase: (query: string, topK: number = 4) =>
    request<DocumentSearchResult[]>('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK, min_score: 0.1 }),
    }),
  deleteDocument: (id: string) =>
    request<{ message: string }>(`/knowledge/documents/${id}`, { method: 'DELETE' }),

  // Analytics & Logs
  getDashboardMetrics: () => request<DashboardMetrics>('/analytics/dashboard'),
  getAuditLogs: (limit: number = 50) => request<AuditLog[]>(`/analytics/audit-logs?limit=${limit}`),
};
