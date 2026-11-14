"""Benchmark References, Investor Personas, and Reference-Guided Judge for ArthaAI.

Provides authoritative CFA / SEBI Registered Research Analyst ground-truth references
for the 38 canonical benchmark scenarios, 6 institutional investor personas,
and the FinancialRefJudge for semantic meaning match and contradiction audits.
"""

from __future__ import annotations

import logging
from typing import Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. Six Institutional Investor Personas
# ---------------------------------------------------------------------------

INVESTOR_PERSONAS: dict[str, dict[str, Any]] = {
    "conservative_retiree": {
        "id": "conservative_retiree",
        "name": "Conservative Senior Citizen / Retiree",
        "profile": "70-year-old pensioner dependent on fixed capital safety and regular dividend yields.",
        "risk_tolerance": "LOW",
        "time_horizon": "3-5 Years",
        "hard_constraints": [
            "Capital preservation paramount; max portfolio drawdown < 15%",
            "Strictly prohibited from naked derivatives or high-leverage F&O",
            "Mandates dividend-yielding blue chips with clean corporate governance (SEBI Reg 30/33)",
        ],
        "assigned_groups": ["GROUP_ITC_DEMERGER", "GROUP_HDFCBANK_NIM", "GROUP_SBIN_REPO"],
        "assigned_symbols": ["ITC.NS", "HDFCBANK.NS", "SBIN.NS"],
    },
    "long_term_compounder": {
        "id": "long_term_compounder",
        "name": "Institutional Wealth Compounder",
        "profile": "Patient generational capital seeking 10-year multi-bagger compounding and high return on capital.",
        "risk_tolerance": "MODERATE",
        "time_horizon": "10 Years",
        "hard_constraints": [
            "Sustainable ROE > 15% and Debt/Equity < 0.7x",
            "High reinvestment rate into free cash flow compounding",
            "Deduct Finance Act 2024 LTCG (12.5%) and STT friction from terminal wealth projections",
        ],
        "assigned_groups": ["GROUP_RELIANCE_5Y", "GROUP_TCS_INFY_PAIR"],
        "assigned_symbols": ["RELIANCE.NS", "TCS.NS", "INFY.NS"],
    },
    "tactical_fno_hedger": {
        "id": "tactical_fno_hedger",
        "name": "Tactical Derivatives & Momentum Hedger",
        "profile": "Active quantitative trader managing directional equity volatility via NSE options chain microstructure.",
        "risk_tolerance": "AGGRESSIVE",
        "time_horizon": "1 Year",
        "hard_constraints": [
            "Audits Put-Call Ratio (PCR) and Max Pain boundaries on active expiry",
            "Mandates empirical trailing stop-loss boundaries anchored at 88% of LTP",
            "Monitors Kyle's Lambda price impact and bid-ask slippage",
        ],
        "assigned_groups": ["GROUP_TATAMOTORS_EV"],
        "assigned_symbols": ["TATAMOTORS.NS"],
    },
    "commodities_bullion_allocator": {
        "id": "commodities_bullion_allocator",
        "name": "Precious Metals Inflation & Currency Hedger",
        "profile": "Macro asset allocator preserving purchasing power against fiat currency debasement and CPI inflation.",
        "risk_tolerance": "MODERATE",
        "time_horizon": "10 Years",
        "hard_constraints": [
            "Audits physical bullion reserves backed by 99.9% LBMA Good Delivery Standard",
            "Verifies SEBI physical vault inspection compliance and custodian audits",
            "Monitors Gold-to-Silver Ratio (GSR: ~84.5:1) and global physical supply deficits (~4,000 MT)",
            "Strictly forbids corporate balance sheet filings, ROE, or Debt/Equity claims on physical bullion ETFs",
        ],
        "assigned_groups": ["GROUP_SILVER_TREND"],
        "assigned_symbols": ["TATSILV", "SILVERBEES.NS"],
    },
    "green_capex_allocator": {
        "id": "green_capex_allocator",
        "name": "Energy Transition & Sovereign Infrastructure Allocator",
        "profile": "Public equity stewardship fund evaluating large-scale decarbonization capex and utility storage buildouts.",
        "risk_tolerance": "MODERATE",
        "time_horizon": "5-10 Years",
        "hard_constraints": [
            "Audits Debt-Service Coverage Ratio (DSCR) during heavy capital expenditure cycles",
            "Evaluates sovereign indigenization pipeline and defense budget allocation",
            "Stress-tests carbon border taxes and global green transition subsidies",
        ],
        "assigned_groups": ["GROUP_TATAPOWER_RENEW", "GROUP_LT_INFRA", "GROUP_HAL_DEFENSE", "GROUP_TATASTEEL_CYCLICAL"],
        "assigned_symbols": ["TATAPOWER.NS", "LT.NS", "HAL.NS", "TATASTEEL.NS"],
    },
    "deep_value_adversarial": {
        "id": "deep_value_adversarial",
        "name": "Forensic Value & Adversarial Red-Team Auditor",
        "profile": "Skeptical institutional auditor probing regulatory compliance, unit economics, and prompt bias.",
        "risk_tolerance": "HARD",
        "time_horizon": "3-5 Years",
        "hard_constraints": [
            "Red-teams optimistic terminal multiples against historical sector drawdowns",
            "Audits USFDA inspection status (Form 483 / Warning Letters) and quick-commerce dark store burn",
            "Maintains empirical neutrality under adversarially negative or leading prompts",
        ],
        "assigned_groups": ["GROUP_SUNPHARMA_FDA", "GROUP_BHARTIARTL_5G", "GROUP_ZOMATO_NEWAGE"],
        "assigned_symbols": ["SUNPHARMA.NS", "BHARTIARTL.NS", "ZOMATO.NS"],
    },
}

