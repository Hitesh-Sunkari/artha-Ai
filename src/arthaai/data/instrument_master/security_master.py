"""SecurityMaster — Dynamic, point-in-time safe Indian equity security master.

Provides canonical security resolution, multi-exchange support (NSE/BSE),
company-name search, symbol aliases (renamed/merged companies), SME handling,
and data-layer isolation to prevent ticker cross-contamination.
"""

from __future__ import annotations

import logging
import re
from datetime import date
from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.config import DataConfig

logger = logging.getLogger(__name__)


class ListingStatus(str, Enum):
    """Listing status of a security on Indian exchanges."""

    ACTIVE = "ACTIVE"
    NEWLY_LISTED = "NEWLY_LISTED"
    DELISTED = "DELISTED"
    SUSPENDED = "SUSPENDED"
    UNKNOWN = "UNKNOWN"


class MarketCapCategory(str, Enum):
    """SEBI market-cap categorization for Indian listed equities."""

    LARGE_CAP = "LARGE_CAP"    # Top 100 by market cap
    MID_CAP = "MID_CAP"        # 101 to 250 by market cap
    SMALL_CAP = "SMALL_CAP"    # 251 and beyond
    MICRO_CAP = "MICRO_CAP"
    SME = "SME"                # NSE Emerge / BSE SME platforms


class ResolutionType(str, Enum):
    """Classification of how an input query was resolved."""

    CANONICAL_EXACT = "CANONICAL_EXACT"
    SYMBOL_MATCH = "SYMBOL_MATCH"
    ALIAS_MATCH = "ALIAS_MATCH"
    COMPANY_NAME_MATCH = "COMPANY_NAME_MATCH"
    ISIN_MATCH = "ISIN_MATCH"
    DYNAMIC_RESOLVED_UNLISTED = "DYNAMIC_RESOLVED_UNLISTED"
    INVALID_FORMAT = "INVALID_FORMAT"


class SecurityRecord(BaseModel):
    """Canonical security identity and market metadata."""

    model_config = ConfigDict(frozen=True)

    canonical_id: str = Field(..., description="Unique exchange-qualified identifier, e.g. 'NSE:RELIANCE'")
    symbol: str = Field(..., description="Trading ticker symbol, e.g. 'RELIANCE'")
    exchange: str = Field(..., description="Primary exchange: 'NSE' or 'BSE'")
    company_name: str = Field(..., description="Full legal company name")
    isin: str = Field(..., description="International Securities Identification Number")
    series: str = Field(default="EQ", description="Trading series: 'EQ' (Equity), 'BE' (Trade-to-Trade), 'SM' (SME)")
    listing_status: ListingStatus = ListingStatus.ACTIVE
    supported_instruments: list[str] = Field(default_factory=lambda: ["EQUITY"])
    market_cap_category: MarketCapCategory = MarketCapCategory.LARGE_CAP
    sector: str = Field(default="Diversified")
    industry: str = Field(default="Diversified")
    yahoo_ticker: str = Field(..., description="Yahoo Finance query ticker, e.g. 'RELIANCE.NS'")
    aliases: list[str] = Field(default_factory=list, description="Former symbols or common trade names")
    is_sme: bool = False
    has_derivatives: bool = False
    lot_size: int | None = None
    price_band_pct: float | None = None
    corporate_actions: list[dict[str, Any]] = Field(default_factory=list)
    listing_date: date | None = None
    delisting_date: date | None = None
    notes: str | None = None


class SecurityResolutionResult(BaseModel):
    """Output contract for security resolution requests."""

    model_config = ConfigDict(frozen=True)

    resolved: bool
    canonical_id: str
    symbol: str
    exchange: str
    yahoo_ticker: str
    company_name: str
    record: SecurityRecord | None = None
    resolution_type: ResolutionType
    listing_status: ListingStatus
    is_valid_for_research: bool
    has_local_parquet: bool
    is_sme: bool = False
    has_derivatives: bool = False
    lot_size: int | None = None
    price_band_pct: float | None = None
    corporate_actions: list[dict[str, Any]] = Field(default_factory=list)
    message: str = ""


# ============================================================================
# Canonical Seed Universe of Indian Listed Equities
# ============================================================================

