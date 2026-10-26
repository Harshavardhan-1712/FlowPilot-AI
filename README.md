# FlowPilot AI — Agentic Workflow Automation Platform

> A production-style, full-stack enterprise platform that interprets business tasks in natural language, synthesizes structured DAG workflows, executes approved actions via AI and external integrations, and provides real-time observability and human-in-the-loop governance.

---

## 1. System Architecture

```
+---------------------------------------------------------------------------------------+
|                                    FlowPilot Frontend                                 |
|   Next.js 14+ (App Router) / React 18 / TypeScript / Tailwind CSS / Lucide / Recharts   |
|                                                                                       |
|  +--------------------+  +---------------------+  +--------------------------------+  |
|  |  Visual Builder    |  |  AI Workflow Wizard |  |  Live Execution Timeline (SSE) |  |
|  |  (React Flow DAG)  |  |  (NL -> Graph Plan) |  |  (Step logs, outputs, metrics) |  |
|  +--------------------+  +---------------------+  +--------------------------------+  |
|  +--------------------+  +---------------------+  +--------------------------------+  |
|  |  Approval Center   |  |  RAG Document Hub   |  |  Dashboard & Audit Analytics   |  |
|  |  (Action Gates)    |  |  (Ingest & Preview) |  |  (Real DB stats & Health)      |  |
|  +--------------------+  +---------------------+  +--------------------------------+  |
+-------------------------------------------|-------------------------------------------+
                                            | REST API & SSE (/api/v1)
+-------------------------------------------v-------------------------------------------+
|                                     FastAPI Backend                                   |
|                                                                                       |
|  [Security & Auth Middleware] -> JWT Bearer / Workspace Tenant Isolation / RBAC / SSRF|
|                                                                                       |
|  +----------------------------------+  +--------------------------------------------+ |
|  |  AI Planner & Schema Validator   |  |  Workflow Orchestrator & State Machine     | |
|  |  - Pydantic v2 Graph Schema      |  |  - DAG cycle check & topological order     | |
|  |  - NL -> Graph prompt engine     |  |  - Branching, retries, timeouts, fallback  | |
|  |  - LLM Provider Adapter Layer    |  |  - Human Approval pause/resume states      | |
|  +----------------------------------+  +--------------------------------------------+ |
|  +----------------------------------+  +--------------------------------------------+ |
|  |  Agentic RAG Engine              |  |  Tool & Action Registry                    | |
|  |  - Document chunking & parsing   |  |  - HTTP client with SSRF filter            | |
|  |  - Hybrid vector + keyword search|  |  - Email draft generator (safe sandbox)    | |
|  |  - Tenant-filtered citations     |  |  - Data transformation & JSON evaluator    | |
|  +----------------------------------+  +--------------------------------------------+ |
+-------------------------------------------|-------------------------------------------+
                                            |
                    +-----------------------+-----------------------+
                    |                                               |
+-------------------v-------------------+       +-------------------v-------------------+
|     Storage & Vector Database         |       |      Task Coordination & Cache        |
|  PostgreSQL 16 + pgvector (Production)|       |  Redis 7 (Distributed Queue / PubSub) |
|  SQLite WAL + Vector Fallback (Local) |       |  In-memory Queue Fallback (Local Dev) |
+---------------------------------------+       +---------------------------------------+
```

---

## 2. Core Capabilities & Architecture

- **Visual Workflow Builder (React Flow)**: Interactive DAG canvas with 12 distinct node types, connectable ports, real-time node property inspector, and live test runner drawer with node status rings.
- **Natural Language AI Workflow Planner**: Converts user prompts into valid DAGs with cycle detection and automatic parameter schema validation.
- **Deterministic & Multi-Provider AI Layer**:
  - `mock`: High-fidelity deterministic provider for instant offline local testing without paid API keys.
  - `openai`: GPT-4o and GPT-4o-mini integration.
  - `gemini`: Google Gemini 1.5 Flash integration.