# ---------------------------------------------------------------------------
# 2. Benchmark Reference Truth Library for Canonical Queries
# ---------------------------------------------------------------------------

BENCHMARK_REFERENCES: dict[str, dict[str, Any]] = {
    "Q01": {
        "id": "Q01",
        "symbol": "RELIANCE.NS",
        "category": "Conglomerates & Energy",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 11.5,
        "expected_cagr_p50_max": 15.5,
        "key_valuation_points": [
            "O2C refining margins stabilized following petrochemical downcycle",
            "Jio telecom tariff hikes drive sustained 5G ARPU expansion",
            "Retail segment self-funding expansion capex from operating cash flows",
            "Finance Act 2024 STT round-trip drag deducted from net post-tax return",
        ],
        "contraindications_and_pitfalls": [
            "Asserting consolidated net debt is unserviceable without factoring Jio/Retail cash flow",
            "Ignoring 22.22 bps statutory round-trip friction under Finance Act 2024",
        ],
    },
    "Q05": {
        "id": "Q05",
        "symbol": "TATAMOTORS.NS",
        "category": "Automotive & Clean Mobility",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 10.0,
        "expected_cagr_p50_max": 14.5,
        "key_valuation_points": [
            "JLR order book deleveraging net debt towards zero-debt milestone",
            "Domestic EV market share defensibility against discount competition",
            "Commercial vehicle cycle inflection and infrastructure demand",
            "Trailing stop-loss boundary anchored at 88% of LTP to safeguard against cyclical downside",
        ],
        "contraindications_and_pitfalls": [
            "Claiming catastrophic EV margin collapse without analyzing JLR cash flow buffers",
            "Ignoring options chain Max Pain support level",
        ],
    },
    "Q09": {
        "id": "Q09",
        "symbol": "TATSILV",
        "category": "Commodities & Bullion",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 9.0,
        "expected_cagr_p50_max": 13.8,
        "key_valuation_points": [
            "Physical silver bullion backed by 99.9% pure LBMA Good Delivery Standard vault reserves",
            "SEBI physical custody inspection compliance verified with zero tracking error anomalies",
            "Structural industrial demand from solar PV paste and EV automotive power electronics",
            "Annual global mine supply deficit estimated at ~4,000 metric tons",
        ],
        "contraindications_and_pitfalls": [
            "Attributing corporate financial ratios (ROE, ROCE, Debt/Equity, P/E) to physical bullion ETFs",
            "Confusing corporate stock filings with physical vault audit inspection certificates",
        ],
    },
    "Q13": {
        "id": "Q13",
        "symbol": "HDFCBANK.NS",
        "category": "Banking & Financial Services",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 12.0,
        "expected_cagr_p50_max": 16.0,
        "key_valuation_points": [
            "Post-merger mortgage assimilation transitioning into NIM stabilization",
            "Credit-to-deposit ratio gradually normalizing through branch mobilization",
            "Asset quality and gross NPA ratios remaining under pristine control (<1.4%)",
            "High capital adequacy buffer (Tier-1 CAR > 16%) supporting credit expansion",
        ],
        "contraindications_and_pitfalls": [
            "Overstating NIM compression without factoring branch deposit growth",
            "Ignoring RBI statutory liquidity ratio (SLR) and cash reserve ratio (CRR) buffers",
        ],
    },
    "Q17": {
        "id": "Q17",
        "symbol": "TCS.NS",
        "category": "Technology & Enterprise IT",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 10.5,
        "expected_cagr_p50_max": 14.5,
        "key_valuation_points": [
            "Industry-leading operating margins (25-26% EBIT) with minimal financial leverage",
            "Enterprise GenAI client engagements transitioning from proof-of-concept to production billing",
            "Sustained high return on equity (ROE > 40%) and robust shareholder dividend payout ratio (>80%)",
            "Low voluntary attrition compared to domestic Tier-1 IT services peers",
        ],
        "contraindications_and_pitfalls": [
            "Projecting zero AI productivity impact on IT delivery costs",
            "Ignoring currency volatility between INR and USD/EUR",
        ],
    },
    "Q21": {
        "id": "Q21",
        "symbol": "SBIN.NS",
        "category": "Banking & Financial Services",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 11.0,
        "expected_cagr_p50_max": 15.0,
        "key_valuation_points": [
            "Sovereign franchise supporting low-cost CASA deposit mobilization across rural/semi-urban branches",
            "Corporate credit loan book re-accelerating alongside national infrastructure capex",
            "Net Interest Margin defended through floating-rate MCLR loan book repricing",
            "Gross NPA reduced below multi-year cyclical lows (<2.2%)",
        ],
        "contraindications_and_pitfalls": [
            "Extrapolating historical PSU bad-loan cycles without inspecting current restructured book metrics",
        ],
    },
    "Q23": {
        "id": "Q23",
        "symbol": "TATAPOWER.NS",
        "category": "Renewables & Power Utilities",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 11.5,
        "expected_cagr_p50_max": 16.5,
        "key_valuation_points": [
            "Clean energy generation capacity expanding towards >50% of total installed utility capacity",
            "Utility-scale solar module manufacturing facility in Tamil Nadu operationalized",
            "EV charging infrastructure network leadership across national highway corridors",
            "Debt-Service Coverage Ratio (DSCR) protected by long-term Power Purchase Agreements (PPAs)",
        ],
        "contraindications_and_pitfalls": [
            "Failing to separate regulated distribution business cash flows from merchant generation exposure",
        ],
    },
    "Q25": {
        "id": "Q25",
        "symbol": "ITC.NS",
        "category": "FMCG & Consumer Goods",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 9.5,
        "expected_cagr_p50_max": 13.5,
        "key_valuation_points": [
            "1:10 hotel business demerger unlocks shareholder value and elevates standalone ROCE by >800 bps",
            "Cigarette volume growth backed by stable taxation framework and zero unexpected excise shocks",
            "Non-cigarette FMCG business scaling EBITDA margins towards 10-12% trajectory",
            "Sustained dividend yield (~3.5%) providing solid capital downside cushion",
        ],
        "contraindications_and_pitfalls": [
            "Ignoring the demerger ratio and ROCE expansion resulting from asset-light hotel spinoff",
        ],
    },
    "Q27": {
        "id": "Q27",
        "symbol": "LT.NS",
        "category": "Infrastructure & Capital Goods",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 11.0,
        "expected_cagr_p50_max": 15.0,
        "key_valuation_points": [
            "Consolidated multi-year order book exceeding ₹4.5 lakh crore with ~2.5x revenue visibility",
            "Middle East hydrocarbon and green energy EPC contracts expanding international contribution",
            "Working capital to sales ratio kept under rigorous discipline (~12%)",
            "Domestic national infrastructure pipeline (railways, defense, semiconductor fabs) driving domestic execution",
        ],
        "contraindications_and_pitfalls": [
            "Over-discounting execution capability during geopolitical tensions in the Gulf region",
        ],
    },
    "Q29": {
        "id": "Q29",
        "symbol": "SUNPHARMA.NS",
        "category": "Pharmaceuticals & Healthcare",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 10.0,
        "expected_cagr_p50_max": 14.5,
        "key_valuation_points": [
            "Global specialty dermatology and ophthalmology pipeline driving margin expansion (>27% EBITDA)",
            "USFDA compliance status proactively remediated across active manufacturing sites",
            "Strong domestic formulations franchise with double-digit chronic therapy growth",
            "Net debt-free balance sheet enabling targeted specialty acquisitions",
        ],
        "contraindications_and_pitfalls": [
            "Treating Sun Pharma as a commodity generic business rather than a branded specialty enterprise",
        ],
    },
    "Q31": {
        "id": "Q31",
        "symbol": "BHARTIARTL.NS",
        "category": "Telecommunications & Infrastructure",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 12.0,
        "expected_cagr_p50_max": 16.5,
        "key_valuation_points": [
            "Industry-leading ARPU expansion past ₹220+ driven by 4G-to-5G premium upgrades and tariff hikes",
            "5G nationwide network capex peaking, unleashing dramatic free cash flow inflection",
            "Africa business providing foreign currency earnings diversification",
            "Enterprise and cloud services (Airtel Business) delivering high-margin recurring revenues",
        ],
        "contraindications_and_pitfalls": [
            "Ignoring AGR statutory payment schedules and Indus Towers lease obligations",
        ],
    },
    "Q33": {
        "id": "Q33",
        "symbol": "HAL.NS",
        "category": "Defense & Aerospace",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 12.5,
        "expected_cagr_p50_max": 17.5,
        "key_valuation_points": [
            "Sovereign defense procurement order pipeline backing >7 years of revenue visibility",
            "Tejas Mk1A delivery ramp-up and domestic indigenous helicopter platforms (LCH Prachand)",
            "High operating margins (>25% EBIT) supported by high-margin aircraft maintenance and repair (MRO)",
            "Debt-free status with robust cash balances earning treasury interest yields",
        ],
        "contraindications_and_pitfalls": [
            "Overstating engine delivery bottleneck delays without analyzing GE Aerospace supply commitments",
        ],
    },
    "Q35": {
        "id": "Q35",
        "symbol": "TATASTEEL.NS",
        "category": "Metals & Mining",
        "expected_verdict": "NEUTRAL_HOLD",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 8.0,
        "expected_cagr_p50_max": 12.5,
        "key_valuation_points": [
            "Domestic Kalinganagar blast furnace expansion lower unit costs and raises volume capacity",
            "UK Port Talbot blast furnace transitioning to electric arc furnace (EAF) with UK government subsidy",
            "Chinese steel export dumping creates near-term margin pressure on domestic flat product realizations",
            "High cyclical leverage necessitating disciplined debt deleveraging during margin contractions",
        ],
        "contraindications_and_pitfalls": [
            "Underestimating the multi-year capital drag of European green steel decarbonization",
        ],
    },
    "Q37": {
        "id": "Q37",
        "symbol": "ZOMATO.NS",
        "category": "Consumer Internet & Quick Commerce",
        "expected_verdict": "ACCUMULATE",
        "expected_posture": "ACCUMULATE_BIASED",
        "expected_cagr_p50_min": 13.0,
        "expected_cagr_p50_max": 18.5,
        "key_valuation_points": [
            "Blinkit quick-commerce gross order value (GOV) compounding >100% YoY with dark-store profitability",
            "Food delivery adjusted EBITDA margins sustaining >3% of GOV through platform fee increases",
            "District platform consolidating dining out, live events, and entertainment ticketing",
            "Strong net cash treasury reserves (>₹12,000 crore) insulating against competitor burn wars",
        ],
        "contraindications_and_pitfalls": [
            "Projecting eternal cash burn without recognizing dark store operational breakeven metrics",
        ],
    },
}

