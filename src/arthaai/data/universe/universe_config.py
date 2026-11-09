"""Universe Configuration Engine — Dynamic, configurable security universe management.

Loads seed universe from external JSON/YAML configuration (default: configs/seed_universe.json),
resolves every candidate against SecurityMaster, validates exchange boundaries,
and supports arbitrary dynamic onboarding without hardcoding stock symbols in application logic.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.data.instrument_master.security_master import (
    ListingStatus,
    ResolutionType,
    SecurityMaster,
    SecurityRecord,
    SecurityResolutionResult,
    get_security_master,
)

logger = logging.getLogger(__name__)

DEFAULT_CONFIG_PATH = Path("configs/seed_universe.json")


class ConfiguredSecurity(BaseModel):
    """Specification of a security in the universe configuration."""

    model_config = ConfigDict(frozen=True)

    symbol: str = Field(..., description="Target equity ticker symbol")
    exchange: str = Field(default="NSE", description="Exchange identifier (NSE/BSE)")
    yahoo_ticker: str | None = Field(default=None, description="External provider ticker")
    name: str | None = Field(default=None, description="Full company name")
    isin: str | None = Field(default=None, description="ISIN")
    sector: str | None = Field(default=None, description="Sector classification")
    industry: str | None = Field(default=None, description="Industry classification")
    derivatives_eligible: bool = Field(default=False, description="Whether stock is in NSE F&O segment")
    aliases: list[str] = Field(default_factory=list, description="Common aliases or historical tickers")


class ResolvedUniverseSecurity(BaseModel):
    """Resolution output of a configured universe instrument against SecurityMaster."""

    model_config = ConfigDict(frozen=True)

    configured: ConfiguredSecurity
    resolution: SecurityResolutionResult
    is_supported: bool
    status: str
    reasons: list[str] = Field(default_factory=list)


class UniverseManifest(BaseModel):
    """Manifest summarizing the validated active security universe."""

    model_config = ConfigDict(frozen=True)

    universe_name: str
    version: str
    total_configured: int
    total_resolved: int
    total_supported: int
    total_derivatives_eligible: int
    sector_breakdown: dict[str, int]
    exchange_breakdown: dict[str, int]
    instruments: list[ResolvedUniverseSecurity]


class UniverseConfigManager:
    """Manages the lifecycle of configured security universes."""

    def __init__(self, config_path: str | Path | None = None) -> None:
        if config_path:
            self.config_path = Path(config_path)
        else:
            env_path = os.environ.get("ARTHAAI_UNIVERSE_CONFIG")
            self.config_path = Path(env_path) if env_path else DEFAULT_CONFIG_PATH
        
        self.security_master: SecurityMaster = get_security_master()
        self._raw_config: dict[str, Any] = {}
        self._configured_securities: list[ConfiguredSecurity] = []
        self._resolved_universe: list[ResolvedUniverseSecurity] = []
        self.reload()

    def reload(self) -> None:
        """Loads or reloads configuration from disk and resolves against SecurityMaster."""
        if not self.config_path.exists():
            logger.warning("Universe configuration file not found at %s. Empty universe initialized.", self.config_path)
            self._raw_config = {"name": "Empty Universe", "version": "0.0.0", "securities": []}
            self._configured_securities = []
            self._resolved_universe = []
            return

        with open(self.config_path, "r", encoding="utf-8") as f:
            self._raw_config = json.load(f)

        raw_items = self._raw_config.get("securities", [])
        self._configured_securities = [ConfiguredSecurity(**item) for item in raw_items]
        self._resolved_universe = []

        for item in self._configured_securities:
            res = self.security_master.resolve(item.symbol)
            reasons: list[str] = []
            is_supported = res.resolved and res.is_valid_for_research

            if not res.resolved:
                reasons.append(f"SecurityMaster could not resolve query '{item.symbol}'.")
            elif res.listing_status in (ListingStatus.DELISTED, ListingStatus.SUSPENDED):
                reasons.append(f"Security is {res.listing_status.value} on exchange.")
            
            # Check exchange alignment
            if res.resolved and item.exchange and res.exchange != item.exchange:
                reasons.append(f"Exchange mismatch: configured {item.exchange} vs resolved {res.exchange}.")

            status = "ACTIVE_SUPPORTED" if is_supported and not reasons else "CONDITIONAL_SUPPORTED" if is_supported else "UNSUPPORTED"
            self._resolved_universe.append(
                ResolvedUniverseSecurity(
                    configured=item,
                    resolution=res,
                    is_supported=is_supported,
                    status=status,
                    reasons=reasons,
                )
            )

    def list_securities(self, only_supported: bool = True) -> list[ResolvedUniverseSecurity]:
        """Returns the list of resolved securities in the universe."""
        if only_supported:
            return [s for s in self._resolved_universe if s.is_supported]
        return list(self._resolved_universe)

    def get_symbols(self, only_supported: bool = True) -> list[str]:
        """Returns the list of canonical trading symbols."""
        return [s.resolution.symbol for s in self.list_securities(only_supported=only_supported)]

    def get_security(self, symbol: str) -> ResolvedUniverseSecurity | None:
        """Finds a security in the universe by symbol, alias, or ISIN."""
        clean = symbol.upper().strip()
        for item in self._resolved_universe:
            if (
                item.configured.symbol.upper() == clean
                or item.resolution.symbol.upper() == clean
                or clean in [a.upper() for a in item.configured.aliases]
                or (item.configured.isin and item.configured.isin.upper() == clean)
            ):
                return item
        return None

    def export_manifest(self) -> UniverseManifest:
        """Generates audit-ready manifest of the security universe."""
        supported = [s for s in self._resolved_universe if s.is_supported]
        sector_counts: dict[str, int] = {}
        exchange_counts: dict[str, int] = {}

        for s in supported:
            sec = s.configured.sector or "Unclassified"
            sector_counts[sec] = sector_counts.get(sec, 0) + 1
            exc = s.configured.exchange or "NSE"
            exchange_counts[exc] = exchange_counts.get(exc, 0) + 1

        derivatives_count = sum(1 for s in supported if s.configured.derivatives_eligible)

        return UniverseManifest(
            universe_name=self._raw_config.get("name", "ArthaAI Universe"),
            version=self._raw_config.get("version", "1.0.0"),
            total_configured=len(self._configured_securities),
            total_resolved=sum(1 for s in self._resolved_universe if s.resolution.resolved),
            total_supported=len(supported),
            total_derivatives_eligible=derivatives_count,
            sector_breakdown=sector_counts,
            exchange_breakdown=exchange_counts,
            instruments=self._resolved_universe,
        )


_GLOBAL_UNIVERSE_MANAGER: UniverseConfigManager | None = None


def get_universe_manager(config_path: str | Path | None = None) -> UniverseConfigManager:
    """Returns singleton instance of the UniverseConfigManager."""
    global _GLOBAL_UNIVERSE_MANAGER
    if _GLOBAL_UNIVERSE_MANAGER is None or config_path is not None:
        _GLOBAL_UNIVERSE_MANAGER = UniverseConfigManager(config_path)
    return _GLOBAL_UNIVERSE_MANAGER

