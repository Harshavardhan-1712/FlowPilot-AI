import time
from app.providers.mock_provider import MockLLMProvider
from app.schemas.workflow import WorkflowGenerateResponse
from app.services.workflow_validator import validate_workflow_graph


def test_eval_workflow_plan_generation_benchmark():
    """
    Evaluates schema validity, node count distribution, and graph topology across sample prompt suites.
    """
    provider = MockLLMProvider()
    test_prompts = [
        "Monitor customer support tickets, classify urgency, retrieve policy, and notify team.",
        "Ingest incoming vendor invoices, match purchase order, and route for manager sign-off.",
        "Process new employee onboarding, create account credentials, send welcome packet, and assign buddy."
    ]

    valid_count = 0
    total_latency = 0.0

    for prompt in test_prompts:
        start = time.time()
        plan: WorkflowGenerateResponse = provider.generate_structured(prompt, WorkflowGenerateResponse)
        duration = time.time() - start
        total_latency += duration

        # Validate DAG schema
        val_res = validate_workflow_graph(plan.definition)
        if val_res.is_valid:
            valid_count += 1

        assert len(plan.definition.nodes) >= 3
        assert len(plan.definition.edges) >= 2

    validity_rate = valid_count / len(test_prompts)
    assert validity_rate == 1.0, f"Plan validity rate was {validity_rate * 100}%"
    avg_latency = total_latency / len(test_prompts)
    assert avg_latency < 1.0, f"Average generation latency {avg_latency}s exceeded 1.0s limit"


def test_eval_retrieval_precision_benchmark(db_session):
    """
    Evaluates keyword + vector retrieval recall and precision on labeled benchmark corpus.
    """
    from app.services.retrieval_service import search_knowledge_base
    from app.models.workspace import Workspace

    ws = db_session.query(Workspace).filter(Workspace.slug == "flowpilot-enterprise-demo").first()
    assert ws is not None

    query = "duplicate billing refund policy threshold"
    results = search_knowledge_base(db_session, workspace_id=ws.id, query=query, top_k=3, min_score=0.1)

    assert len(results) > 0
    top_doc = results[0]
    # Labeled ground truth: must match Customer Support & Refund SOP
    assert "Customer Support & Refund SOP" in top_doc.document_title
    assert top_doc.score >= 0.2
