"""ArthaAI DeepEval Framework Integration Adapter.

Provides seamless integration with DeepEval LLM evaluation framework.
If DeepEval is not installed in the environment, provides graceful fallback
with status="NOT_EVALUATED" and informative diagnostics without crashing.
"""

from __future__ import annotations

import logging
from typing import Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Check DeepEval availability
try:
    import deepeval  # noqa: F401
    DEEPEVAL_AVAILABLE = True
except ImportError:
    DEEPEVAL_AVAILABLE = False


class DeepEvalScoreResult(BaseModel):
    """Normalized DeepEval evaluation result."""
    framework: str = "DeepEval"
    status: str = "COMPLETED" if DEEPEVAL_AVAILABLE else "NOT_EVALUATED"
    is_available: bool = DEEPEVAL_AVAILABLE
    faithfulness_score: float | None = None
    answer_relevancy_score: float | None = None
    hallucination_score: float | None = None
    g_eval_score: float | None = None
    reason: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class DeepEvalAdapter:
    """Wraps DeepEval metrics with automatic graceful degradation."""

    @classmethod
    def is_available(cls) -> bool:
        return DEEPEVAL_AVAILABLE

    @classmethod
    async def evaluate_response(
        cls,
        input_query: str,
        actual_output: str,
        retrieval_context: list[str] | None = None,
        expected_output: str | None = None,
    ) -> DeepEvalScoreResult:
        if not DEEPEVAL_AVAILABLE:
            return DeepEvalScoreResult(
                status="NOT_EVALUATED",
                is_available=False,
                faithfulness_score=None,
                answer_relevancy_score=None,
                hallucination_score=None,
                g_eval_score=None,
                reason="DeepEval package is not installed in current environment. Graceful fallback active.",
                details={"fallback_mode": "graceful_skip"},
            )

        try:
            # If deepeval is installed, execute actual metrics
            from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric
            from deepeval.test_case import LLMTestCase

            test_case = LLMTestCase(
                input=input_query,
                actual_output=actual_output,
                retrieval_context=retrieval_context or [],
                expected_output=expected_output,
            )

            faithfulness = FaithfulnessMetric(threshold=0.7)
            relevancy = AnswerRelevancyMetric(threshold=0.7)

            faithfulness.measure(test_case)
            relevancy.measure(test_case)

            return DeepEvalScoreResult(
                status="COMPLETED",
                is_available=True,
                faithfulness_score=round(faithfulness.score * 100.0, 2),
                answer_relevancy_score=round(relevancy.score * 100.0, 2),
                hallucination_score=round((1.0 - faithfulness.score) * 100.0, 2),
                g_eval_score=round(((faithfulness.score + relevancy.score) / 2.0) * 100.0, 2),
                reason="Evaluated successfully with DeepEval.",
                details={
                    "faithfulness_reason": faithfulness.reason,
                    "relevancy_reason": relevancy.reason,
                },
            )
        except Exception as e:
            logger.warning("DeepEval execution failed: %s", e)
            return DeepEvalScoreResult(
                status="ERROR",
                is_available=True,
                reason=f"DeepEval runtime exception: {e}",
                details={"error": str(e)},
            )