- **Agentic RAG Knowledge Base**: Ingests PDF, Markdown, and TXT files. Chunks with sliding token overlap, computes vector embeddings, and executes hybrid vector + keyword search with strict tenant workspace isolation.
- **Human Approval Center**: Pauses workflow execution state machine before sensitive actions (financial reversals, external notifications). Approving resumes execution from the exact paused node.
- **Enterprise Security & Governance**:
  - Bcrypt password hashing & JWT authentication.
  - Workspace-level multi-tenant isolation and RBAC (`admin`, `member`, `viewer`).
  - Strict SSRF protection on HTTP nodes (blocks RFC 1918 private subnets, loopbacks, and cloud metadata IPs).
  - Secret redaction (passwords, tokens, and API keys scrubbed from execution inputs/outputs and logs).
  - OpenTelemetry-ready audit trail of all administrative and workflow actions.

---

## 3. Supported Workflow Nodes

| Node Type | Category | Capabilities |
| :--- | :--- | :--- |
| `manualTrigger` | Trigger | Manual or on-demand execution trigger |
| `scheduledTrigger`| Trigger | Cron-based recurring schedule trigger |
| `webhookTrigger` | Trigger | Inbound HTTP payload receiver |
| `textInput` | Input | Parameter and text field ingestion |
| `documentRetrieval`| RAG | Tenant-isolated vector + keyword knowledge search |
| `llmProcessing` | AI Reasoning | Structured classification, entity extraction, reasoning |
| `conditionalBranch`| Logic Flow | Boolean routing with multiple output paths |
| `httpRequest` | External Tool | Outbound API call with strict SSRF filtering |
| `emailDraft` | Action | RFC-compliant email draft preparation |
| `humanApproval` | Governance | Pauses state machine for supervisor sign-off |
| `dataTransformation`| Data | JSON path mapping and manipulation |
| `endOutput` | Termination | Final pipeline payload aggregator |

---

## 4. Quickstart Guide (Local Development)

### Prerequisites
- Python 3.12+ (verified on Python 3.14)
- Node.js 18+ (verified on Node.js v24)
- npm 10+

### Option A: Local Development (Zero Background Daemons Required)

The backend automatically utilizes SQLite in WAL mode with local vector fallback and in-process async task coordination when external Postgres/Redis instances are not configured.

#### 1. Start the Backend API
```powershell
cd backend
python -m app.main
```
The FastAPI server will start at `http://127.0.0.1:8000`.
- API Documentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/healthz`

*Note: On first startup, the database automatically initializes tables and seeds the demo workspace.*

#### 2. Start the Frontend
```powershell
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

#### 3. Log In with Pre-Seeded Demo Account
- **Email**: `admin@flowpilot.ai`
- **Password**: `flowpilot_secure_demo_2026`
*(Or click the "Fill Demo" button on the login screen for instant one-click login).*

---

### Option B: Production Stack via Docker Compose

```bash
docker compose up --build
```
This launches:
- `flowpilot-postgres`: PostgreSQL 16 with pgvector extension enabled
- `flowpilot-redis`: Redis 7
- `flowpilot-backend`: FastAPI application
- `flowpilot-frontend`: Next.js production build

---

## 5. Seeded Demonstration Workflow

The workspace includes a pre-seeded, end-to-end demonstration workflow:
**"Customer Feedback Intelligence"**

