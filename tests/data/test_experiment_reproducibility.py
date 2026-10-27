"""Tests for experiment manifests, reproducibility fingerprints, and configuration tracking."""

import pytest

from arthaai.control_plane.experiments.manifest import (
    ExperimentManifest,
    ExperimentRegistry,
)
from arthaai.core.errors import RegistryError


@pytest.fixture
def sample_experiment_manifest():
    return ExperimentManifest(
        experiment_id="EXP_MOMENTUM_2024_A",
        dataset_ids=["DS_NSE_NIFTY_2024", "DS_NSE_BANKNIFTY_2024"],
        dataset_fingerprints={
            "DS_NSE_NIFTY_2024": "a1b2c3d4e5f6071829",
            "DS_NSE_BANKNIFTY_2024": "f9e8d7c6b5a4132435",
        },
        market_rule_hash="999888777666555444333222111000aabbccddeeff",
        calendar_hash="11223344556677889900aabbccddeeff11223344",
        schema_versions={"ohlcv": "1.0.0", "trade": "1.0.0"},
        config={"lookback_days": 20, "rebalance_freq": "1W", "threshold": 0.05},
        code_commit="git_commit_abc1234",
        random_seed=42,
    )


def test_identical_experiments_produce_identical_fingerprint(sample_experiment_manifest):
    """Two experiments with identical parameters must have bit-exact fingerprints."""
    exp1 = sample_experiment_manifest
    # Create duplicate with identical parameters
    exp2 = ExperimentManifest(
        experiment_id="EXP_MOMENTUM_2024_B",  # different ID, same inputs
        dataset_ids=list(exp1.dataset_ids),
        dataset_fingerprints=dict(exp1.dataset_fingerprints),
        market_rule_hash=exp1.market_rule_hash,
        calendar_hash=exp1.calendar_hash,
        schema_versions=dict(exp1.schema_versions),
        config=dict(exp1.config),
        code_commit=exp1.code_commit,
        random_seed=exp1.random_seed,
    )

    f1 = exp1.compute_experiment_fingerprint()
    f2 = exp2.compute_experiment_fingerprint()
    assert f1 == f2
    assert len(f1) == 64


def test_changing_random_seed_changes_fingerprint(sample_experiment_manifest):
    """Changing only the random seed must produce a different experiment fingerprint."""
    exp1 = sample_experiment_manifest
    exp2 = exp1.model_copy(update={"random_seed": 43})

    assert exp1.compute_experiment_fingerprint() != exp2.compute_experiment_fingerprint()


def test_changing_market_rule_hash_changes_fingerprint(sample_experiment_manifest):
    """Changing market rules (e.g. STT revision or lot size) alters the experiment fingerprint."""
    exp1 = sample_experiment_manifest
    exp2 = exp1.model_copy(update={"market_rule_hash": "modified_rule_hash_123456"})

    assert exp1.compute_experiment_fingerprint() != exp2.compute_experiment_fingerprint()


def test_experiment_registry_comparison_detects_diffs(sample_experiment_manifest):
    """Verify ExperimentRegistry can compare two experiments and pinpoint exact diffs."""
    reg = ExperimentRegistry()
    exp1 = sample_experiment_manifest
    exp2 = exp1.model_copy(update={
        "experiment_id": "EXP_MOMENTUM_2024_VAR",
        "config": {"lookback_days": 30, "rebalance_freq": "1W", "threshold": 0.05},
        "random_seed": 99,
    })

    reg.register(exp1)
    reg.register(exp2)

    diffs = reg.compare("EXP_MOMENTUM_2024_A", "EXP_MOMENTUM_2024_VAR")
    assert diffs["identical"] is False
    assert "config" in diffs
    assert "random_seed" in diffs
    assert diffs["random_seed"]["exp_1"] == 42
    assert diffs["random_seed"]["exp_2"] == 99


def test_duplicate_experiment_id_raises_registry_error(sample_experiment_manifest):
    """Verify registering an experiment with an existing ID raises RegistryError."""
    reg = ExperimentRegistry()
    reg.register(sample_experiment_manifest)

    with pytest.raises(RegistryError, match="already registered"):
        reg.register(sample_experiment_manifest)
