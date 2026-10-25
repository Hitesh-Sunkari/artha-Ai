"""Authentic statutory, regulatory, and corporate filing document repository for Indian markets.

Provides structured, immutable reference texts used by the RAG retriever and agents:
- SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015
- Finance (No. 2) Act 2024 Statutory Securities Transaction Tax (STT) Schedule
- Reserve Bank of India (RBI) Monetary Policy & Liquidity Framework
- Official corporate disclosure filings for benchmark Indian equities (RELIANCE, TCS, INFY, HDFCBANK)
"""

from __future__ import annotations

from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field


class DocumentChunk(BaseModel):
    """An individual indexed passage with stable citation metadata."""

    model_config = ConfigDict(frozen=True)

    chunk_id: str
    doc_id: str
    doc_type: str  # REGULATION, STATUTE, MACRO, FILING
    title: str
    symbol: str | None = None  # None for broad regulations/statutes
    effective_date: str  # YYYY-MM-DD
    content: str
    citation_uri: str
    source_authority: str


REGULATORY_AND_STATUTORY_CHUNKS: list[DocumentChunk] = [
    # -------------------------------------------------------------------------
    # 1. SEBI (Listing Obligations and Disclosure Requirements) Regulations
    # -------------------------------------------------------------------------
    DocumentChunk(
        chunk_id="SEBI-LODR-REG30-MATERIALITY",
        doc_id="SEBI-LODR-2015",
        doc_type="REGULATION",
        title="SEBI LODR Regulation 30: Disclosure of Material Events",
        symbol=None,
        effective_date="2015-12-01",
        content=(
            "SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015 — Regulation 30: "
            "Every listed entity shall promptly make disclosures of any events or information which, "
            "in the opinion of the board of directors, are material. Material events under Schedule III Part A "
            "must be disclosed to recognized stock exchanges (NSE/BSE) as soon as reasonably possible and "
            "no later than: (a) thirty minutes from the closure of the board meeting for outcome disclosures; "
            "(b) twelve hours from occurrence for events originating within the entity; "
            "(c) twenty-four hours from occurrence for external events."
        ),
        citation_uri="rag://sebi/lodr_reg30#SEBI-LODR-REG30-MATERIALITY",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    DocumentChunk(
        chunk_id="SEBI-LODR-REG33-FINANCIALS",
        doc_id="SEBI-LODR-2015",
        doc_type="REGULATION",
        title="SEBI LODR Regulation 33: Financial Results Reporting Standards",
        symbol=None,
        effective_date="2015-12-01",
        content=(
            "SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015 — Regulation 33: "
            "The listed entity shall submit quarterly and year-to-date standalone financial results to the stock exchange "
            "within forty-five days of the end of each quarter (sixty days for annual audited financial results). "
            "The financial results submitted shall be accompanied by the Limited Review Report or Audit Report "
            "submitted by the statutory auditors. Unaudited results must state whether statutory auditors have "
            "expressed any modified opinion or disclaimer."
        ),
        citation_uri="rag://sebi/lodr_reg33#SEBI-LODR-REG33-FINANCIALS",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    # -------------------------------------------------------------------------
    # 2. Finance (No. 2) Act 2024 Statutory Cost Schedule
    # -------------------------------------------------------------------------
    DocumentChunk(
        chunk_id="FINANCE-ACT-2024-STT-DELIVERY",
        doc_id="FINANCE-ACT-2024",
        doc_type="STATUTE",
        title="Finance (No. 2) Act 2024: Securities Transaction Tax (STT) Equity Delivery",
        symbol=None,
        effective_date="2024-10-01",
        content=(
            "Finance (No. 2) Act 2024, Chapter VII — Securities Transaction Tax: "
            "Under Section 98 and Section 99, taxable securities transactions in Equity Delivery on recognized "
            "stock exchanges shall be levied at 0.1% (one-tenth of one percent) payable by both the purchaser and seller. "
            "For equity intraday (non-delivery) transactions, the statutory rate is 0.025% payable by the seller only. "
            "Statutory costs are mandatory and deduct from gross trading turnover before net trading realization."
        ),
        citation_uri="rag://statutory/finance_act_2024#FINANCE-ACT-2024-STT-DELIVERY",
        source_authority="Ministry of Finance, Government of India",
    ),
    DocumentChunk(
        chunk_id="FINANCE-ACT-2024-STT-DERIVATIVES",
        doc_id="FINANCE-ACT-2024",
        doc_type="STATUTE",
        title="Finance (No. 2) Act 2024: Revised STT on Futures and Options",
        symbol=None,
        effective_date="2024-10-01",
        content=(
            "Finance (No. 2) Act 2024, Section 98 Amendments effective October 1, 2024: "
            "1. Sale of an option in securities: STT increased to 0.1% (from 0.0625%) of the option premium payable by seller. "
            "2. Sale of a future in securities: STT increased to 0.02% (from 0.0125%) of the trade value payable by seller. "
            "Any quantitative model operating in Indian derivatives must account for this increased statutory drag "
            "to prevent lookback slippage underestimation."
        ),
        citation_uri="rag://statutory/finance_act_2024#FINANCE-ACT-2024-STT-DERIVATIVES",
        source_authority="Ministry of Finance, Government of India",
    ),
    # -------------------------------------------------------------------------
    # 3. Reserve Bank of India (RBI) Macroeconomic Framework
    # -------------------------------------------------------------------------
    DocumentChunk(
        chunk_id="RBI-MPC-REPO-RATE-FRAMEWORK",
        doc_id="RBI-MONETARY-POLICY",
        doc_type="MACRO",
        title="RBI Monetary Policy Committee (MPC) Operating Framework",
        symbol=None,
        effective_date="2024-08-08",
        content=(
            "Reserve Bank of India Monetary Policy Committee Operating Framework: "
            "The policy repo rate under the Liquidity Adjustment Facility (LAF) serves as the anchor rate for money market interest rates. "
            "The Standing Deposit Facility (SDF) rate operates at repo rate minus 25 bps (6.25% when repo is 6.50%), "
            "and the Marginal Standing Facility (MSF) operates at repo rate plus 25 bps (6.75%). "
            "The MPC targets medium-term consumer price index (CPI) headline inflation of 4.0% within a +/- 2.0% tolerance band."
        ),
        citation_uri="rag://macro/rbi_policy#RBI-MPC-REPO-RATE-FRAMEWORK",
        source_authority="Reserve Bank of India (RBI)",
    ),
    # -------------------------------------------------------------------------
    # 4. Official Corporate Filing Disclosures for Benchmark Equities
    # -------------------------------------------------------------------------
    DocumentChunk(
        chunk_id="FILING-RELIANCE-Q2FY25",
        doc_id="RELIANCE-Q2FY25",
        doc_type="FILING",
        title="Reliance Industries Ltd: Q2 FY25 Standalone & Consolidated Financial Disclosures",
        symbol="RELIANCE",
        effective_date="2024-10-14",
        content=(
            "Reliance Industries Limited (NSE: RELIANCE) Statutory Disclosure under SEBI LODR Regulation 33: "
            "For the quarter ended September 30, 2024 (Q2 FY25), Consolidated Revenue from Operations stood at INR 235,481 crore. "
            "Jio Infocomm reported quarterly net profit growth with monthly Average Revenue Per User (ARPU) increasing to INR 195.1. "
            "Oil-to-Chemicals (O2C) segment performance reflected global downstream crack margin volatility offset by domestic fuel demand. "
            "Capital expenditure for the quarter remained aligned with 5G rollout and renewable energy manufacturing."
        ),
        citation_uri="rag://filings/reliance_q2fy25#FILING-RELIANCE-Q2FY25",
        source_authority="National Stock Exchange of India (NSE) Corporate Disclosures",
    ),
    DocumentChunk(
        chunk_id="FILING-TCS-Q2FY25",
        doc_id="TCS-Q2FY25",
        doc_type="FILING",
        title="Tata Consultancy Services Ltd: Q2 FY25 Financial Results & Shareholder Return",
        symbol="TCS",
        effective_date="2024-10-10",
        content=(
            "Tata Consultancy Services Limited (NSE: TCS) Statutory Disclosure under SEBI LODR Regulation 33: "
            "For the quarter ended September 30, 2024, Constant Currency revenue expanded 5.5% YoY. "
            "Operating margin stood at 24.1%. Net headcount expanded by 5,726 employees with LTM attrition moderating to 12.3%. "
            "Total Contract Value (TCV) signed reached USD 8.6 billion with resilient demand in Cloud migration and Enterprise AI services. "
            "Board declared second interim dividend of INR 10 per equity share."
        ),
        citation_uri="rag://filings/tcs_q2fy25#FILING-TCS-Q2FY25",
        source_authority="National Stock Exchange of India (NSE) Corporate Disclosures",
    ),
    DocumentChunk(
        chunk_id="FILING-INFY-Q2FY25",
        doc_id="INFY-Q2FY25",
        doc_type="FILING",
        title="Infosys Ltd: Q2 FY25 Financial Disclosures & FY25 Guidance Update",
        symbol="INFY",
        effective_date="2024-10-17",
        content=(
            "Infosys Limited (NSE: INFY) Statutory Disclosure under SEBI LODR Regulation 33: "
            "Q2 FY25 constant currency revenue grew 3.8% YoY. Operating margin expanded to 21.1%. "
            "Large deal Total Contract Value (TCV) was reported at USD 2.4 billion with 52% net new deals. "
            "FY25 constant currency revenue guidance revised upwards to 3.75% - 4.50%. "
            "Interim dividend of INR 21 per share approved by board of directors."
        ),
        citation_uri="rag://filings/infy_q2fy25#FILING-INFY-Q2FY25",
        source_authority="National Stock Exchange of India (NSE) Corporate Disclosures",
    ),
    DocumentChunk(
        chunk_id="FILING-HDFCBANK-Q2FY25",
        doc_id="HDFCBANK-Q2FY25",
        doc_type="FILING",
        title="HDFC Bank Ltd: Q2 FY25 Disclosures on Advances, Deposits, and Asset Quality",
        symbol="HDFCBANK",
        effective_date="2024-10-19",
        content=(
            "HDFC Bank Limited (NSE: HDFCBANK) Statutory Disclosure under SEBI LODR Regulation 33: "
            "Total deposits grew 15.1% YoY to INR 25.0 lakh crore in Q2 FY25. "
            "Gross Advances grew 7.0% YoY. Gross Non-Performing Assets (GNPA) stood stable at 1.36% (Net NPA at 0.41%). "
            "Capital Adequacy Ratio (CAR) under Basel III stood at 19.8% against regulatory minimum of 11.7%. "
            "Credit-to-Deposit (CD) ratio moderated sequentially as post-merger balance sheet normalization progresses."
        ),
        citation_uri="rag://filings/hdfcbank_q2fy25#FILING-HDFCBANK-Q2FY25",
        source_authority="National Stock Exchange of India (NSE) Corporate Disclosures",
    ),
]
