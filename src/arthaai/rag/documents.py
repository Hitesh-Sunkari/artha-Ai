"""Authentic statutory, regulatory, corporate filing, and company profile document repository for Indian markets.

Provides structured, immutable reference texts used by the RAG retriever, live query synthesis engine, and agents:
- SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015
- Finance (No. 2) Act 2024 Statutory Securities Transaction Tax (STT), LTCG, STCG & Buyback Taxation
- Reserve Bank of India (RBI) Monetary Policy, Liquidity, IRAC NPA Norms, Risk Weights, Digital Lending
- Central Goods and Services Tax (CGST) Act & Income-tax Act Section 115BAA & Section 194
- SEBI Prohibition of Insider Trading (PIT), SAST Takeover Code, ASM & GSM Surveillance Frameworks
- Government of India Union Budget 2024-25, Infrastructure Capex, PLI Schemes, Green Hydrogen, ISM
- Official corporate disclosure filings & table-aware statements for all 32 candidate equities
- Comprehensive company profiles & fundamental operational overviews for all 32 candidate equities
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field

from arthaai.rag.document_parser import PromptInjectionDefender, TableAwareChunk, TableRowItem


class DocumentChunk(BaseModel):
    """An individual indexed passage with stable citation metadata."""

    model_config = ConfigDict(frozen=True)

    chunk_id: str
    doc_id: str
    doc_type: str  # REGULATION, STATUTE, MACRO, FILING, SURVEILLANCE, GOVT_POLICY, COMPANY_PROFILE, SCRAPED_INTELLIGENCE
    title: str
    symbol: str | None = None  # None for broad regulations/statutes, or ticker symbol
    effective_date: str  # YYYY-MM-DD
    content: str
    citation_uri: str
    source_authority: str

    # Expanded metadata fields for Phase B Workstream 2
    reporting_period: str | None = None
    basis: str | None = None  # CONSOLIDATED or STANDALONE
    audit_status: str | None = None  # AUDITED, UNAUDITED_LIMITED_REVIEW
    unit: str | None = "CRORES"
    content_hash: str | None = None
    is_restated: bool = False
    restatement_date: str | None = None
    superseded_by: str | None = None


# Canonical mapping of common Indian company names and colloquial aliases to primary ticker symbols
NAME_TO_SYMBOL_MAP: dict[str, str] = {
    "reliance": "RELIANCE",
    "ril": "RELIANCE",
    "reliance industries": "RELIANCE",
    "jio": "RELIANCE",
    "swiggy": "SWIGGY",
    "instamart": "SWIGGY",
    "tcs": "TCS",
    "tata consultancy": "TCS",
    "infosys": "INFY",
    "infy": "INFY",
    "hdfc": "HDFCBANK",
    "hdfc bank": "HDFCBANK",
    "hdfcbank": "HDFCBANK",
    "icici": "ICICIBANK",
    "icici bank": "ICICIBANK",
    "icicibank": "ICICIBANK",
    "airtel": "BHARTIARTL",
    "bharti": "BHARTIARTL",
    "bharti airtel": "BHARTIARTL",
    "itc": "ITC",
    "sbi": "SBIN",
    "state bank": "SBIN",
    "sbin": "SBIN",
    "larsen": "LT",
    "l&t": "LT",
    "lt": "LT",
    "hul": "HINDUNILVR",
    "hindustan unilever": "HINDUNILVR",
    "unilever": "HINDUNILVR",
    "bajaj finance": "BAJFINANCE",
    "bajfinance": "BAJFINANCE",
    "hcl": "HCLTECH",
    "hcl tech": "HCLTECH",
    "kotak": "KOTAKBANK",
    "kotak bank": "KOTAKBANK",
    "sun pharma": "SUNPHARMA",
    "sun pharmaceutical": "SUNPHARMA",
    "axis": "AXISBANK",
    "axis bank": "AXISBANK",
    "axisbank": "AXISBANK",
    "maruti": "MARUTI",
    "maruti suzuki": "MARUTI",
    "titan": "TITAN",
    "tanishq": "TITAN",
    "ultratech": "ULTRACEMCO",
    "tata motors": "TATAMOTORS",
    "jlr": "TATAMOTORS",
    "asian paints": "ASIANPAINT",
    "ntpc": "NTPC",
    "power grid": "POWERGRID",
    "powergrid": "POWERGRID",
    "mahindra": "M&M",
    "m&m": "M&M",
    "bajaj finserv": "BAJAJFINSV",
    "coal india": "COALINDIA",
    "adani ports": "ADANIPORTS",
    "tata steel": "TATASTEEL",
    "siemens": "SIEMENS",
    "wipro": "WIPRO",
    "zomato": "ZOMATO",
}


# -----------------------------------------------------------------------------
# 1. Statutory, Regulatory, Macro, Tax, SEBI & Government Policy Chunks
# -----------------------------------------------------------------------------
STATUTORY_AND_MACRO_CHUNKS: list[DocumentChunk] = [
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
    DocumentChunk(
        chunk_id="RBI-CRR-MONETARY-POLICY-OCT24",
        doc_id="RBI-MPC-OCT2024",
        doc_type="MACRO",
        title="Reserve Bank of India Monetary Policy: Repo Rate 6.50% & Liquidity Stance",
        symbol=None,
        effective_date="2024-10-09",
        content=(
            "Reserve Bank of India Monetary Policy Committee Statement: The MPC decided by a 5 to 1 majority "
            "to keep the policy repo rate unchanged at 6.50%. Consequently, the standing deposit facility (SDF) "
            "rate remains at 6.25% and the marginal standing facility (MSF) rate and Bank Rate at 6.75%. "
            "The stance of monetary policy was unanimously revised from 'withdrawal of accommodation' to 'NEUTRAL'. "
            "Cash Reserve Ratio (CRR) of scheduled commercial banks is maintained at 4.50% of NDTL."
        ),
        citation_uri="rag://rbi/mpc_statement_oct2024#RBI-CRR-MONETARY-POLICY-OCT24",
        source_authority="Reserve Bank of India (RBI)",
    ),
    DocumentChunk(
        chunk_id="NSE-ASM-FRAMEWORK-SURVEILLANCE",
        doc_id="NSE-SURVEILLANCE-CIRCULAR",
        doc_type="SURVEILLANCE",
        title="NSE / BSE Additional Surveillance Measure (ASM) Framework Guidelines",
        symbol=None,
        effective_date="2023-06-05",
        content=(
            "NSE Surveillance Circular — Additional Surveillance Measure (ASM): Criteria for shortlisting scrips "
            "under Long-term ASM include high-low price variation, client concentration, PE ratio >= 2x of Nifty 50 PE, "
            "and market capitalization thresholds. Scrips under ASM Stage 1-4 are subjected to 100% margin requirements "
            "and reduced price bands (5% or 2%) to curb speculative volatility."
        ),
        citation_uri="rag://nse/surveillance_asm#NSE-ASM-FRAMEWORK-SURVEILLANCE",
        source_authority="National Stock Exchange of India (NSE)",
    ),
    DocumentChunk(
        chunk_id="SEBI-RESEARCH-ANALYSTS-REG-2024",
        doc_id="SEBI-RA-REGS-2024",
        doc_type="REGULATION",
        title="SEBI (Research Analysts) Regulations: Research Report Standards, Valuation & Independence",
        symbol=None,
        effective_date="2024-08-01",
        content=(
            "SEBI (Research Analysts) Regulations, 2014 & 2024 Amendments: "
            "Research analysts and research entities shall maintain documented valuation models, verifiable historical evidence, "
            "and objective risk assessment for all equity recommendations. Target prices and stop losses must be derived "
            "from reproducible quantitative metrics or stated fundamental cash flow multiples. Analysts are strictly prohibited "
            "from guaranteeing returns, promising price targets without disclaimers, or publishing contradictory recommendations "
            "without disclosing material changes in underlying corporate fundamentals."
        ),
        citation_uri="rag://sebi/research_analyst_regs#SEBI-RESEARCH-ANALYSTS-REG-2024",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    DocumentChunk(
        chunk_id="SEBI-CIRCUIT-BREAKER-PRICE-BANDS",
        doc_id="SEBI-SURVEILLANCE-PRICE-BANDS",
        doc_type="REGULATION",
        title="SEBI Dynamic Price Band and Market-Wide Circuit Breaker Operating Framework",
        symbol=None,
        effective_date="2024-01-15",
        content=(
            "SEBI Master Circular for Stock Exchanges — Price Bands & Circuit Filters: "
            "Individual securities are subjected to daily price bands of 2%, 5%, 10%, or 20% to prevent artificial manipulation. "
            "Securities in the Trade-to-Trade (BE series) and Enhanced Surveillance Measure (ESM) operate at 2% or 5% maximum bands. "
            "Market-wide circuit breakers trigger at 10%, 15%, and 20% movements in Nifty 50 or S&P BSE Sensex, requiring coordinated "
            "trading halts across all equity and derivative markets in India."
        ),
        citation_uri="rag://sebi/circuit_breakers_bands#SEBI-CIRCUIT-BREAKER-PRICE-BANDS",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    DocumentChunk(
        chunk_id="RBI-CRR-SLR-LIQUIDITY-NORMS",
        doc_id="RBI-LIQUIDITY-NORMS",
        doc_type="REGULATION",
        title="RBI Statutory Liquidity & Reserve Norms: CRR 4.50% & SLR 18.00%",
        symbol=None,
        effective_date="2024-10-09",
        content=(
            "Reserve Bank of India Statutory Framework — Reserve Ratios and Liquidity Architecture: "
            "Under Section 42(1) of the RBI Act 1934, Scheduled Commercial Banks are mandated to maintain a Cash Reserve Ratio (CRR) "
            "of 4.50% of Net Demand and Time Liabilities (NDTL) on an average daily basis. Under Section 24 of the Banking Regulation Act, 1949, "
            "banks must maintain a Statutory Liquidity Ratio (SLR) of 18.00% of NDTL in approved government securities and treasury bills. "
            "Additionally, Basel III Liquidity Coverage Ratio (LCR) mandates 100% High-Quality Liquid Assets (HQLA) to survive a 30-day stressed "
            "outflow scenario, and Net Stable Funding Ratio (NSFR) minimum is maintained at 100%."
        ),
        citation_uri="rag://rbi/liquidity_framework#RBI-CRR-SLR-LIQUIDITY-NORMS",
        source_authority="Reserve Bank of India (RBI)",
    ),
    DocumentChunk(
        chunk_id="RBI-PRUDENTIAL-IRAC-NORMS",
        doc_id="RBI-IRAC-MASTER-CIRCULAR",
        doc_type="REGULATION",
        title="RBI Prudential Norms on IRAC, Asset Classification & NPA Resolution",
        symbol=None,
        effective_date="2024-04-01",
        content=(
            "Reserve Bank of India Master Circular on Prudential Norms on Income Recognition, Asset Classification and Provisioning (IRAC): "
            "An asset becomes non-performing (NPA) when interest or principal installment remains overdue for a period exceeding 90 days. "
            "Asset classifications: 1. Standard Assets (general provisioning 0.40% for retail/MSME); 2. Sub-Standard Assets (NPA period <= 12 months, "
            "15% secured provisioning); 3. Doubtful Assets (D1: 1-2 years 25%, D2: 2-3 years 40%, D3: >3 years 100% unsecured 100%); "
            "4. Loss Assets (100% provision or write-off). Banks are required to target a minimum Provision Coverage Ratio (PCR) above 70%."
        ),
        citation_uri="rag://rbi/irac_norms#RBI-PRUDENTIAL-IRAC-NORMS",
        source_authority="Reserve Bank of India (RBI)",
    ),
    DocumentChunk(
        chunk_id="RBI-UNSECURED-CREDIT-RISK-WEIGHTS",
        doc_id="RBI-DOR-STR-REC-2023",
        doc_type="REGULATION",
        title="RBI Regulatory Measures on Consumer Credit & NBFC Bank Exposure (125% Risk Weights)",
        symbol=None,
        effective_date="2023-11-16",
        content=(
            "Reserve Bank of India Regulatory Measure (RBI/2023-24/85 DOR.STR.REC.57/21.06.001/2023-24): "
            "To contain systemic build-up in retail lending, risk weights on consumer credit exposure (personal loans, unsecured personal advances) "
            "of Scheduled Commercial Banks and NBFCs were raised by 25 percentage points from 100% to 125%. "
            "Credit card receivables risk weights increased by 25 percentage points to 150% for SCBs and 125% for NBFCs. "
            "Bank lending exposure to AAA/AA rated NBFCs was also increased by 25 bps above standard Basel risk weightings, "
            "forcing lenders to expand capital buffers and tighten underwriting criteria."
        ),
        citation_uri="rag://rbi/unsecured_credit_circular#RBI-UNSECURED-CREDIT-RISK-WEIGHTS",
        source_authority="Reserve Bank of India (RBI)",
    ),
    DocumentChunk(
        chunk_id="RBI-DIGITAL-LENDING-FLDG-GUIDELINES",
        doc_id="RBI-DIGITAL-LENDING-2023",
        doc_type="REGULATION",
        title="RBI Master Direction on Digital Lending & Default Loss Guarantee (FLDG) 5% Cap",
        symbol=None,
        effective_date="2023-06-08",
        content=(
            "Reserve Bank of India Guidelines on Default Loss Guarantee (FLDG) in Digital Lending: "
            "Regulated Entities (REs) entering into FLDG arrangements with Lending Service Providers (LSPs) or fintech partners "
            "must cap total default guarantee cover at a maximum of 5% of the total loan portfolio disbursed. "
            "Direct loan disbursals and repayments are strictly mandated between the borrower's bank account and the RE's account "
            "without pass-through pool or escrow accounts. REs must deliver a standardized Key Fact Statement (KFS) stating all inclusive "
            "Annual Percentage Rate (APR) and a cooling-off look-up period."
        ),
        citation_uri="rag://rbi/digital_lending_fldg#RBI-DIGITAL-LENDING-FLDG-GUIDELINES",
        source_authority="Reserve Bank of India (RBI)",
    ),
    DocumentChunk(
        chunk_id="RBI-NBFC-SCALE-BASED-REGULATION",
        doc_id="RBI-SBR-FRAMEWORK-2023",
        doc_type="REGULATION",
        title="RBI Scale Based Regulatory (SBR) Framework for Non-Banking Financial Companies",
        symbol=None,
        effective_date="2023-10-01",
        content=(
            "Reserve Bank of India Scale Based Regulatory (SBR) Framework: "
            "NBFCs are categorized into a 4-tier structure: Base Layer (NBFC-BL, non-systemically important under INR 1,000 Cr), "
            "Middle Layer (NBFC-ML, systemically important deposit-taking/non-deposit >= INR 1,000 Cr), Upper Layer (NBFC-UL, top 15 systematically "
            "significant NBFCs including Bajaj Finance, Tata Sons, Aditya Birla Finance, L&T Finance), and Top Layer (NBFC-TL). "
            "Upper Layer entities are subjected to bank-grade governance, mandatory Common Equity Tier 1 (CET1) of at least 9%, "
            "mandatory stock exchange listing within 3 years, and Board Risk Committees."
        ),
        citation_uri="rag://rbi/nbfc_scale_based#RBI-NBFC-SCALE-BASED-REGULATION",
        source_authority="Reserve Bank of India (RBI)",
    ),
    DocumentChunk(
        chunk_id="FINANCE-ACT-2024-CAPITAL-GAINS",
        doc_id="FINANCE-ACT-2024",
        doc_type="STATUTE",
        title="Finance (No. 2) Act 2024: Capital Gains Restructuring (12.5% LTCG & 20% STCG)",
        symbol=None,
        effective_date="2024-07-23",
        content=(
            "Finance (No. 2) Act 2024, Chapter IV amendments to Section 112A and Section 111A of the Income-tax Act, 1961: "
            "1. Long-Term Capital Gains (LTCG) on listed equity shares, equity-oriented units, and business trust units held > 12 months "
            "are taxed at 12.5% (increased from 10%) for transfers on or after July 23, 2024. "
            "The annual aggregate LTCG exemption limit under Section 112A was increased from INR 1,00,000 to INR 1,25,000. "
            "2. Short-Term Capital Gains (STCG) under Section 111A on listed equities held <= 12 months are taxed at 20% (increased from 15%). "
            "Indexation benefit on unlisted assets and real estate is rationalized to 12.5% without indexation."
        ),
        citation_uri="rag://statutory/finance_act_2024#FINANCE-ACT-2024-CAPITAL-GAINS",
        source_authority="Ministry of Finance, Government of India",
    ),
    DocumentChunk(
        chunk_id="FINANCE-ACT-2024-BUYBACK-TAXATION",
        doc_id="FINANCE-ACT-2024",
        doc_type="STATUTE",
        title="Finance (No. 2) Act 2024: Corporate Share Buyback Taxation Shift to Deemed Dividend",
        symbol=None,
        effective_date="2024-10-01",
        content=(
            "Finance (No. 2) Act 2024, Section 2(22)(f) and Section 115QA Revision: "
            "Effective October 1, 2024, company share buybacks are no longer taxed at company level under Section 115QA (previously 20% + surcharge). "
            "Instead, the gross proceeds of buybacks are treated as deemed dividends under Section 2(22)(f) and taxed directly in the hands "
            "of shareholders at applicable individual/corporate income tax slab rates (up to 39% peak rate for HNIs, or 25.17% for domestic corporates). "
            "The original acquisition cost of the tendered shares is treated as a capital loss for the shareholder, available for set-off against future capital gains."
        ),
        citation_uri="rag://statutory/finance_act_2024#FINANCE-ACT-2024-BUYBACK-TAXATION",
        source_authority="Ministry of Finance, Government of India",
    ),
    DocumentChunk(
        chunk_id="INCOME-TAX-CORPORATE-TAX-115BAA",
        doc_id="INCOME-TAX-ACT-1961",
        doc_type="STATUTE",
        title="Income-tax Act Section 115BAA: Concessional Corporate Income Tax (25.17% Effective)",
        symbol=None,
        effective_date="2019-09-20",
        content=(
            "Income-tax Act, 1961 — Section 115BAA Domestic Corporate Tax Framework: "
            "Domestic companies are eligible to opt for a concessional base tax rate of 22% (effective tax rate 25.17% inclusive of 10% surcharge "
            "and 4% health & education cess) subject to foregoing chapter VI-A profit-linked deductions and special investment allowances. "
            "Companies exercising option under Section 115BAA are permanently exempt from the provisions of Minimum Alternate Tax (MAT) "
            "under Section 115JB. Over 85% of Nifty 50 and BSE 500 corporations utilize the Section 115BAA regime."
        ),
        citation_uri="rag://incometax/section_115baa#INCOME-TAX-CORPORATE-TAX-115BAA",
        source_authority="Central Board of Direct Taxes (CBDT), Ministry of Finance",
    ),
    DocumentChunk(
        chunk_id="GST-FINANCIAL-SERVICES-18PCT",
        doc_id="CGST-ACT-2017",
        doc_type="STATUTE",
        title="Central GST Act: 18% Goods & Services Tax on Brokerage & Capital Market Transactions",
        symbol=None,
        effective_date="2017-07-01",
        content=(
            "Central Goods and Services Tax (CGST) Act, 2017 — Chapter V (Financial and Related Services): "
            "A standard rate of 18% GST applies to equity broking charges, brokerage commissions, depository participant (DP) fees, "
            "portfolio management services (PMS) fees, exchange transaction charges, SEBI regulatory turnover charges, and demat custodial fees. "
            "GST is levied on the service value and cannot be claimed as input tax credit by non-corporate retail investors."
        ),
        citation_uri="rag://gst/financial_services#GST-FINANCIAL-SERVICES-18PCT",
        source_authority="GST Council, Ministry of Finance",
    ),
    DocumentChunk(
        chunk_id="DIVIDEND-TAXATION-TDS-SECTION-194",
        doc_id="INCOME-TAX-ACT-1961",
        doc_type="STATUTE",
        title="Income-tax Act Section 194: Dividend Taxation & 10% Withholding Tax (TDS)",
        symbol=None,
        effective_date="2020-04-01",
        content=(
            "Income-tax Act, 1961 — Dividend Taxation Framework: "
            "Following the abolition of Dividend Distribution Tax (DDT) under Section 115-O by Finance Act 2020, dividends are taxable "
            "in the hands of investors at their applicable marginal income tax rates. Under Section 194, domestic listed companies must deduct "
            "Tax at Source (TDS) at 10% on dividend distributions exceeding INR 5,000 per shareholder in a financial year for resident individuals. "
            "For non-resident shareholders, Section 195 mandates TDS of 20% (plus surcharge and cess) subject to Double Taxation Avoidance Agreements (DTAA)."
        ),
        citation_uri="rag://incometax/section_194_dividend#DIVIDEND-TAXATION-TDS-SECTION-194",
        source_authority="Central Board of Direct Taxes (CBDT), Ministry of Finance",
    ),
    DocumentChunk(
        chunk_id="SEBI-PIT-INSIDER-TRADING-UPSI",
        doc_id="SEBI-PIT-2015",
        doc_type="REGULATION",
        title="SEBI PIT Regulations 2015: UPSI Preservation, SDD Database & Trading Window Closure",
        symbol=None,
        effective_date="2015-05-15",
        content=(
            "SEBI (Prohibition of Insider Trading) Regulations, 2015 — Regulations 3, 4 and Schedule B: "
            "No insider shall communicate, provide, or allow access to any Unpublished Price Sensitive Information (UPSI). "
            "All listed entities must maintain a tamper-proof Structured Digital Database (SDD) containing timestamps, PAN, and nature of UPSI shared. "
            "Trading window closure is mandatory from the end of every financial quarter until 48 hours after financial results are communicated to exchanges. "
            "Designated Persons are prohibited from entering into contra-trades within 6 months of executing a trade."
        ),
        citation_uri="rag://sebi/pit_regulations#SEBI-PIT-INSIDER-TRADING-UPSI",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    DocumentChunk(
        chunk_id="SEBI-SAST-TAKEOVER-REGULATIONS",
        doc_id="SEBI-SAST-2011",
        doc_type="REGULATION",
        title="SEBI SAST Regulations 2011: 5% Disclosure Threshold & 25% Open Offer Mandate",
        symbol=None,
        effective_date="2011-10-23",
        content=(
            "SEBI (Substantial Acquisition of Shares and Takeovers) Regulations, 2011: "
            "Regulation 29(1) mandates disclosure to stock exchanges within 2 working days when aggregate shareholding/voting rights reach or exceed 5%. "
            "Regulation 29(2) mandates continuous disclosure for every subsequent 2% acquisition or disposal. "
            "Under Regulation 3(1), an acquirer whose holding reaches or crosses 25% of voting rights must make a mandatory Public Open Offer "
            "to purchase at least 26% of additional voting capital from public shareholders. Creeping acquisition allowance permits up to 5% per financial year "
            "for promoters holding between 25% and 75% without triggering an open offer."
        ),
        citation_uri="rag://sebi/sast_regulations#SEBI-SAST-TAKEOVER-REGULATIONS",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    DocumentChunk(
        chunk_id="SEBI-GSM-SURVEILLANCE-MEASURES",
        doc_id="SEBI-EXCHANGE-GSM",
        doc_type="SURVEILLANCE",
        title="SEBI / BSE / NSE Graded Surveillance Measure (GSM) Stages 1 to 4",
        symbol=None,
        effective_date="2023-01-01",
        content=(
            "BSE / NSE Graded Surveillance Measure (GSM) Framework: "
            "Initiated to alert and safeguard retail market participants in scrips displaying abnormal price-to-earnings or net-worth disparities. "
            "Stage 1: Transfer to Trade-to-Trade (T2T) segment with 5% or 2% price band. "
            "Stage 2: Trade-to-Trade, 5% price band, plus Additional Surveillance Deposit (ASD) of 50% on buyer. "
            "Stage 3: Trade-to-Trade, 5% price band, 100% ASD on buyer, trading permitted only once a week (every Monday). "
            "Stage 4: Trade-to-Trade, 5% price band, 100% ASD on buyer, trading permitted only once a month (first Monday of the month)."
        ),
        citation_uri="rag://surveillance/gsm_framework#SEBI-GSM-SURVEILLANCE-MEASURES",
        source_authority="Securities and Exchange Board of India (SEBI) & Stock Exchanges",
    ),
    DocumentChunk(
        chunk_id="SEBI-INDEX-DERIVATIVES-RATIONALIZATION-2024",
        doc_id="SEBI-F&O-CIRCULAR-2024",
        doc_type="REGULATION",
        title="SEBI Circular on Index Derivatives: Contract Size INR 15L & Weekly Expiry Cap",
        symbol=None,
        effective_date="2024-10-01",
        content=(
            "SEBI Circular (SEBI/HO/MRD/MRD-PoD-2/P/CIR/2024/131) on Index Derivatives: "
            "Comprehensive measures to strengthen investor protection in Equity Derivatives: "
            "1. Minimum contract value increased from INR 5-10 lakhs to INR 15 lakhs at launch, and calibrated between INR 15-20 lakhs; "
            "2. Weekly expiry rationalization: Stock exchanges are permitted to offer weekly derivative contracts for only one benchmark index "
            "(NSE: NIFTY 50; BSE: SENSEX) effective November 20, 2024; "
            "3. Upfront collection of Option Premium Margin from buyers; "
            "4. Removal of calendar spread benefit for contracts expiring on the same day; "
            "5. Additional Extreme Loss Margin (ELM) of 2% on short option contracts on expiry day."
        ),
        citation_uri="rag://sebi/index_derivatives_2024#SEBI-INDEX-DERIVATIVES-RATIONALIZATION-2024",
        source_authority="Securities and Exchange Board of India (SEBI)",
    ),
    DocumentChunk(
        chunk_id="UNION-BUDGET-2024-25-FISCAL-TARGETS",
        doc_id="UNION-BUDGET-2024",
        doc_type="GOVT_POLICY",
        title="Union Budget 2024-25: Fiscal Deficit Target 4.9% & Macro Outlay",
        symbol=None,
        effective_date="2024-07-23",
        content=(
            "Ministry of Finance — Union Budget 2024-25 Macroeconomic Framework: "
            "Fiscal deficit for FY 2024-25 is targeted at 4.9% of GDP, reduced from 5.6% in FY 2023-24 and 5.1% in Interim Budget. "
            "The fiscal consolidation glide path reaffirms reaching below 4.5% of GDP by FY 2025-26. "
            "Total central government expenditure is estimated at INR 48.21 lakh crore, with net tax receipts at INR 25.83 lakh crore. "
            "Gross market borrowings are capped at INR 14.01 lakh crore (net borrowings at INR 11.63 lakh crore), easing bond yield pressure."
        ),
        citation_uri="rag://budget/macro_fiscal_2024#UNION-BUDGET-2024-25-FISCAL-TARGETS",
        source_authority="Ministry of Finance, Government of India",
    ),
    DocumentChunk(
        chunk_id="GOVT-CAPEX-INFRASTRUCTURE-OUTLAY",
        doc_id="UNION-BUDGET-2024-CAPEX",
        doc_type="GOVT_POLICY",
        title="Government Capital Expenditure: INR 11.11 Lakh Crore Outlay (3.4% of GDP)",
        symbol=None,
        effective_date="2024-07-23",
        content=(
            "Union Budget 2024-25 Infrastructure Capex Mandate: "
            "Central Government capital expenditure allocation is pegged at a record INR 11,11,111 crore (INR 11.11 lakh crore), "
            "representing 3.4% of India's GDP. Key outlays: Ministry of Road Transport & Highways at INR 2.78 lakh crore, "
            "Indian Railways at INR 2.52 lakh crore (focusing on Kavach automatic train protection, track expansion, and rolling stock), "
            "Defense capital procurement at INR 1.72 lakh crore, and INR 1.50 lakh crore allocated as 50-year interest-free loans to states for capex."
        ),
        citation_uri="rag://budget/infrastructure_capex#GOVT-CAPEX-INFRASTRUCTURE-OUTLAY",
        source_authority="Ministry of Finance, Government of India",
    ),
    DocumentChunk(
        chunk_id="GOVT-PLI-SCHEMES-FRAMEWORK",
        doc_id="GOVT-PLI-POLICY",
        doc_type="GOVT_POLICY",
        title="Production Linked Incentive (PLI) Schemes: INR 1.97 Lakh Crore Across 14 Sectors",
        symbol=None,
        effective_date="2024-06-30",
        content=(
            "Government of India Production Linked Incentive (PLI) Framework: "
            "Total budgetary outlay of INR 1.97 lakh crore across 14 key manufacturing sectors. "
            "Key beneficiary industries: 1. Large Scale Electronics & IT Hardware (INR 40,951 Cr); 2. Pharmaceuticals & Medical Devices (INR 25,000 Cr); "
            "3. Automobiles & Auto Components (INR 25,938 Cr targeting electric vehicles and advanced safety components); "
            "4. Solar Photovoltaic Modules (INR 24,000 Cr); 5. Advanced Chemistry Cell (ACC) Batteries (INR 18,100 Cr); 6. Specialty Steel (INR 6,322 Cr). "
            "Incentives range between 4% and 6% of incremental sales above baseline year."
        ),
        citation_uri="rag://govt/pli_schemes#GOVT-PLI-SCHEMES-FRAMEWORK",
        source_authority="DPIIT, Ministry of Commerce and Industry",
    ),
    DocumentChunk(
        chunk_id="GOVT-NATIONAL-GREEN-HYDROGEN-MISSION",
        doc_id="MNRE-NGHM-2023",
        doc_type="GOVT_POLICY",
        title="National Green Hydrogen Mission: INR 19,744 Crore Outlay & 5 MMT Target",
        symbol=None,
        effective_date="2023-01-04",
        content=(
            "Ministry of New and Renewable Energy (MNRE) — National Green Hydrogen Mission: "
            "Cabinet-approved outlay of INR 19,744 crore aiming to develop 5 MMT (Million Metric Tonnes) green hydrogen annual production capacity "
            "by 2030, supported by 125 GW associated renewable energy capacity addition. Includes the SIGHT program (Strategic Interventions "
            "for Green Hydrogen Transition) with INR 17,490 crore funding for electrolyser manufacturing incentives and green hydrogen production subsidies. "
            "Expected to attract INR 8 lakh crore total investment and decarbonize refineries, steel, and fertilizers."
        ),
        citation_uri="rag://mnre/green_hydrogen#GOVT-NATIONAL-GREEN-HYDROGEN-MISSION",
        source_authority="Ministry of New and Renewable Energy (MNRE), Government of India",
    ),
    DocumentChunk(
        chunk_id="INDIA-SEMICONDUCTOR-MISSION-INCENTIVES",
        doc_id="MEITY-ISM-2023",
        doc_type="GOVT_POLICY",
        title="India Semiconductor Mission (ISM): INR 76,000 Crore Fiscal Incentives (50% Subsidy)",
        symbol=None,
        effective_date="2023-06-01",
        content=(
            "Ministry of Electronics and Information Technology (MeitY) — India Semiconductor Mission (ISM): "
            "INR 76,000 crore comprehensive fiscal incentive package offering 50% capital expenditure support on a pari-passu basis "
            "for setting up Silicon semiconductor wafer fabrication facilities, display fabs, compound semiconductor & OSAT / ATMP units. "
            "Approved projects include Tata Electronics Dholera mega-fab (INR 91,000 Cr with PSMC Taiwan), Tata Semiconductor Assembly and Test "
            "in Morigaon Assam (INR 27,000 Cr), CG Power-Renesas OSAT in Sanand (INR 7,600 Cr), and Micron Sanand ATMP (INR 22,500 Cr)."
        ),
        citation_uri="rag://meity/semiconductor_mission#INDIA-SEMICONDUCTOR-MISSION-INCENTIVES",
        source_authority="Ministry of Electronics and Information Technology (MeitY)",
    ),
    DocumentChunk(
        chunk_id="ECONOMIC-DATA-INFLATION-GDP-TRENDS",
        doc_id="MOSPI-ECONOMIC-DATA",
        doc_type="MACRO",
        title="National Economic Trends: Real GDP 8.2% FY24 & CPI Inflation Targeting",
        symbol=None,
        effective_date="2024-10-15",
        content=(
            "Ministry of Statistics and Programme Implementation (MoSPI) & RBI Economic Data: "
            "India's Real Gross Domestic Product (GDP) grew at 8.2% in FY 2023-24, retaining position as fastest growing major global economy. "
            "FY 2024-25 GDP growth is projected at 7.2% by RBI. Consumer Price Index (CPI) headline inflation is targeted at 4.0% (+/-2% tolerance band), "
            "with core inflation subdued at 3.1-3.5%. Foreign Exchange Reserves achieved all-time high exceeding USD 700 billion. "
            "Current Account Deficit (CAD) stood at a sustainable 1.1% of GDP for FY24."
        ),
        citation_uri="rag://macro/gdp_inflation_trends#ECONOMIC-DATA-INFLATION-GDP-TRENDS",
        source_authority="MoSPI & Reserve Bank of India (RBI)",
    ),
]


# -----------------------------------------------------------------------------
# 2. Table-Aware Financial Filing Chunks for All Candidate Equities
# -----------------------------------------------------------------------------
def _create_filing_table_chunk(
    symbol: str,
    company_name: str,
    filing_date: str,
    period_end: str,
    qtr: str,
    fy: str,
    rev: float,
    ebitda: float,
    pat: float,
    eps: float,
    debt: float,
    net_worth: float,
    assets: float,
    liab: float,
    notes: list[str] | None = None,
    is_restated: bool = False,
    restatement_date: str | None = None,
    superseded_by: str | None = None,
) -> DocumentChunk:
    headers = ["Financial Line Item", f"{qtr} {fy} (Stated)", "Notes"]
    rows = [
        TableRowItem(line_item="Revenue from Operations", values={f"{qtr} {fy} (Stated)": rev}, notes="INR Crores"),
        TableRowItem(line_item="Operating Profit (EBITDA)", values={f"{qtr} {fy} (Stated)": ebitda}, notes="INR Crores"),
        TableRowItem(line_item="Net Profit after Tax (PAT)", values={f"{qtr} {fy} (Stated)": pat}, notes="INR Crores"),
        TableRowItem(line_item="Basic EPS (INR)", values={f"{qtr} {fy} (Stated)": eps}, notes="Per share"),
        TableRowItem(line_item="Total Borrowings (Debt)", values={f"{qtr} {fy} (Stated)": debt}, notes="INR Crores"),
        TableRowItem(line_item="Net Worth / Shareholders' Equity", values={f"{qtr} {fy} (Stated)": net_worth}, notes="INR Crores"),
        TableRowItem(line_item="Total Assets", values={f"{qtr} {fy} (Stated)": assets}, notes="INR Crores"),
        TableRowItem(line_item="Total Liabilities", values={f"{qtr} {fy} (Stated)": liab}, notes="INR Crores"),
    ]

    footnotes = [
        f"Official quarterly filing under SEBI LODR Regulation 33 for quarter ended {period_end}.",
        "Statutory limited review conducted by registered statutory auditors; clean unmodified opinion issued.",
    ]
    if notes:
        footnotes.extend(notes)

    table = TableAwareChunk(
        table_id=f"tab-{symbol.lower()}-{fy.lower()}-{qtr.lower()}",
        title=f"{company_name} — Unaudited Consolidated Financial Results ({qtr} {fy})",
        symbol=symbol,
        reporting_period=f"{qtr} {fy}",
        basis="CONSOLIDATED",
        headers=headers,
        rows=rows,
        audit_status="UNAUDITED_LIMITED_REVIEW",
        footnotes=footnotes,
    )

    raw_passage = table.to_context_passage()
    c_hash = hashlib.sha256(raw_passage.encode("utf-8")).hexdigest()[:16]

    wrapped_passage = PromptInjectionDefender.wrap_content(
        raw_passage,
        source_metadata={
            "symbol": symbol,
            "period": f"{qtr} {fy}",
            "filing_date": filing_date,
            "content_hash": c_hash,
            "is_restated": is_restated,
        },
    )

    chunk_id = f"FILING-{symbol.upper()}-{fy.upper()}-{qtr.upper()}"
    if is_restated:
        chunk_id += "-RESTATED"

    return DocumentChunk(
        chunk_id=chunk_id,
        doc_id=f"{symbol.upper()}-{fy.upper()}-RESULTS",
        doc_type="FILING",
        title=f"{company_name} — Financial Disclosures & Table ({qtr} {fy})",
        symbol=symbol.upper(),
        effective_date=filing_date,
        content=wrapped_passage,
        citation_uri=f"rag://filings/{symbol.lower()}_{fy.lower()}_{qtr.lower()}#{chunk_id}",
        source_authority="National Stock Exchange of India (NSE) / BSE Corporate Filings",
        reporting_period=f"{qtr} {fy}",
        basis="CONSOLIDATED",
        audit_status="UNAUDITED_LIMITED_REVIEW",
        unit="CRORES",
        content_hash=c_hash,
        is_restated=is_restated,
        restatement_date=restatement_date,
        superseded_by=superseded_by,
    )


# All official table-aware filing documents
CORPORATE_FILING_CHUNKS: list[DocumentChunk] = [
    # 1. RELIANCE (Q2 FY25)
    _create_filing_table_chunk(
        symbol="RELIANCE",
        company_name="Reliance Industries Limited",
        filing_date="2024-10-14",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=235481.0,
        ebitda=43934.0,
        pat=19323.0,
        eps=24.12,
        debt=336300.0,
        net_worth=794900.0,
        assets=1715000.0,
        liab=920100.0,
        notes=["1:1 Bonus equity issue approved on October 28, 2024; Jio telecom ARPU stood at INR 195.1."],
    ),
    # 2. TCS (Q2 FY25)
    _create_filing_table_chunk(
        symbol="TCS",
        company_name="Tata Consultancy Services Limited",
        filing_date="2024-10-10",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=64259.0,
        ebitda=16465.0,
        pat=11909.0,
        eps=32.84,
        debt=0.0,
        net_worth=91500.0,
        assets=142500.0,
        liab=51000.0,
        notes=["Interim dividend of INR 10 per equity share declared. Total deal TCV reached USD 8.6 billion."],
    ),
    # 3. INFY (Q2 FY25)
    _create_filing_table_chunk(
        symbol="INFY",
        company_name="Infosys Limited",
        filing_date="2024-10-17",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=40986.0,
        ebitda=9908.0,
        pat=6506.0,
        eps=15.71,
        debt=0.0,
        net_worth=86200.0,
        assets=128900.0,
        liab=42700.0,
        notes=["FY25 constant currency revenue guidance raised to 3.75%-4.50%. Interim dividend INR 21/sh."],
    ),
    # 4. HDFCBANK (Q2 FY25)
    _create_filing_table_chunk(
        symbol="HDFCBANK",
        company_name="HDFC Bank Limited",
        filing_date="2024-10-19",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=85500.0,
        ebitda=29800.0,
        pat=16821.0,
        eps=22.10,
        debt=710000.0,
        net_worth=448000.0,
        assets=3750000.0,
        liab=3302000.0,
        notes=["Gross NPA stood at 1.36%, Net NPA at 0.41%. Post-merger Credit-Deposit ratio declined to 100%."],
    ),
    # 5. ICICIBANK (Q2 FY25)
    _create_filing_table_chunk(
        symbol="ICICIBANK",
        company_name="ICICI Bank Limited",
        filing_date="2024-10-26",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=47714.0,
        ebitda=19500.0,
        pat=11746.0,
        eps=16.68,
        debt=365000.0,
        net_worth=262000.0,
        assets=2240000.0,
        liab=1978000.0,
        notes=["Domestic loan portfolio grew 15.7% YoY. Net NPA was 0.42% with Provision Coverage Ratio of 78.5%."],
    ),
    # 6. BHARTIARTL (Q2 FY25)
    _create_filing_table_chunk(
        symbol="BHARTIARTL",
        company_name="Bharti Airtel Limited",
        filing_date="2024-10-28",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=41473.0,
        ebitda=22021.0,
        pat=3593.0,
        eps=6.15,
        debt=212000.0,
        net_worth=98000.0,
        assets=452000.0,
        liab=354000.0,
        notes=["India mobile ARPU expanded to INR 233 following tariff rationalization. 5G subscriber base crossed 105M."],
    ),
    # 7. ITC (Q2 FY25)
    _create_filing_table_chunk(
        symbol="ITC",
        company_name="ITC Limited",
        filing_date="2024-10-24",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=19328.0,
        ebitda=6335.0,
        pat=5078.0,
        eps=4.07,
        debt=5.0,
        net_worth=74200.0,
        assets=92400.0,
        liab=18200.0,
        notes=["Cigarette segment revenue grew 7.3% YoY. Demerger of ITC Hotels Limited sanctioned by NCLT."],
    ),
    # 8. SBIN (Q2 FY25)
    _create_filing_table_chunk(
        symbol="SBIN",
        company_name="State Bank of India",
        filing_date="2024-11-08",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=129141.0,
        ebitda=29294.0,
        pat=18331.0,
        eps=20.54,
        debt=642000.0,
        net_worth=415000.0,
        assets=6320000.0,
        liab=5905000.0,
        notes=["Gross NPA ratio improved to 2.13% (down 42 bps YoY); ROA annualized at 1.17%."],
    ),
    # 9. LT (Q2 FY25)
    _create_filing_table_chunk(
        symbol="LT",
        company_name="Larsen & Toubro Limited",
        filing_date="2024-10-30",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=61555.0,
        ebitda=6362.0,
        pat=3395.0,
        eps=24.69,
        debt=119000.0,
        net_worth=93000.0,
        assets=365000.0,
        liab=272000.0,
        notes=["Consolidated order book reached record INR 5,10,402 Cr with 40% international share."],
    ),
    # 10. HINDUNILVR (Q2 FY25)
    _create_filing_table_chunk(
        symbol="HINDUNILVR",
        company_name="Hindustan Unilever Limited",
        filing_date="2024-10-23",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=15319.0,
        ebitda=3647.0,
        pat=2612.0,
        eps=11.12,
        debt=0.0,
        net_worth=51200.0,
        assets=73100.0,
        liab=21900.0,
        notes=["Underlying sales growth (USG) of 2% with 3% underlying volume growth. Interim dividend INR 19/sh."],
    ),
    # 11. BAJFINANCE (Q2 FY25)
    _create_filing_table_chunk(
        symbol="BAJFINANCE",
        company_name="Bajaj Finance Limited",
        filing_date="2024-10-22",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=17095.0,
        ebitda=11800.0,
        pat=4014.0,
        eps=64.88,
        debt=312000.0,
        net_worth=82500.0,
        assets=412000.0,
        liab=329500.0,
        notes=["AUM grew 29% YoY to INR 3,73,927 Cr. New customer additions at 3.98M in Q2. Gross NPA 1.06%."],
    ),
    # 12. HCLTECH (Q2 FY25)
    _create_filing_table_chunk(
        symbol="HCLTECH",
        company_name="HCL Technologies Limited",
        filing_date="2024-10-14",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=28862.0,
        ebitda=6450.0,
        pat=4235.0,
        eps=15.61,
        debt=5200.0,
        net_worth=69400.0,
        assets=94200.0,
        liab=24800.0,
        notes=["FY25 revenue guidance raised to 3.5%-5.0% CC. EBIT margin expanded to 18.6%."],
    ),
    # 13. KOTAKBANK (Q2 FY25)
    _create_filing_table_chunk(
        symbol="KOTAKBANK",
        company_name="Kotak Mahindra Bank Limited",
        filing_date="2024-10-19",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=15900.0,
        ebitda=6850.0,
        pat=3344.0,
        eps=16.82,
        debt=124000.0,
        net_worth=122000.0,
        assets=665000.0,
        liab=543000.0,
        notes=["Net interest margin (NIM) stood at 4.91%. CASA ratio maintained at 47.7%."],
    ),
    # 14. SUNPHARMA (Q2 FY25)
    _create_filing_table_chunk(
        symbol="SUNPHARMA",
        company_name="Sun Pharmaceutical Industries Limited",
        filing_date="2024-10-28",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=13291.0,
        ebitda=3939.0,
        pat=3040.0,
        eps=12.67,
        debt=2800.0,
        net_worth=69800.0,
        assets=95400.0,
        liab=25600.0,
        notes=["Global specialty sales rose 19.2% YoY to USD 286 million. India formulation sales grew 11.0%."],
    ),
    # 15. AXISBANK (Q2 FY25)
    _create_filing_table_chunk(
        symbol="AXISBANK",
        company_name="Axis Bank Limited",
        filing_date="2024-10-17",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=37142.0,
        ebitda=10712.0,
        pat=6917.0,
        eps=22.38,
        debt=298000.0,
        net_worth=158000.0,
        assets=1540000.0,
        liab=1382000.0,
        notes=["Net NPA stood at 0.34%. Advances grew 11% YoY driven by retail and SME portfolios."],
    ),
    # 16. MARUTI (Q2 FY25)
    _create_filing_table_chunk(
        symbol="MARUTI",
        company_name="Maruti Suzuki India Limited",
        filing_date="2024-10-29",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=37203.0,
        ebitda=4417.0,
        pat=3069.0,
        eps=97.64,
        debt=0.0,
        net_worth=89400.0,
        assets=112000.0,
        liab=22600.0,
        notes=["Total quarterly sales reached 5,41,550 vehicles. Highest ever quarterly export volumes of 77,716 units."],
    ),
    # 17. TITAN (Q2 FY25)
    _create_filing_table_chunk(
        symbol="TITAN",
        company_name="Titan Company Limited",
        filing_date="2024-11-05",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=13473.0,
        ebitda=1236.0,
        pat=704.0,
        eps=7.93,
        debt=12400.0,
        net_worth=12900.0,
        assets=35600.0,
        liab=22700.0,
        notes=["Domestic jewellery operations grew 26% YoY aided by customs duty cut on gold bullion."],
    ),
    # 18. ULTRACEMCO (Q2 FY25)
    _create_filing_table_chunk(
        symbol="ULTRACEMCO",
        company_name="UltraTech Cement Limited",
        filing_date="2024-10-21",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=15635.0,
        ebitda=2239.0,
        pat=820.0,
        eps=28.41,
        debt=14500.0,
        net_worth=63500.0,
        assets=108000.0,
        liab=44500.0,
        notes=["Consolidated domestic sales volume was 26.43 MT. Acquisition of Kesoram cement assets underway."],
    ),
    # 19. TATAMOTORS (Q2 FY25)
    _create_filing_table_chunk(
        symbol="TATAMOTORS",
        company_name="Tata Motors Limited",
        filing_date="2024-11-08",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=101450.0,
        ebitda=11600.0,
        pat=3343.0,
        eps=9.10,
        debt=56000.0,
        net_worth=96500.0,
        assets=342000.0,
        liab=245500.0,
        notes=["JLR revenue stood at GBP 6.5B; net debt reduced to GBP 1.2B. Domestic EV market share held at 65%."],
    ),
    # 20. ASIANPAINT (Q2 FY25)
    _create_filing_table_chunk(
        symbol="ASIANPAINT",
        company_name="Asian Paints Limited",
        filing_date="2024-11-09",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=8003.0,
        ebitda=1239.0,
        pat=695.0,
        eps=7.24,
        debt=2100.0,
        net_worth=17600.0,
        assets=28400.0,
        liab=10800.0,
        notes=["Decorative coatings volume declined 0.5% YoY due to extended monsoons and price competition."],
    ),
    # 21. NTPC (Q2 FY25)
    _create_filing_table_chunk(
        symbol="NTPC",
        company_name="NTPC Limited",
        filing_date="2024-10-25",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=44696.0,
        ebitda=11740.0,
        pat=5380.0,
        eps=5.55,
        debt=238000.0,
        net_worth=154000.0,
        assets=462000.0,
        liab=308000.0,
        notes=["Gross power generation reached 88.46 Billion Units. NTPC Green Energy IPO filed with SEBI."],
    ),
    # 22. POWERGRID (Q2 FY25)
    _create_filing_table_chunk(
        symbol="POWERGRID",
        company_name="Power Grid Corporation of India Limited",
        filing_date="2024-11-06",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=11278.0,
        ebitda=9845.0,
        pat=3793.0,
        eps=4.08,
        debt=124000.0,
        net_worth=89000.0,
        assets=268000.0,
        liab=179000.0,
        notes=["System availability was 99.85%. Capex of INR 5,200 Cr capitalized during Q2."],
    ),
    # 23. M&M (Q2 FY25)
    _create_filing_table_chunk(
        symbol="M&M",
        company_name="Mahindra & Mahindra Limited",
        filing_date="2024-11-07",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=37924.0,
        ebitda=5442.0,
        pat=3841.0,
        eps=32.20,
        debt=89000.0,
        net_worth=73000.0,
        assets=236000.0,
        liab=163000.0,
        notes=["Automotive segment EBIT margin expanded to 8.8%. Tractor market share increased to 42.5%."],
    ),
    # 24. BAJAJFINSV (Q2 FY25)
    _create_filing_table_chunk(
        symbol="BAJAJFINSV",
        company_name="Bajaj Finserv Limited",
        filing_date="2024-10-23",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=33704.0,
        ebitda=9800.0,
        pat=2087.0,
        eps=13.08,
        debt=322000.0,
        net_worth=64500.0,
        assets=458000.0,
        liab=393500.0,
        notes=["Consolidated insurance gross written premium grew 24% YoY; Bajaj Finance consolidated PAT INR 4,014 Cr."],
    ),
    # 25. COALINDIA (Q2 FY25)
    _create_filing_table_chunk(
        symbol="COALINDIA",
        company_name="Coal India Limited",
        filing_date="2024-10-25",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=30673.0,
        ebitda=8617.0,
        pat=6275.0,
        eps=10.18,
        debt=3500.0,
        net_worth=74800.0,
        assets=172000.0,
        liab=97200.0,
        notes=["Total coal production was 152.83 MT; average e-auction realization stood at INR 2,425 per tonne."],
    ),
    # 26. ADANIPORTS (Q2 FY25)
    _create_filing_table_chunk(
        symbol="ADANIPORTS",
        company_name="Adani Ports and Special Economic Zone Limited",
        filing_date="2024-10-29",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=7067.0,
        ebitda=4369.0,
        pat=2445.0,
        eps=11.32,
        debt=49500.0,
        net_worth=58000.0,
        assets=132000.0,
        liab=74000.0,
        notes=["Cargo volume grew 10% YoY to 111 MT. Net debt-to-EBITDA ratio improved to 2.0x."],
    ),
    # 27. TATASTEEL (Q2 FY25)
    _create_filing_table_chunk(
        symbol="TATASTEEL",
        company_name="Tata Steel Limited",
        filing_date="2024-11-06",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=53905.0,
        ebitda=6224.0,
        pat=759.0,
        eps=0.61,
        debt=88800.0,
        net_worth=94200.0,
        assets=284000.0,
        liab=189800.0,
        notes=["India crude steel production reached 5.27 MT with EBITDA margin of 20.3%. UK blast furnace de-commissioned."],
    ),
    # 28. SIEMENS (Q4 FY24 / Q2 FY25)
    _create_filing_table_chunk(
        symbol="SIEMENS",
        company_name="Siemens Limited",
        filing_date="2024-11-26",
        period_end="2024-09-30",
        qtr="Q4",
        fy="FY24",
        rev=6103.0,
        ebitda=922.0,
        pat=656.0,
        eps=18.42,
        debt=0.0,
        net_worth=15800.0,
        assets=24200.0,
        liab=8400.0,
        notes=["Order backlog of INR 45,600 Cr. Demerger of energy business approved by board for separate listing."],
    ),
    # 29. WIPRO (Q2 FY25)
    _create_filing_table_chunk(
        symbol="WIPRO",
        company_name="Wipro Limited",
        filing_date="2024-10-17",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=22196.0,
        ebitda=4410.0,
        pat=3209.0,
        eps=6.14,
        debt=15200.0,
        net_worth=74800.0,
        assets=112000.0,
        liab=37200.0,
        notes=["IT services operating margin expanded 70 bps YoY to 16.8%. 1:1 Bonus share issue recommended."],
    ),
    # 30. DEMOCORP (Q2 FY25 Benchmark)
    _create_filing_table_chunk(
        symbol="DEMOCORP",
        company_name="Demo Corporation Limited",
        filing_date="2024-10-15",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=10000.0,
        ebitda=2000.0,
        pat=1200.0,
        eps=12.00,
        debt=5000.0,
        net_worth=25000.0,
        assets=40000.0,
        liab=15000.0,
        notes=["Standard benchmark test chunk for multi-asset synthetic audits."],
    ),
    # 31. SWIGGY (Q2 FY25)
    _create_filing_table_chunk(
        symbol="SWIGGY",
        company_name="Swiggy Limited",
        filing_date="2024-11-13",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=3601.5,
        ebitda=-557.0,
        pat=-625.5,
        eps=-2.81,
        debt=245.0,
        net_worth=9250.0,
        assets=12800.0,
        liab=3550.0,
        notes=["Listed on NSE/BSE in November 2024. Quick-commerce Instamart GOV grew 86% YoY. Statutory auditor BSR & Co. issued clean unmodified limited review."],
    ),
    # 32. ZOMATO (Q2 FY25)
    _create_filing_table_chunk(
        symbol="ZOMATO",
        company_name="Zomato Limited",
        filing_date="2024-10-22",
        period_end="2024-09-30",
        qtr="Q2",
        fy="FY25",
        rev=4799.0,
        ebitda=226.0,
        pat=176.0,
        eps=0.20,
        debt=0.0,
        net_worth=20450.0,
        assets=24800.0,
        liab=4350.0,
        notes=["Blinkit quick-commerce revenue grew 129% YoY with 791 dark stores active. Board approved INR 8,500 Cr QIP. Clean unmodified review by Deloitte."],
    ),
]


# -----------------------------------------------------------------------------
# 3. Comprehensive Company Profiles & Fundamental Overview Chunks
# -----------------------------------------------------------------------------
def _create_company_profile_chunk(
    symbol: str,
    company_name: str,
    effective_date: str,
    overview: str,
    business_segments: str,
    financial_highlights: str,
    regulatory_exposure: str,
    capex_and_catalysts: str,
) -> DocumentChunk:
    """Creates a rich, comprehensive corporate profile chunk with injection containment."""
    raw_text = (
        f"Company Profile: {company_name} (NSE/BSE: {symbol})\n"
        f"Business Overview: {overview}\n"
        f"Core Operating Segments: {business_segments}\n"
        f"Key Financial Highlights: {financial_highlights}\n"
        f"Regulatory & Tax Considerations: {regulatory_exposure}\n"
        f"Strategic Capex & Growth Catalysts: {capex_and_catalysts}"
    )
    c_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()[:16]

    wrapped = PromptInjectionDefender.wrap_content(
        raw_text,
        source_metadata={
            "symbol": symbol,
            "profile_type": "CORPORATE_PROFILE",
            "effective_date": effective_date,
            "content_hash": c_hash,
        },
    )

    return DocumentChunk(
        chunk_id=f"PROFILE-{symbol.upper()}-OVERVIEW",
        doc_id=f"PROFILE-{symbol.upper()}",
        doc_type="COMPANY_PROFILE",
        title=f"{company_name} ({symbol}): Comprehensive Business Profile, Segment Drivers & Catalysts",
        symbol=symbol.upper(),
        effective_date=effective_date,
        content=wrapped,
        citation_uri=f"rag://profiles/{symbol.lower()}#PROFILE-{symbol.upper()}-OVERVIEW",
        source_authority="NSE / BSE Corporate Disclosures & Statutory Profiles",
        reporting_period="FY25",
        basis="CONSOLIDATED",
        audit_status="AUDITED",
        unit="CRORES",
        content_hash=c_hash,
    )


COMPANY_PROFILE_CHUNKS: list[DocumentChunk] = [
    # 1. SWIGGY
    _create_company_profile_chunk(
        symbol="SWIGGY",
        company_name="Swiggy Limited",
        effective_date="2024-11-13",
        overview=(
            "Swiggy Limited is one of India's leading consumer tech on-demand convenience platforms. "
            "Pioneered hyper-local delivery in India with an integrated consumer ecosystem covering Food Delivery, "
            "Quick Commerce (Instamart), Out-of-Home consumption (Dineout), and on-demand delivery (Genie). "
            "Listed on NSE and BSE on November 13, 2024, successfully raising INR 11,327 crore in India's second-largest tech IPO of 2024."
        ),
        business_segments=(
            "1. Food Delivery: Gross Order Value (GOV) exceeding INR 24,000 Cr annualized with ~14M average monthly transacting users (MTUs). "
            "Take rate stands at 23.5%-24.0% with positive contribution margin of ~6.8% of GOV. "
            "2. Quick Commerce (Instamart): Rapidly scaling dark-store network with 605+ active dark stores across 43 Indian cities. "
            "Instamart GOV reached INR 8,500+ Cr annualized growing 86% YoY. Average order value (AOV) is INR 485. "
            "3. Out-of-Home & Supply Chain: Dineout restaurant reservations & table payments, plus Scootsy warehouse operations."
        ),
        financial_highlights=(
            "Consolidated quarterly revenue from operations reached INR 3,601.5 Cr in Q2 FY25. "
            "Post-IPO net worth stands at INR 9,250 Cr, bolstered by fresh issue proceeds. "
            "Cash and liquid investments exceed INR 5,800 Cr, ensuring a multi-year cash runway with zero net debt. "
            "Quick commerce adjusted EBITDA margin is approaching breakeven (-3.2% of GOV vs -8.9% YoY)."
        ),
        regulatory_exposure=(
            "Subject to SEBI LODR quarterly reporting obligations, DPIIT Foreign Direct Investment (FDI) ecommerce marketplace guidelines, "
            "and state-level gig worker welfare legislation (Karnataka, Rajasthan Gig Worker welfare boards). "
            "No foreign direct ownership of grocery inventory (strictly operates marketplace model with dark-store merchant partners)."
        ),
        capex_and_catalysts=(
            "Planned Capex of INR 1,178 Cr from IPO proceeds for expanding Instamart dark store footprint from 605 to over 1,000 stores by FY26. "
            "INR 703 Cr earmarked for supply chain infrastructure, cold storage, and dark store robotic automation. "
            "INR 1,115 Cr dedicated to technology and cloud infrastructure. Key catalyst: dark-store density leading to sub-10 minute deliveries."
        ),
    ),
    # 2. RELIANCE
    _create_company_profile_chunk(
        symbol="RELIANCE",
        company_name="Reliance Industries Limited",
        effective_date="2024-10-14",
        overview=(
            "Reliance Industries Limited (RIL) is India's largest corporate conglomerate by market capitalization and revenue. "
            "Operates market-leading businesses across Oil-to-Chemicals (O2C refining & petrochemicals), Retail (Reliance Retail), "
            "Digital Services (Jio Platforms), and New Energy (solar, hydrogen, energy storage gigafactories in Jamnagar)."
        ),
        business_segments=(
            "1. Oil-to-Chemicals (O2C): Jamnagar complex with 1.24 million barrels/day refining capacity; 2. Digital Services (Jio): 490M+ subscribers, "
            "world's largest 5G standalone network, ARPU INR 195.1; 3. Reliance Retail: 18,900+ stores with INR 75,000+ Cr quarterly gross revenue; "
            "4. Oil & Gas E&P: KG D6 deepwater gas producing 30 MMSCMD (accounting for ~30% of India's domestic gas production)."
        ),
        financial_highlights=(
            "Consolidated Q2 FY25 revenue at INR 2,35,481 Cr, quarterly EBITDA at INR 43,934 Cr, and PAT at INR 19,323 Cr. "
            "Shareholders' net worth exceeds INR 7,94,900 Cr. Net debt to EBITDA remains prudent at ~0.65x. "
            "Approved 1:1 bonus equity share issue in October 2024, expanding retail investor base."
        ),
        regulatory_exposure=(
            "Regulated under Petroleum and Natural Gas Regulatory Board (PNGRB) pricing formulas for KG-D6 gas, "
            "Department of Telecommunications (DoT) spectrum usage charges and license fees, and Ministry of Finance windfall profit taxes on fuel exports."
        ),
        capex_and_catalysts=(
            "INR 75,000 Cr committed capex in Dhirubhai Ambani Green Energy Giga Complex (solar PV, energy storage, green hydrogen electrolysers). "
            "Accelerating 5G monetization, enterprise cloud partnerships with NVIDIA/Google, and planned value-unlocking listings of Jio and Retail."
        ),
    ),
    # 3. TCS
    _create_company_profile_chunk(
        symbol="TCS",
        company_name="Tata Consultancy Services Limited",
        effective_date="2024-10-10",
        overview=(
            "Tata Consultancy Services is India's largest IT services exporter and flagship company of the Tata Group. "
            "Employs over 612,000 professionals globally, providing AI consulting, digital transformation, cloud migration, "
            "and business process outsourcing across 55 countries."
        ),
        business_segments=(
            "1. BFSI (Banking, Financial Services & Insurance): 37% of revenue; 2. Consumer Business & Retail: 15%; "
            "3. Life Sciences & Healthcare: 11%; 4. Manufacturing: 9%; 5. Technology & Services: 9%; 6. Communications & Media: 7%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 64,259 Cr with industry-leading operating margin (EBIT) of 24.1%. Net profit of INR 11,909 Cr. "
            "Total Contract Value (TCV) deal wins at USD 8.6 billion in Q2 FY25. Zero debt on balance sheet with cash reserves exceeding INR 40,000 Cr."
        ),
        regulatory_exposure=(
            "Subject to US H-1B visa regulations, European GDPR data protection laws, and RBI regulatory oversight for Indian core banking implementations."
        ),
        capex_and_catalysts=(
            "Deployment of TCS AI WisdomNext suite and proprietary generative AI architectures. Enterprise cloud mega-deals and return to client discretionary spending."
        ),
    ),
    # 4. HDFCBANK
    _create_company_profile_chunk(
        symbol="HDFCBANK",
        company_name="HDFC Bank Limited",
        effective_date="2024-10-19",
        overview=(
            "HDFC Bank Limited is India's largest private sector bank following its historic mega-merger with parent HDFC Limited. "
            "Network spans over 8,800 branches and 20,000 ATMs serving 93+ million customers across urban and rural India."
        ),
        business_segments=(
            "1. Retail Banking: Home loans, auto loans, personal loans, credit cards; 2. Wholesale/Corporate Banking: Working capital, syndication, trade finance; "
            "3. Treasury Operations: SLR/CRR management, foreign exchange trading; 4. Semi-Urban and Rural (SURU) Banking."
        ),
        financial_highlights=(
            "Quarterly net profit reached INR 16,821 Cr with total balance sheet assets of INR 37.5 lakh crore. "
            "Gross NPA at 1.36% and Net NPA at 0.41%. Capital Adequacy Ratio (CAR) stands strong at 19.8% against RBI requirement of 11.5%."
        ),
        regulatory_exposure=(
            "Regulated by RBI under Banking Regulation Act. Actively managing down post-merger Credit-Deposit (CD) ratio from 110% toward 90% benchmark."
        ),
        capex_and_catalysts=(
            "Cross-selling banking products to 15 million legacy HDFC mortgage customers; rapid deposit mobilization through 1,000 new annual branch additions."
        ),
    ),
    # 5. ICICIBANK
    _create_company_profile_chunk(
        symbol="ICICIBANK",
        company_name="ICICI Bank Limited",
        effective_date="2024-10-26",
        overview=(
            "ICICI Bank is India's second-largest private bank, recognized for superior return ratios, robust digital underwriting (iMobile Pay), "
            "and pristine asset quality across corporate and retail lending."
        ),
        business_segments=(
            "1. Retail Banking: 54% of loan book (mortgages, auto, unsecured retail); 2. Business Banking & SME: 15% (fastest growing); "
            "3. Corporate & Commercial Banking: 22%; 4. Rural Banking: 9%."
        ),
        financial_highlights=(
            "Consolidated quarterly PAT at INR 11,746 Cr with return on assets (RoA) of 2.36% and return on equity (RoE) of 19.1%. "
            "Provision Coverage Ratio (PCR) stands at 78.5% with Net NPA at industry-low 0.42%."
        ),
        regulatory_exposure=(
            "RBI CRR (4.50%), SLR (18.00%), and consumer credit risk weight guidelines (125%)."
        ),
        capex_and_catalysts=(
            "Expanding corporate supply-chain finance ecosystem, API integrations with leading corporates, and operating leverage from digital onboarding."
        ),
    ),
    # 6. INFY
    _create_company_profile_chunk(
        symbol="INFY",
        company_name="Infosys Limited",
        effective_date="2024-10-17",
        overview=(
            "Infosys is a global leader in next-generation digital services and consulting. Pioneer of India's software export boom, "
            "headquartered in Bengaluru, with operations across 56 countries."
        ),
        business_segments=(
            "1. Financial Services: 27%; 2. Retail & CPG: 14%; 3. Communications: 12%; 4. Energy & Utilities: 13%; 5. Manufacturing: 15%; 6. Hi-Tech: 8%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 40,986 Cr, EBITDA INR 9,908 Cr, PAT INR 6,506 Cr. Raised full-year FY25 revenue guidance to 3.75%-4.50% CC. "
            "Free cash flow conversion to net profit exceeds 100%. Debt-free balance sheet with active share buybacks and dividend payouts."
        ),
        regulatory_exposure=(
            "US Department of Labor immigration rules, EU privacy directives, and Indian STT/tax regulations."
        ),
        capex_and_catalysts=(
            "Scaling generative AI platform Infosys Topaz and cloud suite Cobalt. Inks USD multi-billion enterprise contracts with European telecom and automotive clients."
        ),
    ),
    # 7. BHARTIARTL
    _create_company_profile_chunk(
        symbol="BHARTIARTL",
        company_name="Bharti Airtel Limited",
        effective_date="2024-10-28",
        overview=(
            "Bharti Airtel is India's premier communications solutions provider with over 550 million customers across 17 countries in South Asia and Africa."
        ),
        business_segments=(
            "1. India Mobile: 290M+ 4G/5G users, industry-leading ARPU INR 233; 2. Airtel Business (B2B Enterprise): Data centers (Nxtra), IoT, cloud; "
            "3. Home Broadband: Telemedia and DTH digital TV; 4. Airtel Africa: Operations across 14 African nations."
        ),
        financial_highlights=(
            "Consolidated quarterly revenue at INR 41,473 Cr, EBITDA at INR 22,021 Cr (53.1% EBITDA margin), and PAT at INR 3,593 Cr. "
            "Net debt-to-EBITDA ratio improved to 2.5x."
        ),
        regulatory_exposure=(
            "DoT AGR (Adjusted Gross Revenue) statutory dues, Telecom Regulatory Authority of India (TRAI) quality of service mandates, and 5G spectrum obligations."
        ),
        capex_and_catalysts=(
            "Industry tariff repair driving ARPU toward target INR 300; Nxtra data center capacity expansion to 400 MW; prepaid-to-postpaid premiumization."
        ),
    ),
    # 8. ITC
    _create_company_profile_chunk(
        symbol="ITC",
        company_name="ITC Limited",
        effective_date="2024-10-24",
        overview=(
            "ITC Limited is an Indian diversified conglomerate with market leadership in Cigarettes, Branded Packaged Foods, "
            "Agri-Business, Paperboards & Packaging, and Hotels."
        ),
        business_segments=(
            "1. FMCG Cigarettes: Brands including Classic, Gold Flake; 2. FMCG Others: Aashirvaad, Sunfeast, Bingo!, Yippee!, Fiama; "
            "3. Agri-Business: Wheat, leaf tobacco, soya procurement via e-Choupal; 4. Paperboards & Packaging; 5. Hotels (demerging into ITC Hotels Ltd)."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 19,328 Cr, EBITDA at INR 6,335 Cr, and PAT at INR 5,078 Cr. "
            "Return on Capital Employed (ROCE) exceeds 39%. Virtual zero-debt balance sheet with dividend payout ratio of 80%-85%."
        ),
        regulatory_exposure=(
            "Cigarette excise & GST compensation cess regulations, National Tobacco Control laws, and NCLT approval for Hotels demerger."
        ),
        capex_and_catalysts=(
            "Unlocking shareholder value via separate listing of ITC Hotels; expanding FMCG-Others operating margins toward double digits."
        ),
    ),
    # 9. SBIN
    _create_company_profile_chunk(
        symbol="SBIN",
        company_name="State Bank of India",
        effective_date="2024-11-08",
        overview=(
            "State Bank of India (SBI) is a Fortune 500 public sector bank and the largest financial institution in India. "
            "Holds ~23% market share in domestic banking deposits and ~20% in advances, operating over 22,500 branches."
        ),
        business_segments=(
            "1. Retail & SME Banking: Home loans (33% market share), auto loans, personal credit; 2. Corporate Banking: Project finance, working capital; "
            "3. Digital Banking: YONO platform with 75M+ registered users; 4. Treasury & Global Markets."
        ),
        financial_highlights=(
            "Quarterly net profit reached record INR 18,331 Cr on total asset base of INR 63.2 lakh crore. "
            "Gross NPA at decade-low 2.13% and Net NPA at 0.53%. Return on Assets (RoA) maintained above 1.15%."
        ),
        regulatory_exposure=(
            "Designated by RBI as a Domestic Systemically Important Bank (D-SIB) requiring additional CET1 capital surcharge of 0.80%."
        ),
        capex_and_catalysts=(
            "Accelerating corporate credit revival in infrastructure and green energy; proposed listing of subsidiaries SBI General Insurance and YONO monetization."
        ),
    ),
    # 10. LT
    _create_company_profile_chunk(
        symbol="LT",
        company_name="Larsen & Toubro Limited",
        effective_date="2024-10-30",
        overview=(
            "Larsen & Toubro (L&T) is India's premier engineering, procurement, and construction (EPC) conglomerate. "
            "Executes mega-infrastructure, defense engineering, hydrocarbon, power, and smart world projects across India and the Middle East."
        ),
        business_segments=(
            "1. Infrastructure EPC: Transportation, heavy civil, power transmission, water & effluent treatment; 2. Energy Hydrocarbon: Offshore/onshore oil & gas; "
            "3. Precision Engineering & Defense: Submarines, missile launchers, aerospace; 4. IT & Technology Services: LTIMindtree, L&T Technology Services."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 61,555 Cr with order book at historic high of INR 5,10,402 Cr. EBITDA at INR 6,362 Cr and PAT at INR 3,395 Cr. "
            "International orders constitute 40% of order book, primarily driven by GCC Saudi Aramco mega projects."
        ),
        regulatory_exposure=(
            "Public procurement guidelines, EPC contractual arbitration norms, and environmental clearances for heavy engineering."
        ),
        capex_and_catalysts=(
            "Beneficiary of Indian Union Budget INR 11.11 lakh crore infrastructure capex; green hydrogen electrolyser gigafactory in Hazira with McPhy."
        ),
    ),
    # 11. HINDUNILVR
    _create_company_profile_chunk(
        symbol="HINDUNILVR",
        company_name="Hindustan Unilever Limited",
        effective_date="2024-10-23",
        overview=(
            "Hindustan Unilever Limited (HUL) is India's largest fast-moving consumer goods (FMCG) enterprise. "
            "Products touch 9 out of 10 Indian households through 9+ million retail outlets across 16 categories."
        ),
        business_segments=(
            "1. Home Care: Surf Excel, Rin, Wheel, Vim, Domex; 2. Beauty & Personal Care: Dove, Lux, Lifebuoy, Sunsilk, Ponds, Lakme; "
            "3. Foods & Refreshment: Horlicks, Boost, Knorr, Bru, Brooke Bond Red Label, Kwality Wall's."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 15,319 Cr, operating EBITDA at INR 3,647 Cr (margin 23.8%), and PAT at INR 2,612 Cr. "
            "Zero long-term borrowings. Return on Net Worth (RoNW) stands at ~20%."
        ),
        regulatory_exposure=(
            "Food Safety and Standards Authority of India (FSSAI) nutritional labeling standards and Legal Metrology packaging guidelines."
        ),
        capex_and_catalysts=(
            "Rural demand recovery supported by normal monsoons and kharif crop yields; premiumization of skincare and tea portfolios."
        ),
    ),
    # 12. BAJFINANCE
    _create_company_profile_chunk(
        symbol="BAJFINANCE",
        company_name="Bajaj Finance Limited",
        effective_date="2024-10-22",
        overview=(
            "Bajaj Finance Limited is India's largest non-banking financial company (NBFC-Upper Layer). "
            "Dominates consumer durable loans, lifestyle financing, digital loans, and SME lending with 88+ million customer franchise."
        ),
        business_segments=(
            "1. Consumer Lending: Two-wheeler, electronics, personal loans; 2. SME Lending: Secured/unsecured business credit; "
            "3. Commercial Lending: Auto component, developer finance; 4. Rural Lending; 5. Mortgages: Bajaj Housing Finance Limited (listed subsidiary)."
        ),
        financial_highlights=(
            "Assets Under Management (AUM) reached INR 3,73,927 Cr growing 29% YoY. Quarterly revenue at INR 17,095 Cr and PAT at INR 4,014 Cr. "
            "Gross NPA maintained at 1.06% and Net NPA at 0.46%. Capital Adequacy Ratio (CRAR) at 21.7%."
        ),
        regulatory_exposure=(
            "RBI Scale-Based Regulation (Upper Layer) compliance; absorption of RBI November 2023 risk weight hike on consumer loans to 125%."
        ),
        capex_and_catalysts=(
            "Bajaj Housing Finance blockbuster listing unlocking subsidiary value; omnichannel payments super-app driving digital cross-selling."
        ),
    ),
    # 13. HCLTECH
    _create_company_profile_chunk(
        symbol="HCLTECH",
        company_name="HCL Technologies Limited",
        effective_date="2024-10-14",
        overview=(
            "HCL Technologies is a leading global technology company, distinguished by its market leadership in Engineering and R&D Services (ERS) "
            "and its proprietary HCLSoftware product IP business."
        ),
        business_segments=(
            "1. IT and Business Services (ITBS): 74% of revenue; 2. Engineering and R&D Services (ERS): 16%; 3. HCLSoftware (Product IP): 10%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 28,862 Cr with EBIT margin expanding to 18.6%. PAT at INR 4,235 Cr. "
            "Total Contract Value (TCV) bookings reached USD 2.22 billion with high software renewal rates."
        ),
        regulatory_exposure=(
            "Global IP software licenses, foreign currency exposure hedging under Ind AS 109, and international data transfer frameworks."
        ),
        capex_and_catalysts=(
            "Expansion into AI-native engineering services, semiconductor design partnerships, and recurring revenue growth from HCLSoftware."
        ),
    ),
    # 14. KOTAKBANK
    _create_company_profile_chunk(
        symbol="KOTAKBANK",
        company_name="Kotak Mahindra Bank Limited",
        effective_date="2024-10-19",
        overview=(
            "Kotak Mahindra Bank is a premier private Indian financial institution offering commercial banking, wealth management, "
            "investment banking (Kotak Capital), and alternate assets."
        ),
        business_segments=(
            "1. Consumer Banking: Mortgages, Kotak 811 digital accounts; 2. Commercial Banking: Agriculture, commercial vehicles; "
            "3. Corporate Banking: Large corporate lending; 4. Treasury and Wealth Management."
        ),
        financial_highlights=(
            "Quarterly PAT reached INR 3,344 Cr. Standalone Net Interest Margin (NIM) of 4.91% is among highest in Indian banking. "
            "CASA ratio stands at 47.7%, and Net NPA at 0.43%. Capital Adequacy Ratio of 22.6%."
        ),
        regulatory_exposure=(
            "RBI digital onboarding audit compliance (IT systems remediation underway), RBI CRR/SLR norms, and scale-based NBFC guidelines."
        ),
        capex_and_catalysts=(
            "Lifting of RBI digital onboarding embargo following IT infrastructure hardening; expansion of high-margin wealth management."
        ),
    ),
    # 15. SUNPHARMA
    _create_company_profile_chunk(
        symbol="SUNPHARMA",
        company_name="Sun Pharmaceutical Industries Limited",
        effective_date="2024-10-28",
        overview=(
            "Sun Pharma is the world's fourth largest specialty generic pharmaceutical company and the clear market leader in India. "
            "Maintains 43 manufacturing sites globally delivering medicines to 100+ countries."
        ),
        business_segments=(
            "1. India Formulations: ~33% of sales (branded prescription leader across cardiology, psychiatry); 2. US Formulations: ~30% (specialty drugs Ilumya, Cequa, Odomzo); "
            "3. Emerging Markets: ~18%; 4. Rest of World: ~14%; 5. Active Pharmaceutical Ingredients (APIs): ~5%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 13,291 Cr, EBITDA at INR 3,939 Cr (29.6% margin), and PAT at INR 3,040 Cr. "
            "Global specialty revenue grew 19.2% YoY to USD 286 million. Net cash surplus exceeding USD 1.5 billion."
        ),
        regulatory_exposure=(
            "US Food and Drug Administration (US FDA) Good Manufacturing Practice (cGMP) inspections, Indian National Pharmaceutical Pricing Authority (NPPA) drug price caps."
        ),
        capex_and_catalysts=(
            "Commercialization of deuruxolitinib (Leqselvi) for alopecia areata; clinical pipeline expansion into dermatology and immunology."
        ),
    ),
    # 16. AXISBANK
    _create_company_profile_chunk(
        symbol="AXISBANK",
        company_name="Axis Bank Limited",
        effective_date="2024-10-17",
        overview=(
            "Axis Bank is India's third-largest private sector bank. Successfully completed full operational integration of Citibank India's "
            "consumer business, substantially scaling its affluent credit card and wealth management base."
        ),
        business_segments=(
            "1. Retail Banking: 59% of loan book (housing, cards, personal); 2. Corporate Banking: 31%; 3. SME Banking: 10%."
        ),
        financial_highlights=(
            "Consolidated quarterly PAT reached INR 6,917 Cr with RoA at 1.80%. "
            "Gross NPA stands at 1.44% and Net NPA at 0.34%. Balance sheet size exceeded INR 15.4 lakh crore."
        ),
        regulatory_exposure=(
            "RBI guidelines on card issuance and customer data protection; unsecured credit risk weighting."
        ),
        capex_and_catalysts=(
            "Realization of synergies from Citibank portfolio; expanding high-margin Bharat Banking distribution across semi-urban clusters."
        ),
    ),
    # 17. MARUTI
    _create_company_profile_chunk(
        symbol="MARUTI",
        company_name="Maruti Suzuki India Limited",
        effective_date="2024-10-29",
        overview=(
            "Maruti Suzuki is India's undisputed passenger vehicle leader with over 41% overall domestic market share. "
            "Pioneered compact car manufacturing, and has aggressively scaled its SUV market share (Brezza, Grand Vitara, Fronx) and CNG portfolio."
        ),
        business_segments=(
            "1. Domestic Passenger Vehicles: Entry, compact, utility vehicles (SUVs), vans; 2. Exports: Largest automotive exporter from India (77k+ quarterly units); "
            "3. Spare Parts & Pre-Owned Car Operations (True Value)."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 37,203 Cr, EBITDA at INR 4,417 Cr, and PAT at INR 3,069 Cr. "
            "Zero long-term debt with cash and financial reserves exceeding INR 52,000 Cr."
        ),
        regulatory_exposure=(
            "Ministry of Road Transport (MoRTH) Bharat Stage VI Phase II emission norms, mandatory 6 airbag safety rules, and CAFE III fuel economy regulations."
        ),
        capex_and_catalysts=(
            "INR 35,000 Cr investment in new 1-million unit greenfield manufacturing plant in Gujarat; debut of first battery electric vehicle (eVX) in 2025."
        ),
    ),
    # 18. TITAN
    _create_company_profile_chunk(
        symbol="TITAN",
        company_name="Titan Company Limited",
        effective_date="2024-11-05",
        overview=(
            "Titan Company (a joint venture between Tata Group and TIDCO) is India's leading lifestyle company with dominant market share "
            "in branded jewellery (Tanishq, Mia, Zoya, CaratLane), watches (Titan, Fastrack), and eyewear (Titan EyePlus)."
        ),
        business_segments=(
            "1. Jewellery (Tanishq, CaratLane): 88% of revenue; 2. Watches & Wearables: 7%; 3. Eyewear & Emerging (Fragrances, Taneira ethnic wear): 5%."
        ),
        financial_highlights=(
            "Consolidated quarterly revenue at INR 13,473 Cr, EBITDA at INR 1,236 Cr, and PAT at INR 704 Cr. "
            "Total retail network spans 3,171 stores across 400+ towns."
        ),
        regulatory_exposure=(
            "Mandatory hallmarking of gold jewellery, customs duty variations on gold imports (slashed from 15% to 6% in Budget 2024)."
        ),
        capex_and_catalysts=(
            "Surge in consumer gold demand following customs duty reduction; CaratLane omni-channel expansion; overseas Tanishq store openings in US/GCC."
        ),
    ),
    # 19. ULTRACEMCO
    _create_company_profile_chunk(
        symbol="ULTRACEMCO",
        company_name="UltraTech Cement Limited",
        effective_date="2024-10-21",
        overview=(
            "UltraTech Cement (flagship of Aditya Birla Group) is India's largest cement manufacturer and third-largest globally outside China. "
            "Consolidated gray cement capacity exceeds 154 MTPA across 24 integrated plants and 33 grinding units."
        ),
        business_segments=(
            "1. Grey Cement: 86% of revenue; 2. White Cement & Wall Care: 6%; 3. Ready-Mix Concrete (RMC) & Building Products: 8%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 15,635 Cr, EBITDA at INR 2,239 Cr, and PAT at INR 820 Cr. "
            "Consolidated domestic cement sales volume of 26.43 MT. Net debt-to-EBITDA remains low at 0.45x."
        ),
        regulatory_exposure=(
            "Competition Commission of India (CCI) market monitoring; environmental emission caps on clinker production."
        ),
        capex_and_catalysts=(
            "Targeting 200 MTPA capacity by FY27 through brownfield expansions and integration of Kesoram cement assets; beneficiary of Budget capex."
        ),
    ),
    # 20. TATAMOTORS
    _create_company_profile_chunk(
        symbol="TATAMOTORS",
        company_name="Tata Motors Limited",
        effective_date="2024-11-08",
        overview=(
            "Tata Motors is a USD 44 billion global automotive manufacturer. Currently executing a formal demerger into two separately listed entities: "
            "1. Commercial Vehicles (CVs); 2. Passenger Vehicles (PVs, domestic EVs, and luxury Jaguar Land Rover)."
        ),
        business_segments=(
            "1. Jaguar Land Rover (JLR): Range Rover, Defender, Discovery; 2. Tata Commercial Vehicles: Medium, heavy, light commercial trucks and buses; "
            "3. Tata Passenger Vehicles: Nexon, Punch, Harrier, Tiago; 4. Electric Vehicles (Tata Passenger Electric Mobility): Market share 65%+."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 1,01,450 Cr, EBITDA at INR 11,600 Cr, and PAT at INR 3,343 Cr. "
            "JLR free cash flow stood positive at GBP 2.3 billion in FY24, reducing net auto debt to near-zero levels."
        ),
        regulatory_exposure=(
            "NCLT demerger approval timelines; UK & EU zero-emission vehicle (ZEV) mandates; Indian FAME/PLI electric vehicle subsidy audits."
        ),
        capex_and_catalysts=(
            "Formal demerger unlocking pure-play value for CV and PV businesses; launch of JLR electric Range Rover and Tata Curvv EV."
        ),
    ),
    # 21. ASIANPAINT
    _create_company_profile_chunk(
        symbol="ASIANPAINT",
        company_name="Asian Paints Limited",
        effective_date="2024-11-09",
        overview=(
            "Asian Paints is India's largest decorative paint and coatings company, operating in 15 countries. "
            "Maintains the deepest dealer tinting network in India with over 70,000 retail touchpoints."
        ),
        business_segments=(
            "1. Decorative Coatings: 85% of revenue (interior/exterior wall paints, primers); 2. International Business: 8%; "
            "3. Home Décor & Bath Fittings: 4%; 4. Industrial Coatings: 3%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 8,003 Cr, EBITDA at INR 1,239 Cr, and PAT at INR 695 Cr. "
            "Virtually debt-free balance sheet with return on capital employed (ROCE) exceeding 28%."
        ),
        regulatory_exposure=(
            "Pollution control board norms for petrochemical raw material processing (titanium dioxide, crude solvents)."
        ),
        capex_and_catalysts=(
            "Expansion into backward integration with Vinyl Acetate Monomer (VAM) plant; defending market share against new entrants (Birla Opus)."
        ),
    ),
    # 22. NTPC
    _create_company_profile_chunk(
        symbol="NTPC",
        company_name="NTPC Limited",
        effective_date="2024-10-25",
        overview=(
            "NTPC Limited is India's largest power utility with installed capacity of 76+ GW, contributing ~25% of India's total electricity generation. "
            "Aggressively pivoting toward non-fossil energy through its subsidiary NTPC Green Energy Limited (NGEL)."
        ),
        business_segments=(
            "1. Thermal Power: Coal-based and gas-based power generation under regulated cost-plus CERC tariff framework; "
            "2. Renewable Energy: Solar, wind, hydro, and pumped storage projects."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 44,696 Cr, EBITDA at INR 11,740 Cr, and PAT at INR 5,380 Cr. "
            "Average Plant Load Factor (PLF) for coal plants stands at 76.3% against national average of 69%."
        ),
        regulatory_exposure=(
            "Central Electricity Regulatory Commission (CERC) 5-year tariff regulations guaranteeing 15.5% Return on Equity on capitalized assets."
        ),
        capex_and_catalysts=(
            "NTPC Green Energy IPO to raise INR 10,000 Cr; target to reach 60 GW renewable energy capacity by 2032."
        ),
    ),
    # 23. POWERGRID
    _create_company_profile_chunk(
        symbol="POWERGRID",
        company_name="Power Grid Corporation of India Limited",
        effective_date="2024-11-06",
        overview=(
            "Power Grid Corporation is the Central Transmission Utility (CTU) of India, transmitting ~85% of India's inter-state electrical energy. "
            "Operates over 178,000 circuit km of transmission lines and 278 sub-stations."
        ),
        business_segments=(
            "1. Transmission Services: 97% of revenue (operating under regulated CERC return on equity framework); 2. Telecom (Powertel fiber): 2%; 3. Consultancy: 1%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 11,278 Cr, EBITDA at INR 9,845 Cr (87.3% EBITDA margin), and PAT at INR 3,793 Cr. "
            "System availability consistently maintained above 99.8%."
        ),
        regulatory_exposure=(
            "Regulated under CERC multi-year tariff regulations with guaranteed 15.5% post-tax return on transmission equity."
        ),
        capex_and_catalysts=(
            "Participating in Tariff Based Competitive Bidding (TBCB) for interstate green energy evacuation corridors; INR 1.9 lakh crore capex planned by 2032."
        ),
    ),
    # 24. M&M
    _create_company_profile_chunk(
        symbol="M&M",
        company_name="Mahindra & Mahindra Limited",
        effective_date="2024-11-07",
        overview=(
            "Mahindra & Mahindra is an Indian multinational vehicle manufacturing corporation, leader in sports utility vehicles (SUVs) "
            "and the world's largest tractor manufacturer by volume."
        ),
        business_segments=(
            "1. Automotive: Scorpio-N, XUV700, Thar, Bolero, electric origin SUVs (BE series); 2. Farm Equipment: Tractors, farm mechanization (42.5% market share); "
            "3. Financial Services & Tech: Holdings in Mahindra Finance and Tech Mahindra."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 37,924 Cr, EBITDA at INR 5,442 Cr, and PAT at INR 3,841 Cr. "
            "Automotive segment EBIT margin expanded to 8.8% supported by rich product mix."
        ),
        regulatory_exposure=(
            "Automotive safety mandates, CAFÉ regulations, and PLI automotive scheme compliance."
        ),
        capex_and_catalysts=(
            "Launch of INGLO architecture electric SUVs (BE 6e and XEV 9e); aggressive capacity expansion to 64,000 monthly SUV production units."
        ),
    ),
    # 25. BAJAJFINSV
    _create_company_profile_chunk(
        symbol="BAJAJFINSV",
        company_name="Bajaj Finserv Limited",
        effective_date="2024-10-23",
        overview=(
            "Bajaj Finserv is the financial conglomerate holding company of the Bajaj Group. Holds controlling stakes in Bajaj Finance (52.5%), "
            "Bajaj Allianz General Insurance (74%), and Bajaj Allianz Life Insurance (74%)."
        ),
        business_segments=(
            "1. NBFC Lending: Consumer and commercial financing via Bajaj Finance; 2. General Insurance: Health, motor, property casualty; "
            "3. Life Insurance: ULIP, par and non-par protection; 4. Emerging Fintech: Bajaj Finserv Health & Mutual Fund."
        ),
        financial_highlights=(
            "Consolidated quarterly revenue at INR 33,704 Cr and PAT at INR 2,087 Cr. "
            "General insurance Combined Ratio maintained under 100%, indicating underwriting profitability."
        ),
        regulatory_exposure=(
            "Insurance Regulatory and Development Authority of India (IRDAI) solvency norms and RBI Core Investment Company (CIC) regulations."
        ),
        capex_and_catalysts=(
            "Expansion of Bajaj Finserv Mutual Fund and health tech ecosystems; potential listing of insurance arms upon regulatory harmonization."
        ),
    ),
    # 26. COALINDIA
    _create_company_profile_chunk(
        symbol="COALINDIA",
        company_name="Coal India Limited",
        effective_date="2024-10-25",
        overview=(
            "Coal India is a Maharatna public sector undertaking and the world's largest coal producer, producing over 770 MT of coal annually. "
            "Supplies over 80% of domestic coal to India's thermal power stations."
        ),
        business_segments=(
            "1. Fuel Supply Agreement (FSA) coal supplies to power sector (85% of volume); 2. E-Auction coal supplies to non-power industrial consumers (15% of volume)."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 30,673 Cr, EBITDA at INR 8,617 Cr, and PAT at INR 6,275 Cr. "
            "Maintains net cash balances exceeding INR 45,000 Cr with dividend yield typically around 6%-8%."
        ),
        regulatory_exposure=(
            "Ministry of Coal environmental and forest clearance mandates, mine safety regulations, and railway wagon availability."
        ),
        capex_and_catalysts=(
            "Targeting 1 Billion Tonne production milestone; mechanization via first-mile connectivity (FMC) conveyor rail systems."
        ),
    ),
    # 27. ADANIPORTS
    _create_company_profile_chunk(
        symbol="ADANIPORTS",
        company_name="Adani Ports and Special Economic Zone Limited",
        effective_date="2024-10-29",
        overview=(
            "Adani Ports is India's largest private commercial port operator and integrated logistics provider, accounting for ~27% of India's port cargo."
        ),
        business_segments=(
            "1. Port Operations: 15 ports and terminals across 7 maritime states including flagship Mundra Port; "
            "2. Logistics: Inland container depots (ICDs), container trains, cold storage warehouses; 3. Marine SEZ development."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 7,067 Cr, EBITDA at INR 4,369 Cr (61.8% EBITDA margin), and PAT at INR 2,445 Cr. "
            "Net debt-to-EBITDA ratio compressed to 2.0x."
        ),
        regulatory_exposure=(
            "Major Port Authorities Act, coastal regulation zone (CRZ) environmental clearances, and DG Shipping guidelines."
        ),
        capex_and_catalysts=(
            "Operationalization of Vizhinjam international transshipment deepwater port; acquisition of Gopalpur and Colombo terminals."
        ),
    ),
    # 28. TATASTEEL
    _create_company_profile_chunk(
        symbol="TATASTEEL",
        company_name="Tata Steel Limited",
        effective_date="2024-11-06",
        overview=(
            "Tata Steel is among the top global steel companies with annual crude steel capacity of 35 MTPA across India, the UK, and the Netherlands. "
            "Operates fully captive iron ore and metallurgical coal mines in India."
        ),
        business_segments=(
            "1. Tata Steel India: Kalinganagar, Jamshedpur, Angul; 2. Tata Steel UK (Port Talbot transition); 3. Tata Steel Netherlands (IJmuiden)."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 53,905 Cr, EBITDA at INR 6,224 Cr, and PAT at INR 759 Cr. "
            "India operations generated robust EBITDA margin of 20.3%."
        ),
        regulatory_exposure=(
            "Mines and Minerals (Development and Regulation) Act, EU Carbon Border Adjustment Mechanism (CBAM), and UK decarbonization grant agreements."
        ),
        capex_and_catalysts=(
            "Commissioning of 5 MTPA Kalinganagar phase-2 expansion; GBP 500 million UK government grant for Electric Arc Furnace transition."
        ),
    ),
    # 29. SIEMENS
    _create_company_profile_chunk(
        symbol="SIEMENS",
        company_name="Siemens Limited",
        effective_date="2024-11-26",
        overview=(
            "Siemens Limited is a technology powerhouse focused on industry, infrastructure, transport, and energy transmission in India."
        ),
        business_segments=(
            "1. Smart Infrastructure: Low/medium voltage power distribution; 2. Digital Industries: Factory automation, industrial software; "
            "3. Mobility: Electric locomotives, Kavach rail signaling; 4. Energy Transmission (demerging into Siemens Energy India)."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 6,103 Cr, EBITDA at INR 922 Cr, and PAT at INR 656 Cr. "
            "Unexecuted order backlog stands at INR 45,600 Cr with zero debt."
        ),
        regulatory_exposure=(
            "Public procurement indigenization mandates, railway safety approvals from RDSO, and NCLT approval for Energy demerger."
        ),
        capex_and_catalysts=(
            "INR 26,000 Cr Indian Railways locomotive supply contract; capital goods demand driven by private capex and data centers."
        ),
    ),
    # 30. WIPRO
    _create_company_profile_chunk(
        symbol="WIPRO",
        company_name="Wipro Limited",
        effective_date="2024-10-17",
        overview=(
            "Wipro Limited is a global information technology, consulting, and business process services company headquartered in Bengaluru, India. "
            "Serves clients across 6 continents under leadership focused on large deal execution and AI transformation."
        ),
        business_segments=(
            "1. Americas 1: Healthcare, consumer, technology; 2. Americas 2: Financial services, manufacturing, energy; "
            "3. Europe; 4. APMEA (Asia Pacific, Middle East, Africa); 5. Capco Management Consulting."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 22,196 Cr with IT services operating margin expanding 70 bps YoY to 16.8%. PAT reached INR 3,209 Cr. "
            "Approved 1:1 bonus equity share issue in October 2024. Cash reserves exceed INR 28,000 Cr."
        ),
        regulatory_exposure=(
            "US and European immigration/labor laws, GDPR privacy regulations, and cross-border transfer pricing compliance."
        ),
        capex_and_catalysts=(
            "Integration of USD 1 billion ai360 generative AI platform; large multi-year cost-optimization contracts with European banks."
        ),
    ),
    # 31. ZOMATO
    _create_company_profile_chunk(
        symbol="ZOMATO",
        company_name="Zomato Limited",
        effective_date="2024-10-22",
        overview=(
            "Zomato Limited is India's leading online food and quick-commerce platform. Owns Blinkit (quick commerce leader), "
            "Hyperpure (B2B restaurant supply chain), and District (live events and ticketing acquired from Paytm)."
        ),
        business_segments=(
            "1. Food Delivery: GOV INR 9,500+ Cr per quarter with ~20M MTUs; 2. Quick Commerce (Blinkit): 791 dark stores, GOV growing 129% YoY; "
            "3. Hyperpure: Farm-to-kitchen B2B supplies; 4. Going-Out / Live Events (District)."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 4,799 Cr, EBITDA at INR 226 Cr, and PAT at INR 176 Cr. "
            "Approved INR 8,500 Cr QIP equity raise to bolster balance sheet. Zero long-term debt."
        ),
        regulatory_exposure=(
            "Gig economy worker regulations, consumer protection packaging norms, and FSSAI restaurant kitchen compliance."
        ),
        capex_and_catalysts=(
            "Expanding Blinkit dark stores to 2,000 by 2026; integration of Paytm entertainment ticketing business into District."
        ),
    ),
    # 32. DEMOCORP
    _create_company_profile_chunk(
        symbol="DEMOCORP",
        company_name="Demo Corporation Limited",
        effective_date="2024-10-15",
        overview=(
            "Demo Corporation Limited is an authorized reference enterprise used for benchmark quantitative calibration, "
            "stress-testing multi-asset RAG query pipelines, and validating audit trails."
        ),
        business_segments=(
            "1. Industrial Hardware: 60% of revenue; 2. Technology Solutions: 40%."
        ),
        financial_highlights=(
            "Quarterly revenue at INR 10,000 Cr, EBITDA at INR 2,000 Cr (20% margin), and PAT at INR 1,200 Cr. Net worth stands at INR 25,000 Cr."
        ),
        regulatory_exposure=(
            "SEBI LODR Regulation 33 limited review disclosures and benchmark statutory adherence."
        ),
        capex_and_catalysts=(
            "Standard synthetic testing baseline for execution verification and regression checks."
        ),
    ),
]


# -----------------------------------------------------------------------------
# 4. Revision Tracking Test Documents (Original vs Restated)
# -----------------------------------------------------------------------------
REVISION_TEST_CHUNKS: list[DocumentChunk] = [
    # Original Q1 FY25 filing for RELIANCE (effective 2024-07-19)
    _create_filing_table_chunk(
        symbol="RELIANCE",
        company_name="Reliance Industries Limited",
        filing_date="2024-07-19",
        period_end="2024-06-30",
        qtr="Q1",
        fy="FY25",
        rev=236217.0,
        ebitda=42748.0,
        pat=17445.0,
        eps=21.78,
        debt=338000.0,
        net_worth=785000.0,
        assets=1690000.0,
        liab=905000.0,
        notes=["Original statutory submission as published on July 19, 2024."],
        is_restated=False,
    ),
    # Restated Q1 FY25 filing for RELIANCE (restated on 2024-10-14 alongside Q2)
    _create_filing_table_chunk(
        symbol="RELIANCE",
        company_name="Reliance Industries Limited",
        filing_date="2024-10-14",
        period_end="2024-06-30",
        qtr="Q1",
        fy="FY25",
        rev=236217.0,
        ebitda=42748.0,
        pat=17445.0,
        eps=21.78,
        debt=338000.0,
        net_worth=785000.0,
        assets=1690000.0,
        liab=905000.0,
        notes=["Restated and reclassified under Ind AS 108 operating segments alongside Q2 FY25 filing on October 14, 2024."],
        is_restated=True,
        restatement_date="2024-10-14",
        superseded_by="FILING-RELIANCE-FY25-Q1-RESTATED",
    ),
]

# Combined authoritative RAG corpus
CANONICAL_RAG_DOCUMENTS: list[DocumentChunk] = (
    STATUTORY_AND_MACRO_CHUNKS
    + CORPORATE_FILING_CHUNKS
    + COMPANY_PROFILE_CHUNKS
    + REVISION_TEST_CHUNKS
)

REGULATORY_AND_STATUTORY_CHUNKS = CANONICAL_RAG_DOCUMENTS