# ---------------------------------------------------------------------------
# 3. Pydantic Model for Reference-Guided Semantic Evaluation
# ---------------------------------------------------------------------------

class FinancialRefJudgeScore(BaseModel):
    """Pydantic structured schema for reference-guided semantic evaluation."""
    key_points_covered: int = Field(ge=1, le=5, description="1=covers none, 5=covers all gold reference targets")
    verdict_alignment: bool = Field(description="True if the agent recommendation aligns with the expected institutional verdict")
    contradicts_reference: bool = Field(description="True if recommendation contradicts the gold reference findings")
    statutory_invariants_preserved: bool = Field(description="True if Finance Act 2024 STT and SEBI guardrails are intact")
    reason: str = Field(description="Short expert institutional explanation of score and any identified contradictions")


def get_persona_for_scenario(scenario_id: str, symbol: str, category: str) -> str:
    """Deterministically maps a benchmark scenario or target equity to an Investor Persona."""
    sym = (symbol or "").upper()
    cat = (category or "").upper()
    sc_id = (scenario_id or "").upper()

    # 1. Commodities & Bullion
    if "SILV" in sym or "GOLD" in sym or "COMMODIT" in cat or "SILVER" in sc_id:
        return "commodities_bullion_allocator"

    # 2. Retiree / Dividend Focus
    if "ITC" in sym or "HDFC" in sym or "SBIN" in sym or "FMCG" in cat or "BANK" in cat:
        return "conservative_retiree"

    # 3. Tactical F&O Hedger
    if "TATAMOTORS" in sym or "AUTO" in cat:
        return "tactical_fno_hedger"

    # 4. Long Term Compounder
    if "RELIANCE" in sym or "TCS" in sym or "INFY" in sym or "ENERGY" in cat or "TECH" in cat:
        return "long_term_compounder"

    # 5. Green Infrastructure Allocator
    if "POWER" in sym or "LT" in sym or "HAL" in sym or "STEEL" in sym or "DEFENSE" in cat or "METALS" in cat:
        return "green_capex_allocator"

    # 6. Deep Value & Adversarial
    return "deep_value_adversarial"
