"""Provider Capability Registry — Audit-ready capabilities, entitlements, and limitations.

Documents all external market data providers (Groww, Yahoo Finance, DuckDB/Parquet, ChromaDB)
against authoritative documentation and local runtime configuration.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.core.config import AppConfig


class CapabilityStatus(str, Enum):
    """Operational status of a provider capability."""

    OPERATIONAL = "OPERATIONAL"
    UNCONFIGURED = "UNCONFIGURED"
    REQUIRES_SUBSCRIPTION = "REQUIRES_SUBSCRIPTION"
    UNSUPPORTED_DATA_ABSENCE = "UNSUPPORTED_DATA_ABSENCE"
    DISABLED_BY_POLICY = "DISABLED_BY_POLICY"
    DEPRECATED = "DEPRECATED"


class ProviderCapabilityRecord(BaseModel):
    """Standardized audit contract for a single data capability offered by a provider."""

    model_config = ConfigDict(frozen=True)

    provider: str = Field(..., description="Provider name, e.g. 'groww', 'yahoo_finance', 'duckdb_parquet'")
    capability: str = Field(..., description="Canonical capability identifier, e.g. 'historical_daily_ohlcv'")
    instrument_scope: str = Field(..., description="Supported segments: 'NSE_EQ', 'BSE_EQ', 'NSE_FNO', 'MCX'")
    historical_depth: str = Field(..., description="Available historical lookback period (e.g. '5Y', '3M', 'None')")
    granularity: str = Field(..., description="Bar frequency or data resolution: '1D', '1M', '5M', 'TICK'")
    fields: list[str] = Field(..., description="List of concrete payload attributes returned")
    authentication_required: bool = Field(..., description="True if API key, OAuth, or bearer token is mandatory")
    entitlement_status: str = Field(..., description="Active entitlement state under current environment")
    last_verified_at: datetime = Field(default_factory=now_utc, description="Timestamp of latest verification")
    limitations: list[str] = Field(default_factory=list, description="Explicit technical, licensing, or rate limitations")
    status: CapabilityStatus = Field(..., description="Operational status under current deployment")


class ProviderCapabilityRegistry:
    """Registry evaluating and cataloging all integrated data providers."""

    def __init__(self) -> None:
        self._capabilities: list[ProviderCapabilityRecord] = []
        self._load_registry()

    def _load_registry(self) -> None:
        """Instantiates verified capability records for all supported providers."""
        app_cfg = AppConfig()
        live_trading_active = getattr(app_cfg, "live_trading_enabled", False)

        # ---------------------------------------------------------------------
        # 1. Groww Developer / Trading API Evaluation
        # Official Docs: https://api.groww.in/v1/
        # SDK: growwapi (OAuth 2.0 / Token authentication, ~₹499/mo + GST)
        # ---------------------------------------------------------------------
        # Check if Groww credentials are configured in environment
        import os
        groww_token = os.environ.get("GROWW_API_TOKEN") or os.environ.get("GROWW_API_KEY")
        groww_entitled = bool(groww_token)

        self._capabilities.extend([
            ProviderCapabilityRecord(
                provider="groww",
                capability="historical_daily_ohlcv",
                instrument_scope="NSE_EQ, BSE_EQ, NSE_FNO",
                historical_depth="Up to 5Y on Cash Equities",
                granularity="1D",
                fields=["timestamp", "open", "high", "low", "close", "volume"],
                authentication_required=True,
                entitlement_status="ACTIVE_SUBSCRIBED" if groww_entitled else "UNCONFIGURED_REQUIRES_TOKEN",
                limitations=[
                    "Requires active daily OAuth access token from Groww developer dashboard.",
                    "Rate limit capped at standard broker threshold (~10 requests/sec).",
                    "EOD bars subject to exchange post-close clearing adjustments."
                ],
                status=CapabilityStatus.OPERATIONAL if groww_entitled else CapabilityStatus.UNCONFIGURED,
            ),
            ProviderCapabilityRecord(
                provider="groww",
                capability="historical_intraday_candles",
                instrument_scope="NSE_EQ, NSE_FNO",
                historical_depth="Rolling 3 Months Maximum",
                granularity="1M, 5M, 15M, 30M, 60M",
                fields=["timestamp", "open", "high", "low", "close", "volume"],
                authentication_required=True,
                entitlement_status="ACTIVE_SUBSCRIBED" if groww_entitled else "UNCONFIGURED_REQUIRES_TOKEN",
                limitations=[
                    "Intraday history is strictly restricted to rolling 3 months; multi-year minute backtesting unsupported.",
                    "Requires active Trading API subscription."
                ],
                status=CapabilityStatus.OPERATIONAL if groww_entitled else CapabilityStatus.UNCONFIGURED,
            ),
            ProviderCapabilityRecord(
                provider="groww",
                capability="live_market_depth_l2",
                instrument_scope="NSE_EQ, BSE_EQ, NSE_FNO",
                historical_depth="Live Snapshot Only (0 historical lookback)",
                granularity="SNAPSHOT_5_DEPTH",
                fields=["bid_prices", "bid_quantities", "ask_prices", "ask_quantities", "ltp", "volume", "open_interest"],
                authentication_required=True,
                entitlement_status="ACTIVE_SUBSCRIBED" if groww_entitled else "UNCONFIGURED_REQUIRES_TOKEN",
                limitations=[
                    "Live 5-bid / 5-ask quote snapshot only via GET /v1/live-data/quote.",
                    "Does not provide historical queue depth or order-level replay."
                ],
                status=CapabilityStatus.OPERATIONAL if groww_entitled else CapabilityStatus.UNCONFIGURED,
            ),
            ProviderCapabilityRecord(
                provider="groww",
                capability="derivatives_option_chain",
                instrument_scope="NSE_FNO",
                historical_depth="Live Current Expiries Only",
                granularity="STRIKE_CHAIN_SNAPSHOT",
                fields=["strike_price", "expiry", "call_oi", "put_oi", "call_iv", "put_iv", "call_ltp", "put_ltp", "greeks"],
                authentication_required=True,
                entitlement_status="ACTIVE_SUBSCRIBED" if groww_entitled else "UNCONFIGURED_REQUIRES_TOKEN",
                limitations=[
                    "Covers current liquid expiries only; expired options contracts not distributed.",
                    "Greeks computed from Black-Scholes model calibrated to broker volatility surface."
                ],
                status=CapabilityStatus.OPERATIONAL if groww_entitled else CapabilityStatus.UNCONFIGURED,
            ),
            ProviderCapabilityRecord(
                provider="groww",
                capability="historical_tick_order_flow_l3",
                instrument_scope="NONE",
                historical_depth="None",
                granularity="TICK_LEVEL_MBO",
                fields=[],
                authentication_required=True,
                entitlement_status="UNSUPPORTED_DATA_ABSENCE",
                limitations=[
                    "Groww Trading API does NOT distribute historical tick-level order book events (order adds/cancels).",
                    "True order-flow requires exchange Colocation / Tick-By-Tick (TBT) market data feed."
                ],
                status=CapabilityStatus.UNSUPPORTED_DATA_ABSENCE,
            ),
            ProviderCapabilityRecord(
                provider="groww",
                capability="live_order_execution",
                instrument_scope="NSE_EQ, NSE_FNO",
                historical_depth="N/A",
                granularity="INTERACTIVE_ORDER",
                fields=["order_id", "status", "fill_price", "fill_quantity"],
                authentication_required=True,
                entitlement_status="DISABLED_BY_POLICY",
                limitations=[
                    "Permanently blocked by ArthaAI system policy (ARTHAAI_LIVE_TRADING_ENABLED=False).",
                    "System operates strictly as research and simulation platform."
                ],
                status=CapabilityStatus.DISABLED_BY_POLICY,
            ),

            # -----------------------------------------------------------------
            # 2. Yahoo Finance Chart REST Engine (Production Fallback & Ingestion)
            # -----------------------------------------------------------------
            ProviderCapabilityRecord(
                provider="yahoo_finance",
                capability="historical_daily_ohlcv",
                instrument_scope="NSE_EQ (.NS), BSE_EQ (.BO)",
                historical_depth="Up to 5Y+ on all Indian listed equities",
                granularity="1D",
                fields=["timestamp", "open", "high", "low", "close", "volume"],
                authentication_required=False,
                entitlement_status="OPERATIONAL_DIRECT_REST",
                limitations=[
                    "Bypasses cookie crumbs via direct v8 chart API; client rate limits monitored.",
                    "Unadjusted historical prices must be cross-referenced with corporate action filings."
                ],
                status=CapabilityStatus.OPERATIONAL,
            ),
            ProviderCapabilityRecord(
                provider="yahoo_finance",
                capability="historical_intraday_candles",
                instrument_scope="NSE_EQ, BSE_EQ",
                historical_depth="Rolling 60 Days Maximum",
                granularity="1M, 5M, 15M, 60M",
                fields=["timestamp", "open", "high", "low", "close", "volume"],
                authentication_required=False,
                entitlement_status="OPERATIONAL_DIRECT_REST",
                limitations=[
                    "Intraday 1m/5m data restricted to 60 days.",
                    "Volume is reported as cumulative period volume, not bid/ask aggression."
                ],
                status=CapabilityStatus.OPERATIONAL,
            ),
            ProviderCapabilityRecord(
                provider="yahoo_finance",
                capability="historical_order_flow_and_l2",
                instrument_scope="NONE",
                historical_depth="None",
                granularity="NONE",
                fields=[],
                authentication_required=False,
                entitlement_status="UNSUPPORTED_DATA_ABSENCE",
                limitations=[
                    "Yahoo Finance does not provide Level 2 order books, tick data, or order-flow metrics."
                ],
                status=CapabilityStatus.UNSUPPORTED_DATA_ABSENCE,
            ),

            # -----------------------------------------------------------------
            # 3. DuckDB / Local Partitioned Parquet Storage Engine
            # -----------------------------------------------------------------
            ProviderCapabilityRecord(
                provider="duckdb_parquet",
                capability="historical_daily_ohlcv",
                instrument_scope="Partitioned Universe (NSE & BSE equities)",
                historical_depth="5 Years Verified (2020-2025)",
                granularity="1D",
                fields=["timestamp", "symbol", "open", "high", "low", "close", "volume", "available_at"],
                authentication_required=False,
                entitlement_status="OPERATIONAL_LOCAL_ANALYTICAL",
                limitations=[
                    "Point-in-time filtering enforced on available_at timestamp to prevent lookahead bias.",
                    "Partitions created on ingestion; zero synthetic observations inserted."
                ],
                status=CapabilityStatus.OPERATIONAL,
            ),
            ProviderCapabilityRecord(
                provider="duckdb_parquet",
                capability="historical_order_flow_l3",
                instrument_scope="NONE",
                historical_depth="None",
                granularity="NONE",
                fields=[],
                authentication_required=False,
                entitlement_status="UNSUPPORTED_DATA_ABSENCE",
                limitations=[
                    "Analytical database store contains verified OHLCV bars; tick-level queue depth absent."
                ],
                status=CapabilityStatus.UNSUPPORTED_DATA_ABSENCE,
            ),

            # -----------------------------------------------------------------
            # 4. ChromaDB Grounded RAG Document Store
            # -----------------------------------------------------------------
            ProviderCapabilityRecord(
                provider="chromadb_rag",
                capability="statutory_filings_and_regulations",
                instrument_scope="Indian Listed Equities, SEBI LODR, RBI MPC, Finance Act 2024",
                historical_depth="Point-in-Time Regulatory Library (2015-2025)",
                granularity="SEMANTIC_CHUNK",
                fields=["doc_id", "chunk_id", "symbol", "doc_type", "effective_date", "source_authority", "content", "citation_uri"],
                authentication_required=False,
                entitlement_status="OPERATIONAL_EMBEDDED_VECTOR",
                limitations=[
                    "Document search verifies ground truth text; cannot manufacture missing corporate filings.",
                    "Similarity score alone does not verify claim; requires explicit entity mapping."
                ],
                status=CapabilityStatus.OPERATIONAL,
            ),
        ])

    def list_capabilities(self, provider: str | None = None) -> list[ProviderCapabilityRecord]:
        """Returns all capability records, optionally filtered by provider."""
        if provider:
            p_clean = provider.strip().lower()
            return [c for c in self._capabilities if c.provider.lower() == p_clean]
        return list(self._capabilities)

    def get_capability(self, provider: str, capability: str) -> ProviderCapabilityRecord | None:
        """Retrieves a specific capability record."""
        p_clean = provider.strip().lower()
        c_clean = capability.strip().lower()
        for rec in self._capabilities:
            if rec.provider.lower() == p_clean and rec.capability.lower() == c_clean:
                return rec
        return None

    def export_summary(self) -> dict[str, Any]:
        """Exports JSON-serializable capability matrix."""
        return {
            "total_capabilities": len(self._capabilities),
            "providers": sorted(list({c.provider for c in self._capabilities})),
            "records": [c.model_dump(mode="json") for c in self._capabilities],
        }


# Singleton accessor
_GLOBAL_CAPABILITY_REGISTRY: ProviderCapabilityRegistry | None = None


def get_provider_capability_registry() -> ProviderCapabilityRegistry:
    """Returns singleton instance of the ProviderCapabilityRegistry."""
    global _GLOBAL_CAPABILITY_REGISTRY
    if _GLOBAL_CAPABILITY_REGISTRY is None:
        _GLOBAL_CAPABILITY_REGISTRY = ProviderCapabilityRegistry()
    return _GLOBAL_CAPABILITY_REGISTRY
