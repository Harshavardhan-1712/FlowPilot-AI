import time
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership
from app.models.workflow import Workflow, WorkflowVersion
from app.models.knowledge import KnowledgeDocument
from app.services.auth_service import hash_password
from app.services.retrieval_service import ingest_document

DEMO_USER_EMAIL = "admin@flowpilot.ai"
DEMO_USER_PASSWORD = "flowpilot_secure_demo_2026"

SAMPLE_KNOWLEDGE_DOC = """
# FlowPilot AI — Customer Support & Refund Policy Standard Operating Procedures (SOP)

## 1. Enterprise Billing & Duplicate Charges
When a customer reports being charged multiple times for a single enterprise subscription invoice:
- All duplicate transactions must be immediately flagged for priority review.
- If the duplicate billing amount exceeds $500 USD, mandatory approval from an Operations Supervisor or Finance Reviewer is required before triggering any automated banking reversal or ledger refund.
- High-priority support tickets require resolution and customer acknowledgment within 4 hours.

## 2. Technical Support Escalations
- Severity 1 (Outage): Core API unreachable, data pipeline stalled. Notify on-call incident commander immediately.
- Severity 2 (Major Impact): Non-critical endpoint failure or degraded latency.
- Severity 3 (Standard Inquiry): Feature requests, configuration questions, documentation lookups.

## 3. Communication Guidelines
All outbound customer notification drafts must maintain a professional, empathetic, and reassuring tone. Explicitly state the ticket ID and the steps taken to resolve the inquiry.
"""

DEMO_WORKFLOW_DEFINITION = {
    "nodes": [
        {
            "id": "node-1",
            "type": "manualTrigger",
            "position": {"x": 80, "y": 250},
            "data": {
                "label": "Manual / Ticket Trigger",
                "description": "Fires upon receipt of customer support ticket"
            }
        },
        {
            "id": "node-2",
            "type": "textInput",
            "position": {"x": 360, "y": 250},
            "data": {
                "label": "Customer Ticket Payload",
                "field_name": "ticket_text",
                "default_value": "URGENT: We were billed twice for Invoice #INV-2026-883 totaling $1,200. Please reverse the duplicate charge immediately."
            }
        },
        {
            "id": "node-3",
            "type": "documentRetrieval",
            "position": {"x": 640, "y": 250},
            "data": {
                "label": "Search Policy SOP",
                "top_k": 2,
                "min_score": 0.15
            }
        },
        {
            "id": "node-4",
            "type": "llmProcessing",
            "position": {"x": 920, "y": 250},
            "data": {
                "label": "AI Classifier & Triage",
                "system_prompt": "Evaluate ticket urgency against SOP refund thresholds and determine if supervisor approval is mandatory."
            }
        },
        {
            "id": "node-5",
            "type": "conditionalBranch",
            "position": {"x": 1200, "y": 250},
            "data": {
                "label": "Check Urgency Threshold",
                "condition_variable": "urgency",
                "operator": "equals",
                "value": "high"
            }
        },
        {
            "id": "node-6",
            "type": "humanApproval",
            "position": {"x": 1480, "y": 120},
            "data": {
                "label": "Supervisor Approval Gate",
                "action_name": "Approve Duplicate Charge Reversal ($1,200)",
                "summary_template": "Review duplicate invoice reversal exceeding $500 policy threshold."
            }
        },
        {
            "id": "node-7",
            "type": "emailDraft",
            "position": {"x": 1760, "y": 120},
            "data": {
                "label": "Draft Customer Resolution Email",
                "recipient": "customer@acme-corp.com",
                "subject": "Resolution regarding duplicate billing on Invoice #INV-2026-883"
            }
        },
        {
            "id": "node-8",
            "type": "endOutput",
            "position": {"x": 1480, "y": 400},
            "data": {
                "label": "Standard Ticket Close",
                "output_format": "json"
            }
        }
    ],
    "edges": [
        {"id": "e1-2", "source": "node-1", "target": "node-2"},
        {"id": "e2-3", "source": "node-2", "target": "node-3"},
        {"id": "e3-4", "source": "node-3", "target": "node-4"},
        {"id": "e4-5", "source": "node-4", "target": "node-5"},
        {"id": "e5-6", "source": "node-5", "target": "node-6", "label": "Urgent / High Priority"},
        {"id": "e6-7", "source": "node-6", "target": "node-7"},
        {"id": "e5-8", "source": "node-5", "target": "node-8", "label": "Standard / Routine"}
    ]
}


def seed_database(db: Session = None):
    close_at_end = False
    if db is None:
        init_db()
        db = SessionLocal()
        close_at_end = True

    try:
        # 1. Create or retrieve demo user
        user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
        if not user:
            user = User(
                email=DEMO_USER_EMAIL,
                hashed_password=hash_password(DEMO_USER_PASSWORD),
                full_name="Lead Operations Admin",
                is_active=True,
                is_superuser=True
            )
            db.add(user)
            db.flush()

        # 2. Create demo workspace
        ws = db.query(Workspace).filter(Workspace.slug == "flowpilot-enterprise-demo").first()
        if not ws:
            ws = Workspace(
                name="Enterprise Operations & Automation",
                slug="flowpilot-enterprise-demo",
                description="Production demonstration workspace for FlowPilot agentic pipelines."
            )
            db.add(ws)
            db.flush()

            # Membership
            membership = WorkspaceMembership(
                workspace_id=ws.id,
                user_id=user.id,
                role="admin"
            )
            db.add(membership)
            db.flush()

        # 3. Ingest sample knowledge document
        existing_doc = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.workspace_id == ws.id,
            KnowledgeDocument.title == "Customer Support & Refund SOP"
        ).first()

        if not existing_doc:
            ingest_document(
                db=db,
                workspace_id=ws.id,
                title="Customer Support & Refund SOP",
                filename="customer_support_refund_sop.md",
                content_bytes=SAMPLE_KNOWLEDGE_DOC.encode("utf-8"),
                content_type="text/markdown"
            )

        # 4. Create "Customer Feedback Intelligence" demonstration workflow
        demo_wf = db.query(Workflow).filter(
            Workflow.workspace_id == ws.id,
            Workflow.name == "Customer Feedback Intelligence"
        ).first()

        if not demo_wf:
            demo_wf = Workflow(
                workspace_id=ws.id,
                name="Customer Feedback Intelligence",
                description="Autonomous triage pipeline: ingests tickets, retrieves SOP knowledge base, classifies urgency, routes high-impact cases to supervisor approval, and drafts resolution emails.",
                status="active",
                current_version=1,
                created_by_id=user.id
            )
            db.add(demo_wf)
            db.flush()

            version = WorkflowVersion(
                workflow_id=demo_wf.id,
                version_number=1,
                definition=DEMO_WORKFLOW_DEFINITION,
                changelog="Seeded production demo workflow",
                created_by_id=user.id
            )
            db.add(version)

        db.commit()
        print("Demo database seeded successfully.")
    finally:
        if close_at_end:
            db.close()


if __name__ == "__main__":
    seed_database()
