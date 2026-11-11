"""ArthaAI Ragas Framework Integration Adapter.

Provides seamless integration with Ragas evaluation framework.
If Ragas is not installed in the environment, provides graceful fallback
with status="NOT_EVALUATED" and informative diagnostics without crashing.
"""

from __future__ import annotations

import logging
from typing import Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Check Ragas availability
try:
    import ragas  # noqa: F401
    RAGAS_AVAILABLE = True
except ImportError:
    RAGAS_AVAILABLE = False


class RagasScoreResult(BaseModel):
    """Normalized Ragas evaluation result."""
    framework: str = "Ragas"
    status: str = "COMPLETED" if RAGAS_AVAILABLE else "NOT_EVALUATED"
    is_available: bool = RAGAS_AVAILABLE
    context_precision: float | None = None
    context_recall: float | None = None
    faithfulness: float | None = None
    answer_relevancy: float | None = None
    harmonic_rag_score: float | None = None
    reason: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class RagasAdapter:
    """Wraps Ragas metrics with automatic graceful degradation."""

    @classmethod
    def is_available(cls) -> bool:
        return RAGAS_AVAILABLE

    @classmethod
    async def evaluate_rag(
        cls,
        question: str,
        answer: str,
        contexts: list[str] | None = None,
        ground_truth: str | None = None,
    ) -> RagasScoreResult:
        if not RAGAS_AVAILABLE:
            return RagasScoreResult(
                status="NOT_EVALUATED",
                is_available=False,
                context_precision=None,
                context_recall=None,
                faithfulness=None,
                answer_relevancy=None,
                harmonic_rag_score=None,
                reason="Ragas package is not installed in current environment. Graceful fallback active.",
                details={"fallback_mode": "graceful_skip"},
            )

        try:
            from datasets import Dataset
            from ragas import evaluate
            from ragas.metrics import (
                context_precision,
                context_recall,
                faithfulness,
                answer_relevancy,
            )

            data = {
                "question": [question],
                "answer": [answer],
                "contexts": [contexts or []],
            }
            if ground_truth:
                data["ground_truth"] = [ground_truth]

            dataset = Dataset.from_dict(data)
            metrics = [faithfulness, answer_relevancy]
            if contexts:
                metrics.append(context_precision)
            if ground_truth:
                metrics.append(context_recall)

            result = evaluate(dataset, metrics=metrics)

            f_score = float(result.get("faithfulness", 0.0)) * 100.0
            a_score = float(result.get("answer_relevancy", 0.0)) * 100.0
            cp_score = float(result.get("context_precision", 0.0)) * 100.0 if "context_precision" in result else None
            cr_score = float(result.get("context_recall", 0.0)) * 100.0 if "context_recall" in result else None

            # Harmonic mean
            valid_scores = [s for s in [f_score, a_score, cp_score, cr_score] if s is not None and s > 0]
            harmonic = (len(valid_scores) / sum(1.0 / s for s in valid_scores)) if valid_scores else None

            return RagasScoreResult(
                status="COMPLETED",
                is_available=True,
                faithfulness=round(f_score, 2),
                answer_relevancy=round(a_score, 2),
                context_precision=round(cp_score, 2) if cp_score is not None else None,
                context_recall=round(cr_score, 2) if cr_score is not None else None,
                harmonic_rag_score=round(harmonic, 2) if harmonic is not None else None,
                reason="Evaluated successfully with Ragas.",
                details={k: round(float(v), 4) for k, v in result.items()},
            )
        except Exception as e:
            logger.warning("Ragas evaluation failed: %s", e)
            return RagasScoreResult(
                status="ERROR",
                is_available=True,
                reason=f"Ragas runtime exception: {e}",
                details={"error": str(e)},
            )

