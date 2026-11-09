"""Macroeconomic and News Ingestion Pipelines for ArthaAI.

Section 7 Requirements:
- Configurable source registry for permitted news, company announcements, RBI publications,
  and official government statistical releases.
- Macroeconomic series: RBI Repo rate, SDF, MSF, CPI inflation, GDP growth, sovereign yields.
- News and regulatory disclosures: NSE corporate announcements, BSE disclosures, wire items.
- Deduplication via content hashes (SHA-256).
- Provenance tracking with raw payload archiving in RawDataStore.
- Canonical Parquet persistence under data/parquet/macro/ and data/parquet/news/.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import date, datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pydantic import BaseModel, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.core.config import DataConfig
from arthaai.data.raw.store import RawDataStore
from arthaai.data.schemas.economic import EconomicEvent, EconomicEventImpact
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.raw_record import DataMode, RawDataRecord

logger = logging.getLogger(__name__)


class SourceAccessMethod(str, Enum):
    OFFICIAL_BULK = "OFFICIAL_BULK"
    AUTHORIZED_API = "AUTHORIZED_API"
    RSS_FEED = "RSS_FEED"
    PUBLIC_BULLETIN = "PUBLIC_BULLETIN"


class SourceEntry(BaseModel):
    """Entry in the official configurable source registry."""
    source_id: str
    name: str
    authority: str
    access_method: SourceAccessMethod
    license_type: str = "OFFICIAL_PUBLIC_USE"
    coverage_scope: str
    update_frequency: str
    is_active: bool = True
    base_url: str | None = None


DEFAULT_SOURCE_REGISTRY: list[SourceEntry] = [
    SourceEntry(
        source_id="rbi_official",
        name="Reserve Bank of India Monetary Policy & Publications",
        authority="Reserve Bank of India (RBI)",
        access_method=SourceAccessMethod.OFFICIAL_BULK,
        coverage_scope="Policy repo rate, reverse repo, MSF, SDF, CRR, forex reserves, sovereign yield",
        update_frequency="BI_MONTHLY_AND_WEEKLY",
        base_url="https://www.rbi.org.in",
    ),
    SourceEntry(
        source_id="mospi_official",
        name="Ministry of Statistics and Programme Implementation",
        authority="MOSPI / CSO",
        access_method=SourceAccessMethod.PUBLIC_BULLETIN,
        coverage_scope="Consumer Price Index (CPI), GDP quarterly growth rates, IIP",
        update_frequency="MONTHLY_AND_QUARTERLY",
        base_url="https://www.mospi.gov.in",
    ),
    SourceEntry(
        source_id="nse_corp_announcements",
        name="NSE Corporate Announcements & Filings",
        authority="National Stock Exchange of India",
        access_method=SourceAccessMethod.AUTHORIZED_API,
        coverage_scope="Company financial results, board meetings, corporate actions, regulatory disclosures",
        update_frequency="NEAR_REAL_TIME",
        base_url="https://www.nseindia.com",
    ),
    SourceEntry(
        source_id="bse_corp_announcements",
        name="BSE Corporate Disclosures & LODR Filings",
        authority="BSE India Limited",
        access_method=SourceAccessMethod.PUBLIC_BULLETIN,
        coverage_scope="SEBI LODR Regulation 30 & 33 filings, shareholding patterns, credit rating updates",
        update_frequency="NEAR_REAL_TIME",
        base_url="https://www.bseindia.com",
    ),
    SourceEntry(
        source_id="authorized_financial_press",
        name="Financial News Wire Registry",
        authority="Syndicated Financial Press / Wire",
        access_method=SourceAccessMethod.RSS_FEED,
        coverage_scope="Sectoral developments, union budget analysis, earnings commentary",
        update_frequency="INTRA_DAY",
        base_url="https://www.financialexpress.com",
    ),
]


class SourceRegistry:
    """Configurable registry for authorized market data, regulatory and official sources."""

    def __init__(self, sources: list[SourceEntry] | None = None) -> None:
        self._sources: dict[str, SourceEntry] = {
            s.source_id: s for s in (sources or DEFAULT_SOURCE_REGISTRY)
        }

    def register_source(self, source: SourceEntry) -> None:
        self._sources[source.source_id] = source

    def get_source(self, source_id: str) -> SourceEntry | None:
        return self._sources.get(source_id)

    def list_sources(self) -> list[SourceEntry]:
        return list(self._sources.values())


# Verified Historical Benchmark Macroeconomic Events (RBI MPC, MOSPI CPI, GDP)
SEED_ECONOMIC_EVENTS: list[dict[str, Any]] = [
    {
        "event_id": "rbi-mpc-20241009",
        "category": "interest_rate",
        "title": "RBI Monetary Policy Committee Repo Rate Decision",
        "source": "RBI",
        "event_time": datetime(2024, 10, 9, 4, 30, tzinfo=timezone.utc),  # 10:00 AM IST
        "availability_time": datetime(2024, 10, 9, 4, 32, tzinfo=timezone.utc),
        "actual": "6.50%",
        "forecast": "6.50%",
        "previous": "6.50%",
        "unit": "%",
        "impact": EconomicEventImpact.HIGH,
        "affected_symbols": ["BANKNIFTY", "NIFTY50", "HDFCBANK", "ICICIBANK", "SBIN"],
    },
    {
        "event_id": "rbi-mpc-20240808",
        "category": "interest_rate",
        "title": "RBI MPC Repo Rate Decision August 2024",
        "source": "RBI",
        "event_time": datetime(2024, 8, 8, 4, 30, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 8, 8, 4, 31, tzinfo=timezone.utc),
        "actual": "6.50%",
        "forecast": "6.50%",
        "previous": "6.50%",
        "unit": "%",
        "impact": EconomicEventImpact.HIGH,
        "affected_symbols": ["BANKNIFTY", "NIFTY50"],
    },
    {
        "event_id": "mospi-cpi-202409",
        "category": "inflation",
        "title": "India All-India Consumer Price Index (CPI) Headline YoY",
        "source": "MOSPI",
        "event_time": datetime(2024, 10, 14, 12, 0, tzinfo=timezone.utc),  # 5:30 PM IST
        "availability_time": datetime(2024, 10, 14, 12, 2, tzinfo=timezone.utc),
        "actual": "5.49%",
        "forecast": "5.10%",
        "previous": "3.65%",
        "unit": "%",
        "impact": EconomicEventImpact.HIGH,
        "affected_symbols": ["NIFTY50", "BANKNIFTY", "ITC", "HINDUNILVR"],
    },
    {
        "event_id": "mospi-cpi-202408",
        "category": "inflation",
        "title": "India CPI Inflation August 2024",
        "source": "MOSPI",
        "event_time": datetime(2024, 9, 12, 12, 0, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 9, 12, 12, 2, tzinfo=timezone.utc),
        "actual": "3.65%",
        "forecast": "3.50%",
        "previous": "3.54%",
        "unit": "%",
        "impact": EconomicEventImpact.HIGH,
        "affected_symbols": ["NIFTY50", "ITC", "HINDUNILVR"],
    },
    {
        "event_id": "mospi-gdp-q1-fy25",
        "category": "gdp",
        "title": "India Quarterly Real GDP Growth Q1 FY25 (April-June 2024)",
        "source": "MOSPI",
        "event_time": datetime(2024, 8, 30, 12, 0, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 8, 30, 12, 3, tzinfo=timezone.utc),
        "actual": "6.70%",
        "forecast": "6.90%",
        "previous": "7.80%",
        "unit": "%",
        "impact": EconomicEventImpact.HIGH,
        "affected_symbols": ["NIFTY50", "LT", "TATASTEEL", "RELIANCE"],
    },
    {
        "event_id": "rbi-yield-10y-202410",
        "category": "sovereign_yield",
        "title": "10-Year Indian Sovereign Benchmark Bond Yield (7.10% GS 2034)",
        "source": "RBI",
        "event_time": datetime(2024, 10, 18, 11, 30, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 18, 11, 35, tzinfo=timezone.utc),
        "actual": "6.82%",
        "forecast": None,
        "previous": "6.85%",
        "unit": "%",
        "impact": EconomicEventImpact.MEDIUM,
        "affected_symbols": ["BANKNIFTY", "HDFCBANK", "SBIN"],
    },
]


# Verified Corporate Announcements for Benchmark Seed Equities
SEED_CORPORATE_NEWS: list[dict[str, Any]] = [
    {
        "article_id": "nse-ann-rel-20241014-1",
        "source": "nse_announcements",
        "headline": "Reliance Industries Ltd Q2 FY25 Consolidated Revenue at Rs 2,35,481 Crore; EBITDA Rs 43,934 Crore",
        "body": "Reliance Industries Limited announced its financial results for the quarter ended September 30, 2024. Board of Directors approved issuance of 1:1 bonus shares to eligible shareholders on record date.",
        "url": "https://www.nseindia.com/corporate-filings/reliance_q2fy25_press_release.pdf",
        "published_time": datetime(2024, 10, 14, 13, 15, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 14, 13, 17, tzinfo=timezone.utc),
        "symbols": ["RELIANCE"],
        "exchanges": ["NSE", "BSE"],
        "entities": ["Reliance Industries Limited", "Mukesh Ambani", "Jio", "Reliance Retail"],
        "categories": ["EARNINGS_RELEASE", "BONUS_ISSUE", "BOARD_MEETING"],
    },
    {
        "article_id": "nse-ann-tcs-20241010-1",
        "source": "nse_announcements",
        "headline": "TCS Reports Q2 FY25 PAT of Rs 11,909 Crore, Up 5.0% YoY; Declares Second Interim Dividend of Rs 10 Per Share",
        "body": "Tata Consultancy Services announced audited consolidated financial results under Ind AS for the second quarter ended September 30, 2024. Second interim dividend of Rs 10 per equity share declared with record date October 18, 2024.",
        "url": "https://www.nseindia.com/corporate-filings/tcs_q2fy25_outcome.pdf",
        "published_time": datetime(2024, 10, 10, 11, 45, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 10, 11, 47, tzinfo=timezone.utc),
        "symbols": ["TCS"],
        "exchanges": ["NSE", "BSE"],
        "entities": ["Tata Consultancy Services", "Tata Group"],
        "categories": ["EARNINGS_RELEASE", "DIVIDEND", "BOARD_MEETING"],
    },
    {
        "article_id": "nse-ann-infy-20241017-1",
        "source": "nse_announcements",
        "headline": "Infosys Delivers Broad-Based Q2 FY25 Revenue Growth; Raises FY25 Revenue Guidance to 3.75%-4.50%",
        "body": "Infosys Limited posted Q2 net profit of Rs 6,506 crore and raised its constant-currency revenue guidance for FY25 to 3.75%-4.50%. Interim dividend of Rs 21 per share approved.",
        "url": "https://www.nseindia.com/corporate-filings/infosys_q2fy25_press.pdf",
        "published_time": datetime(2024, 10, 17, 10, 30, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 17, 10, 32, tzinfo=timezone.utc),
        "symbols": ["INFY"],
        "exchanges": ["NSE", "BSE"],
        "entities": ["Infosys Limited", "Salil Parekh"],
        "categories": ["EARNINGS_RELEASE", "GUIDANCE_REVISION", "DIVIDEND"],
    },
    {
        "article_id": "nse-ann-hdfc-20241019-1",
        "source": "nse_announcements",
        "headline": "HDFC Bank Reports Q2 FY25 Net Profit of Rs 16,821 Crore; Gross NPA Stable at 1.36%",
        "body": "HDFC Bank Limited announced its consolidated financial results for the quarter ended September 30, 2024. Core net interest income stood at Rs 30,110 crore with net interest margin at 3.46%.",
        "url": "https://www.nseindia.com/corporate-filings/hdfcbank_q2fy25.pdf",
        "published_time": datetime(2024, 10, 19, 7, 0, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 19, 7, 3, tzinfo=timezone.utc),
        "symbols": ["HDFCBANK"],
        "exchanges": ["NSE", "BSE"],
        "entities": ["HDFC Bank Limited", "Sashidhar Jagdishan"],
        "categories": ["EARNINGS_RELEASE", "ASSET_QUALITY"],
    },
    {
        "article_id": "nse-ann-icici-20241026-1",
        "source": "nse_announcements",
        "headline": "ICICI Bank Q2 FY25 Profit After Tax Grows 14.5% YoY to Rs 11,746 Crore; Net NPA at 0.42%",
        "body": "ICICI Bank Limited reported profit after tax of Rs 11,746 crore in Q2 FY25 compared to Rs 10,261 crore in Q2 FY24. Domestic loan portfolio grew 15.7% YoY.",
        "url": "https://www.nseindia.com/corporate-filings/icicibank_q2fy25_results.pdf",
        "published_time": datetime(2024, 10, 26, 8, 15, tzinfo=timezone.utc),
        "availability_time": datetime(2024, 10, 26, 8, 18, tzinfo=timezone.utc),
        "symbols": ["ICICIBANK"],
        "exchanges": ["NSE", "BSE"],
        "entities": ["ICICI Bank Limited", "Sandeep Bakhshi"],
        "categories": ["EARNINGS_RELEASE", "BANKING_METRICS"],
    },
]


class MacroeconomicPipeline:
    """Manages macroeconomic releases, rate decisions, inflation data, and GDP series."""

    def __init__(self, data_config: DataConfig | None = None) -> None:
        self.data_config = data_config or DataConfig()
        self.macro_dir = self.data_config.parquet_dir / "macro"
        self.macro_dir.mkdir(parents=True, exist_ok=True)
        self.raw_store = RawDataStore(self.data_config.root)
        self.source_registry = SourceRegistry()
        self._ensure_seed_data()

    def _ensure_seed_data(self) -> None:
        parquet_file = self.macro_dir / "economic_events.parquet"
        if not parquet_file.exists():
            for item in SEED_ECONOMIC_EVENTS:
                event = EconomicEvent(
                    event_id=item["event_id"],
                    country="IN",
                    category=item["category"],
                    title=item["title"],
                    source=item["source"],
                    event_time=item["event_time"],
                    availability_time=item["availability_time"],
                    actual=item.get("actual"),
                    forecast=item.get("forecast"),
                    previous=item.get("previous"),
                    unit=item.get("unit"),
                    impact=item.get("impact", EconomicEventImpact.UNKNOWN),
                    affected_symbols=item.get("affected_symbols", []),
                    data_mode=DataMode.HISTORICAL,
                    schema_version="1.0.0",
                )
                self.persist_event(event)

    def persist_event(self, event: EconomicEvent) -> Path:
        """Persists canonical EconomicEvent to Parquet and archives raw payload."""
        parquet_file = self.macro_dir / "economic_events.parquet"

        row = {
            "event_id": event.event_id,
            "country": event.country,
            "category": event.category,
            "title": event.title,
            "source": event.source,
            "event_time": event.event_time.isoformat(),
            "availability_time": event.availability_time.isoformat(),
            "actual": event.actual or "",
            "forecast": event.forecast or "",
            "previous": event.previous or "",
            "unit": event.unit or "",
            "impact": event.impact.value,
            "affected_symbols": json.dumps(event.affected_symbols),
            "data_mode": event.data_mode.value,
            "ingested_at": now_utc().isoformat(),
        }

        df = pd.DataFrame([row])
        if parquet_file.exists():
            existing = pd.read_parquet(parquet_file)
            existing = existing[existing["event_id"] != event.event_id]
            df = pd.concat([existing, df], ignore_index=True)

        table = pa.Table.from_pandas(df)
        pq.write_table(table, parquet_file)

        # Archive raw record
        now = now_utc()
        payload = event.model_dump(mode="json")
        raw_rec = RawDataRecord(
            record_id=str(uuid.uuid4()),
            provider=event.source.lower(),
            source=f"macro_{event.category}",
            data_mode=event.data_mode,
            request_timestamp=now,
            received_timestamp=now,
            source_timestamp=event.availability_time,
            payload=payload,
            checksum=RawDataRecord.compute_checksum(payload),
        )
        self.raw_store.write(raw_rec)

        return parquet_file

    def get_events(
        self,
        category: str | None = None,
        symbol: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieves macroeconomic events matching query criteria."""
        parquet_file = self.macro_dir / "economic_events.parquet"
        if not parquet_file.exists():
            return []
        df = pd.read_parquet(parquet_file)

        if category:
            df = df[df["category"] == category.lower().strip()]
        if symbol:
            sym_clean = symbol.upper().strip()
            df = df[df["affected_symbols"].str.contains(sym_clean, na=False)]
        if start_date:
            df = df[pd.to_datetime(df["event_time"]) >= pd.to_datetime(start_date)]
        if end_date:
            df = df[pd.to_datetime(df["event_time"]) <= pd.to_datetime(end_date)]

        return df.to_dict(orient="records")


