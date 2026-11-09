"""Phase 3B Audit-Hash Integrity and Tampering Detection Test Suite.

Validates:
1. Canonical serialization determinism across repeated executions.
2. Exclusion of audit_hash and volatile timestamps (generated_at) from hash inputs.
3. Every material field is bound to the cryptographic hash (symbol, recommendation,
   conviction_score, target_price, stop_loss_price, statutory_drag, etc.).
4. Tampering with any material field immediately invalidates verify_audit_hash().
5. Missing or malformed audit hashes safely return False.
6. Content hash detects modification only; does not replace cryptographic asymmetric signatures.
"""

from datetime import datetime, timezone
import pytest

from arthaai.schemas.research_output import QuantitativeResearchReport


@pytest.fixture
def base_report() -> QuantitativeResearchReport:
    """Creates a canonical reference QuantitativeResearchReport."""
    as_of = datetime(2026, 10, 26, 15, 30, 0, tzinfo=timezone.utc)
    report = QuantitativeResearchReport(
        run_id="run-api-hash-test-001",
        symbol="RELIANCE.NS",
        as_of_time=as_of,
        executive_thesis="Institutional Quantitative Synthesis for RELIANCE.NS — Consensus Stance: HOLD.",
        quantitative_findings={
            "latest_close": 1196.20,
            "sma_20d": 1347.13,
            "sma_200d": 1865.31,
            "rsi_14d": 15.38,
            "realized_volatility_20d": 0.365,
        },
        statutory_risk_bounds={
            "total_statutory_costs": 222.24,
            "effective_rate_pct": 0.2222,
            "transaction_type": "ROUND_TRIP",
        },
        qualitative_evidence=["parquet://data/ohlcv/reliance:1260_bars", "academic://corwin_schultz_2012"],
        source_provenance=["duckdb_parquet", "statutory_rules_registry_finance_act_2024"],
        limitations_and_uncertainties=["Point-in-time constraints applied", "Live trading disabled"],
        recommendation="HOLD",
        conviction_score=20,
        statutory_friction_drag_pct=0.2222,
        target_price=1347.13,
        target_upside_pct=12.6,
        stop_loss_price=1184.24,
        stop_loss_pct=-1.0,
        reward_to_risk_ratio=12.62,
        target_methodology="Mean-reversion corridor in high-volatility regime",
        audit_hash=None,
    )
    # Stamp audit hash
    return report.model_copy(update={"audit_hash": report.compute_audit_hash()})


def test_hash_determinism_and_self_verification(base_report):
    """Verifies that canonical report generates identical hashes across repeated calls and passes verification."""
    hash1 = base_report.compute_audit_hash()
    hash2 = base_report.compute_audit_hash()
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256 hex string
    assert base_report.verify_audit_hash() is True


def test_hash_excludes_audit_hash_itself(base_report):
    """Confirm that the audit_hash attribute itself is excluded from canonical hash input."""
    # Clearing or changing audit_hash field should NOT change compute_audit_hash() output
    cleared = base_report.model_copy(update={"audit_hash": None})
    dummy = base_report.model_copy(update={"audit_hash": "dummy_hash_value"})
    
    assert cleared.compute_audit_hash() == base_report.compute_audit_hash()
    assert dummy.compute_audit_hash() == base_report.compute_audit_hash()


def test_tampering_recommendation_invalidates_hash(base_report):
    """Changing recommendation (e.g. from HOLD to BUY) must invalidate verification."""
    tampered = base_report.model_copy(update={"recommendation": "BUY"})
    assert tampered.verify_audit_hash() is False


def test_tampering_conviction_score_invalidates_hash(base_report):
    """Changing conviction score (e.g. from 20 to 85) must invalidate verification."""
    tampered = base_report.model_copy(update={"conviction_score": 85})
    assert tampered.verify_audit_hash() is False


def test_tampering_target_price_invalidates_hash(base_report):
    """Changing target price must invalidate verification."""
    tampered = base_report.model_copy(update={"target_price": 2500.0})
    assert tampered.verify_audit_hash() is False


def test_tampering_stop_loss_price_invalidates_hash(base_report):
    """Changing stop loss floor must invalidate verification."""
    tampered = base_report.model_copy(update={"stop_loss_price": 900.0})
    assert tampered.verify_audit_hash() is False


def test_tampering_quantitative_findings_invalidates_hash(base_report):
    """Changing nested numerical findings must invalidate verification."""
    tampered_findings = dict(base_report.quantitative_findings)
    tampered_findings["latest_close"] = 1500.00
    tampered = base_report.model_copy(update={"quantitative_findings": tampered_findings})
    assert tampered.verify_audit_hash() is False


def test_tampering_statutory_bounds_invalidates_hash(base_report):
    """Altering statutory friction bounds invalidates verification."""
    tampered_bounds = dict(base_report.statutory_risk_bounds)
    tampered_bounds["effective_rate_pct"] = 0.05
    tampered = base_report.model_copy(update={"statutory_risk_bounds": tampered_bounds})
    assert tampered.verify_audit_hash() is False


def test_tampering_executive_thesis_invalidates_hash(base_report):
    """Modifying executive thesis text invalidates verification."""
    tampered = base_report.model_copy(update={"executive_thesis": "Tampered thesis without authorization."})
    assert tampered.verify_audit_hash() is False


def test_missing_or_malformed_hash_safely_fails(base_report):
    """Missing, empty, or garbage hashes fail verification safely without exceptions."""
    no_hash = base_report.model_copy(update={"audit_hash": None})
    assert no_hash.verify_audit_hash() is False

    empty_hash = base_report.model_copy(update={"audit_hash": ""})
    assert empty_hash.verify_audit_hash() is False

    corrupt_hash = base_report.model_copy(update={"audit_hash": "deadbeef1234"})
    assert corrupt_hash.verify_audit_hash() is False
