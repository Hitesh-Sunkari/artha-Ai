"""ArthaAI Evaluation Package.

Provides comprehensive, reproducible evaluation infrastructure:
- canonical dataset: 12 scenarios (Q01-Q06, S01-S06), 96 paired runs
- trace_adapter: OpenTelemetry span tree normalizer for agent lifecycle events
- evaluators: Programmatic evaluators (Numerical, Schema, Tools, Grounding, Roles)
- framework adapters: DeepEval & Ragas graceful integration
- persistence: Dual JSON & DuckDB persistent storage
- orchestrator: Stateful experiment orchestrator with SSE streaming
- master_benchmark: High-level canonical benchmark engine
"""

from arthaai.evaluation.trace_adapter import (
    EvaluationSpan,
    TraceQualityMetrics,
    NormalizedTrace,
    TraceToEvaluationAdapter,
)
from arthaai.evaluation.evaluators import (
    EvaluationMetricResult,
    NumericalAccuracyEvaluator,
    SchemaValidityEvaluator,
    ToolSelectionEvaluator,
    CitationGroundingEvaluator,
    RoleAdherenceEvaluator,
    CompositeEvaluator,
)
from arthaai.evaluation.deepeval_adapter import DeepEvalAdapter, DeepEvalScoreResult
from arthaai.evaluation.ragas_adapter import RagasAdapter, RagasScoreResult
from arthaai.evaluation.persistence import (
    evaluation_repository,
    EvaluationRepository,
    HumanReviewRecord,
    FailureRecord,
)
from arthaai.evaluation.orchestrator import (
    benchmark_orchestrator,
    BenchmarkOrchestrator,
    OrchestratorProgress,
    SingleAgentBaselineRunner,
)
from arthaai.evaluation.master_benchmark import (
    benchmark_engine,
    MasterBenchmarkEngine,
    BenchmarkExperimentReport,
    ExecutionRecord,
    MetricScores,
    PairedComparisonResult,
)

from arthaai.evaluation.user_runs import (
    UserRunStore,
    compute_rouge_scores,
)

__all__ = [
    "UserRunStore",
    "compute_rouge_scores",
    "EvaluationSpan",
    "EvaluationSpan",
    "TraceQualityMetrics",
    "NormalizedTrace",
    "TraceToEvaluationAdapter",
    "EvaluationMetricResult",
    "NumericalAccuracyEvaluator",
    "SchemaValidityEvaluator",
    "ToolSelectionEvaluator",
    "CitationGroundingEvaluator",
    "RoleAdherenceEvaluator",
    "CompositeEvaluator",
    "DeepEvalAdapter",
    "DeepEvalScoreResult",
    "RagasAdapter",
    "RagasScoreResult",
    "evaluation_repository",
    "EvaluationRepository",
    "HumanReviewRecord",
    "FailureRecord",
    "benchmark_orchestrator",
    "BenchmarkOrchestrator",
    "OrchestratorProgress",
    "SingleAgentBaselineRunner",
    "benchmark_engine",
    "MasterBenchmarkEngine",
    "BenchmarkExperimentReport",
    "ExecutionRecord",
    "MetricScores",
    "PairedComparisonResult",
]