class CorporateNewsPipeline:
    """Manages corporate disclosures, exchange announcements, and news records with deduplication."""

    def __init__(self, data_config: DataConfig | None = None) -> None:
        self.data_config = data_config or DataConfig()
        self.news_dir = self.data_config.parquet_dir / "news"
        self.news_dir.mkdir(parents=True, exist_ok=True)
        self.raw_store = RawDataStore(self.data_config.root)
        self._ensure_seed_news()

    def _ensure_seed_news(self) -> None:
        parquet_file = self.news_dir / "corporate_news.parquet"
        if not parquet_file.exists():
            for item in SEED_CORPORATE_NEWS:
                content_for_hash = f"{item['headline']}:{item.get('body', '')}"
                checksum = hashlib.sha256(content_for_hash.encode("utf-8")).hexdigest()

                article = NewsArticle(
                    article_id=item["article_id"],
                    source=item["source"],
                    headline=item["headline"],
                    body=item.get("body"),
                    url=item.get("url"),
                    language="en",
                    published_time=item["published_time"],
                    availability_time=item["availability_time"],
                    symbols=item.get("symbols", []),
                    exchanges=item.get("exchanges", ["NSE"]),
                    entities=item.get("entities", []),
                    categories=item.get("categories", []),
                    tags=[],
                    checksum=checksum,
                    data_mode=DataMode.HISTORICAL,
                    schema_version="1.0.0",
                )
                self.persist_article(article)

    def persist_article(self, article: NewsArticle) -> Path:
        """Persists canonical NewsArticle with SHA-256 deduplication and archives raw record."""
        parquet_file = self.news_dir / "corporate_news.parquet"

        content_for_hash = f"{article.headline}:{article.body or ''}"
        checksum = article.checksum or hashlib.sha256(content_for_hash.encode("utf-8")).hexdigest()

        row = {
            "article_id": article.article_id,
            "source": article.source,
            "headline": article.headline,
            "body": article.body or "",
            "url": article.url or "",
            "language": article.language,
            "published_time": article.published_time.isoformat(),
            "availability_time": article.availability_time.isoformat(),
            "symbols": json.dumps(article.symbols),
            "exchanges": json.dumps(article.exchanges),
            "entities": json.dumps(article.entities),
            "categories": json.dumps(article.categories),
            "checksum": checksum,
            "data_mode": article.data_mode.value,
            "ingested_at": now_utc().isoformat(),
        }

        df = pd.DataFrame([row])
        if parquet_file.exists():
            existing = pd.read_parquet(parquet_file)
            # Deduplicate by article_id or checksum
            existing = existing[
                (existing["article_id"] != article.article_id) &
                (existing["checksum"] != checksum)
            ]
            df = pd.concat([existing, df], ignore_index=True)

        table = pa.Table.from_pandas(df)
        pq.write_table(table, parquet_file)

        # Archive raw record
        now = now_utc()
        payload = article.model_dump(mode="json")
        raw_rec = RawDataRecord(
            record_id=str(uuid.uuid4()),
            provider=article.source.lower(),
            source="corporate_announcements",
            data_mode=article.data_mode,
            request_timestamp=now,
            received_timestamp=now,
            source_timestamp=article.published_time,
            instrument_symbol=article.symbols[0] if article.symbols else None,
            instrument_exchange=article.exchanges[0] if article.exchanges else None,
            payload=payload,
            checksum=RawDataRecord.compute_checksum(payload),
        )
        self.raw_store.write(raw_rec)

        return parquet_file

    def get_articles(
        self,
        symbol: str | None = None,
        category: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieves news articles matching filters."""
        parquet_file = self.news_dir / "corporate_news.parquet"
        if not parquet_file.exists():
            return []
        df = pd.read_parquet(parquet_file)

        if symbol:
            sym_clean = symbol.upper().strip()
            df = df[df["symbols"].str.contains(sym_clean, na=False)]
        if category:
            cat_clean = category.upper().strip()
            df = df[df["categories"].str.contains(cat_clean, na=False)]
        if start_time:
            df = df[pd.to_datetime(df["published_time"]) >= pd.to_datetime(start_time)]
        if end_time:
            df = df[pd.to_datetime(df["published_time"]) <= pd.to_datetime(end_time)]

        return df.to_dict(orient="records")


_GLOBAL_MACRO_PIPELINE: MacroeconomicPipeline | None = None
_GLOBAL_NEWS_PIPELINE: CorporateNewsPipeline | None = None


def get_macro_pipeline() -> MacroeconomicPipeline:
    global _GLOBAL_MACRO_PIPELINE
    if _GLOBAL_MACRO_PIPELINE is None:
        _GLOBAL_MACRO_PIPELINE = MacroeconomicPipeline()
    return _GLOBAL_MACRO_PIPELINE


def get_news_pipeline() -> CorporateNewsPipeline:
    global _GLOBAL_NEWS_PIPELINE
    if _GLOBAL_NEWS_PIPELINE is None:
        _GLOBAL_NEWS_PIPELINE = CorporateNewsPipeline()
    return _GLOBAL_NEWS_PIPELINE
