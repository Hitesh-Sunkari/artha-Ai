"""Unit tests for centralized LLM adapter, quota handling, and cost controls."""

import asyncio
import pytest

from arthaai.core.config import LLMConfig
from arthaai.orchestration.llm_adapter import LLMAdapter, LLMResponse


def test_provider_status_masks_credentials():
    config = LLMConfig(
        openai_api_key="sk-test-secret-key-12345",
        gemini_api_key="ai-test-secret-key-67890",
    )
    adapter = LLMAdapter(config=config)
    status = adapter.get_provider_status()

    assert status["openai"]["configured"] is True
    assert status["openai"]["model"] == "gpt-4o-mini"
    assert status["gemini"]["configured"] is True
    assert "gemini" in status["gemini"]["model"]

    # Strict security assertion: Never expose secret keys in status
    status_str = str(status)
    assert "sk-test-secret" not in status_str
    assert "ai-test-secret" not in status_str


def test_token_cost_estimation():
    adapter = LLMAdapter()
    cost = adapter._estimate_cost("gpt-4o-mini", prompt_tokens=1000, completion_tokens=500)
    # 1000 tokens * $0.15/1M + 500 tokens * $0.60/1M = $0.00015 + $0.00030 = $0.00045
    assert 0.0004 <= cost <= 0.0005


def test_run_call_budget_enforcement():
    async def _test():
        config = LLMConfig(max_calls_per_run=2)
        adapter = LLMAdapter(config=config)
        run_id = "test-budget-run"

        # Simulate 2 calls
        adapter._run_call_counts[run_id] = 2

        # 3rd call should trigger budget guardrail
        res = await adapter.generate("Test prompt", run_id=run_id)
        assert res.status == "BUDGET_EXCEEDED"
        assert "limit" in res.error_message.lower()

    asyncio.run(_test())


def test_unconfigured_provider_safe_fallback():
    async def _test():
        config = LLMConfig(openai_api_key=None, gemini_api_key=None)
        adapter = LLMAdapter(config=config)
        res = await adapter.generate("Test prompt", preferred_provider="gemini")
        assert res.status == "FALLBACK"
        assert "not configured" in res.error_message.lower()

    asyncio.run(_test())
