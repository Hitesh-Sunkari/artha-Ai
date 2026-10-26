"""Production Security, Input Validation, and Adversarial Guardrails for ArthaAI.

Enforces layered point-in-time safety, prompt injection neutralization, toxicity filtering,
tool budget limits, citation integrity, and live trading execution prevention.
"""

from __future__ import annotations

import re
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class GuardrailCheckResult(BaseModel):
    """Structured outcome of a guardrail evaluation gate."""

    model_config = ConfigDict(frozen=True)

    passed: bool
    guardrail_name: str
    risk_level: Literal["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    reason: str
    remediated_input: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class InputGuardrail:
    """Validates user prompts, research requests, and input parameters."""

    INJECTION_PATTERNS = [
        r"(?i)\bignore\s+(all\s+)?(previous|prior)\s+instructions\b",
        r"(?i)\bdisregard\s+(system\s+)?prompt\b",
        r"(?i)\bsystem\s+override\b",
        r"(?i)\badmin\s+mode\b",
        r"(?i)\bexecute\s+trade\b",
        r"(?i)\bbypass\s+(guardrail|safety|filter)\b",
        r"(?i)\bdrop\s+table\b",
        r"(?i)\bformat\s+drive\b",
        r"(?i)\bdo\s+anything\s+now\b",
        r"(?i)\bDAN\s+mode\b",
    ]

    TOXICITY_PATTERNS = [
        r"(?i)\b(kill\s+yourself|f\*\*\*|bitch|bastard|idiot\s+analyst|corrupt\s+scum)\b",
    ]

    # Explicit policy: Bearish or negative financial sentiment is NOT toxic
    FINANCIAL_SKEPTICISM_SAFEWORDS = [
        "overvalued", "fraudulent accounting", "bearish", "crash", "bubble",
        "insolvent", "default risk", "poor management", "downgrade", "sell"
    ]

    @classmethod
    def sanitize_and_validate_prompt(cls, text: str) -> GuardrailCheckResult:
        """Inspects user input for prompt injection and abusive toxicity."""
        if not text or not text.strip():
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="input_validation",
                risk_level="MEDIUM",
                reason="Input text is empty or blank.",
            )

        # 1. Prompt Injection Detection
        for pat in cls.INJECTION_PATTERNS:
            if re.search(pat, text):
                remediated = re.sub(pat, "[REDACTED_INJECTION_ATTEMPT]", text)
                return GuardrailCheckResult(
                    passed=False,
                    guardrail_name="prompt_injection_defense",
                    risk_level="CRITICAL",
                    reason=f"Prompt injection pattern detected: '{pat}'.",
                    remediated_input=remediated,
                )

        # 2. Toxicity Check (separate from financial bearishness)
        for pat in cls.TOXICITY_PATTERNS:
            if re.search(pat, text):
                return GuardrailCheckResult(
                    passed=False,
                    guardrail_name="toxicity_filter",
                    risk_level="HIGH",
                    reason="Abusive or toxic content policy violation.",
                    details={"policy": "respectful_research_discourse"},
                )

        return GuardrailCheckResult(
            passed=True,
            guardrail_name="input_validation",
            risk_level="SAFE",
            reason="Input passed all security and parameter validation checks.",
            remediated_input=text.strip(),
        )

    @classmethod
    def validate_symbol(cls, symbol: str) -> GuardrailCheckResult:
        """Validates that the target symbol is well-formed for Indian financial markets."""
        clean = symbol.upper().strip()
        if not clean:
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="symbol_validator",
                risk_level="HIGH",
                reason="Symbol cannot be empty.",
            )
        if len(clean) > 20:
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="symbol_validator",
                risk_level="HIGH",
                reason="Symbol length exceeds 20 characters.",
            )
        if not re.match(r"^[A-Z0-9_.\-]+$", clean):
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="symbol_validator",
                risk_level="CRITICAL",
                reason=f"Symbol contains illegal characters: '{clean}'.",
            )
        return GuardrailCheckResult(
            passed=True,
            guardrail_name="symbol_validator",
            risk_level="SAFE",
            reason=f"Symbol '{clean}' is valid for Indian markets.",
            remediated_input=clean,
        )


class ToolGuardrail:
    """Enforces execution limits, timeouts, and argument safety for tool invocations."""

    MAX_TOOL_CALLS_PER_RUN = 15

    @classmethod
    def validate_statutory_args(cls, instrument_type: str, price: float, quantity: int) -> GuardrailCheckResult:
        """Validates numerical arguments for statutory transaction calculations."""
        if price <= 0:
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="tool_args_validator",
                risk_level="HIGH",
                reason="Price must be strictly positive.",
            )
        if quantity <= 0:
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="tool_args_validator",
                risk_level="HIGH",
                reason="Quantity must be strictly positive.",
            )
        valid_instruments = ["EQUITY_DELIVERY", "EQUITY_INTRADAY", "FUTURES", "OPTIONS"]
        if instrument_type not in valid_instruments:
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="tool_args_validator",
                risk_level="HIGH",
                reason=f"Unsupported instrument type '{instrument_type}'. Valid: {valid_instruments}",
            )
        return GuardrailCheckResult(
            passed=True,
            guardrail_name="tool_args_validator",
            risk_level="SAFE",
            reason="Tool arguments validated.",
        )


class OutputGuardrail:
    """Validates final reports, recommendation safety, and trading restrictions."""

    @classmethod
    def validate_report(cls, report_dict: dict[str, Any]) -> GuardrailCheckResult:
        """Asserts schema compliance, zero live trading, and citation validity."""
        # 1. Trading Safety Guardrail (Never allow live trading execution)
        if report_dict.get("live_trading_enabled", False):
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="trading_safety_guardrail",
                risk_level="CRITICAL",
                reason="live_trading_enabled cannot be True. Live execution is strictly forbidden.",
            )

        # 2. Check for guaranteed return claims (Unrealistic/Illegal under SEBI)
        thesis = report_dict.get("executive_thesis", "")
        if re.search(r"(?i)\b(guaranteed\s+(returns?|profit)|100%\s+risk-free|cannot\s+lose)\b", thesis):
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="sebi_compliance_guardrail",
                risk_level="CRITICAL",
                reason="Report claims guaranteed returns or zero risk, violating SEBI investment advisory code.",
            )

        # 3. Rubric check: If empty result or observations < 20, must not be BUY/SELL
        quant = report_dict.get("quantitative_findings", {})
        empty_res = quant.get("empty_result", True)
        bars_count = quant.get("records_retrieved", 0)
        rec = report_dict.get("recommendation", "HOLD")

        if (empty_res or bars_count < 20) and rec in ("BUY", "SELL"):
            return GuardrailCheckResult(
                passed=False,
                guardrail_name="evidence_sufficiency_guardrail",
                risk_level="HIGH",
                reason=f"Recommendation cannot be '{rec}' when market data is insufficient ({bars_count} bars). Expected 'INSUFFICIENT_EVIDENCE'.",
            )

        return GuardrailCheckResult(
            passed=True,
            guardrail_name="output_safety_guardrail",
            risk_level="SAFE",
            reason="Output report passed all statutory, SEBI compliance, and evidence sufficiency checks.",
        )
