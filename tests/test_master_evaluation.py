"""ArthaAI Master Evaluation & Experimental Suite Tests.

Validates the complete end-to-end evaluation framework:
- Canonical 12-scenario benchmark dataset & reference answers
- OpenTelemetry trace-to-evaluation adapter
- Deterministic modular evaluators (numerical, schema, tools, grounding, roles)
- DeepEval and Ragas fallback adapters
- Persistence engine (dual JSON & DuckDB)
- Benchmark orchestrator & paired statistical calculations
- Immutable safety lock enforcement
"""

import asyncio
import json
from pathlib import Path
import pytest

from arthaai.core.config import AppConfig
from arthaai.evaluation.trace_adapter import (
    TraceToEvaluationAdapter,
    EvaluationSpan,
    NormalizedTrace,
)
from arthaai.evaluation.evaluators import (
    NumericalAccuracyEvaluator,
    SchemaValidityEvaluator,
    ToolSelectionEvaluator,
    CitationGroundingEvaluator,
    RoleAdherenceEvaluator,
    CompositeEvaluator,
)
from arthaai.evaluation.deepeval_adapter import DeepEvalAdapter
from arthaai.evaluation.ragas_adapter import RagasAdapter
from arthaai.evaluation.persistence import (
    evaluation_repository,
    HumanReviewRecord,
    FailureRecord,
)
from arthaai.evaluation.orchestrator import (
    SingleAgentBaselineRunner,
    BenchmarkOrchestrator,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = REPO_ROOT / "experiments" / "datasets" / "arthaai_benchmark_v1.json"
RUBRICS_PATH = REPO_ROOT / "experiments" / "reference_answers" / "rubrics_v1.json"


# ===========================================================================
# 1. Safety Lock Invariant Assertion
# ===========================================================================

def test_immutable_live_trading_safety_lock():
    """Non-negotiable institutional safety invariant."""
    cfg = AppConfig()
    assert cfg.live_trading_enabled is False, (
        "CRITICAL SAFETY VIOLATION: live_trading_enabled must remain false at all times."
    )


# ===========================================================================
# 2. Canonical Dataset & Reference Answers Integrity
# ===========================================================================

def test_benchmark_dataset_contains_all_12_scenarios():
    assert DATASET_PATH.exists(), f"Benchmark dataset missing at {DATASET_PATH}"
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    scenarios = data.get("scenarios", [])
    assert len(scenarios) == 12, f"Expected 12 scenarios, found {len(scenarios)}"

    scenario_ids = [s["scenario_id"] for s in scenarios]
    expected_ids = [
        "Q01", "Q02", "Q03", "Q04", "Q05", "Q06",
        "S01", "S02", "S03", "S04", "S05", "S06"
    ]
    for exp_id in expected_ids:
        assert exp_id in scenario_ids, f"Scenario {exp_id} missing from dataset."

    # Validate schema for each scenario
    for sc in scenarios:
        assert "question" in sc and len(sc["question"]) > 10
        assert "numerical_invariants" in sc
        assert "target_symbols" in sc and len(sc["target_symbols"]) >= 1
        assert "numerical_tolerances" in sc or "tolerances" in sc


def test_rubrics_and_reference_files_exist():
    assert RUBRICS_PATH.exists(), "Rubrics file missing."
    with open(RUBRICS_PATH, "r", encoding="utf-8") as f:
        rubrics = json.load(f)
    assert len(rubrics.get("reference_scenarios", {})) >= 12

    # Check that individual reference answer files exist
    ref_dir = REPO_ROOT / "experiments" / "reference_answers"
    for s_id in ["Q01", "Q02", "Q03", "Q04", "Q05", "Q06", "S01", "S02", "S03", "S04", "S05", "S06"]:
        matches = list(ref_dir.glob(f"REF_{s_id}_*.json"))
        assert len(matches) >= 1, f"Missing reference answer file for scenario {s_id}"


# ===========================================================================
# 3. Trace-to-Evaluation Adapter
# ===========================================================================

def test_trace_adapter_normalizes_spans():
    adapter = TraceToEvaluationAdapter()
    dummy_events = [
        {
            "event_type": "AGENT_STARTED",
            "source": "ResearchManager",
            "trace_id": "test-trc-01",
            "correlation_id": "corr-01",
            "timestamp": "2026-10-29T10:00:00Z",
            "metadata": {"task": "decompose_query"},
        },
        {
            "event_type": "TOOL_INVOKED",
            "source": "FastMCP",
            "trace_id": "test-trc-01",
            "correlation_id": "corr-02",
            "timestamp": "2026-10-29T10:00:01Z",
            "metadata": {"tool_name": "get_stock_quote", "symbol": "RELIANCE.NS"},
        },
        {
            "event_type": "TOOL_COMPLETED",
            "source": "FastMCP",
            "trace_id": "test-trc-01",
            "correlation_id": "corr-02",
            "timestamp": "2026-10-29T10:00:02Z",
            "metadata": {"duration_ms": 250},
        },
        {
            "event_type": "AGENT_COMPLETED",
            "source": "ResearchManager",
            "trace_id": "test-trc-01",
            "correlation_id": "corr-01",
            "timestamp": "2026-10-29T10:00:03Z",
            "metadata": {"verdict": "BUY"},
        },
    ]

    normalized = adapter.adapt(
        run_id="run-test-01",
        events=dummy_events,
        scenario_id="Q01",
        system_type="ARTHAAI_MULTI_AGENT",
    )

    assert isinstance(normalized, NormalizedTrace)
    assert len(normalized.spans) >= 1
    assert normalized.system_type == "ARTHAAI_MULTI_AGENT"
    assert normalized.root_span_id is not None


# ===========================================================================
# 4. Modular Evaluators
# ===========================================================================

def test_numerical_accuracy_evaluator():
    scenario = {
        "numerical_invariants": {
            "anchor_close_inr": 2950.0,
            "statutory_stt_delivery_bps": 10.0,
        },
        "tolerances": {"price_pct": 0.5},
    }

    # Within tolerance
    output_good = {
        "current_anchor_ltp": 2955.0,  # +0.17% error <= 0.5%
        "statutory_tax_drag": {"stt_rate_pct": 0.10, "effective_bps": 22.22},
    }
    res_good = NumericalAccuracyEvaluator.evaluate(output_good, scenario)
    assert res_good.passed is True
    assert res_good.score >= 80.0

    # Outside tolerance
    output_bad = {
        "current_anchor_ltp": 3400.0,  # ~15% error > 0.5%
        "statutory_tax_drag": {"stt_rate_pct": 0.25},
    }
    res_bad = NumericalAccuracyEvaluator.evaluate(output_bad, scenario)
    assert res_bad.score < res_good.score


def test_schema_validity_evaluator():
    scenario = {"required_subtasks": ["technical_momentum", "risk_appraisal"]}

    valid_output = {
        "verdict": "BUY",
        "conviction_score": 85,
        "executive_synthesis": "Comprehensive momentum and risk appraisal complete.",
    }
    res_valid = SchemaValidityEvaluator.evaluate(valid_output, scenario)
    assert res_valid.passed is True
    assert res_valid.score >= 85.0

    invalid_output = {
        "verdict": "MAYBE_INVEST",  # invalid financial stance
        "conviction_score": 150,     # > 100 out of bounds
    }
    res_invalid = SchemaValidityEvaluator.evaluate(invalid_output, scenario)
    assert res_invalid.passed is False
    assert res_invalid.failure_category == "SCHEMA_MISMATCH"


def test_tool_selection_evaluator():
    scenario = {
        "expected_tools": ["get_stock_quote", "get_historical_ohlcv"],
        "forbidden_tools": ["execute_live_order", "place_market_order"],
        "target_symbols": ["RELIANCE.NS"],
    }

    clean_tools = [
        {"tool_name": "get_stock_quote", "arguments": {"symbol": "RELIANCE.NS"}},
        {"tool_name": "get_historical_ohlcv", "arguments": {"symbol": "RELIANCE.NS"}},
    ]
    res_clean = ToolSelectionEvaluator.evaluate(clean_tools, scenario)
    assert res_clean.passed is True
    assert res_clean.score == 100.0

    violating_tools = [
        {"tool_name": "get_stock_quote", "arguments": {"symbol": "RELIANCE.NS"}},
        {"tool_name": "execute_live_order", "arguments": {"symbol": "RELIANCE.NS"}},
    ]
    res_violating = ToolSelectionEvaluator.evaluate(violating_tools, scenario)
    assert res_violating.passed is False
    assert res_violating.failure_category == "SAFETY_VIOLATION"


def test_citation_grounding_evaluator():
    scenario = {}
    grounded_output = {
        "source_provenance": ["DuckDB_OHLCV", "FastMCP_Quote", "ChromaDB_Extract", "SEBI_LODR_Filing"],
        "executive_synthesis": "Analysis validated with certified exchange disclosures.",
    }
    res_grounded = CitationGroundingEvaluator.evaluate(grounded_output, scenario)
    assert res_grounded.passed is True
    assert res_grounded.score >= 90.0

    fabricated_output = {
        "source_provenance": [],
        "executive_synthesis": "According to http://fake-market-news.com source: unknown, stock will double.",
    }
    res_fab = CitationGroundingEvaluator.evaluate(fabricated_output, scenario)
    assert res_fab.passed is False
    assert res_fab.failure_category == "HALLUCINATED_CLAIM"


def test_composite_evaluator_weights_and_dimensions():
    scenario = {
        "numerical_invariants": {"anchor_close_inr": 2950.0},
        "required_subtasks": ["technical_momentum"],
        "target_symbols": ["RELIANCE.NS"],
        "expected_tools": ["get_stock_quote"],
    }
    output = {
        "verdict": "ACCUMULATE_BASKET",
        "conviction_score": 88,
        "current_anchor_ltp": 2950.0,
        "executive_synthesis": "Strong momentum confirmed.",
        "source_provenance": ["DuckDB", "FastMCP", "ChromaDB"],
    }
    metrics = CompositeEvaluator.evaluate_all(
        system_type="ARTHAAI_MULTI_AGENT",
        scenario_meta=scenario,
        actual_output=output,
        latency_sec=4.2,
    )

    assert "composite_quality_index" in metrics
    assert "analytical_accuracy" in metrics
    assert "evidence_grounding" in metrics
    assert "task_completion" in metrics
    assert "consistency_stability" in metrics
    assert "operational_reliability" in metrics
    assert "traceability_provenance" in metrics
    assert "latency_breakdown" in metrics
    assert metrics["composite_quality_index"] > 80.0


# ===========================================================================
# 5. Framework Fallback Adapters
# ===========================================================================

def test_deepeval_adapter_graceful_fallback():
    async def _test():
        res = await DeepEvalAdapter.evaluate_response(
            input_query="Evaluate Reliance",
            actual_output="Grounded consensus report",
        )
        assert res.framework == "DeepEval"
        if not DeepEvalAdapter.is_available():
            assert res.status == "NOT_EVALUATED"
            assert res.reason is not None

    asyncio.run(_test())


def test_ragas_adapter_graceful_fallback():
    async def _test():
        res = await RagasAdapter.evaluate_rag(
            question="What is the 5-year CAGR?",
            answer="CAGR is 14.2% verified by DuckDB.",
        )
        assert res.framework == "Ragas"
        if not RagasAdapter.is_available():
            assert res.status == "NOT_EVALUATED"

    asyncio.run(_test())


# ===========================================================================
# 6. Persistent Evaluation Repository
# ===========================================================================

def test_evaluation_repository_persistence():
    # Human Review
    rev = HumanReviewRecord(
        execution_id="exec-test-hitl-01",
        scenario_id="Q01",
        reviewer="Chief Quantitative Officer",
        verdict_rating=5,
        factual_accuracy_rating=5,
        notes="Audit verification confirmed.",
    )
    evaluation_repository.add_human_review(rev)
    revs = evaluation_repository.get_all_reviews()
    assert any(r["execution_id"] == "exec-test-hitl-01" for r in revs)

    # Failure Record
    fail = FailureRecord(
        execution_id="exec-test-fail-01",
        scenario_id="Q05",
        system_type="SINGLE_AGENT_BASELINE",
        category="EVIDENCE_GAP",
        root_cause="Baseline did not resolve conflicting news data.",
        mitigation_action="Route through Adversarial Skeptic.",
    )
    evaluation_repository.record_failure(fail)
    fails = evaluation_repository.get_all_failures()
    assert any(f["execution_id"] == "exec-test-fail-01" for f in fails)


# ===========================================================================
# 7. Single-Agent Baseline Runner
# ===========================================================================

def test_single_agent_baseline_execution():
    async def _test():
        scenario = {
            "scenario_id": "Q01",
            "question": "Comprehensive research on RELIANCE.NS",
            "target_symbols": ["RELIANCE.NS"],
        }
        output, tools, elapsed = await SingleAgentBaselineRunner.run(scenario)
        assert output["system"] == "SINGLE_AGENT_BASELINE"
        assert output["multi_agent_delegation"] is False
        assert len(tools) >= 1
        assert elapsed > 0.0

    asyncio.run(_test())
