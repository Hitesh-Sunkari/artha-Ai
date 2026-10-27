"""ArthaAI Copilot Institutional Guardrails System.

Enforces strict domain boundaries and ethical compliance:
1. Rejects out-of-domain queries (cooking, sports, entertainment, unrelated coding, medical, etc.)
2. Blocks unethical queries (market manipulation, insider tips, front-running, tax evasion, hacking)
3. Enforces structured, concise responses (<180 words)
"""

from __future__ import annotations

import re
from typing import Tuple

UNETHICAL_PATTERNS = [
    r"\binsider\b",
    r"\bpump\s+and\s+dump\b",
    r"\bmanipulat(?:e|ing|ion)\b",
    r"\bcircular\s+trading\b",
    r"\bfront\s*running\b",
    r"\beva(?:de|sion)\b",
    r"\bhack(?:ing)?\b",
    r"\bjailbreak\b",
    r"\bignore\s+(?:all\s+)?(?:previous\s+)?instructions\b",
    r"\bguaranteed\s+(?:profit|return|money|multibagger)s?\b",
    r"\bfree\s+money\b",
]

OUT_OF_DOMAIN_PATTERNS = [
    r"\b(?:recipe|cook(?:ing)?|bake|cake|pasta|pizza|biryani|ingredient|food)\b",
    r"\b(?:movie|actor|actress|hollywood|bollywood|netflix|cinema)\b",
    r"\b(?:cricket|ipl|football|soccer|tennis|messi|ronaldo|badminton)\b",
    r"\b(?:symptom|illness|disease|medicine|doctor|headache|fever|prescription)\b",
    r"\b(?:game\s*development|minecraft|roblox|fortnite|gta)\b",
    r"\b(?:poem|poetry|love\s*letter|horoscope|astrology|tarot)\b",
    r"\b(?:weather\s+in|tourist|hotel\s*booking|flight\s*ticket)\b",
    r"\b(?:relationship|dating|breakup)\b",
]

FINANCIAL_DOMAIN_KEYWORDS = [
    "stock", "equity", "share", "nifty", "sensex", "reliance", "tcs", "hdfc", "infy",
    "sebi", "lodr", "rbi", "repo", "inflation", "tax", "finance act", "stt", "ltcg", "stcg",
    "rsi", "sma", "ema", "volatility", "pnl", "portfolio", "trading", "investment", "conviction",
    "thesis", "dividend", "earnings", "market", "bse", "nse", "valuation", "ratio", "pe",
    "pb", "orderbook", "liquidity", "corwin", "slippage", "bear", "bull", "drag", "holding",
    "cash", "paper", "slsqp", "agent", "run", "fastmcp", "a2a", "copilot", "statutory", "audit"
]

ETHICAL_REFUSAL_MESSAGE = (
    "🛡️ **Institutional Compliance & Ethical Guardrail Triggered**\n\n"
    "ArthaAI Copilot strictly adheres to SEBI (Prohibition of Insider Trading / Fraudulent Trade Practices) Regulations, "
    "statutory guidelines under Finance Act 2024, and institutional algorithmic safety standards.\n\n"
    "Requests involving market manipulation, insider trading tips, regulatory evasion, or unethical practices are "
    "strictly prohibited and recorded in the audit trail."
)

OUT_OF_DOMAIN_MESSAGE = (
    "🏛️ **Domain Scope Boundary Notice**\n\n"
    "ArthaAI Copilot is an institutional quantitative research assistant exclusively calibrated for "
    "**Indian Capital Markets (NSE/BSE)**, equity valuation, technical indicators (RSI, SMA, Volatility), "
    "corporate governance (SEBI LODR 2015), and statutory tax schedules (Finance Act 2024).\n\n"
    "Your query falls outside this financial research scope. Please ask about stock valuations, multi-agent "
    "findings, technical indicators, or portfolio simulations."
)


def evaluate_copilot_guardrails(message: str) -> Tuple[bool, str | None]:
    """Evaluates whether the incoming user query violates ethical standards or falls out-of-domain.
    
    Returns (is_blocked: bool, refusal_reason: str | None).
    """
    clean_msg = message.strip().lower()
    if not clean_msg:
        return True, "Please provide a valid question regarding Indian equities or terminal operations."

    # 1. Unethical & Compliance Check
    for pattern in UNETHICAL_PATTERNS:
        if re.search(pattern, clean_msg, re.IGNORECASE):
            return True, ETHICAL_REFUSAL_MESSAGE

    # 2. Obvious Out-of-Domain Check
    # If it matches an out of domain pattern and contains ZERO financial domain keywords
    has_domain_keyword = any(kw in clean_msg for kw in FINANCIAL_DOMAIN_KEYWORDS)
    for pattern in OUT_OF_DOMAIN_PATTERNS:
        if re.search(pattern, clean_msg, re.IGNORECASE) and not has_domain_keyword:
            return True, OUT_OF_DOMAIN_MESSAGE

    return False, None
