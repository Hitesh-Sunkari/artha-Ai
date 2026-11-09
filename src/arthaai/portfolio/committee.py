"""ArthaAI Investment Committee Deliberation Engine.

Simulates a formal institutional investment committee meeting featuring four distinct AI personas:
1. Chief Macro Strategist: Evaluates RBI monetary corridor, headline CPI inflation, sector transmission, and sovereign yields.
2. Quantitative Risk Officer: Scrutinizes VaR 99%, realized volatility, RSI bounds, liquidity tiers, and Amihud ratio.
3. Adversarial Skeptic: Aggressively stress-tests bullish assumptions, statutory fee drag, circuit filter boundaries, and earnings sustainability.
4. Chief Investment Officer (CIO): Synthesizes specialist arguments, adjudicates dissent, tallies binding votes, and issues official allocation verdict.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.orchestration.llm_adapter import get_llm_adapter
from arthaai.orchestration.a2a_bridge import clean_narrative_text


class CommitteeMemberStatement(BaseModel):
    """A statement or debate argument delivered by a committee persona."""

    model_config = ConfigDict(frozen=True)

    persona_id: str
    member_name: str
    role_title: str
    avatar_color: str
    framework: str
    stance: Literal["BULLISH", "CAUTIOUS", "NEUTRAL", "SKEPTICAL", "DECISIVE"]
    argument: str
    vote: Literal["APPROVE", "CONDITIONAL", "REJECT"]
    dissent_notes: str | None = None
    timestamp: str = Field(default_factory=lambda: now_utc().isoformat())


class CommitteeDeliberationResult(BaseModel):
    """The complete transcript, votes, and final verdict of an Investment Committee session."""

    model_config = ConfigDict(frozen=True)

    session_id: str
    target_subject: str  # Ticker symbol or Portfolio ID
    chairperson: str
    deliberation_timestamp: str
    transcript: list[CommitteeMemberStatement]
    votes_summary: dict[str, int]
    official_verdict: Literal["APPROVED", "CONDITIONALLY_APPROVED", "REJECTED"]
    consensus_rationale: str
    binding_constraints: list[str]


def _extract_vote(text: str, default_vote: Literal["APPROVE", "CONDITIONAL", "REJECT"]) -> tuple[Literal["APPROVE", "CONDITIONAL", "REJECT"], str]:
    """Extracts vote and cleans argument text."""
    vote = default_vote
    upper = text.upper()
    if "VOTE: REJECT" in upper or "VOTE:REJECT" in upper or "VERDICT: REJECT" in upper:
        vote = "REJECT"
    elif "VOTE: APPROVE" in upper or "VOTE:APPROVE" in upper or "VERDICT: APPROVE" in upper:
        vote = "APPROVE"
    elif "VOTE: CONDITIONAL" in upper or "VOTE:CONDITIONAL" in upper or "VERDICT: CONDITIONAL" in upper:
        vote = "CONDITIONAL"

    cleaned = re.sub(r"VOTE\s*:\s*(APPROVE|CONDITIONAL|REJECT)", "", text, flags=re.IGNORECASE)
    cleaned = clean_narrative_text(cleaned)
    return vote, cleaned


async def run_committee_deliberation(
    target_subject: str,
    context: dict[str, Any],
) -> CommitteeDeliberationResult:
    """Executes a multi-persona deliberation session using live LLM or institutional heuristic fallback."""
    adapter = get_llm_adapter()
    session_id = f"comm-{int(datetime.now().timestamp())}"
    now_str = now_utc().isoformat()

    # Extract symbol
    symbol = context.get("symbol") or context.get("target_subject") or target_subject
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "").strip()

    # Extract report fields if present
    rep = context.get("report") if isinstance(context.get("report"), dict) else {}
    quant_findings = rep.get("quantitative_findings", {})
    calc_metrics = quant_findings.get("calculated_metrics", {})

    rec = rep.get("recommendation") or context.get("recommendation", "HOLD")
    conviction = rep.get("conviction_score") or context.get("conviction_score", 60)
    target_price = rep.get("target_price") or context.get("target_price")
    stop_loss = rep.get("stop_loss_price") or context.get("stop_loss_price")
    statutory_drag = rep.get("statutory_friction_drag_pct") or context.get("statutory_drag", 0.1186)
    exec_thesis = rep.get("executive_thesis") or context.get("executive_thesis", "")

    # Resolve quantitative metrics: latest close, vol, rsi, adv
    latest_close = calc_metrics.get("latest_close") or quant_findings.get("latest_close") or context.get("latest_close")
    volatility = calc_metrics.get("realized_volatility_annualized") or quant_findings.get("realized_volatility_annualized") or context.get("volatility")
    rsi = calc_metrics.get("latest_rsi") or quant_findings.get("latest_rsi") or context.get("rsi")
    turnover_cr = context.get("average_daily_turnover_inr_cr") or 450.0

    # If missing from report or context, load authentic market data for the symbol
    if latest_close is None or volatility is None or rsi is None:
        try:
            from arthaai.data.yfinance_pipeline import YahooFinancePipeline
            bars = YahooFinancePipeline().load_historical_bars(symbol)
            if bars:
                latest_close = latest_close or float(bars[-1]["close"])
                if len(bars) >= 21 and volatility is None:
                    import numpy as np
                    rets = [(float(bars[i]["close"]) / float(bars[i-1]["close"]) - 1.0) for i in range(len(bars)-20, len(bars))]
                    volatility = float(np.std(rets) * np.sqrt(252.0))
                if len(bars) >= 15 and rsi is None:
                    diffs = [float(bars[i]["close"]) - float(bars[i-1]["close"]) for i in range(len(bars)-14, len(bars))]
                    gains = [d for d in diffs if d > 0]
                    losses = [-d for d in diffs if d < 0]
                    avg_gain = sum(gains) / 14.0 if gains else 0.0001
                    avg_loss = sum(losses) / 14.0 if losses else 0.0001
                    rs = avg_gain / avg_loss
                    rsi = 100.0 - (100.0 / (1.0 + rs))
        except Exception:
            pass

    latest_close = float(latest_close or 1450.0)
    volatility = float(volatility or 0.22)
    rsi = float(rsi or 52.0)

    # Macro & Sector data
    sector = "Diversified"
    try:
        from arthaai.data.universe.universe_config import get_universe_manager
        u_mgr = get_universe_manager()
        sec_entry = next((s for s in u_mgr._configured_securities if s.symbol.upper() == clean_sym), None)
        if sec_entry:
            sector = sec_entry.sector or "Diversified"
    except Exception:
        pass

    macro_regime = context.get("macro_regime", "RBI Repo Rate steady at 6.50% corridor; Neutral Stance; MoSPI Headline CPI 5.49% YoY; 10Y Yield 6.82%")

    # 1. Chief Macro Strategist (Dr. Sunita Ramanathan, Google ADK)
    macro_prompt = (
        f"You are Dr. Sunita Ramanathan, Chief Macro Strategist on the ArthaAI Investment Committee.\n"
        f"Deliberate on allocating capital to {clean_sym} (Sector: {sector}) under macroeconomic conditions:\n"
        f"• Monetary Regime: {macro_regime}\n"
        f"• Market Price: INR {latest_close:.2f} | Trailing ADV Turnover: INR {turnover_cr:.1f} Cr\n\n"
        f"INSTRUCTIONS: Output exactly 3 structured bullet points under 90 words:\n"
        f"• Policy Corridor & Liquidity Stance\n"
        f"• Sector Transmission & Sovereign Discount Rate Impact\n"
        f"• Conclude on the final line with either: VOTE: APPROVE, VOTE: CONDITIONAL, or VOTE: REJECT."
    )
    macro_resp = await adapter.generate(
        prompt=macro_prompt,
        system_prompt="You are an authoritative Chief Macro Strategist specializing in Indian RBI monetary frameworks, sovereign curves, and capital flows.",
        temperature=0.3,
    )
    if macro_resp.status == "SUCCESS" and macro_resp.content:
        macro_vote, macro_arg = _extract_vote(macro_resp.content, "APPROVE")
    else:
        macro_vote = "APPROVE" if "BANK" in sector.upper() or "TECH" in sector.upper() else "CONDITIONAL"
        macro_arg = (
            f"• Policy Corridor: RBI Monetary Policy Committee keeps repo rate steady at 6.50% with daily LAF operations maintaining orderly banking liquidity.\n"
            f"• Sector Transmission ({sector}): 10-Year sovereign bond yield benchmarked at 6.82% provides a predictable discount rate for valuation multiples.\n"
            f"• Macro Allocation Mandate: Benign monetary baseline supports equity accumulation, though headline CPI at 5.49% requires monitoring of margin pressure."
        )

    # 2. Quantitative Risk Officer (Marcus Vance, CFA, Google ADK)
    risk_prompt = (
        f"You are Marcus Vance, CFA, Quantitative Risk Officer on the ArthaAI Investment Committee.\n"
        f"Scrutinize {clean_sym} quantitative risk profile:\n"
        f"• Latest Close: INR {latest_close:.2f} | 14-Day RSI: {rsi:.1f} | Realized Annualized Volatility: {volatility*100:.1f}%\n"
        f"• Statutory Roundtrip Friction Drag: {statutory_drag:.4f}% | Recommendation: {rec} (Conviction: {conviction}/100)\n\n"
        f"INSTRUCTIONS: Output exactly 3 structured bullet points under 90 words:\n"
        f"• Volatility & Tail Risk Bounds (99% daily VaR)\n"
        f"• Liquidity & Quoted Spread Drag (Execution friction)\n"
        f"• Sizing Boundary & Conclude on the final line with either: VOTE: APPROVE, VOTE: CONDITIONAL, or VOTE: REJECT."
    )
    risk_resp = await adapter.generate(
        prompt=risk_prompt,
        system_prompt="You are an uncompromising Chief Risk Officer evaluating statistical tail risks, VaR thresholds, and friction bounds.",
        temperature=0.2,
    )
    if risk_resp.status == "SUCCESS" and risk_resp.content:
        risk_vote, risk_arg = _extract_vote(risk_resp.content, "CONDITIONAL")
    else:
        risk_vote = "APPROVE" if volatility < 0.20 and 40 <= rsi <= 65 else "CONDITIONAL"
        daily_var99 = round(2.326 * (volatility / 15.87) * 100, 2)
        risk_arg = (
            f"• Tail Risk: Realized annualized volatility of {volatility*100:.1f}% yields a 99% 1-day parametric VaR of {daily_var99}%, requiring strict adherence to stop-loss floors.\n"
            f"• Momentum & Frictions: 14-day RSI stands at {rsi:.1f}. Statutory delivery friction ({statutory_drag:.4f}% roundtrip) requires an expected return hurdle of at least 3.0x friction.\n"
            f"• Position Limits: Single-stock allocation must be strictly capped at 15.0% of portfolio NAV with automatic liquidation if trailing drawdown exceeds 7.5%."
        )

    # 3. Adversarial Skeptic & Red Team (Elena Rostova, CrewAI A2A)
    skeptic_prompt = (
        f"You are Elena Rostova, Adversarial Skeptic & Red Team Leader on the ArthaAI Investment Committee.\n"
        f"Stress-test and attack the investment case for {clean_sym}:\n"
        f"• Stance: {rec} (Conviction: {conviction}/100) | Volatility: {volatility*100:.1f}% | RSI: {rsi:.1f}\n"
        f"• Statutory Drag: {statutory_drag:.4f}% | Target Corridor: INR {target_price} | Stop Floor: INR {stop_loss}\n\n"
        f"INSTRUCTIONS: Output exactly 3 structured adversarial challenges under 90 words:\n"
        f"• Valuation Multiple Fragility & Earnings Overhang\n"
        f"• Statutory Turnover Erosion (Finance Act 2024 dragnet)\n"
        f"• Stress Scenario & Conclude on the final line with either: VOTE: APPROVE, VOTE: CONDITIONAL, or VOTE: REJECT."
    )
    skeptic_resp = await adapter.generate(
        prompt=skeptic_prompt,
        system_prompt="You are an adversarial financial analyst and red team lead dedicated to exposing flaws, liquidity traps, and false momentum.",
        temperature=0.3,
    )
    if skeptic_resp.status == "SUCCESS" and skeptic_resp.content:
        skeptic_vote, skeptic_arg = _extract_vote(skeptic_resp.content, "CONDITIONAL")
    else:
        skeptic_vote = "CONDITIONAL" if rec in ("BUY", "HOLD") else "REJECT"
        skeptic_arg = (
            f"• Valuation Vulnerability: Current price levels bake in sustained margin expansion, leaving zero margin of safety against potential quarterly earnings disappointments under SEBI LODR Reg 33.\n"
            f"• Statutory Friction Erosion: Roundtrip statutory tax drag ({statutory_drag:.4f}% STT + GST + Stamp Duty) will heavily penalize tactical rebalancing if market experiences choppy consolidation.\n"
            f"• Execution Guardrail: Immediate lump-sum deployment is rejected. Accumulation must proceed via 3-session tranche execution with trailing stop-loss enforcement."
        )

    # 4. Chief Investment Officer (Aravind Swaminathan, Google ADK)
    cio_prompt = (
        f"You are Aravind Swaminathan, Chief Investment Officer and Committee Chairperson.\n"
        f"Adjudicate the committee deliberation on {clean_sym}:\n"
        f"• Macro View ({macro_vote}): {macro_arg[:200]}\n"
        f"• Quant View ({risk_vote}): {risk_arg[:200]}\n"
        f"• Skeptic View ({skeptic_vote}): {skeptic_arg[:200]}\n\n"
        f"INSTRUCTIONS: Formulate final CIO synthesis in exactly 3 structured bullet points under 90 words:\n"
        f"• Specialist Synthesis & Portfolio Strategic Stance\n"
        f"• Capital Allocation Sizing Mandate\n"
        f"• Conclude on the final line with either: VOTE: APPROVE, VOTE: CONDITIONAL, or VOTE: REJECT."
    )
    cio_resp = await adapter.generate(
        prompt=cio_prompt,
        system_prompt="You are the Chief Investment Officer synthesizing institutional specialist debate and making the final binding capital allocation decision.",
        temperature=0.2,
    )
    if cio_resp.status == "SUCCESS" and cio_resp.content:
        cio_vote, cio_arg = _extract_vote(cio_resp.content, "APPROVE")
    else:
        cio_vote = "APPROVE" if (macro_vote != "REJECT" and risk_vote != "REJECT" and skeptic_vote != "REJECT") else "CONDITIONAL"
        cio_arg = (
            f"• Committee Consensus: Macro regime stability and quantitative indicator verification substantiate an institutional allocation, acknowledging the Skeptic's friction warnings.\n"
            f"• Strategic Mandate: Position authorized under strict conditional governance. Maximum single-asset allocation capped at 15.0% NAV to guarantee risk budget preservation.\n"
            f"• Execution Directive: Phased tranche deployment over 3 trading windows with stop-loss protection benchmarked at INR {stop_loss or (latest_close * 0.94):.2f}."
        )

    # Tally votes and determine final official verdict
    statements = [
        CommitteeMemberStatement(
            persona_id="macro_econometrician",
            member_name="Dr. Sunita Ramanathan",
            role_title="Chief Macro Strategist",
            avatar_color="#0F766E",
            framework="GOOGLE_ADK",
            stance="BULLISH" if macro_vote == "APPROVE" else "CAUTIOUS",
            argument=macro_arg.strip(),
            vote=macro_vote,
            dissent_notes="Monitor upcoming RBI MPC inflation trajectory and MoSPI releases.",
        ),
        CommitteeMemberStatement(
            persona_id="quant_risk_officer",
            member_name="Marcus Vance, CFA",
            role_title="Quantitative Risk Officer",
            avatar_color="#1E293B",
            framework="GOOGLE_ADK",
            stance="CAUTIOUS" if risk_vote == "CONDITIONAL" else ("BULLISH" if risk_vote == "APPROVE" else "SKEPTICAL"),
            argument=risk_arg.strip(),
            vote=risk_vote,
            dissent_notes=f"Mandatory 99% VaR trailing stop-loss floor benchmarked at INR {stop_loss or (latest_close * 0.94):.2f}.",
        ),
        CommitteeMemberStatement(
            persona_id="adversarial_skeptic",
            member_name="Elena Rostova",
            role_title="Adversarial Skeptic & Red Team",
            avatar_color="#DC2626",
            framework="CREWAI",
            stance="SKEPTICAL",
            argument=skeptic_arg.strip(),
            vote=skeptic_vote,
            dissent_notes=f"Finance Act 2024 statutory friction ({statutory_drag:.4f}%) requires phased order execution.",
        ),
        CommitteeMemberStatement(
            persona_id="chief_investment_officer",
            member_name="Aravind Swaminathan",
            role_title="Chief Investment Officer (CIO)",
            avatar_color="#6D0E5A",
            framework="GOOGLE_ADK",
            stance="DECISIVE",
            argument=cio_arg.strip(),
            vote=cio_vote,
            dissent_notes="Execution approved exclusively under tranche accumulation schedule with strict risk budget.",
        ),
    ]

    votes = {
        "APPROVE": sum(1 for s in statements if s.vote == "APPROVE"),
        "CONDITIONAL": sum(1 for s in statements if s.vote == "CONDITIONAL"),
        "REJECT": sum(1 for s in statements if s.vote == "REJECT"),
    }

    if votes["REJECT"] >= 2:
        official_verdict = "REJECTED"
        rationale = f"Committee rejected allocation for {clean_sym} due to prevailing quantitative risk bounds and adversarial challenge objections."
    elif votes["APPROVE"] >= 3 and votes["REJECT"] == 0:
        official_verdict = "APPROVED"
        rationale = f"Committee approved capital deployment for {clean_sym} based on unanimous macro alignment, robust quantitative metrics, and manageable fee drag."
    else:
        official_verdict = "CONDITIONALLY_APPROVED"
        rationale = f"Committee granted conditional approval for {clean_sym}: Macro baseline and quantitative setup support accumulation, subject to mandatory position caps and tranche execution."

    binding_constraints = [
        f"Maximum single-asset portfolio allocation capped at 15.0% NAV (Vol: {volatility*100:.1f}%)",
        f"Mandatory stop-loss execution floor active at INR {stop_loss or (latest_close * 0.94):.2f}",
        f"Tranche accumulation executed across 3 trading sessions to restrict ADV market impact",
        f"Statutory friction hurdle reserve of {statutory_drag*2:.2f}% retained under Finance Act 2024 schedules",
        f"Quarterly review audit trigger active upon SEBI LODR Reg 33 filing release",
    ]

    return CommitteeDeliberationResult(
        session_id=session_id,
        target_subject=symbol,
        chairperson="Aravind Swaminathan (CIO)",
        deliberation_timestamp=now_str,
        transcript=statements,
        votes_summary=votes,
        official_verdict=official_verdict,
        consensus_rationale=rationale,
        binding_constraints=binding_constraints,
    )
