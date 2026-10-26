import hashlib
import math
import re
from typing import List, Dict, Any, Optional, Type
from pydantic import BaseModel
from app.providers.base import BaseLLMProvider, LLMResponse
from app.schemas.workflow import WorkflowDefinition, WorkflowNode, WorkflowEdge, NodePosition


class MockLLMProvider(BaseLLMProvider):
    """
    Deterministic mock provider for offline local testing and reliable test suites.
    Produces schema-compliant workflows, classifications, and embeddings.
    """

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> LLMResponse:
        prompt_lower = prompt.lower()
        
        if "classify" in prompt_lower or "sentiment" in prompt_lower:
            content = (
                "Classification Result:\n"
                "- Sentiment: Negative (Urgent)\n"
                "- Category: Billing & Subscriptions\n"
                "- Key Issue: Double charge reported on invoice #INV-2026-883\n"
                "- Confidence: 0.94"
            )
        elif "summarize" in prompt_lower or "summary" in prompt_lower:
            content = (
                "Executive Summary:\n"
                "The customer reported a recurring billing discrepancy. According to internal refund policy, "
                "accounts with overbilling exceeding $500 require senior financial approval before automated credit "
                "processing. Recommended action is immediate invoice reversal and customer courtesy notice."
            )
        else:
            content = (
                f"[FlowPilot Mock AI Engine] Processed prompt successfully.\n"
                f"Generated comprehensive automated response based on internal workflow parameters."
            )

        tokens = len(prompt.split()) + len(content.split())
        return LLMResponse(
            content=content,
            prompt_tokens=len(prompt.split()),
            completion_tokens=len(content.split()),
            total_tokens=tokens,
            model="mock-deterministic-v1",
        )

    def generate_structured(self, prompt: str, response_model: Type[BaseModel], system_prompt: Optional[str] = None) -> Any:
        prompt_lower = prompt.lower()

        # Check if requested model is for workflow generation
        from app.schemas.workflow import WorkflowGenerateResponse
        if response_model == WorkflowGenerateResponse:
            return self._generate_workflow_from_prompt(prompt)

        # Generic structured fallback
        text_resp = self.generate_text(prompt, system_prompt)
        return {"result": text_resp.content, "status": "success"}

    def _generate_workflow_from_prompt(self, prompt: str):
        from app.schemas.workflow import WorkflowGenerateResponse, WorkflowValidationIssue
        prompt_lower = prompt.lower()

        nodes = [
            WorkflowNode(
                id="node-trigger-1",
                type="manualTrigger",
                position=NodePosition(x=100, y=200),
                data={"label": "Manual Trigger", "description": "Initiate workflow execution manually or on demand"}
            ),
            WorkflowNode(
                id="node-input-2",
                type="textInput",
                position=NodePosition(x=380, y=200),
                data={"label": "Input Ingestion", "field_name": "raw_input", "default_value": "Customer complaint ticket regarding duplicate invoice charges."}
            ),
            WorkflowNode(
                id="node-rag-3",
                type="documentRetrieval",
                position=NodePosition(x=660, y=200),
                data={"label": "Knowledge Retrieval", "top_k": 3, "min_score": 0.25}
            ),
            WorkflowNode(
                id="node-llm-4",
                type="llmProcessing",
                position=NodePosition(x=940, y=200),
                data={
                    "label": "AI Classification & Triage",
                    "model": "mock-deterministic-v1",
                    "system_prompt": "Analyze incoming text against retrieved documentation and classify urgency and sentiment."
                }
            ),
            WorkflowNode(
                id="node-branch-5",
                type="conditionalBranch",
                position=NodePosition(x=1220, y=200),
                data={
                    "label": "Urgency Branch",
                    "condition_variable": "urgency",
                    "operator": "equals",
                    "value": "high"
                }
            ),
            WorkflowNode(
                id="node-approval-6",
                type="humanApproval",
                position=NodePosition(x=1500, y=100),
                data={
                    "label": "Supervisor Approval",
                    "action_name": "Approve Customer Refund & Notification",
                    "summary_template": "Approve action for high-priority case."
                }
            ),
            WorkflowNode(
                id="node-email-7",
                type="emailDraft",
                position=NodePosition(x=1780, y=100),
                data={"label": "Draft Response Email", "recipient": "customer@example.com", "subject": "Regarding your FlowPilot support inquiry"}
            ),
            WorkflowNode(
                id="node-end-8",
                type="endOutput",
                position=NodePosition(x=1500, y=340),
                data={"label": "Standard Closure", "output_format": "json"}
            ),
        ]

        edges = [
            WorkflowEdge(id="e1-2", source="node-trigger-1", target="node-input-2"),
            WorkflowEdge(id="e2-3", source="node-input-2", target="node-rag-3"),
            WorkflowEdge(id="e3-4", source="node-rag-3", target="node-llm-4"),
            WorkflowEdge(id="e4-5", source="node-llm-4", target="node-branch-5"),
            WorkflowEdge(id="e5-6", source="node-branch-5", target="node-approval-6", label="Urgent / High"),
            WorkflowEdge(id="e6-7", source="node-approval-6", target="node-email-7"),
            WorkflowEdge(id="e5-8", source="node-branch-5", target="node-end-8", label="Standard / Normal"),
        ]

        suggested_name = "AI Incident & Feedback Triage Pipeline"
        suggested_description = f"Autonomous workflow generated from: '{prompt[:80]}...'"
        explanation = (
            "1. Manual Trigger: Entry point for executing the workflow.\n"
            "2. Input Ingestion: Captures the business payload or message.\n"
            "3. Knowledge Retrieval: Searches the authorized workspace knowledge base for company policies.\n"
            "4. AI Classification: Evaluates sentiment, urgency, and extracts key entities.\n"
            "5. Conditional Branch: Routes high-priority requests through safety controls.\n"
            "6. Supervisor Approval: Enforces human-in-the-loop governance before sensitive actions.\n"
            "7. Email Draft / Closure: Prepares final resolution artifacts safely."
        )

        return WorkflowGenerateResponse(
            suggested_name=suggested_name,
            suggested_description=suggested_description,
            explanation=explanation,
            definition=WorkflowDefinition(nodes=nodes, edges=edges),
            is_valid=True,
            validation_issues=[]
        )

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate deterministic unit-normalized 384-dimensional vector embeddings based on text hashing.
        """
        dim = 384
        embeddings = []
        for text in texts:
            vec = [0.0] * dim
            tokens = re.findall(r"\w+", text.lower())
            if not tokens:
                tokens = ["empty"]
            for token in tokens:
                # Hash token to dimension indices
                hash_val = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
                idx = hash_val % dim
                sign = 1.0 if (hash_val % 2 == 0) else -1.0
                vec[idx] += sign

            # Normalize to unit length
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            embeddings.append(vec)
        return embeddings
