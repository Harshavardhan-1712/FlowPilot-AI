from app.services.retrieval_service import (
    chunk_text,
    extract_text_from_file,
    ingest_document,
    search_knowledge_base,
)
from app.models.workspace import Workspace


def test_chunking_with_overlap():
    text = "word " * 1200
    chunks = chunk_text(text, chunk_size=300, overlap=50)
    assert len(chunks) >= 4
    for c in chunks:
        assert len(c.split()) <= 300


def test_rag_ingest_and_search(client, auth_headers, db_session):
    ws = db_session.query(Workspace).filter(Workspace.slug == "flowpilot-enterprise-demo").first()
    assert ws is not None

    sample_doc_content = (
        "FlowPilot Enterprise License Agreement: "
        "Each customer account is permitted up to 100 concurrent workflow executions. "
        "Any requests exceeding this concurrency quota require a dedicated high-throughput plan."
    )

    doc = ingest_document(
        db=db_session,
        workspace_id=ws.id,
        title="Concurrency Licensing Policy",
        filename="licensing_policy.txt",
        content_bytes=sample_doc_content.encode("utf-8"),
        content_type="text/plain"
    )
    assert doc.id is not None
    assert doc.chunk_count >= 1

    # Search for concurrency
    results = search_knowledge_base(
        db=db_session,
        workspace_id=ws.id,
        query="concurrency quota workflow executions",
        top_k=3,
        min_score=0.1
    )
    assert len(results) >= 1
    assert "concurrency" in results[0].content.lower()
    assert results[0].score > 0.1
