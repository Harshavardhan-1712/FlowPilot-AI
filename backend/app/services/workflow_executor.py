import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Set
from collections import defaultdict, deque
from sqlalchemy.orm import Session

from app.models.execution import WorkflowExecution, NodeExecution
from app.models.workflow import WorkflowVersion
from app.services.tool_registry import (
    execute_http_request,
    execute_data_transformation,
    execute_email_draft,
    redact_secrets,
)
from app.services.retrieval_service import search_knowledge_base
from app.services.approval_service import create_approval_request
from app.providers import get_llm_provider


def evaluate_condition(data: Dict[str, Any], variable: str, operator: str, target_value: Any) -> bool:
    """Evaluates a branch condition against workflow state."""
    # Find variable in data
    val = data.get(variable)
    if val is None:
        # Search nested dicts
        for k, v in data.items():
            if isinstance(v, dict) and variable in v:
                val = v[variable]
                break

    val_str = str(val or "").lower().strip()
    target_str = str(target_value or "").lower().strip()

    if operator in ("equals", "=="):
        return val_str == target_str
    elif operator in ("not_equals", "!="):
        return val_str != target_str
    elif operator in ("contains", "in"):
        return target_str in val_str
    elif operator == "greater_than":
        try:
            return float(val) > float(target_value)
        except (ValueError, TypeError):
            return False
    elif operator == "less_than":
        try:
            return float(val) < float(target_value)
        except (ValueError, TypeError):
            return False
    return bool(val)


