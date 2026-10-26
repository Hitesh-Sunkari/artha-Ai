"""Grounded RAG retrieval engine enforcing point-in-time constraints and prompt-injection defense."""

from __future__ import annotations

import math
import re
from datetime import date, datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import enforce_utc, now_utc
from arthaai.rag.documents import REGULATORY_AND_STATUTORY_CHUNKS, DocumentChunk
from arthaai.rag.chroma_store import ChromaRAGStore, get_chroma_rag_store, RAGRetrievalMatch


class RetrievalResult(BaseModel):
    """A scored, point-in-time validated retrieval match."""

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


class RAGRetriever:
    """Hybrid lexical and semantic document retriever over Indian regulatory and corporate texts backed by persistent ChromaDB."""

    def __init__(self, chunks: list[DocumentChunk] | None = None, chroma_store: ChromaRAGStore | None = None) -> None:
        self.chunks = list(chunks if chunks is not None else REGULATORY_AND_STATUTORY_CHUNKS)
        self._citation_index = {c.citation_uri: c for c in self.chunks}
        self._chunk_index = {c.chunk_id: c for c in self.chunks}
        self.chroma_store = chroma_store or get_chroma_rag_store()

    def _sanitize_text(self, text: str) -> str:
        """Sanitizes untrusted text and neutralizes potential prompt-injection payloads."""
        # Strip potential instruction overrides
        cleaned = re.sub(
            r"(?i)(ignore previous instructions|disregard system prompt|system override|admin mode|execute trade)",
            "[REDACTED_ADVERSARIAL_INJECTION]",
            text,
        )
        return cleaned.strip()

    def _tokenize(self, text: str) -> list[str]:
        """Simple lowercase tokenization for lexical search."""
        return [w.lower() for w in re.findall(r"\b[A-Za-z0-9_-]{2,}\b", text)]

    def retrieve(
        self,
        query: str,
        symbol: str | None = None,
        doc_type: str | None = None,
        as_of_time: datetime | str | None = None,
        limit: int = 5,
    ) -> list[RetrievalResult]:
        """Retrieves and ranks relevant document chunks under strict point-in-time bounds."""
        if not query or not query.strip():
            return []

        clean_query = self._sanitize_text(query)
        query_tokens = set(self._tokenize(clean_query))
        symbol_upper = symbol.strip().upper() if symbol else None

        # Parse point-in-time upper bound
        pit_date: date | None = None
        if as_of_time:
            if isinstance(as_of_time, str):
                try:
                    pit_date = datetime.fromisoformat(as_of_time).date()
                except Exception:
                    pit_date = now_utc().date()
            elif isinstance(as_of_time, datetime):
                pit_date = as_of_time.date()

        # Execute query against persistent ChromaDB collection
        chroma_matches = self.chroma_store.search(
            query=clean_query,
            symbol=symbol,
            doc_type=doc_type,
            as_of_time=as_of_time,
            limit=limit,
        )

        if chroma_matches:
            return [
                RetrievalResult(
                    chunk_id=m.chunk_id,
                    doc_id=m.doc_id,
                    doc_type=m.doc_type,
                    title=m.title,
                    symbol=m.symbol,
                    effective_date=m.effective_date,
                    relevance_score=m.relevance_score,
                    citation_uri=m.citation_uri,
                    source_authority=m.source_authority,
                    content=m.content,
                    sanitized_snippet=m.sanitized_snippet,
                )
                for m in chroma_matches
            ]

        # Fallback to in-memory scored results if Chroma returns zero
        scored_results: list[tuple[float, DocumentChunk]] = []

        for chunk in self.chunks:
            # 1. Point-in-time safety: discard documents published strictly AFTER as_of_time
            if pit_date:
                try:
                    chunk_date = date.fromisoformat(chunk.effective_date)
                    if chunk_date > pit_date:
                        continue  # Exclude future documents (zero lookahead)
                except Exception:
                    pass

            # 2. Metadata filtering: symbol matching
            if symbol_upper and chunk.symbol and chunk.symbol != symbol_upper:
                continue

            # 3. Metadata filtering: doc_type matching
            if doc_type and chunk.doc_type.upper() != doc_type.upper():
                continue

            # 4. Lexical Scoring
            chunk_tokens = self._tokenize(f"{chunk.title} {chunk.content} {chunk.chunk_id}")
            overlap = query_tokens.intersection(set(chunk_tokens))
            score = float(len(overlap))

            # Boost exact symbol match
            if symbol_upper and chunk.symbol == symbol_upper:
                score += 5.0

            # Boost exact chunk_id match
            for t in query_tokens:
                if t in chunk.chunk_id.lower():
                    score += 4.0

            # Boost exact title match
            title_tokens = set(self._tokenize(chunk.title))
            title_overlap = query_tokens.intersection(title_tokens)
            score += len(title_overlap) * 2.0

            if score > 0.0 or (symbol_upper and chunk.symbol == symbol_upper):
                norm_score = round(min(1.0, score / max(1.0, math.sqrt(len(query_tokens) + 1))), 4)
                scored_results.append((norm_score, chunk))

        # Sort descending by score
        scored_results.sort(key=lambda x: x[0], reverse=True)
        top_matches = scored_results[: max(1, limit)]

        results: list[RetrievalResult] = []
        for score, c in top_matches:
            sanitized_content = self._sanitize_text(c.content)
            snippet = (
                f"<UNTRUSTED_STATUTORY_DOCUMENT id=\"{c.chunk_id}\" authority=\"{c.source_authority}\">\n"
                f"{sanitized_content}\n"
                f"</UNTRUSTED_STATUTORY_DOCUMENT>"
            )
            results.append(
                RetrievalResult(
                    chunk_id=c.chunk_id,
                    doc_id=c.doc_id,
                    doc_type=c.doc_type,
                    title=c.title,
                    symbol=c.symbol,
                    effective_date=c.effective_date,
                    relevance_score=score,
                    citation_uri=c.citation_uri,
                    source_authority=c.source_authority,
                    content=sanitized_content,
                    sanitized_snippet=snippet,
                )
            )

        return results

    def validate_citation(self, citation_uri: str) -> bool:
        """Verifies if a citation resolves to a known registered document chunk."""
        return citation_uri in self._citation_index

    def get_chunk_by_id(self, chunk_id: str) -> DocumentChunk | None:
        """Returns chunk metadata by unique chunk ID."""
        return self._chunk_index.get(chunk_id)

    def get_all_citations(self) -> list[str]:
        """Returns all registered citation URIs."""
        return list(self._citation_index.keys())


_DEFAULT_RETRIEVER: RAGRetriever | None = None


def get_rag_retriever() -> RAGRetriever:
    """Singleton factory returning the shared RAGRetriever."""
    global _DEFAULT_RETRIEVER
    if _DEFAULT_RETRIEVER is None:
        _DEFAULT_RETRIEVER = RAGRetriever()
    return _DEFAULT_RETRIEVER