### Flow Steps:
1. **Manual / Ticket Trigger**: Receives customer support ticket.
2. **Customer Ticket Payload**: Ingests billing complaint (`"Billed twice for Invoice #INV-2026-883 for $1,200. Please reverse immediately."`).
3. **Search Policy SOP**: Retrieves the seeded *"Customer Support & Refund SOP"* knowledge document.
4. **AI Classifier & Triage**: Analyzes refund amount against SOP $500 threshold, tags sentiment as negative, and sets urgency to `high`.
5. **Check Urgency Threshold**: Evaluates condition (`urgency == 'high'`) and branches to the urgent gate.
6. **Supervisor Approval Gate**: Execution state machine pauses (`waiting_for_approval`) and registers an approval request.
7. **Human Approval**: The supervisor navigates to the **Approvals** tab, reviews the $1,200 proposed reversal, and clicks **Approve**.
8. **Draft Customer Resolution Email**: Execution resumes and generates the customer resolution email draft.
9. **Standard Ticket Close**: Reaches final output with status `completed` and records full execution telemetry.

---

## 6. Running the Automated Test Suite

Run the comprehensive pytest suite from the backend directory:

```powershell
cd backend
python -m pytest app/tests -v
```

### Test Coverage Highlights:
- `test_auth.py`: User registration, password verification, JWT token issuance, profile lookup.
- `test_workspaces.py`: Multi-tenant boundary isolation; cross-workspace queries are strictly denied with `403 Forbidden`.
- `test_workflows.py`: Workflow CRUD, cycle detection in DAGs (detects circular paths), invalid node rejection.
- `test_executor.py`: Complete state machine lifecycle: trigger -> branching -> approval pause -> supervisor approval -> completion.
- `test_ssrf.py`: Outbound request validation blocks `localhost`, `127.0.0.1`, RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and AWS metadata `169.254.169.254`.
- `test_rag.py`: Text chunking with overlap, vector similarity calculations, and tenant-isolated retrieval.
- `test_evals.py`: AI schema generation validity benchmarks, generation latency metrics, and precision/recall evaluation.

---

## 7. API Reference (Selected Endpoints)

All API endpoints are versioned under `/api/v1`:

- **Auth**:
  - `POST /api/v1/auth/register` — Register user & default workspace
  - `POST /api/v1/auth/login` — Authenticate & receive JWT token
  - `GET /api/v1/auth/me` — Current user profile & accessible workspaces
- **Workspaces**:
  - `GET /api/v1/workspaces` — List user workspaces
  - `POST /api/v1/workspaces` — Create new workspace
  - `GET /api/v1/workspaces/{id}/members` — List team members & roles
  - `POST /api/v1/workspaces/{id}/members` — Add member with role (`admin`, `member`, `viewer`)
- **Workflows**:
  - `GET /api/v1/workflows` — List workflows in workspace
  - `POST /api/v1/workflows` — Create new workflow
  - `GET /api/v1/workflows/{id}` — Retrieve workflow & active version definition
  - `PUT /api/v1/workflows/{id}` — Update definition (creates immutable version increment)
  - `DELETE /api/v1/workflows/{id}` — Delete workflow
  - `POST /api/v1/workflows/validate` — Validate DAG structure and connection handles
  - `POST /api/v1/workflows/generate-plan` — Natural language AI workflow generator
  - `POST /api/v1/workflows/{id}/execute` — Trigger workflow execution
- **Executions**:
  - `GET /api/v1/executions` — List executions with status & duration filters
  - `GET /api/v1/executions/{id}` — Detailed execution trace with step-by-step node outputs
  - `POST /api/v1/executions/{id}/cancel` — Cancel active execution
  - `GET /api/v1/executions/{id}/stream` — Server-Sent Events (SSE) live updates
- **Approvals**:
  - `GET /api/v1/approvals` — List pending approval requests
  - `POST /api/v1/approvals/{id}/decision` — Approve or reject action (resumes execution if approved)
- **Knowledge**:
  - `GET /api/v1/knowledge/documents` — List uploaded documents
  - `POST /api/v1/knowledge/documents/upload` — Ingest PDF, Markdown, or TXT
  - `POST /api/v1/knowledge/search` — Query vector store with source citations
- **Analytics & Governance**:
  - `GET /api/v1/analytics/dashboard` — Real database-backed platform metrics
  - `GET /api/v1/analytics/audit-logs` — Immutable audit logs
