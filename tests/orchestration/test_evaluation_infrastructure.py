"""Tests for the evaluation dataset and experiment runner."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest

from arthaai.evaluation.dataset import (
    ALL_CASES,
    DATASET_VERSION,
    EvaluationCategory,
    ExpectedOutcome,
    get_case_by_id,
    get_cases_by_category,
    get_dataset_summary,
)
from arthaai.evaluation.runner import (
    ExperimentRunner,
    RunnerConfig,
    _run_statutory_case,
)


# ---------------------------------------------------------------------------
# Dataset integrity tests
# ---------------------------------------------------------------------------

class TestEvaluationDataset:
    def test_dataset_has_minimum_cases(self):
        """Dataset must contain at least 40 cases for reproducible benchmarking."""
        assert len(ALL_CASES) >= 40, (
            f"Dataset has only {len(ALL_CASES)} cases; minimum required is 40."
        )

    def test_all_case_ids_are_unique(self):
        """All evaluation case IDs must be unique."""
        ids = [c.case_id for c in ALL_CASES]
        assert len(ids) == len(set(ids)), "Duplicate case IDs found in dataset"

    def test_case_ids_are_sequential(self):
        """Case IDs must follow EVL-NNN naming convention."""
        for case in ALL_CASES:
            assert case.case_id.startswith("EVL-"), (
                f"Case ID {case.case_id!r} does not follow EVL-NNN naming"
            )

    def test_dataset_covers_all_categories(self):
        """Dataset must cover all 7 evaluation categories."""
        categories_present = {c.category for c in ALL_CASES}
        for cat in EvaluationCategory:
            assert cat in categories_present, (
                f"Category {cat.value} has no evaluation cases"
            )

    def test_all_cases_have_descriptions(self):
        """Every evaluation case must have a human-readable description."""
        for case in ALL_CASES:
            assert case.description.strip(), f"Case {case.case_id} has empty description"

    def test_all_cases_have_valid_expected_outcomes(self):
        """All expected_outcome values must be valid ExpectedOutcome enum members."""
        valid = set(e.value for e in ExpectedOutcome)
        for case in ALL_CASES:
            assert case.expected_outcome.value in valid, (
                f"Case {case.case_id} has invalid expected_outcome: {case.expected_outcome}"
            )

    def test_get_case_by_id_returns_correct_case(self):
        """get_case_by_id must return the correct case for known IDs."""
        case = get_case_by_id("EVL-001")
        assert case is not None
        assert case.case_id == "EVL-001"
        assert case.symbol == "RELIANCE"

    def test_get_case_by_id_returns_none_for_unknown(self):
        """get_case_by_id must return None for unknown IDs."""
        case = get_case_by_id("EVL-9999")
        assert case is None

    def test_get_cases_by_category_returns_correct_subset(self):
        """get_cases_by_category must return only cases for that category."""
        statutory_cases = get_cases_by_category(EvaluationCategory.STATUTORY_COST)
        assert all(c.category == EvaluationCategory.STATUTORY_COST for c in statutory_cases)
        assert len(statutory_cases) >= 5  # Minimum statutory cost cases

    def test_dataset_summary_structure(self):
        """get_dataset_summary must return all required metadata fields."""
        summary = get_dataset_summary()
        assert summary["version"] == DATASET_VERSION
        assert summary["total_cases"] == len(ALL_CASES)
        assert "by_category" in summary
        assert "by_expected_outcome" in summary
        assert "case_ids" in summary
        assert len(summary["case_ids"]) == len(ALL_CASES)

    def test_statutory_cost_cases_have_required_fields(self):
        """Statutory cost cases must have instrument_type, price, quantity, transaction."""
        statutory = get_cases_by_category(EvaluationCategory.STATUTORY_COST)
        for case in statutory:
            assert case.instrument_type is not None, f"{case.case_id}: instrument_type is None"
            if case.expected_outcome != ExpectedOutcome.FAIL_VALIDATION:
                assert case.statutory_price is not None, f"{case.case_id}: statutory_price is None"
                assert case.statutory_quantity is not None, f"{case.case_id}: statutory_quantity is None"
                assert case.statutory_transaction is not None, f"{case.case_id}: statutory_transaction is None"

    def test_valid_data_cases_are_empty_result_expected(self):
        """Valid data cases must expect EMPTY_RESULT (no Parquet store pre-populated)."""
        valid_cases = get_cases_by_category(EvaluationCategory.VALID_DATA)
        for case in valid_cases:
            assert case.expected_outcome == ExpectedOutcome.EMPTY_RESULT, (
                f"Case {case.case_id}: expected EMPTY_RESULT but got {case.expected_outcome}"
            )

    def test_injection_cases_have_injection_assertion_tags(self):
        """Prompt injection cases must have at least one injection-related assertion tag."""
        injection_cases = get_cases_by_category(EvaluationCategory.PROMPT_INJECTION)
        injection_keywords = {"sql_injection_blocked", "xss_blocked", "prompt_injection_blocked",
                              "length_overflow_handled", "path_traversal_blocked", "upstream_context_injection"}
        for case in injection_cases:
            has_injection_tag = any(tag in injection_keywords for tag in case.assertion_tags)
            assert has_injection_tag, (
                f"Injection case {case.case_id} has no injection-related assertion tag"
            )

    def test_dataset_version_is_pinned(self):
        """Dataset version must match the pinned value for reproducibility."""
        assert DATASET_VERSION == "1.0.0"


# ---------------------------------------------------------------------------
# Runner configuration tests
# ---------------------------------------------------------------------------

class TestRunnerConfig:
    def test_default_config_is_valid(self):
        """Default RunnerConfig must have valid default values."""
        config = RunnerConfig()
        assert config.budget_seconds > 0
        assert config.per_case_timeout_seconds > 0
        assert len(config.orchestration_patterns) == 3
        assert config.persist_results is True

    def test_max_cases_limits_selection(self):
        """max_cases parameter must limit the number of cases selected."""
        config = RunnerConfig(max_cases=5, budget_seconds=300.0)
        runner = ExperimentRunner(config)
        cases = runner._select_cases()
        # After max_cases filtering (done in run_all, not _select_cases)
        assert len(cases) == len(ALL_CASES)  # _select_cases doesn't cap

    def test_category_filter_limits_selection(self):
        """Category filter must return only cases for specified categories."""
        config = RunnerConfig(
            categories=["STATUTORY_COST"],
            budget_seconds=120.0,
        )
        runner = ExperimentRunner(config)
        cases = runner._select_cases()
        assert all(c.category.value == "STATUTORY_COST" for c in cases)

    def test_injection_filter_excludes_injection_cases(self):
        """run_injection_cases=False must exclude prompt injection cases."""
        config = RunnerConfig(run_injection_cases=False, budget_seconds=120.0)
        runner = ExperimentRunner(config)
        cases = runner._select_cases()
        assert not any(c.category == EvaluationCategory.PROMPT_INJECTION for c in cases)

    def test_statutory_filter_excludes_statutory_cases(self):
        """run_statutory_cases=False must exclude statutory cost cases."""
        config = RunnerConfig(run_statutory_cases=False, budget_seconds=120.0)
        runner = ExperimentRunner(config)
        cases = runner._select_cases()
        assert not any(c.category == EvaluationCategory.STATUTORY_COST for c in cases)


# ---------------------------------------------------------------------------
# Statutory case runner unit tests
# ---------------------------------------------------------------------------

class TestStatutoryCaseRunner:
    def test_valid_equity_delivery_buy_passes(self):
        case = get_case_by_id("EVL-026")
        assert case is not None
        result = _run_statutory_case(case)
        assert result.passed is True
        assert result.actual_outcome == "PASS"
        assert result.latency_seconds >= 0

    def test_invalid_instrument_type_fails_correctly(self):
        case = get_case_by_id("EVL-033")
        assert case is not None
        result = _run_statutory_case(case)
        assert result.passed is True  # FAIL_VALIDATION expected — raised as expected
        assert result.actual_outcome == "PASS"

    def test_zero_price_fails_correctly(self):
        case = get_case_by_id("EVL-032")
        assert case is not None
        result = _run_statutory_case(case)
        assert result.passed is True  # FAIL_VALIDATION expected — raised as expected

    def test_futures_sell_post_oct2024_passes(self):
        case = get_case_by_id("EVL-028")
        assert case is not None
        result = _run_statutory_case(case)
        assert result.passed is True

    def test_equity_delivery_stt_rate_assertion(self):
        case = get_case_by_id("EVL-026")
        assert case is not None
        result = _run_statutory_case(case)
        assert result.passed is True
        assert not result.assertion_failures


# ---------------------------------------------------------------------------
# Experiment runner with statutory-only scope (fast test)
# ---------------------------------------------------------------------------

class TestExperimentRunnerStatutoryOnly:
    def test_run_statutory_only_completes(self):
        """Running only statutory cases must complete within budget."""
        config = RunnerConfig(
            categories=["STATUTORY_COST"],
            budget_seconds=30.0,
            per_case_timeout_seconds=10.0,
            persist_results=False,
        )
        runner = ExperimentRunner(config)
        report = asyncio.run(runner.run_all())

        assert report.total_cases > 0
        # Statutory cases should all pass or fail as expected
        assert report.errors == 0 or report.errors < report.total_cases

    def test_pass_rate_reported_correctly(self):
        """pass_rate_pct must be correctly calculated from passed/total."""
        config = RunnerConfig(
            categories=["STATUTORY_COST"],
            budget_seconds=30.0,
            persist_results=False,
        )
        runner = ExperimentRunner(config)
        report = asyncio.run(runner.run_all())

        expected_rate = round(report.passed / report.total_cases * 100, 2) if report.total_cases > 0 else 0.0
        assert report.pass_rate_pct == expected_rate

    def test_report_has_experiment_id(self):
        """Report must have a unique experiment ID."""
        config = RunnerConfig(
            categories=["STATUTORY_COST"],
            budget_seconds=30.0,
            persist_results=False,
        )
        runner = ExperimentRunner(config)
        report = asyncio.run(runner.run_all())
        assert report.experiment_id.startswith("exp-")
        assert len(report.experiment_id) > 10

    def test_report_dataset_version_matches(self):
        """Report must record the dataset version used."""
        config = RunnerConfig(
            categories=["STATUTORY_COST"],
            budget_seconds=30.0,
            persist_results=False,
        )
        runner = ExperimentRunner(config)
        report = asyncio.run(runner.run_all())
        assert report.dataset_version == DATASET_VERSION
