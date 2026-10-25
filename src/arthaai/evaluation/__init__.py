"""ArthaAI Evaluation Package.

Provides reproducible evaluation infrastructure for Phase 2:
- dataset: 44 versioned evaluation cases
- runner: Experiment runner with budget controls and result persistence
- metrics: Aggregate metrics and latency percentile computation
"""

from arthaai.evaluation.dataset import (
    ALL_CASES,
    DATASET_VERSION,
    EvaluationCase,
    EvaluationCategory,
    ExpectedOutcome,
    get_case_by_id,
    get_cases_by_category,
    get_dataset_summary,
)
from arthaai.evaluation.runner import (
    CaseResult,
    ExperimentReport,
    ExperimentRunner,
    RunnerConfig,
)

__all__ = [
    "ALL_CASES",
    "DATASET_VERSION",
    "EvaluationCase",
    "EvaluationCategory",
    "ExpectedOutcome",
    "get_case_by_id",
    "get_cases_by_category",
    "get_dataset_summary",
    "CaseResult",
    "ExperimentReport",
    "ExperimentRunner",
    "RunnerConfig",
]
