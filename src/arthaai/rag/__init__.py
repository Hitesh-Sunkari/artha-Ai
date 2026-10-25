"""RAG package exposing document corpus and hybrid retrieval engine."""

from arthaai.rag.documents import DocumentChunk, REGULATORY_AND_STATUTORY_CHUNKS
from arthaai.rag.retriever import RAGRetriever, RetrievalResult, get_rag_retriever

__all__ = [
    "DocumentChunk",
    "REGULATORY_AND_STATUTORY_CHUNKS",
    "RAGRetriever",
    "RetrievalResult",
    "get_rag_retriever",
]
