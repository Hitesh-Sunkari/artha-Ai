"""Tests for Phase D: Quarantine Store, Error Isolation, and Pipeline Failure Modes."""

import json
from pathlib import Path
import pytest

from arthaai.core.config import DataConfig
from arthaai.data.quality.quarantine import QuarantineManager


@pytest.fixture
def temp_quarantine_mgr(tmp_path: Path) -> QuarantineManager:
    cfg = DataConfig(root=str(tmp_path))
    return QuarantineManager(cfg)


def test_quarantine_invalid_payload_persistence(temp_quarantine_mgr: QuarantineManager):
    invalid_raw = {
        "ticker": "INVALID_SYM",
        "corrupt_field": [None, "garbage", -99999],
        "message": "Malformed feed payload from test provider",
    }
    
    path = temp_quarantine_mgr.quarantine(
        source="test_websocket_stream",
        provider="mock_broker",
        raw_payload=invalid_raw,
        reason="Corrupt price packet: non-numeric close price",
        validation_errors=["close: float expected, got None", "high < low"],
    )
    
    assert path.exists()
    
    # Verify forensic retrieval
    records = temp_quarantine_mgr.list_quarantined_records(provider="mock_broker")
    assert len(records) == 1
    rec = records[0]
    assert rec["provider"] == "mock_broker"
    assert rec["quarantine_reason"] == "Corrupt price packet: non-numeric close price"
    assert len(rec["validation_errors"]) == 2
    assert "checksum" in rec


def test_quarantine_corrupt_string_payload(temp_quarantine_mgr: QuarantineManager):
    corrupt_str = "HTTP 502 Bad Gateway: Upstream provider gateway timeout"
    path = temp_quarantine_mgr.quarantine(
        source="nse_live_feed",
        provider="nse_direct",
        raw_payload=corrupt_str,
        reason="HTTP Gateway Failure",
    )
    assert path.exists()
    records = temp_quarantine_mgr.list_quarantined_records()
    assert len(records) == 1
    assert "502 Bad Gateway" in str(records[0]["raw_payload"])