class WorkflowExecutionEngine:
    def __init__(self, db: Session, execution_id: str):
        self.db = db
        self.execution_id = execution_id
        self.execution = db.query(WorkflowExecution).filter(WorkflowExecution.id == execution_id).first()
        if not self.execution:
            raise ValueError(f"Execution {execution_id} not found.")

        self.version = db.query(WorkflowVersion).filter(WorkflowVersion.id == self.execution.workflow_version_id).first()
        if not self.version:
            raise ValueError("Workflow version definition not found.")

        self.definition = self.version.definition or {}
        self.nodes = {n["id"]: n for n in self.definition.get("nodes", [])}
        self.edges = self.definition.get("edges", [])

    def run(self, resume_node_id: Optional[str] = None):
        """Executes the workflow graph in topological order."""
        if self.execution.status not in ("pending", "waiting_for_approval", "running"):
            return

        if self.execution.status == "pending":
            self.execution.status = "running"
            self.execution.started_at = datetime.now(timezone.utc)
            self.db.commit()

        # Build adjacency graph
        in_edges = defaultdict(list)
        out_edges = defaultdict(list)
        for edge in self.edges:
            out_edges[edge["source"]].append(edge)
            in_edges[edge["target"]].append(edge)

        # Topological sorting
        in_degree = {nid: len(in_edges[nid]) for nid in self.nodes}
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])

        node_outputs: Dict[str, Any] = {}
        # Preload already completed node executions if resuming
        existing_node_execs = {
            ne.node_id: ne for ne in self.execution.node_executions
        }
        for nid, ne in existing_node_execs.items():
            if ne.status == "completed":
                node_outputs[nid] = ne.outputs or {}

        active_branches: Set[str] = set()
        # All edges out of non-branch nodes are active by default
        for edge in self.edges:
            src_node = self.nodes.get(edge["source"])
            if src_node and src_node.get("type") != "conditionalBranch":
                active_branches.add(edge["id"])

        start_time = time.time()
        paused_for_approval = False

        while queue:
            curr_id = queue.popleft()
            curr_node = self.nodes.get(curr_id)
            if not curr_node:
                continue

            node_type = curr_node.get("type")
            node_data = curr_node.get("data", {})
            node_label = node_data.get("label", node_type)

            # Check if this node is reachable via active edges
            incoming = in_edges[curr_id]
            if incoming:
                # Must have at least one active edge coming into it
                is_active = any(edge["id"] in active_branches for edge in incoming)
                if not is_active:
                    # Mark node as skipped
                    ne = existing_node_execs.get(curr_id)
                    if not ne:
                        ne = NodeExecution(
                            execution_id=self.execution.id,
                            node_id=curr_id,
                            node_type=node_type,
                            node_name=node_label,
                            status="skipped",
                            started_at=datetime.now(timezone.utc),
                            completed_at=datetime.now(timezone.utc),
                        )
                        self.db.add(ne)
                        self.db.commit()
                    # Skip downstream nodes
                    for out_e in out_edges[curr_id]:
                        in_degree[out_e["target"]] -= 1
                        if in_degree[out_e["target"]] == 0:
                            queue.append(out_e["target"])
                    continue

            # Check if node already completed
            ne = existing_node_execs.get(curr_id)
            if ne and ne.status == "completed" and curr_id != resume_node_id:
                for out_e in out_edges[curr_id]:
                    in_degree[out_e["target"]] -= 1
                    if in_degree[out_e["target"]] == 0:
                        queue.append(out_e["target"])
                continue

            # Gather inputs from parent node outputs
            parent_inputs = {}
            for in_e in incoming:
                p_output = node_outputs.get(in_e["source"])
                if p_output:
                    parent_inputs[in_e["source"]] = p_output

            if not ne:
                ne = NodeExecution(
                    execution_id=self.execution.id,
                    node_id=curr_id,
                    node_type=node_type,
                    node_name=node_label,
                    status="running",
                    inputs=redact_secrets(parent_inputs),
                    started_at=datetime.now(timezone.utc),
                )
                self.db.add(ne)
                self.db.commit()
                self.db.refresh(ne)

            node_start = time.time()
            try:
                # EXECUTE SPECIFIC NODE TYPE
                output = self._execute_node(curr_node, parent_inputs, ne, resume_node_id == curr_id)

                if output.get("__PAUSED__"):
                    paused_for_approval = True
                    break

                duration_ms = int((time.time() - node_start) * 1000)
                ne.status = "completed"
                ne.outputs = redact_secrets(output)
                ne.duration_ms = duration_ms
                ne.completed_at = datetime.now(timezone.utc)
                self.db.commit()

                node_outputs[curr_id] = output

                # If this was a conditional branch, determine which edge to activate
                if node_type == "conditionalBranch":
                    cond_result = output.get("condition_matched", False)
                    for out_e in out_edges[curr_id]:
                        label = (out_e.get("label") or "").lower()
                        # Condition true path vs false path
                        if cond_result and ("true" in label or "urgent" in label or "high" in label or not label):
                            active_branches.add(out_e["id"])
                        elif not cond_result and ("false" in label or "standard" in label or "normal" in label or "else" in label):
                            active_branches.add(out_e["id"])
                        elif not label:
                            active_branches.add(out_e["id"])

                # Enqueue children whose dependencies are met
                for out_e in out_edges[curr_id]:
                    in_degree[out_e["target"]] -= 1
                    if in_degree[out_e["target"]] == 0:
                        queue.append(out_e["target"])

            except Exception as e:
                ne.status = "failed"
                ne.error_message = str(e)
                ne.duration_ms = int((time.time() - node_start) * 1000)
                ne.completed_at = datetime.now(timezone.utc)

                self.execution.status = "failed"
                self.execution.error_message = f"Node '{node_label}' ({curr_id}) failed: {str(e)}"
                self.execution.completed_at = datetime.now(timezone.utc)
                self.execution.duration_seconds = round(time.time() - start_time, 2)
                self.db.commit()
                return

        if not paused_for_approval:
            self.execution.status = "completed"
            self.execution.completed_at = datetime.now(timezone.utc)
            self.execution.duration_seconds = round(time.time() - start_time, 2)
            self.db.commit()

    def _execute_node(self, node: dict, parent_inputs: dict, ne: NodeExecution, is_resuming: bool) -> dict:
        node_type = node.get("type")
        data = node.get("data", {})
        trigger_data = self.execution.trigger_data or {}

        if node_type in ("manualTrigger", "scheduledTrigger", "webhookTrigger"):
            return {
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "trigger_type": node_type,
                "payload": trigger_data
            }

        elif node_type == "textInput":
            field_name = data.get("field_name", "input")
            val = trigger_data.get(field_name) or data.get("default_value") or "Sample customer input data"
            return {"field_name": field_name, "value": val}

        elif node_type == "documentRetrieval":
            # Search knowledge base
            # Query from parent textInput or default query
            query = "feedback and refund policy"
            for p_val in parent_inputs.values():
                if isinstance(p_val, dict) and "value" in p_val:
                    query = str(p_val["value"])
                    break
            
            top_k = int(data.get("top_k", 3))
            min_score = float(data.get("min_score", 0.1))
            results = search_knowledge_base(
                self.db,
                workspace_id=self.execution.workspace_id,
                query=query,
                top_k=top_k,
                min_score=min_score
            )
            return {
                "query": query,
                "match_count": len(results),
                "citations": [
                    {
                        "chunk_id": r.chunk_id,
                        "document_title": r.document_title,
                        "score": r.score,
                        "excerpt": r.content[:200]
                    }
                    for r in results
                ]
            }

        elif node_type == "llmProcessing":
            provider = get_llm_provider()
            prompt = f"Analyze inputs:\n{parent_inputs}\nTask: Classify sentiment and urgency."
            resp = provider.generate_text(prompt, system_prompt=data.get("system_prompt"))
            
            self.execution.total_tokens += resp.total_tokens
            return {
                "model": resp.model,
                "analysis": resp.content,
                "urgency": "high" if "urgent" in resp.content.lower() or "negative" in resp.content.lower() else "normal",
                "sentiment": "negative" if "negative" in resp.content.lower() else "neutral",
                "tokens": resp.total_tokens
            }

        elif node_type == "conditionalBranch":
            var = data.get("condition_variable", "urgency")
            op = data.get("operator", "equals")
            val = data.get("value", "high")

            # Flatten parent inputs
            flat_state = {}
            for p_out in parent_inputs.values():
                if isinstance(p_out, dict):
                    flat_state.update(p_out)

            matched = evaluate_condition(flat_state, var, op, val)
            return {
                "evaluated_variable": var,
                "expected_value": val,
                "condition_matched": matched
            }

        elif node_type == "humanApproval":
            if is_resuming:
                return {
                    "approval_status": "approved",
                    "resumed_at": datetime.now(timezone.utc).isoformat()
                }

            # Create approval request and pause execution
            action_name = data.get("action_name", "Approve Sensitive Action")
            summary = data.get("summary_template", f"Approval requested for execution {self.execution.id}")
            
            create_approval_request(
                self.db,
                workspace_id=self.execution.workspace_id,
                execution_id=self.execution.id,
                node_id=node["id"],
                action_name=action_name,
                action_summary=summary,
                proposed_payload=parent_inputs
            )

            ne.status = "waiting_for_approval"
            self.execution.status = "waiting_for_approval"
            self.db.commit()

            return {"__PAUSED__": True}

        elif node_type == "httpRequest":
            url = data.get("url", "https://api.github.com/zen")
            method = data.get("method", "GET")
            headers = data.get("headers", {})
            resp = execute_http_request(url=url, method=method, headers=headers)
            return resp

        elif node_type == "emailDraft":
            recipient = data.get("recipient", "customer@example.com")
            subject = data.get("subject", "FlowPilot Automated Notification")
            body = f"Hello,\n\nWe have reviewed your request. Summary:\n{parent_inputs}\n\nFlowPilot AI Team"
            return execute_email_draft(recipient, subject, body)

        elif node_type == "dataTransformation":
            return execute_data_transformation(parent_inputs, data)

        elif node_type == "endOutput":
            return {
                "status": "completed",
                "final_summary": parent_inputs
            }

        return {"status": "success", "data": parent_inputs}
