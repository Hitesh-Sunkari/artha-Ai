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
        assert len(contribution.evidence_citations) > 0
        assert len(contribution.warnings) > 0

    asyncio.run(_test())
