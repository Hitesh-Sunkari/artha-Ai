"""RAG package exposing document corpus and hybrid retrieval engine."""

from arthaai.rag.citation_verifier import (
    CitationAuditSummary,
    CitationValidationResult,
    CitationVerifier,
    get_citation_verifier,
)
from arthaai.rag.documents import DocumentChunk, REGULATORY_AND_STATUTORY_CHUNKS
from arthaai.rag.retriever import RAGRetriever, RetrievalResult, get_rag_retriever

__all__ = [
    "CitationAuditSummary",
    "CitationValidationResult",
    "CitationVerifier",
    "get_citation_verifier",
    "DocumentChunk",
    "REGULATORY_AND_STATUTORY_CHUNKS",
    "RAGRetriever",
    "RetrievalResult",
    "get_rag_retriever",
]
