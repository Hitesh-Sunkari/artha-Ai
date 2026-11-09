"""Corporate Actions Ingestion & Persistence Pipeline for ArthaAI.

Implements Sections 3 & 4 Requirements:
- Ingestion, validation, and Parquet persistence of dividends, splits, bonuses, and rights issues.
- Ex-date, record date, announcement date, ratios, cash dividend amounts.
- Adjustment factor recording (never silently alter historical raw prices).
- Raw record archiving in RawDataStore.
- Canonical persistence under data/parquet/corporate_actions/.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from arthaai.core.clock.timezone import now_utc
from arthaai.core.config import DataConfig
from arthaai.data.raw.store import RawDataStore
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.raw_record import DataMode, RawDataRecord

logger = logging.getLogger(__name__)


# Verified Corporate Actions from Official NSE/BSE Disclosures
SEED_CORPORATE_ACTIONS: list[dict[str, Any]] = [
    {
        "action_id": "ca-rel-bonus-202410",
        "symbol": "RELIANCE",
        "exchange": "NSE",
        "isin": "INE002A01018",
        "action_type": CorporateActionType.BONUS,
        "announcement_date": date(2024, 9, 5),
        "ex_date": date(2024, 10, 28),
        "record_date": date(2024, 10, 28),
        "ratio": "1:1",
        "ratio_numerator": 1.0,
        "ratio_denominator": 1.0,
        "adjustment_factor": 0.50,
        "adjustment_computed": True,
        "source": "NSE",
        "event_time": datetime(2024, 9, 5, 10, 0, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 9, 5, 10, 5, tzinfo=timezone.utc),
    },
    {
        "action_id": "ca-tcs-div-202410",
        "symbol": "TCS",
        "exchange": "NSE",
        "isin": "INE467B01029",
        "action_type": CorporateActionType.DIVIDEND,
        "announcement_date": date(2024, 10, 10),
        "ex_date": date(2024, 10, 18),
        "record_date": date(2024, 10, 18),
        "dividend_amount": 10.0,
        "dividend_type": "INTERIM",
        "source": "NSE",
        "event_time": datetime(2024, 10, 10, 12, 0, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 10, 12, 2, tzinfo=timezone.utc),
    },
    {
        "action_id": "ca-infy-div-202410",
        "symbol": "INFY",
        "exchange": "NSE",
        "isin": "INE009A01021",
        "action_type": CorporateActionType.DIVIDEND,
        "announcement_date": date(2024, 10, 17),
        "ex_date": date(2024, 10, 29),
        "record_date": date(2024, 10, 29),
        "dividend_amount": 21.0,
        "dividend_type": "INTERIM",
        "source": "NSE",
        "event_time": datetime(2024, 10, 17, 11, 0, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 17, 11, 3, tzinfo=timezone.utc),
    },
    {
        "action_id": "ca-tatasteel-split-202207",
        "symbol": "TATASTEEL",
        "exchange": "NSE",
        "isin": "INE081A01020",
        "action_type": CorporateActionType.SPLIT,
        "announcement_date": date(2022, 5, 3),
        "ex_date": date(2022, 7, 28),
        "record_date": date(2022, 7, 29),
        "ratio": "10:1",
        "ratio_numerator": 10.0,
        "ratio_denominator": 1.0,
        "adjustment_factor": 0.10,
        "adjustment_computed": True,
        "source": "NSE",
        "event_time": datetime(2022, 5, 3, 13, 0, tzinfo=timezone.utc),
        "availability_time": datetime(2022, 5, 3, 13, 5, tzinfo=timezone.utc),
    },
    {
        "action_id": "ca-hdfc-div-202405",
        "symbol": "HDFCBANK",
        "exchange": "NSE",
        "isin": "INE040A01034",
        "action_type": CorporateActionType.DIVIDEND,
        "announcement_date": date(2024, 4, 20),
        "ex_date": date(2024, 5, 10),
        "record_date": date(2024, 5, 10),
        "dividend_amount": 19.50,
        "dividend_type": "SPECIAL_INTERIM",
        "source": "NSE",
        "event_time": datetime(2024, 4, 20, 10, 30, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 4, 20, 10, 35, tzinfo=timezone.utc),
    },
    {
        "action_id": "ca-itc-div-202406",
        "symbol": "ITC",
        "exchange": "NSE",
        "isin": "INE154A01025",
        "action_type": CorporateActionType.DIVIDEND,
        "announcement_date": date(2024, 5, 23),
        "ex_date": date(2024, 6, 4),
        "record_date": date(2024, 6, 4),
        "dividend_amount": 7.50,
        "dividend_type": "FINAL",
        "source": "NSE",
        "event_time": datetime(2024, 5, 23, 12, 15, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 5, 23, 12, 20, tzinfo=timezone.utc),
    },
]


class CorporateActionsPipeline:
    """Manages corporate actions ingestion, Parquet persistence, and querying."""

    def __init__(self, data_config: DataConfig | None = None) -> None:
        self.data_config = data_config or DataConfig()
        self.ca_dir = self.data_config.parquet_dir / "corporate_actions"
        self.ca_dir.mkdir(parents=True, exist_ok=True)
        self.raw_store = RawDataStore(self.data_config.root)
        self._ensure_seed_records()

    def _ensure_seed_records(self) -> None:
        parquet_file = self.ca_dir / "corporate_actions.parquet"
        if not parquet_file.exists():
            for item in SEED_CORPORATE_ACTIONS:
                ca = CorporateAction(
                    action_id=item["action_id"],
                    symbol=item["symbol"],
                    exchange=item["exchange"],
                    isin=item.get("isin"),
                    action_type=item["action_type"],
                    announcement_date=item.get("announcement_date"),
                    ex_date=item["ex_date"],
                    record_date=item.get("record_date"),
                    ratio=item.get("ratio"),
                    ratio_numerator=item.get("ratio_numerator"),
                    ratio_denominator=item.get("ratio_denominator"),
                    dividend_amount=item.get("dividend_amount"),
                    dividend_type=item.get("dividend_type"),
                    adjustment_factor=item.get("adjustment_factor"),
                    adjustment_computed=item.get("adjustment_computed", False),
                    event_time=item["event_time"],
                    availability_time=item["availability_time"],
                    source=item["source"],
                    data_mode=DataMode.HISTORICAL,
                    schema_version="1.0.0",
                )
                self.persist_action(ca)

    def persist_action(self, action: CorporateAction) -> Path:
        """Persists corporate action to Parquet and archives raw payload."""
        parquet_file = self.ca_dir / "corporate_actions.parquet"

        row = {
            "action_id": action.action_id,
            "symbol": action.symbol.upper().strip(),
            "exchange": action.exchange,
            "isin": action.isin or "",
            "action_type": action.action_type.value,
            "announcement_date": action.announcement_date.isoformat() if action.announcement_date else "",
            "ex_date": action.ex_date.isoformat(),
            "record_date": action.record_date.isoformat() if action.record_date else "",
            "ratio": action.ratio or "",
            "ratio_numerator": action.ratio_numerator or 0.0,
            "ratio_denominator": action.ratio_denominator or 0.0,
            "dividend_amount": action.dividend_amount or 0.0,
            "dividend_type": action.dividend_type or "",
            "adjustment_factor": action.adjustment_factor or 1.0,
            "adjustment_computed": action.adjustment_computed,
            "source": action.source,
            "event_time": action.event_time.isoformat(),
            "availability_time": action.availability_time.isoformat(),
            "ingested_at": now_utc().isoformat(),
        }

        df = pd.DataFrame([row])
        if parquet_file.exists():
            existing = pd.read_parquet(parquet_file)
            existing = existing[existing["action_id"] != action.action_id]
            df = pd.concat([existing, df], ignore_index=True)

        table = pa.Table.from_pandas(df)
        pq.write_table(table, parquet_file)

        # Archive raw record
        now = now_utc()
        payload = action.model_dump(mode="json")
        raw_rec = RawDataRecord(
            record_id=str(uuid.uuid4()),
            provider=action.source.lower(),
            source="corporate_actions_feed",
            data_mode=action.data_mode,
            request_timestamp=now,
            received_timestamp=now,
            source_timestamp=action.event_time,
            instrument_symbol=action.symbol,
            instrument_exchange=action.exchange,
            payload=payload,
            checksum=RawDataRecord.compute_checksum(payload),
        )
        self.raw_store.write(raw_rec)

        return parquet_file

    def get_actions(
        self,
        symbol: str | None = None,
        action_type: CorporateActionType | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieves corporate actions matching query criteria."""
        parquet_file = self.ca_dir / "corporate_actions.parquet"
        if not parquet_file.exists():
            return []
        df = pd.read_parquet(parquet_file)

        if symbol:
            sym_clean = symbol.upper().strip()
            df = df[df["symbol"] == sym_clean]
        if action_type:
            df = df[df["action_type"] == action_type.value]
        if start_date:
            df = df[pd.to_datetime(df["ex_date"]) >= pd.to_datetime(start_date)]
        if end_date:
            df = df[pd.to_datetime(df["ex_date"]) <= pd.to_datetime(end_date)]

        return df.to_dict(orient="records")


_GLOBAL_CA_PIPELINE: CorporateActionsPipeline | None = None


def get_corporate_actions_pipeline() -> CorporateActionsPipeline:
    global _GLOBAL_CA_PIPELINE
    if _GLOBAL_CA_PIPELINE is None:
        _GLOBAL_CA_PIPELINE = CorporateActionsPipeline()
    return _GLOBAL_CA_PIPELINE
