# Research query engine package
from arthaai.data.research.dataset import ResearchDataset, verify_research_eligibility
from arthaai.data.research.duckdb_engine import DuckDBEngine

__all__ = ["DuckDBEngine", "ResearchDataset", "verify_research_eligibility"]
