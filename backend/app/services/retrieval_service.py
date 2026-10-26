import io
import math
import re
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.knowledge import KnowledgeDocument, DocumentChunk
from app.providers import get_llm_provider
from app.schemas.knowledge import DocumentSearchResult

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


def extract_text_from_file(content_bytes: bytes, filename: str, content_type: str) -> str:
    lower_fn = filename.lower()
    if lower_fn.endswith(".pdf") or "pdf" in content_type:
        if not PdfReader:
            raise ValueError("pypdf is not installed on system")
        reader = PdfReader(io.BytesIO(content_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages_text.append(text)
        return "\n\n".join(pages_text)
    else:
        # Plain text, markdown, json, etc.
        return content_bytes.decode("utf-8", errors="replace")


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    clean_text = re.sub(r"\s+", " ", text).strip()
    if not clean_text:
        return []
    
    words = clean_text.split(" ")
    if len(words) <= chunk_size:
        return [" ".join(words)]

    chunks = []
    i = 0
    step = chunk_size - overlap
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += step
        if i >= len(words):
            break

    return chunks


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def keyword_overlap_score(query: str, text: str) -> float:
    q_words = set(re.findall(r"\w+", query.lower()))
    if not q_words:
        return 0.0
    t_words = set(re.findall(r"\w+", text.lower()))
    common = q_words.intersection(t_words)
    return len(common) / len(q_words)


def ingest_document(
    db: Session,
    workspace_id: str,
    title: str,
    filename: str,
    content_bytes: bytes,
    content_type: str = "text/plain"
) -> KnowledgeDocument:
    raw_text = extract_text_from_file(content_bytes, filename, content_type)
    chunks_text = chunk_text(raw_text)

    doc = KnowledgeDocument(
        workspace_id=workspace_id,
        title=title,
        filename=filename,
        content_type=content_type,
        file_size=len(content_bytes),
        status="processing",
        chunk_count=len(chunks_text),
    )
    db.add(doc)
    db.flush()

    if chunks_text:
        provider = get_llm_provider()
        embeddings = provider.generate_embeddings(chunks_text)

        for idx, (chunk_str, emb) in enumerate(zip(chunks_text, embeddings)):
            chunk = DocumentChunk(
                document_id=doc.id,
                workspace_id=workspace_id,
                chunk_index=idx,
                content=chunk_str,
                token_count=len(chunk_str.split()),
                embedding_json=emb
            )
            db.add(chunk)

    doc.status = "indexed"
    db.commit()
    db.refresh(doc)
    return doc


def search_knowledge_base(
    db: Session,
    workspace_id: str,
    query: str,
    top_k: int = 5,
    min_score: float = 0.1
) -> List[DocumentSearchResult]:
    provider = get_llm_provider()
    q_emb = provider.generate_embeddings([query])[0]

    # Strictly filter by tenant workspace_id
    chunks = db.query(DocumentChunk).join(KnowledgeDocument).filter(
        DocumentChunk.workspace_id == workspace_id,
        KnowledgeDocument.status == "indexed"
    ).all()

    results = []
    for chunk in chunks:
        vec_score = cosine_similarity(q_emb, chunk.embedding_json or [])
        kw_score = keyword_overlap_score(query, chunk.content)
        # Hybrid score: 70% vector + 30% keyword
        combined_score = (0.7 * vec_score) + (0.3 * kw_score)

        if combined_score >= min_score:
            results.append(DocumentSearchResult(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                document_title=chunk.document.title,
                content=chunk.content,
                score=round(combined_score, 4),
                chunk_index=chunk.chunk_index
            ))

    # Sort descending by score
    results.sort(key=lambda r: r.score, reverse=True)
    return results[:top_k]
