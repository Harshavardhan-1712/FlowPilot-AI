from collections import defaultdict, deque
from typing import List, Dict, Any, Set
from app.schemas.workflow import WorkflowDefinition, WorkflowValidationResult, WorkflowValidationIssue

ALLOWED_NODE_TYPES = {
    "manualTrigger",
    "scheduledTrigger",
    "webhookTrigger",
    "textInput",
    "documentRetrieval",
    "llmProcessing",
    "conditionalBranch",
    "httpRequest",
    "emailDraft",
    "humanApproval",
    "dataTransformation",
    "endOutput",
}

TRIGGER_TYPES = {"manualTrigger", "scheduledTrigger", "webhookTrigger"}


def validate_workflow_graph(definition: WorkflowDefinition) -> WorkflowValidationResult:
    issues: List[WorkflowValidationIssue] = []
    nodes = definition.nodes
    edges = definition.edges

    if not nodes:
        issues.append(WorkflowValidationIssue(type="error", message="Workflow must contain at least one node."))
        return WorkflowValidationResult(is_valid=False, issues=issues)

    node_ids: Set[str] = set()
    trigger_nodes: List[str] = []

    # 1. Validate node types and unique IDs
    for node in nodes:
        if node.id in node_ids:
            issues.append(WorkflowValidationIssue(
                type="error",
                node_id=node.id,
                message=f"Duplicate node ID detected: '{node.id}'"
            ))
        node_ids.add(node.id)

        if node.type not in ALLOWED_NODE_TYPES:
            issues.append(WorkflowValidationIssue(
                type="error",
                node_id=node.id,
                message=f"Unknown node type '{node.type}'. Supported types: {', '.join(sorted(ALLOWED_NODE_TYPES))}"
            ))

        if node.type in TRIGGER_TYPES:
            trigger_nodes.append(node.id)

    # 2. Check for trigger presence
    if not trigger_nodes:
        issues.append(WorkflowValidationIssue(
            type="error",
            message="Workflow must contain at least one trigger node (Manual, Scheduled, or Webhook)."
        ))

    # 3. Validate edges
    adjacency: Dict[str, List[str]] = defaultdict(list)
    in_degree: Dict[str, int] = {node_id: 0 for node_id in node_ids}
    out_degree: Dict[str, int] = {node_id: 0 for node_id in node_ids}

    for edge in edges:
        if edge.source not in node_ids:
            issues.append(WorkflowValidationIssue(
                type="error",
                message=f"Edge '{edge.id}' references nonexistent source node '{edge.source}'."
            ))
            continue
        if edge.target not in node_ids:
            issues.append(WorkflowValidationIssue(
                type="error",
                message=f"Edge '{edge.id}' references nonexistent target node '{edge.target}'."
            ))
            continue

        if edge.source == edge.target:
            issues.append(WorkflowValidationIssue(
                type="error",
                node_id=edge.source,
                message=f"Self-referencing loop detected on node '{edge.source}'."
            ))
            continue

        adjacency[edge.source].append(edge.target)
        in_degree[edge.target] += 1
        out_degree[edge.source] += 1

    # 4. Cycle Detection using Kahn's algorithm (Topological sort)
    temp_in_degree = in_degree.copy()
    queue = deque([node_id for node_id, deg in temp_in_degree.items() if deg == 0])
    visited_count = 0

    while queue:
        curr = queue.popleft()
        visited_count += 1
        for neighbor in adjacency[curr]:
            temp_in_degree[neighbor] -= 1
            if temp_in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited_count < len(node_ids) and len(edges) > 0:
        issues.append(WorkflowValidationIssue(
            type="error",
            message="Cyclic dependency detected! Workflows must be a Directed Acyclic Graph (DAG)."
        ))

    # 5. Check for disconnected / orphan nodes (if more than 1 node exists)
    if len(nodes) > 1:
        for node in nodes:
            if in_degree[node.id] == 0 and out_degree[node.id] == 0:
                issues.append(WorkflowValidationIssue(
                    type="warning",
                    node_id=node.id,
                    message=f"Node '{node.id}' is disconnected from the workflow graph."
                ))

    # 6. Node specific checks
    for node in nodes:
        if node.type == "conditionalBranch":
            # Check outgoing edges have condition handles or labels
            out_edges = [e for e in edges if e.source == node.id]
            if len(out_edges) < 2:
                issues.append(WorkflowValidationIssue(
                    type="warning",
                    node_id=node.id,
                    message="Conditional branch should have at least 2 output connections (e.g., true/false or distinct branches)."
                ))
        elif node.type == "httpRequest":
            url = node.data.get("url")
            if not url:
                issues.append(WorkflowValidationIssue(
                    type="warning",
                    node_id=node.id,
                    message="HTTP Request node does not have a destination URL configured."
                ))

    is_valid = not any(issue.type == "error" for issue in issues)
    return WorkflowValidationResult(is_valid=is_valid, issues=issues)
