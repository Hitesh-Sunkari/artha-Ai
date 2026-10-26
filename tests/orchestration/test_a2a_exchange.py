"""Tests for official A2A protocol exchange between ADK client and CrewAI specialist service."""

import pytest

from arthaai.orchestration.a2a_bridge import (
    A2AClientBridge,
    create_a2a_crewai_app,
)


import asyncio

def test_a2a_crewai_service_app_routes():
    app = create_a2a_crewai_app("crewai_adversarial_specialist")
    routes = [r.path for r in app.routes]
    assert "/rpc" in routes
    assert "/.well-known/agent-card.json" in routes
    assert app.state.agent_card.name == "crewai_adversarial_specialist"


def test_a2a_client_specialist_invocation():
    """Tests adversarial specialist invocation. Evidence-integrity: empty citations on zero data."""
    async def _test():
        app = create_a2a_crewai_app("crewai_adversarial_specialist")
        bridge = A2AClientBridge(app=app, base_url="http://testserver", rpc_url="http://testserver/rpc")

        contribution = await bridge.invoke_specialist(
            symbol="RELIANCE",
            run_id="run-test-a2a-001",
            instructions="Analyze volatility skew and liquidity traps",
        )

        assert contribution.framework == "CREWAI"
        assert contribution.status == "SUCCESS"
        assert contribution.task_name == "adversarial_critique"
        assert "RELIANCE" in contribution.findings.get("thesis_critique", "")
        # Evidence-integrity: on zero data, citations must be empty (not fabricated)
        assert contribution.evidence_citations == []
        assert len(contribution.warnings) > 0

    asyncio.run(_test())


def test_a2a_macro_specialist_invocation():
    async def _test():
        app = create_a2a_crewai_app("crewai_specialist_suite")
        bridge = A2AClientBridge(app=app, base_url="http://testserver", rpc_url="http://testserver/rpc")

        contribution = await bridge.invoke_specialist(
            symbol="TCS",
            run_id="run-test-a2a-macro",
            task_name="macro_analysis",
            instructions="Analyze interest rate sensitivity",
        )

        assert contribution.framework == "CREWAI"
        assert contribution.status == "SUCCESS"
        assert contribution.task_name == "news_macro_analysis"
        assert contribution.findings.get("source_status") in ("CONFIGURED", "NOT_CONFIGURED")
        assert "macro_regime" in contribution.findings

    asyncio.run(_test())


def test_a2a_corporate_filing_specialist_invocation():
    async def _test():
        app = create_a2a_crewai_app("crewai_specialist_suite")
        bridge = A2AClientBridge(app=app, base_url="http://testserver", rpc_url="http://testserver/rpc")

        contribution = await bridge.invoke_specialist(
            symbol="INFY",
            run_id="run-test-a2a-filing",
            task_name="filing_analysis",
            instructions="Inspect quarterly disclosures",
        )

        assert contribution.framework == "CREWAI"
        assert contribution.status == "SUCCESS"
        assert contribution.task_name == "corporate_filing_analysis"
        assert contribution.findings.get("source_status") in ("CONFIGURED", "NOT_CONFIGURED")

    asyncio.run(_test())


def test_a2a_communication_failure_handling():
    async def _test():
        # Point to invalid unroutable port
        bridge = A2AClientBridge(app=None, base_url="http://127.0.0.1:59999", rpc_url="http://127.0.0.1:59999/rpc")
        contribution = await bridge.invoke_specialist(
            symbol="INFY",
            run_id="run-test-a2a-fail",
            task_name="macro_analysis",
        )
        assert contribution.framework == "CREWAI"
        assert contribution.status == "FAILED"
        assert "error" in contribution.findings
        assert len(contribution.warnings) > 0

    asyncio.run(_test())

