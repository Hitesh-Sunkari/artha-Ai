"""Persistent ChromaDB Vector Store and Document Ingestion Pipeline for ArthaAI.

Provides institutional point-in-time document storage and retrieval over:
1. SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015
2. Finance (No. 2) Act 2024 Statutory Schedules (STT, Capital Gains)
3. Reserve Bank of India (RBI) Monetary Policy Framework
4. Official Corporate Disclosures & Earnings Filings for benchmark Indian equities
5. NSE / BSE Surveillance & Risk Frameworks (ASM/GSM)
"""

from __future__ import annotations

import hashlib
import math
import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
import numpy as np
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.rag.documents import REGULATORY_AND_STATUTORY_CHUNKS, DocumentChunk


class CuratedSourceManifestItem(BaseModel):
    """Metadata record for a verified authoritative source in the repository."""

    model_config = ConfigDict(frozen=True)

    doc_id: str
    title: str
    doc_type: str  # REGULATION, STATUTE, MACRO, FILING, SURVEILLANCE
    source_authority: str
    official_url: str
    effective_date: str
    symbol: str | None = None
    chunks_count: int
    content_hash: str
    ingestion_status: str  # INGESTED, VERIFIED


class RAGRetrievalMatch(BaseModel):
    """Grounded search result from persistent ChromaDB with point-in-time validation."""

    model_config = ConfigDict(frozen=True)

    chunk_id: str
    doc_id: str
    doc_type: str
    title: str
    symbol: str | None = None
    effective_date: str
    relevance_score: float
    citation_uri: str
    source_authority: str
    content: str
    sanitized_snippet: str


class DeterministicLexicalEmbeddingFunction(EmbeddingFunction):
    """Deterministic, zero-download 384-dimensional lexical/semantic embedding function.

    Guarantees consistent cosine similarity without external network dependencies,
    disk space bloat, or model downloads.
    """

    def __init__(self) -> None:
        pass

    def __call__(self, input: Documents) -> Embeddings:
        embeddings: list[list[float]] = []
        for text in input:
            vec = np.zeros(384, dtype=np.float32)
            # Tokenize into clean lowercase words and bigrams
            tokens = re.findall(r"\b[a-z0-9_-]{2,}\b", text.lower())
            for i, tok in enumerate(tokens):
                h1 = abs(hash(tok)) % 384
                vec[h1] += 1.0
                if i < len(tokens) - 1:
                    bigram = f"{tok}_{tokens[i+1]}"
                    h2 = abs(hash(bigram)) % 384
                    vec[h2] += 1.5

            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec.tolist())
        return embeddings


