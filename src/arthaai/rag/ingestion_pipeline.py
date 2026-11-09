"""RAG Corpus Ingestion Pipeline & Quality Reporting for ArthaAI.

Implements Phase B Workstream 2:
- Idempotent indexing of statutory, regulatory, macroeconomic, surveillance, and corporate filing corpus.
- Table-aware document representation preserving units, column headers, footnotes, and line items.
- Point-in-time and revision-aware metadata schemas.
- Prompt injection containment (<UNTRUSTED_STATUTORY_DOCUMENT>).
- Generates data/manifests/rag_indexing_report.json documenting indexing status, counts, and verification.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.core.config import DataConfig
from arthaai.rag.chroma_store import ChromaRAGStore, get_rag_store
from arthaai.rag.documents import CANONICAL_RAG_DOCUMENTS, DocumentChunk

logger = logging.getLogger(__name__)


class RAGIndexingReport(BaseModel):
    """Machine-readable audit report documenting RAG vector index status and quality."""

    model_config = ConfigDict(frozen=True)

    report_version: str = "2.0.0"
    generated_at: str
    total_chunks: int
    total_documents: int
    chunks_by_symbol: dict[str, int]
    chunks_by_category: dict[str, int]
    table_aware_chunks_count: int
    revision_tracked_chunks_count: int
    prompt_injection_containment_active: bool = True
    index_quality_status: str  # "VERIFIED", "PARTIALLY_VERIFIED", "FAILED"
    vector_store_backend: str = "chromadb_persistent"
    collection_name: str = "arthaai_evidence_corpus"
    embedding_dimension: int = 384
    embedding_engine: str = "DeterministicLexicalSemantic"
    failure_log: list[str] = Field(default_factory=list)


class DocumentIngestionPipeline:
    """Manages idempotent vector indexing and audit manifest reporting."""

    def __init__(self, data_config: DataConfig | None = None, rag_store: ChromaRAGStore | None = None) -> None:
        self.data_config = data_config or DataConfig()
        self.rag_store = rag_store or get_rag_store()
        self.manifest_file = self.data_config.manifests_dir / "rag_indexing_report.json"
        self.data_config.manifests_dir.mkdir(parents=True, exist_ok=True)

    def run_ingestion(self) -> RAGIndexingReport:
        """Executes full idempotent corpus verification and report generation."""
        # 1. Trigger ChromaRAGStore ensure_corpus_ingested
        self.rag_store.ensure_corpus_ingested()

        # 2. Inspect active collection
        collection_data = self.rag_store.collection.get()
        indexed_ids = set(collection_data.get("ids", []))
        metadatas = collection_data.get("metadatas", [])

        chunks_by_symbol: dict[str, int] = {}
        chunks_by_category: dict[str, int] = {}
        table_aware_count = 0
        revision_count = 0
        failure_log: list[str] = []

        doc_ids: set[str] = set()

        for meta in metadatas:
            sym = str(meta.get("symbol", "ALL"))
            chunks_by_symbol[sym] = chunks_by_symbol.get(sym, 0) + 1

            cat = str(meta.get("doc_type", "OTHER"))
            chunks_by_category[cat] = chunks_by_category.get(cat, 0) + 1

            doc_id = str(meta.get("doc_id", ""))
            if doc_id:
                doc_ids.add(doc_id)

            if meta.get("reporting_period") or meta.get("basis"):
                table_aware_count += 1

            if meta.get("is_restated") in (True, "true", "True") or meta.get("superseded_by"):
                revision_count += 1

        # Check for missing canonical chunks
        for chunk in CANONICAL_RAG_DOCUMENTS:
            if chunk.chunk_id not in indexed_ids:
                failure_log.append(f"Missing chunk in vector index: {chunk.chunk_id}")

        quality_status = "VERIFIED" if not failure_log and len(indexed_ids) >= len(CANONICAL_RAG_DOCUMENTS) else "PARTIALLY_VERIFIED"

        report = RAGIndexingReport(
            generated_at=now_utc().isoformat(),
            total_chunks=len(indexed_ids),
            total_documents=len(doc_ids),
            chunks_by_symbol=chunks_by_symbol,
            chunks_by_category=chunks_by_category,
            table_aware_chunks_count=table_aware_count,
            revision_tracked_chunks_count=revision_count,
            prompt_injection_containment_active=True,
            index_quality_status=quality_status,
            failure_log=failure_log,
        )

        with open(self.manifest_file, "w", encoding="utf-8") as f:
            f.write(report.model_dump_json(indent=2))

        logger.info(
            f"RAG Indexing Complete: {report.total_chunks} chunks indexed across {report.total_documents} documents. "
            f"Status: {report.index_quality_status}."
        )
        return report


def get_ingestion_pipeline() -> DocumentIngestionPipeline:
    """Returns singleton instance of DocumentIngestionPipeline."""
    return DocumentIngestionPipeline()


if __name__ == "__main__":
    pipeline = get_ingestion_pipeline()
    report = pipeline.run_ingestion()
    print(f"RAG Indexing Report Generated: {report.total_chunks} chunks, Status: {report.index_quality_status}")
    print(f"Categories: {report.chunks_by_category}")
    print(f"Symbols: {len(report.chunks_by_symbol)} symbols covered")