CANONICAL_SECURITIES_SEED: list[SecurityRecord] = [
    # --- Top 50 NIFTY Compounders (Large Cap) ---
    SecurityRecord(
        canonical_id="NSE:RELIANCE",
        symbol="RELIANCE",
        exchange="NSE",
        company_name="Reliance Industries Limited",
        isin="INE002A01018",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Energy",
        industry="Oil & Gas Refining & Marketing",
        yahoo_ticker="RELIANCE.NS",
        aliases=["RIL", "RELIANCE INDUSTRIES"],
        has_derivatives=True,
        corporate_actions=[
            {
                "type": "BONUS",
                "ratio": "1:1",
                "ex_date": "2024-10-28",
                "effective_date": "2024-10-28",
                "description": "1:1 Bonus Issue doubling share count; historical price series split-adjusted.",
            },
            {
                "type": "DEMERGER",
                "ex_date": "2023-07-20",
                "effective_date": "2023-07-20",
                "description": "Demerger of Jio Financial Services Limited (JFSL) at 1:1 share allotment ratio.",
            },
        ],
    ),
    SecurityRecord(
        canonical_id="NSE:TCS",
        symbol="TCS",
        exchange="NSE",
        company_name="Tata Consultancy Services Limited",
        isin="INE467B01029",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Technology",
        industry="IT Services & Consulting",
        yahoo_ticker="TCS.NS",
        aliases=["TATA CONSULTANCY"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:HDFCBANK",
        symbol="HDFCBANK",
        exchange="NSE",
        company_name="HDFC Bank Limited",
        isin="INE040A01034",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Private Sector Bank",
        yahoo_ticker="HDFCBANK.NS",
        aliases=["HDFC", "HDFC BANK"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:INFY",
        symbol="INFY",
        exchange="NSE",
        company_name="Infosys Limited",
        isin="INE009A01021",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Technology",
        industry="IT Services & Consulting",
        yahoo_ticker="INFY.NS",
        aliases=["INFOSYS"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:ICICIBANK",
        symbol="ICICIBANK",
        exchange="NSE",
        company_name="ICICI Bank Limited",
        isin="INE090A01021",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Private Sector Bank",
        yahoo_ticker="ICICIBANK.NS",
        aliases=["ICICI", "ICICI BANK"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:HINDUNILVR",
        symbol="HINDUNILVR",
        exchange="NSE",
        company_name="Hindustan Unilever Limited",
        isin="INE030A01027",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Defensive",
        industry="FMCG & Personal Care",
        yahoo_ticker="HINDUNILVR.NS",
        aliases=["HUL", "UNILEVER"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:ITC",
        symbol="ITC",
        exchange="NSE",
        company_name="ITC Limited",
        isin="INE154A01025",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Defensive",
        industry="Tobacco & Diversified FMCG",
        yahoo_ticker="ITC.NS",
        aliases=["ITC LTD"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:SBIN",
        symbol="SBIN",
        exchange="NSE",
        company_name="State Bank of India",
        isin="INE062A01020",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Public Sector Bank",
        yahoo_ticker="SBIN.NS",
        aliases=["SBI", "STATE BANK"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:BHARTIARTL",
        symbol="BHARTIARTL",
        exchange="NSE",
        company_name="Bharti Airtel Limited",
        isin="INE397D01024",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Communication Services",
        industry="Telecom Services",
        yahoo_ticker="BHARTIARTL.NS",
        aliases=["AIRTEL", "BHARTI"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:KOTAKBANK",
        symbol="KOTAKBANK",
        exchange="NSE",
        company_name="Kotak Mahindra Bank Limited",
        isin="INE237A01028",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Private Sector Bank",
        yahoo_ticker="KOTAKBANK.NS",
        aliases=["KOTAK"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:LT",
        symbol="LT",
        exchange="NSE",
        company_name="Larsen & Toubro Limited",
        isin="INE018A01030",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Industrials",
        industry="Engineering & Construction",
        yahoo_ticker="LT.NS",
        aliases=["L&T", "LARSEN"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:AXISBANK",
        symbol="AXISBANK",
        exchange="NSE",
        company_name="Axis Bank Limited",
        isin="INE238A01034",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Private Sector Bank",
        yahoo_ticker="AXISBANK.NS",
        aliases=["AXIS", "UTI BANK"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:TATAMOTORS",
        symbol="TATAMOTORS",
        exchange="NSE",
        company_name="Tata Motors Limited",
        isin="INE155A01022",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Automobiles & Commercial Vehicles",
        yahoo_ticker="TATAMOTORS.NS",
        aliases=["TATA MOTORS", "TELCO"],
        has_derivatives=True,
        corporate_actions=[
            {
                "type": "DEMERGER",
                "ex_date": "2024-03-04",
                "effective_date": "2024-03-04",
                "description": "Demerger into two separate listed entities: Commercial Vehicles (CV) and Passenger Vehicles (PV/EV).",
            },
            {
                "type": "CAPITAL_REDUCTION",
                "ex_date": "2024-09-01",
                "effective_date": "2024-09-01",
                "description": "Cancellation and conversion of 'A' Ordinary (DVR) shares into ordinary shares at 7:10 ratio.",
            },
        ],
    ),
    SecurityRecord(
        canonical_id="NSE:MARUTI",
        symbol="MARUTI",
        exchange="NSE",
        company_name="Maruti Suzuki India Limited",
        isin="INE585B01010",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Passenger Cars",
        yahoo_ticker="MARUTI.NS",
        aliases=["MARUTI SUZUKI"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:BAJFINANCE",
        symbol="BAJFINANCE",
        exchange="NSE",
        company_name="Bajaj Finance Limited",
        isin="INE296A01024",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="NBFC Consumer Finance",
        yahoo_ticker="BAJFINANCE.NS",
        aliases=["BAJAJ FINANCE"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:SUNPHARMA",
        symbol="SUNPHARMA",
        exchange="NSE",
        company_name="Sun Pharmaceutical Industries Limited",
        isin="INE044A01036",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Healthcare",
        industry="Pharmaceuticals",
        yahoo_ticker="SUNPHARMA.NS",
        aliases=["SUN PHARMA"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:TITAN",
        symbol="TITAN",
        exchange="NSE",
        company_name="Titan Company Limited",
        isin="INE280A01028",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Jewelry & Watches",
        yahoo_ticker="TITAN.NS",
        aliases=["TITAN WATCHES", "TANISHQ"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:ULTRACEMCO",
        symbol="ULTRACEMCO",
        exchange="NSE",
        company_name="UltraTech Cement Limited",
        isin="INE481G01011",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Basic Materials",
        industry="Cement & Building Materials",
        yahoo_ticker="ULTRACEMCO.NS",
        aliases=["ULTRATECH"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:ASIANPAINT",
        symbol="ASIANPAINT",
        exchange="NSE",
        company_name="Asian Paints Limited",
        isin="INE021A01026",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Decorative Paints",
        yahoo_ticker="ASIANPAINT.NS",
        aliases=["ASIAN PAINTS"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:NTPC",
        symbol="NTPC",
        exchange="NSE",
        company_name="NTPC Limited",
        isin="INE733E01010",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Utilities",
        industry="Power Generation",
        yahoo_ticker="NTPC.NS",
        aliases=["NATIONAL THERMAL POWER"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:ONGC",
        symbol="ONGC",
        exchange="NSE",
        company_name="Oil & Natural Gas Corporation Limited",
        isin="INE213A01029",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Energy",
        industry="Oil & Gas E&P",
        yahoo_ticker="ONGC.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:POWERGRID",
        symbol="POWERGRID",
        exchange="NSE",
        company_name="Power Grid Corporation of India Limited",
        isin="INE752E01010",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Utilities",
        industry="Power Transmission",
        yahoo_ticker="POWERGRID.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:TATASTEEL",
        symbol="TATASTEEL",
        exchange="NSE",
        company_name="Tata Steel Limited",
        isin="INE081A01020",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Basic Materials",
        industry="Steel",
        yahoo_ticker="TATASTEEL.NS",
        aliases=["TISCO"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:M&M",
        symbol="M&M",
        exchange="NSE",
        company_name="Mahindra & Mahindra Limited",
        isin="INE101A01026",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Automobiles & Farm Tractors",
        yahoo_ticker="M&M.NS",
        aliases=["MAHINDRA", "M AND M"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:COALINDIA",
        symbol="COALINDIA",
        exchange="NSE",
        company_name="Coal India Limited",
        isin="INE522F01014",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Energy",
        industry="Thermal Coal Mining",
        yahoo_ticker="COALINDIA.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:BAJAJFINSV",
        symbol="BAJAJFINSV",
        exchange="NSE",
        company_name="Bajaj Finserv Limited",
        isin="INE918I01026",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Financial Holding Company",
        yahoo_ticker="BAJAJFINSV.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:ADANIENT",
        symbol="ADANIENT",
        exchange="NSE",
        company_name="Adani Enterprises Limited",
        isin="INE423A01024",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Industrials",
        industry="Conglomerate & Infrastructure",
        yahoo_ticker="ADANIENT.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:ADANIPORTS",
        symbol="ADANIPORTS",
        exchange="NSE",
        company_name="Adani Ports and Special Economic Zone Limited",
        isin="INE742F01042",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Industrials",
        industry="Commercial Marine Ports",
        yahoo_ticker="ADANIPORTS.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:JSWSTEEL",
        symbol="JSWSTEEL",
        exchange="NSE",
        company_name="JSW Steel Limited",
        isin="INE019A01038",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Basic Materials",
        industry="Steel",
        yahoo_ticker="JSWSTEEL.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:HINDALCO",
        symbol="HINDALCO",
        exchange="NSE",
        company_name="Hindalco Industries Limited",
        isin="INE038A01020",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Basic Materials",
        industry="Aluminium & Copper",
        yahoo_ticker="HINDALCO.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:GRASIM",
        symbol="GRASIM",
        exchange="NSE",
        company_name="Grasim Industries Limited",
        isin="INE047A01021",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Basic Materials",
        industry="Textiles & Chemicals",
        yahoo_ticker="GRASIM.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:WIPRO",
        symbol="WIPRO",
        exchange="NSE",
        company_name="Wipro Limited",
        isin="INE075A01022",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Technology",
        industry="IT Services & Consulting",
        yahoo_ticker="WIPRO.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:CIPLA",
        symbol="CIPLA",
        exchange="NSE",
        company_name="Cipla Limited",
        isin="INE059A01026",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Healthcare",
        industry="Pharmaceuticals",
        yahoo_ticker="CIPLA.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:NESTLEIND",
        symbol="NESTLEIND",
        exchange="NSE",
        company_name="Nestle India Limited",
        isin="INE239A01024",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Defensive",
        industry="Packaged Foods & Beverages",
        yahoo_ticker="NESTLEIND.NS",
        aliases=["NESTLE"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:DRREDDY",
        symbol="DRREDDY",
        exchange="NSE",
        company_name="Dr. Reddy's Laboratories Limited",
        isin="INE089A01023",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Healthcare",
        industry="Pharmaceuticals",
        yahoo_ticker="DRREDDY.NS",
        aliases=["DR REDDYS"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:SBILIFE",
        symbol="SBILIFE",
        exchange="NSE",
        company_name="SBI Life Insurance Company Limited",
        isin="INE123W01016",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Life Insurance",
        yahoo_ticker="SBILIFE.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:BPCL",
        symbol="BPCL",
        exchange="NSE",
        company_name="Bharat Petroleum Corporation Limited",
        isin="INE029A01011",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Energy",
        industry="Oil Refining & Marketing",
        yahoo_ticker="BPCL.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:BRITANNIA",
        symbol="BRITANNIA",
        exchange="NSE",
        company_name="Britannia Industries Limited",
        isin="INE216A01030",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Defensive",
        industry="Biscuits & Bakery Foods",
        yahoo_ticker="BRITANNIA.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:TATACONSUM",
        symbol="TATACONSUM",
        exchange="NSE",
        company_name="Tata Consumer Products Limited",
        isin="INE192A01025",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Defensive",
        industry="Tea, Coffee & Consumer Foods",
        yahoo_ticker="TATACONSUM.NS",
        aliases=["TATA TEA", "TATA GLOBAL BEVERAGES"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:EICHERMOT",
        symbol="EICHERMOT",
        exchange="NSE",
        company_name="Eicher Motors Limited",
        isin="INE066A01021",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Royal Enfield Motorcycles",
        yahoo_ticker="EICHERMOT.NS",
        aliases=["ROYAL ENFIELD", "EICHER"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:APOLLOHOSP",
        symbol="APOLLOHOSP",
        exchange="NSE",
        company_name="Apollo Hospitals Enterprise Limited",
        isin="INE437A01024",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Healthcare",
        industry="Hospitals & Healthcare Facilities",
        yahoo_ticker="APOLLOHOSP.NS",
        aliases=["APOLLO HOSPITALS"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:DIVISLAB",
        symbol="DIVISLAB",
        exchange="NSE",
        company_name="Divi's Laboratories Limited",
        isin="INE361B01024",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Healthcare",
        industry="API & Custom Synthesis",
        yahoo_ticker="DIVISLAB.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:HEROMOTOCO",
        symbol="HEROMOTOCO",
        exchange="NSE",
        company_name="Hero MotoCorp Limited",
        isin="INE158A01026",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Two-Wheelers & Motorcycles",
        yahoo_ticker="HEROMOTOCO.NS",
        aliases=["HERO HONDA"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:BAJAJ-AUTO",
        symbol="BAJAJ-AUTO",
        exchange="NSE",
        company_name="Bajaj Auto Limited",
        isin="INE917I01017",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Two-Wheelers & 3-Wheelers",
        yahoo_ticker="BAJAJ-AUTO.NS",
        aliases=["BAJAJ AUTO"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:INDUSINDBK",
        symbol="INDUSINDBK",
        exchange="NSE",
        company_name="IndusInd Bank Limited",
        isin="INE095A01012",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Private Sector Bank",
        yahoo_ticker="INDUSINDBK.NS",
        aliases=["INDUSIND"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:TRENT",
        symbol="TRENT",
        exchange="NSE",
        company_name="Trent Limited",
        isin="INE849A01020",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Retail Apparel & Lifestyle (Zudio, Westside)",
        yahoo_ticker="TRENT.NS",
        aliases=["ZUDIO", "WESTSIDE"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:BEL",
        symbol="BEL",
        exchange="NSE",
        company_name="Bharat Electronics Limited",
        isin="INE263A01024",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Industrials",
        industry="Defense Electronics & Radar Systems",
        yahoo_ticker="BEL.NS",
        aliases=["BHARAT ELECTRONICS"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:SHRIRAMFIN",
        symbol="SHRIRAMFIN",
        exchange="NSE",
        company_name="Shriram Finance Limited",
        isin="INE721A01013",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Commercial Vehicle NBFC",
        yahoo_ticker="SHRIRAMFIN.NS",
        aliases=["SHRIRAM TRANSPORT"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:HCLTECH",
        symbol="HCLTECH",
        exchange="NSE",
        company_name="HCL Technologies Limited",
        isin="INE860A01027",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Technology",
        industry="IT Services & ER&D",
        yahoo_ticker="HCLTECH.NS",
        aliases=["HCL"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:LTIM",
        symbol="LTIM",
        exchange="NSE",
        company_name="LTIMindtree Limited",
        isin="INE214T01019",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Technology",
        industry="IT Services & Consulting",
        yahoo_ticker="LTIM.NS",
        aliases=["MINDTREE", "L&T INFOTECH", "LTI"],
        has_derivatives=True,
    ),

    # --- High-Volume Midcaps & New Listings ---
    SecurityRecord(
        canonical_id="NSE:ETERNAL",
        symbol="ETERNAL",
        exchange="NSE",
        company_name="Eternal Limited (formerly Zomato Limited)",
        isin="INE758T01015",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Online Food Delivery & Quick Commerce (Blinkit)",
        yahoo_ticker="ETERNAL.NS",
        aliases=["ZOMATO", "ZOMATO.NS", "BLINKIT", "543320", "ETERNAL LIMITED", "ZOMATO LIMITED"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:HAL",
        symbol="HAL",
        exchange="NSE",
        company_name="Hindustan Aeronautics Limited",
        isin="INE066F01012",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Industrials",
        industry="Aerospace & Defense Aviation",
        yahoo_ticker="HAL.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:JIOFIN",
        symbol="JIOFIN",
        exchange="NSE",
        company_name="Jio Financial Services Limited",
        isin="INE758E01017",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Fintech & Asset Management",
        yahoo_ticker="JIOFIN.NS",
        aliases=["JIO FINANCIAL"],
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="NSE:DLF",
        symbol="DLF",
        exchange="NSE",
        company_name="DLF Limited",
        isin="INE271C01023",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Real Estate",
        industry="Residential & Commercial Real Estate",
        yahoo_ticker="DLF.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:TATAPOWER",
        symbol="TATAPOWER",
        exchange="NSE",
        company_name="Tata Power Company Limited",
        isin="INE245A01021",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Utilities",
        industry="Integrated Electric Utilities & Solar EPC",
        yahoo_ticker="TATAPOWER.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:IRFC",
        symbol="IRFC",
        exchange="NSE",
        company_name="Indian Railway Finance Corporation Limited",
        isin="INE053F01010",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Railway Infrastructure Financing",
        yahoo_ticker="IRFC.NS",
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="NSE:PFC",
        symbol="PFC",
        exchange="NSE",
        company_name="Power Finance Corporation Limited",
        isin="INE134E01011",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Power Sector Infrastructure NBFC",
        yahoo_ticker="PFC.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:REC",
        symbol="REC",
        exchange="NSE",
        company_name="REC Limited",
        isin="INE020B01018",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Rural Electrification & Renewable Financing",
        yahoo_ticker="REC.NS",
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="NSE:SWIGGY",
        symbol="SWIGGY",
        exchange="NSE",
        company_name="Swiggy Limited",
        isin="INE00H001014",
        series="EQ",
        listing_status=ListingStatus.NEWLY_LISTED,
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Online Food Ordering & Instamart Quick Commerce",
        yahoo_ticker="SWIGGY.NS",
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="NSE:HYUNDAI",
        symbol="HYUNDAI",
        exchange="NSE",
        company_name="Hyundai Motor India Limited",
        isin="INE00G001017",
        series="EQ",
        listing_status=ListingStatus.NEWLY_LISTED,
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Consumer Cyclical",
        industry="Passenger Motor Vehicles",
        yahoo_ticker="HYUNDAI.NS",
        has_derivatives=False,
    ),

    # --- Small-Cap & Emerging Equities ---
    SecurityRecord(
        canonical_id="NSE:CDSL",
        symbol="CDSL",
        exchange="NSE",
        company_name="Central Depository Services (India) Limited",
        isin="INE736A01011",
        series="EQ",
        market_cap_category=MarketCapCategory.MID_CAP,
        sector="Financial Services",
        industry="Securities Depository Monopoly",
        yahoo_ticker="CDSL.NS",
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="NSE:ANGELONE",
        symbol="ANGELONE",
        exchange="NSE",
        company_name="Angel One Limited",
        isin="INE732I01013",
        series="EQ",
        market_cap_category=MarketCapCategory.MID_CAP,
        sector="Financial Services",
        industry="Retail Digital Discount Brokerage",
        yahoo_ticker="ANGELONE.NS",
        aliases=["ANGEL BROKING"],
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="NSE:SUZLON",
        symbol="SUZLON",
        exchange="NSE",
        company_name="Suzlon Energy Limited",
        isin="INE040H01021",
        series="EQ",
        market_cap_category=MarketCapCategory.MID_CAP,
        sector="Utilities",
        industry="Wind Turbine Generator Manufacturing",
        yahoo_ticker="SUZLON.NS",
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="NSE:YESBANK",
        symbol="YESBANK",
        exchange="NSE",
        company_name="Yes Bank Limited",
        isin="INE528G01035",
        series="EQ",
        market_cap_category=MarketCapCategory.MID_CAP,
        sector="Financial Services",
        industry="Commercial Banking",
        yahoo_ticker="YESBANK.NS",
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="NSE:RVNL",
        symbol="RVNL",
        exchange="NSE",
        company_name="Rail Vikas Nigam Limited",
        isin="INE415G01027",
        series="EQ",
        market_cap_category=MarketCapCategory.MID_CAP,
        sector="Industrials",
        industry="Railway Project Execution EPC",
        yahoo_ticker="RVNL.NS",
        has_derivatives=False,
    ),

    # --- Bombay Stock Exchange (BSE) Primary Listings ---
    SecurityRecord(
        canonical_id="BSE:500325",
        symbol="500325",
        exchange="BSE",
        company_name="Reliance Industries Limited (BSE Dual Listing)",
        isin="INE002A01018",
        series="A",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Energy",
        industry="Oil & Gas Refining",
        yahoo_ticker="500325.BO",
        aliases=["RELIANCE.BO"],
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="BSE:532540",
        symbol="532540",
        exchange="BSE",
        company_name="Tata Consultancy Services Limited (BSE Dual Listing)",
        isin="INE467B01029",
        series="A",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Technology",
        industry="IT Services",
        yahoo_ticker="532540.BO",
        aliases=["TCS.BO"],
        has_derivatives=False,
    ),
    SecurityRecord(
        canonical_id="BSE:543066",
        symbol="543066",
        exchange="BSE",
        company_name="SBI Cards and Payment Services Limited",
        isin="INE018E01016",
        series="A",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Credit Cards",
        yahoo_ticker="543066.BO",
        aliases=["SBICARD.BO", "SBICARD"],
        has_derivatives=True,
    ),
    SecurityRecord(
        canonical_id="BSE:539254",
        symbol="539254",
        exchange="BSE",
        company_name="Adani Green Energy Limited",
        isin="INE364U01010",
        series="A",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Utilities",
        industry="Solar & Wind Renewable Power",
        yahoo_ticker="539254.BO",
        aliases=["ADANIGREEN.BO", "ADANIGREEN"],
        has_derivatives=False,
    ),

    # --- SME Platform Equities (Series SM) ---
    SecurityRecord(
        canonical_id="NSE:TAC",
        symbol="TAC",
        exchange="NSE",
        company_name="TAC Infosec Limited (NSE Emerge SME)",
        isin="INE0R2G01018",
        series="SM",
        market_cap_category=MarketCapCategory.SME,
        sector="Technology",
        industry="Cybersecurity & Vulnerability Management",
        yahoo_ticker="TAC.NS",
        is_sme=True,
        has_derivatives=False,
        notes="Listed on NSE Emerge SME platform with lot size trading.",
    ),

    # --- Renamed & Reorganized Stocks (Aliases with active canonical routing) ---
    SecurityRecord(
        canonical_id="NSE:IDFCFIRSTB",
        symbol="IDFCFIRSTB",
        exchange="NSE",
        company_name="IDFC First Bank Limited",
        isin="INE092T01019",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Financial Services",
        industry="Commercial Banking",
        yahoo_ticker="IDFCFIRSTB.NS",
        aliases=["IDFCBANK", "CAPITALFIRST"],
        has_derivatives=True,
        notes="Renamed from IDFC Bank after merger with Capital First.",
    ),
    SecurityRecord(
        canonical_id="NSE:ZYDUSLIFE",
        symbol="ZYDUSLIFE",
        exchange="NSE",
        company_name="Zydus Lifesciences Limited",
        isin="INE010B01027",
        series="EQ",
        market_cap_category=MarketCapCategory.LARGE_CAP,
        sector="Healthcare",
        industry="Pharmaceuticals",
        yahoo_ticker="ZYDUSLIFE.NS",
        aliases=["CADILAHC", "CADILA HEALTHCARE"],
        has_derivatives=True,
        notes="Formerly known as Cadila Healthcare Limited.",
    ),

    # --- Delisted / Suspended Historical Equities ---
    SecurityRecord(
        canonical_id="NSE:RCOM",
        symbol="RCOM",
        exchange="NSE",
        company_name="Reliance Communications Limited (Suspended / CIRP)",
        isin="INE330H01018",
        series="BZ",
        listing_status=ListingStatus.SUSPENDED,
        market_cap_category=MarketCapCategory.MICRO_CAP,
        sector="Communication Services",
        industry="Insolvency Proceedings (IBC)",
        yahoo_ticker="RCOM.NS",
        delisting_date=date(2021, 6, 1),
        notes="Trading suspended under IBC Corporate Insolvency Resolution Process.",
    ),
    SecurityRecord(
        canonical_id="NSE:DHFL",
        symbol="DHFL",
        exchange="NSE",
        company_name="Dewan Housing Finance Corporation Limited (Delisted)",
        isin="INE202B01012",
        series="EQ",
        listing_status=ListingStatus.DELISTED,
        market_cap_category=MarketCapCategory.MICRO_CAP,
        sector="Financial Services",
        industry="Housing Finance (Acquired by Piramal)",
        yahoo_ticker="DHFL.NS",
        delisting_date=date(2021, 9, 30),
        notes="Delisted pursuant to resolution plan approval by NCLT.",
    ),
]


class SecurityMaster:
    """In-memory point-in-time safe security master registry with dynamic resolution."""

    def __init__(self) -> None:
        self._records: dict[str, SecurityRecord] = {}
        self._symbol_lookup: dict[tuple[str, str], SecurityRecord] = {}
        self._alias_lookup: dict[str, SecurityRecord] = {}
        self._isin_lookup: dict[str, SecurityRecord] = {}
        self._seed()

    def _seed(self) -> None:
        """Loads canonical seed securities into lookup indexes."""
        for rec in CANONICAL_SECURITIES_SEED:
            self.register(rec)

    def register(self, record: SecurityRecord) -> None:
        """Registers a security record into all indexing structures."""
        self._records[record.canonical_id] = record
        self._symbol_lookup[(record.symbol.upper(), record.exchange.upper())] = record
        if record.isin.upper() not in self._isin_lookup or record.exchange == "NSE":
            self._isin_lookup[record.isin.upper()] = record
        for alias in record.aliases:
            self._alias_lookup[alias.upper()] = record

    def list_all(self) -> list[SecurityRecord]:
        """Returns all registered security records."""
        return list(self._records.values())

    def get_by_symbol(self, symbol: str, exchange: str = "NSE") -> SecurityRecord | None:
        """Retrieves a security record by symbol and exchange, checking aliases if not directly found."""
        sym_upper = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
        rec = self._symbol_lookup.get((sym_upper, exchange.upper()))
        if rec:
            return rec
        alt_exchange = "BSE" if exchange.upper() == "NSE" else "NSE"
        rec = self._symbol_lookup.get((sym_upper, alt_exchange))
        if rec:
            return rec
        return self._alias_lookup.get(sym_upper)

    def has_local_parquet(self, symbol: str) -> bool:
        """Checks if a verified Parquet file exists locally for this symbol."""
        clean = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
        data_root = Path(DataConfig().parquet_dir) / "ohlcv"
        candidate = data_root / f"bars_{clean.lower()}.parquet"
        return candidate.exists()

    def search(self, query: str, limit: int = 15) -> list[dict[str, Any]]:
        """Searches securities by symbol, company name, alias, or ISIN."""
        q = query.strip().upper()
        if not q:
            # Return top active compounders by default
            return [
                {
                    **rec.model_dump(mode="json"),
                    "has_local_parquet": self.has_local_parquet(rec.symbol),
                }
                for rec in list(self._records.values())[:limit]
                if rec.listing_status == ListingStatus.ACTIVE
            ]

        exact_matches: list[SecurityRecord] = []
        prefix_matches: list[SecurityRecord] = []
        substring_matches: list[SecurityRecord] = []
        seen_ids: set[str] = set()

        for rec in self._records.values():
            cid = rec.canonical_id
            sym = rec.symbol.upper()
            cname = rec.company_name.upper()
            isin = rec.isin.upper()
            aliases = [a.upper() for a in rec.aliases]

            if q == sym or q == cid or q == isin or q in aliases:
                exact_matches.append(rec)
                seen_ids.add(cid)
            elif sym.startswith(q) or any(a.startswith(q) for a in aliases):
                if cid not in seen_ids:
                    prefix_matches.append(rec)
                    seen_ids.add(cid)
            elif q in cname or q in sym:
                if cid not in seen_ids:
                    substring_matches.append(rec)
                    seen_ids.add(cid)

        results = exact_matches + prefix_matches + substring_matches
        return [
            {
                **rec.model_dump(mode="json"),
                "has_local_parquet": self.has_local_parquet(rec.symbol),
            }
            for rec in results[:limit]
        ]

    def resolve(self, query: str) -> SecurityResolutionResult:
        """Resolves an arbitrary user query string into a canonical SecurityResolutionResult.

        Handles:
        - Exchange-qualified tickers (e.g. 'NSE:RELIANCE', 'BSE:500325')
        - Yahoo-suffixed tickers (e.g. 'RELIANCE.NS', '500325.BO')
        - Plain tickers (e.g. 'RELIANCE', 'TCS') -> defaults to NSE
        - Company aliases (e.g. 'MINDTREE' -> 'LTIM', 'CADILAHC' -> 'ZYDUSLIFE')
        - Company names (e.g. 'Tata Consultancy Services' -> 'TCS')
        - ISIN codes (e.g. 'INE002A01018' -> 'RELIANCE')
        - Arbitrary valid Indian ticker format (allows researching any new Indian stock)
        """
        raw = query.strip()
        if not raw:
            return SecurityResolutionResult(
                resolved=False,
                canonical_id="",
                symbol="",
                exchange="",
                yahoo_ticker="",
                company_name="",
                resolution_type=ResolutionType.INVALID_FORMAT,
                listing_status=ListingStatus.UNKNOWN,
                is_valid_for_research=False,
                has_local_parquet=False,
                message="Security identifier cannot be empty.",
            )

        clean = raw.upper()

        # 1. Check exact canonical ID (e.g. 'NSE:RELIANCE', 'BSE:500325')
        if clean in self._records:
            rec = self._records[clean]
            return self._build_result(rec, ResolutionType.CANONICAL_EXACT)

        # 2. Check ISIN
        if clean in self._isin_lookup:
            rec = self._isin_lookup[clean]
            return self._build_result(rec, ResolutionType.ISIN_MATCH)

        # 3. Check Known Aliases / Renamed Securities
        if clean in self._alias_lookup:
            rec = self._alias_lookup[clean]
            return self._build_result(
                rec,
                ResolutionType.ALIAS_MATCH,
                message=f"Resolved alias '{clean}' to active security {rec.canonical_id} ({rec.company_name}).",
            )

        # 4. Handle Exchange prefixes or suffixes
        exchange = "NSE"
        pure_symbol = clean

        if ":" in clean:
            parts = clean.split(":", 1)
            exchange = parts[0]
            pure_symbol = parts[1]
        elif clean.endswith(".NS"):
            exchange = "NSE"
            pure_symbol = clean[:-3]
        elif clean.endswith(".BO"):
            exchange = "BSE"
            pure_symbol = clean[:-3]
        elif clean.isdigit() and len(clean) == 6:
            # 6-digit number indicates BSE Scrip Code
            exchange = "BSE"
            pure_symbol = clean

        # Also check pure_symbol against alias lookup
        if pure_symbol in self._alias_lookup:
            rec = self._alias_lookup[pure_symbol]
            return self._build_result(
                rec,
                ResolutionType.ALIAS_MATCH,
                message=f"Resolved alias '{pure_symbol}' to active security {rec.canonical_id} ({rec.company_name}).",
            )

        # Check symbol lookup with determined exchange
        key = (pure_symbol, exchange)
        if key in self._symbol_lookup:
            rec = self._symbol_lookup[key]
            return self._build_result(rec, ResolutionType.SYMBOL_MATCH)

        # Fallback symbol check on opposite exchange if not found
        alt_exchange = "BSE" if exchange == "NSE" else "NSE"
        alt_key = (pure_symbol, alt_exchange)
        if alt_key in self._symbol_lookup:
            rec = self._symbol_lookup[alt_key]
            return self._build_result(
                rec,
                ResolutionType.SYMBOL_MATCH,
                message=f"Resolved on alternate exchange {rec.exchange}.",
            )

        # 5. Fuzzy match against company names
        for rec in self._records.values():
            if clean in rec.company_name.upper():
                return self._build_result(rec, ResolutionType.COMPANY_NAME_MATCH)

        # 6. Syntax validation for uncatalogued Indian equities
        # Any well-formed alphanumeric symbol is dynamically accepted for data retrieval
        if not re.match(r"^[A-Z0-9_\-]+$", pure_symbol) or len(pure_symbol) > 20:
            return SecurityResolutionResult(
                resolved=False,
                canonical_id="",
                symbol=pure_symbol,
                exchange=exchange,
                yahoo_ticker=f"{pure_symbol}.{'NS' if exchange == 'NSE' else 'BO'}",
                company_name=f"{pure_symbol} (Unresolved)",
                resolution_type=ResolutionType.INVALID_FORMAT,
                listing_status=ListingStatus.UNKNOWN,
                is_valid_for_research=False,
                has_local_parquet=False,
                message=f"Invalid Indian stock symbol syntax: '{pure_symbol}'.",
            )

        # Valid Indian security format not currently in seed catalog: Dynamically resolve!
        yahoo_ticker = f"{pure_symbol}.{'NS' if exchange == 'NSE' else 'BO'}"
        canonical_id = f"{exchange}:{pure_symbol}"
        has_local = self.has_local_parquet(pure_symbol)

        return SecurityResolutionResult(
            resolved=True,
            canonical_id=canonical_id,
            symbol=pure_symbol,
            exchange=exchange,
            yahoo_ticker=yahoo_ticker,
            company_name=f"{pure_symbol} Equity ({exchange})",
            record=None,
            resolution_type=ResolutionType.DYNAMIC_RESOLVED_UNLISTED,
            listing_status=ListingStatus.ACTIVE,
            is_valid_for_research=True,
            has_local_parquet=has_local,
            is_sme=pure_symbol.endswith("SM"),
            has_derivatives=False,
            message=(
                f"Dynamically resolved {canonical_id}. "
                f"{'Verified local Parquet cache available.' if has_local else 'Will retrieve from live data source.'}"
            ),
        )

    def _build_result(
        self,
        record: SecurityRecord,
        resolution_type: ResolutionType,
        message: str = "",
    ) -> SecurityResolutionResult:
        """Constructs a successful resolution result from a SecurityRecord."""
        has_local = self.has_local_parquet(record.symbol)
        msg = message or f"Successfully resolved to {record.canonical_id} ({record.company_name})."
        is_valid = record.listing_status != ListingStatus.DELISTED

        return SecurityResolutionResult(
            resolved=True,
            canonical_id=record.canonical_id,
            symbol=record.symbol,
            exchange=record.exchange,
            yahoo_ticker=record.yahoo_ticker,
            company_name=record.company_name,
            record=record,
            resolution_type=resolution_type,
            listing_status=record.listing_status,
            is_valid_for_research=is_valid,
            has_local_parquet=has_local,
            is_sme=record.is_sme,
            has_derivatives=record.has_derivatives,
            lot_size=record.lot_size,
            price_band_pct=record.price_band_pct,
            corporate_actions=record.corporate_actions,
            message=msg,
        )


# ============================================================================
# Singleton Security Master Accessor
# ============================================================================

_DEFAULT_SECURITY_MASTER: SecurityMaster | None = None


def get_security_master() -> SecurityMaster:
    """Returns singleton instance of the Indian Security Master."""
    global _DEFAULT_SECURITY_MASTER
    if _DEFAULT_SECURITY_MASTER is None:
        _DEFAULT_SECURITY_MASTER = SecurityMaster()
    return _DEFAULT_SECURITY_MASTER
