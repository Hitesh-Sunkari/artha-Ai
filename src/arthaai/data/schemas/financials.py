"""Company Financial Results & Regulatory Disclosures Schema.

Preserves authentic financial statement data, filing provenance, and deterministic derived ratios
in compliance with SEBI LODR Regulation 33 disclosure standards:
- Consolidated vs Standalone basis
- Audited vs Unaudited / Limited Review status
- Original stated metrics preserved distinctly from derived ratios
- Explicit accounting periods, units (INR Crores), restatements, and content hashes
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc


class ReportingPeriodType(str, Enum):
    """Fiscal reporting period granularity."""

    QUARTERLY = "QUARTERLY"
    ANNUAL = "ANNUAL"
    HALF_YEARLY = "HALF_YEARLY"


class AuditStatus(str, Enum):
    """Statutory audit verification level."""

    AUDITED = "AUDITED"
    UNAUDITED_LIMITED_REVIEW = "UNAUDITED_LIMITED_REVIEW"
    PROVISIONAL = "PROVISIONAL"


class AccountingBasis(str, Enum):
    """Reporting scope."""

    CONSOLIDATED = "CONSOLIDATED"
    STANDALONE = "STANDALONE"


class FinancialMetricItem(BaseModel):
    """An individual stated line item from an official financial filing."""

    model_config = ConfigDict(frozen=True)

    metric_name: str
    original_value: float
    currency: str = "INR"
    unit: str = "CRORES"  # Standard Indian financial reporting unit
    is_restated: bool = False
    notes: str | None = None


class DerivedFinancialRatio(BaseModel):
    """A deterministically computed financial ratio with transparent derivation lineage."""

    model_config = ConfigDict(frozen=True)

    ratio_name: str
    value: float
    formula: str
    formula_version: str = "1.0.0"
    input_metrics: list[str]
    interpretation: str | None = None


class CompanyFinancialResult(BaseModel):
    """Canonical filing record for an Indian listed company's financial results."""

    model_config = ConfigDict(frozen=True)

    result_id: str
    symbol: str
    exchange: str
    company_name: str
    isin: str | None = None
    period_type: ReportingPeriodType
    fiscal_year: str  # e.g. "FY25", "FY24"
    fiscal_quarter: str | None = None  # "Q1", "Q2", "Q3", "Q4" or None for Annual
    period_end_date: date
    filing_date: date
    publication_timestamp: datetime
    retrieval_timestamp: datetime = Field(default_factory=now_utc)
    
    basis: AccountingBasis
    audit_status: AuditStatus
    source_document_url: str
    source_authority: str  # "NSE", "BSE", "COMPANY_IR"
    document_format: str  # "PDF", "XBRL", "HTML", "JSON"
    content_hash: str

    # Original stated items (INR Crores)
    revenue: float
    operating_profit_ebitda: float
    net_profit_pat: float
    basic_eps: float | None = None
    diluted_eps: float | None = None
    total_debt: float | None = None
    net_worth_equity: float | None = None
    total_assets: float | None = None
    total_liabilities: float | None = None

    # Revision tracking & unit metadata
    is_revised: bool = False
    revision_number: int = 0
    original_filing_id: str | None = None
    currency: str = "INR"
    unit: str = "CRORES"

    line_items: list[FinancialMetricItem] = Field(default_factory=list)
    derived_ratios: list[DerivedFinancialRatio] = Field(default_factory=list)

    parsing_status: str = "VERIFIED_EXTRACTED"
    parsing_errors: list[str] = Field(default_factory=list)

    @classmethod
    def compute_ratios(
        cls,
        revenue: float,
        ebitda: float,
        pat: float,
        total_debt: float | None = None,
        net_worth: float | None = None,
        total_assets: float | None = None,
    ) -> list[DerivedFinancialRatio]:
        """Deterministically computes standard financial ratios with explicit formulas."""
        ratios = []
        if revenue > 0:
            opm = round((ebitda / revenue) * 100.0, 2)
            ratios.append(
                DerivedFinancialRatio(
                    ratio_name="OPERATING_MARGIN_PCT",
                    value=opm,
                    formula="EBITDA / Revenue * 100",
                    input_metrics=["operating_profit_ebitda", "revenue"],
                )
            )
            npm = round((pat / revenue) * 100.0, 2)
            ratios.append(
                DerivedFinancialRatio(
                    ratio_name="NET_PROFIT_MARGIN_PCT",
                    value=npm,
                    formula="PAT / Revenue * 100",
                    input_metrics=["net_profit_pat", "revenue"],
                )
            )

        if net_worth is not None and net_worth > 0:
            roe = round((pat / net_worth) * 100.0, 2)
            ratios.append(
                DerivedFinancialRatio(
                    ratio_name="RETURN_ON_EQUITY_PCT",
                    value=roe,
                    formula="PAT / Net_Worth * 100",
                    input_metrics=["net_profit_pat", "net_worth_equity"],
                )
            )
            if total_debt is not None:
                dte = round(total_debt / net_worth, 2)
                ratios.append(
                    DerivedFinancialRatio(
                        ratio_name="DEBT_TO_EQUITY_RATIO",
                        value=dte,
                        formula="Total_Debt / Net_Worth",
                        input_metrics=["total_debt", "net_worth_equity"],
                    )
                )

        if total_assets is not None and total_assets > 0:
            roa = round((pat / total_assets) * 100.0, 2)
            ratios.append(
                DerivedFinancialRatio(
                    ratio_name="RETURN_ON_ASSETS_PCT",
                    value=roa,
                    formula="PAT / Total_Assets * 100",
                    input_metrics=["net_profit_pat", "total_assets"],
                )
            )

        return ratios