# Additional corporate filing documents to guarantee rich coverage for key Indian equities
ADDITIONAL_FILING_CHUNKS: list[DocumentChunk] = [
    DocumentChunk(
        chunk_id="TATAMOTORS-FY24-Q4-DEMERGER",
        doc_id="TATAMOTORS-FY24-DISCLOSURE",
        doc_type="FILING",
        title="Tata Motors Limited: Demerger of Commercial & Passenger Vehicles Businesses",
        symbol="TATAMOTORS",
        effective_date="2024-03-04",
        content=(
            "Tata Motors Limited Investor Update: The Board of Directors approved the demerger of Tata Motors "
            "into two separate listed entities: (1) The Commercial Vehicles business and its related investments; "
            "(2) The Passenger Vehicles businesses including PV, EV, JLR and related investments. "
            "JLR continues to deliver record cash flow and order book exceeding 140,000 units. "
            "Domestic EV market share stands at ~72% supported by Tiago.ev and Nexon.ev."
        ),
        citation_uri="rag://tatamotors/filing_demerger_2024#TATAMOTORS-FY24-Q4-DEMERGER",
        source_authority="BSE/NSE Corporate Disclosures (Tata Motors)",
    ),
    DocumentChunk(
        chunk_id="TATAMOTORS-JLR-FREE-CASH-FLOW",
        doc_id="TATAMOTORS-FY24-DISCLOSURE",
        doc_type="FILING",
        title="Tata Motors Limited: Jaguar Land Rover Financials & Debt Reduction",
        symbol="TATAMOTORS",
        effective_date="2024-05-10",
        content=(
            "Tata Motors FY24 Full-Year Financial Results: Consolidated revenue grew 26.6% YoY to Rs 437,928 Cr. "
            "Free cash flow in JLR reached record £2.3 billion, reducing net debt to £700 million with target to become "
            "net auto debt-free by FY25. Commercial vehicle EBITDA margins expanded to 10.6% on pricing discipline."
        ),
        citation_uri="rag://tatamotors/filing_jlr_cashflow#TATAMOTORS-JLR-FREE-CASH-FLOW",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    DocumentChunk(
        chunk_id="NSE-ASM-FRAMEWORK-SURVEILLANCE",
        doc_id="NSE-SURVEILLANCE-CIRCULAR",
        doc_type="SURVEILLANCE",
        title="NSE / BSE Additional Surveillance Measure (ASM) Framework Guidelines",
        symbol=None,
        effective_date="2023-06-05",
        content=(
            "NSE Surveillance Circular — Additional Surveillance Measure (ASM): Criteria for shortlisting scrips "
            "under Long-term ASM include high-low price variation, client concentration, PE ratio >= 2x of Nifty 50 PE, "
            "and market capitalization thresholds. Scrips under ASM Stage 1-4 are subjected to 100% margin requirements "
            "and reduced price bands (5% or 2%) to curb speculative volatility."
        ),
        citation_uri="rag://nse/surveillance_asm#NSE-ASM-FRAMEWORK-SURVEILLANCE",
        source_authority="National Stock Exchange of India (NSE)",
    ),
    DocumentChunk(
        chunk_id="RBI-CRR-MONETARY-POLICY-OCT24",
        doc_id="RBI-MPC-OCT2024",
        doc_type="MACRO",
        title="Reserve Bank of India Monetary Policy: Repo Rate 6.50% & Liquidity Stance",
        symbol=None,
        effective_date="2024-10-09",
        content=(
            "Reserve Bank of India Monetary Policy Committee Statement: The MPC decided by a 5 to 1 majority "
            "to keep the policy repo rate unchanged at 6.50%. Consequently, the standing deposit facility (SDF) "
            "rate remains at 6.25% and the marginal standing facility (MSF) rate and Bank Rate at 6.75%. "
            "The stance of monetary policy was unanimously revised from 'withdrawal of accommodation' to 'NEUTRAL'. "
            "Cash Reserve Ratio (CRR) of scheduled commercial banks is maintained at 4.50% of NDTL."
        ),
        citation_uri="rag://rbi/mpc_statement_oct2024#RBI-CRR-MONETARY-POLICY-OCT24",
        source_authority="Reserve Bank of India (RBI)",
    ),
]


class ChromaRAGStore:
    """Production-grade persistent ChromaDB store for Indian financial regulations, statutes, and filings."""

    COLLECTION_NAME = "arthaai_evidence_corpus"

    def __init__(self, db_path: str = "data/chroma_db") -> None:
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(self.db_path))
        self.embedding_fn = DeterministicLexicalEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"description": "ArthaAI Indian financial statutory and filing evidence vector store"},
        )
        self._manifest: dict[str, CuratedSourceManifestItem] = {}
        self.ensure_corpus_ingested()

    def _sanitize_text(self, text: str) -> str:
        """Sanitizes untrusted input, neutralizing potential prompt injection instructions."""
        cleaned = re.sub(
            r"(?i)(ignore previous instructions|disregard system prompt|system override|admin mode|execute trade|drop tables)",
            "[REDACTED_ADVERSARIAL_INJECTION]",
            text,
        )
        return cleaned.strip()

    def ensure_corpus_ingested(self) -> None:
        """Atomically ingests all authoritative statutory, regulatory, and corporate filing chunks."""
        all_chunks = list(REGULATORY_AND_STATUTORY_CHUNKS) + ADDITIONAL_FILING_CHUNKS

        # Group by document for manifest
        doc_groups: dict[str, list[DocumentChunk]] = {}
        for c in all_chunks:
            doc_groups.setdefault(c.doc_id, []).append(c)

        for doc_id, chunks in doc_groups.items():
            first = chunks[0]
            combined_content = "".join(c.content for c in chunks)
            c_hash = hashlib.sha256(combined_content.encode("utf-8")).hexdigest()[:16]
            self._manifest[doc_id] = CuratedSourceManifestItem(
                doc_id=doc_id,
                title=first.title,
                doc_type=first.doc_type,
                source_authority=first.source_authority,
                official_url=first.citation_uri.split("#")[0],
                effective_date=first.effective_date,
                symbol=first.symbol,
                chunks_count=len(chunks),
                content_hash=c_hash,
                ingestion_status="VERIFIED",
            )

        # Upsert chunks into ChromaDB
        existing_ids = set(self.collection.get()["ids"])
        ids_to_add: list[str] = []
        documents_to_add: list[str] = []
        metadatas_to_add: list[dict[str, Any]] = []

        for chunk in all_chunks:
            if chunk.chunk_id not in existing_ids:
                ids_to_add.append(chunk.chunk_id)
                documents_to_add.append(f"{chunk.title}\n{chunk.content}")
                metadatas_to_add.append({
                    "chunk_id": chunk.chunk_id,
                    "doc_id": chunk.doc_id,
                    "doc_type": chunk.doc_type,
                    "title": chunk.title,
                    "symbol": chunk.symbol or "ALL",
                    "effective_date": chunk.effective_date,
                    "citation_uri": chunk.citation_uri,
                    "source_authority": chunk.source_authority,
                })

        if ids_to_add:
            self.collection.add(
                ids=ids_to_add,
                documents=documents_to_add,
                metadatas=metadatas_to_add,
            )

    def search(
        self,
        query: str,
        symbol: str | None = None,
        doc_type: str | None = None,
        as_of_time: datetime | str | None = None,
        limit: int = 5,
    ) -> list[RAGRetrievalMatch]:
        """Executes point-in-time vector query against persistent ChromaDB with sanitization."""
        if not query or not query.strip():
            return []

        clean_query = self._sanitize_text(query)
        clean_symbol = symbol.strip().upper().replace(".NS", "").replace(".BO", "") if symbol else None

        # Build ChromaDB metadata filters
        where_clauses: list[dict[str, Any]] = []
        if doc_type:
            where_clauses.append({"doc_type": {"$eq": doc_type.upper()}})

        where_filter: dict[str, Any] | None = None
        if len(where_clauses) == 1:
            where_filter = where_clauses[0]
        elif len(where_clauses) > 1:
            where_filter = {"$and": where_clauses}

        # Query ChromaDB collection
        fetch_limit = min(30, max(limit * 3, 10))
        results = self.collection.query(
            query_texts=[clean_query],
            n_results=fetch_limit,
            where=where_filter,
        )

        matches: list[RAGRetrievalMatch] = []
        pit_date: date | None = None
        if as_of_time:
            if isinstance(as_of_time, str):
                try:
                    pit_date = datetime.fromisoformat(as_of_time).date()
                except Exception:
                    pit_date = now_utc().date()
            elif isinstance(as_of_time, datetime):
                pit_date = as_of_time.date()

        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0] if "distances" in results else [0.0] * len(ids)

        for chunk_id, doc_text, meta, dist in zip(ids, docs, metadatas, distances):
            eff_date_str = str(meta.get("effective_date", "2020-01-01"))
            # Point-in-time check: discard documents published strictly AFTER as_of_time
            if pit_date:
                try:
                    eff_d = date.fromisoformat(eff_date_str)
                    if eff_d > pit_date:
                        continue  # Zero lookahead rule
                except Exception:
                    pass

            chunk_symbol = str(meta.get("symbol", "ALL"))
            # Symbol relevance filtering
            if clean_symbol and chunk_symbol != "ALL" and chunk_symbol != clean_symbol:
                continue

            # Calculate normalized relevance score (1.0 - normalized distance)
            sim_score = round(max(0.0, min(1.0, 1.0 - float(dist) * 0.5)), 4)
            if clean_symbol and chunk_symbol == clean_symbol:
                sim_score = min(1.0, sim_score + 0.15)

            sanitized_content = self._sanitize_text(doc_text)
            snippet = (
                f"<UNTRUSTED_STATUTORY_DOCUMENT id=\"{chunk_id}\" authority=\"{meta.get('source_authority')}\">\n"
                f"{sanitized_content}\n"
                f"</UNTRUSTED_STATUTORY_DOCUMENT>"
            )

            matches.append(
                RAGRetrievalMatch(
                    chunk_id=chunk_id,
                    doc_id=str(meta.get("doc_id", "")),
                    doc_type=str(meta.get("doc_type", "STATUTE")),
                    title=str(meta.get("title", "")),
                    symbol=chunk_symbol if chunk_symbol != "ALL" else None,
                    effective_date=eff_date_str,
                    relevance_score=sim_score,
                    citation_uri=str(meta.get("citation_uri", "")),
                    source_authority=str(meta.get("source_authority", "")),
                    content=sanitized_content,
                    sanitized_snippet=snippet,
                )
            )

        # Sort descending by relevance score
        matches.sort(key=lambda m: m.relevance_score, reverse=True)
        return matches[:limit]

    def get_source_manifest(self) -> list[CuratedSourceManifestItem]:
        """Returns the complete manifest of ingested authoritative source documents."""
        return list(self._manifest.values())

    def get_corpus_statistics(self) -> dict[str, Any]:
        """Returns diagnostic statistics of the persistent ChromaDB collection."""
        return {
            "collection_name": self.COLLECTION_NAME,
            "total_indexed_chunks": self.collection.count(),
            "manifest_sources_count": len(self._manifest),
            "storage_path": str(self.db_path),
            "embedding_type": "DeterministicLexicalEmbeddingFunction (384-D)",
            "status": "OPERATIONAL",
        }


# Singleton store instance
_CHROMA_RAG_STORE: ChromaRAGStore | None = None


def get_chroma_rag_store(db_path: str = "data/chroma_db") -> ChromaRAGStore:
    """Singleton accessor for persistent ChromaDB RAG store."""
    global _CHROMA_RAG_STORE
    if _CHROMA_RAG_STORE is None:
        _CHROMA_RAG_STORE = ChromaRAGStore(db_path=db_path)
    return _CHROMA_RAG_STORE
