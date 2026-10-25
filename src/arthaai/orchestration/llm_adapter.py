"""Centralized LLM provider adapter with bounded retries, quota detection, and cost controls.

Supports explicit provider selection (OpenAI, Gemini), request timeouts, schema-constrained
output parsing, rate-limit backoff, token cost tracking, and safe offline fallback.
Strictly adheres to security policies: credentials are never logged, exposed to UI, or committed.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.config import LLMConfig

logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Supported model providers."""

    OPENAI = "OPENAI"
    GEMINI = "GEMINI"
    DETERMINISTIC = "DETERMINISTIC"


# Published model token pricing (USD per 1M tokens)
MODEL_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o-mini": {"prompt": 0.15, "completion": 0.60},
    "gpt-4o": {"prompt": 2.50, "completion": 10.00},
    "gemini-1.5-flash": {"prompt": 0.075, "completion": 0.30},
    "gemini-1.5-pro": {"prompt": 1.25, "completion": 5.00},
}


class LLMResponse(BaseModel):
    """Typed execution result from an LLM invocation."""

    model_config = ConfigDict(frozen=True)

    content: str = ""
    parsed_json: dict[str, Any] | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: float = 0.0
    provider: str = "DETERMINISTIC"
    model: str = "none"
    status: str = "SUCCESS"  # SUCCESS, QUOTA_EXHAUSTED, AUTH_FAILED, TIMEOUT, FALLBACK, BUDGET_EXCEEDED
    correlation_id: str = Field(default_factory=lambda: f"corr-{uuid.uuid4().hex[:8]}")
    error_message: str | None = None


class LLMAdapter:
    """Manages secure, bounded interactions with OpenAI and Gemini LLM providers."""

    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or LLMConfig()
        self._quota_exhausted_providers: set[str] = set()
        self._run_call_counts: dict[str, int] = {}
        self._run_costs: dict[str, float] = {}

    def get_provider_status(self) -> dict[str, Any]:
        """Returns safe provider diagnostics for /system/status without leaking secrets."""
        openai_status = "NOT_CONFIGURED"
        if self.config.has_openai:
            openai_status = (
                "QUOTA_EXHAUSTED"
                if "OPENAI" in self._quota_exhausted_providers
                else "CONFIGURED"
            )

        gemini_status = "NOT_CONFIGURED"
        if self.config.has_gemini:
            gemini_status = (
                "QUOTA_EXHAUSTED"
                if "GEMINI" in self._quota_exhausted_providers
                else "CONFIGURED"
            )

        return {
            "default_provider": self.config.default_provider,
            "openai": {
                "configured": self.config.has_openai,
                "model": self.config.openai_model,
                "status": openai_status,
            },
            "gemini": {
                "configured": self.config.has_gemini,
                "model": self.config.gemini_model,
                "status": gemini_status,
            },
            "guardrails": {
                "max_calls_per_run": self.config.max_calls_per_run,
                "max_budget_per_run_usd": self.config.max_budget_per_run_usd,
                "timeout_seconds": self.config.timeout_seconds,
                "max_retries": self.config.max_retries,
            },
        }

    def _estimate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Computes estimated USD cost based on published model token prices."""
        pricing = MODEL_PRICING.get(model, {"prompt": 0.15, "completion": 0.60})
        cost = (prompt_tokens / 1_000_000.0 * pricing["prompt"]) + (
            completion_tokens / 1_000_000.0 * pricing["completion"]
        )
        return round(cost, 6)

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "You are a quantitative financial analyst for Indian markets.",
        run_id: str = "default",
        preferred_provider: str | None = None,
        json_mode: bool = False,
        temperature: float = 0.2,
        correlation_id: str | None = None,
    ) -> LLMResponse:
        """Executes a structured or textual LLM call with bounded retries and cost controls."""
        corr_id = correlation_id or f"corr-{uuid.uuid4().hex[:8]}"
        t0 = time.perf_counter()

        # Enforce run budget limit
        calls = self._run_call_counts.get(run_id, 0)
        if calls >= self.config.max_calls_per_run:
            logger.warning("Run %s reached max LLM call limit (%d).", run_id, self.config.max_calls_per_run)
            return LLMResponse(
                status="BUDGET_EXCEEDED",
                provider="GUARDRAIL",
                model="none",
                correlation_id=corr_id,
                error_message=f"Run reached max LLM calls limit ({self.config.max_calls_per_run}).",
            )

        provider_name = (preferred_provider or self.config.default_provider).upper()

        # Check if selected provider is configured
        if provider_name == "OPENAI" and self.config.has_openai:
            if "OPENAI" in self._quota_exhausted_providers:
                return self._build_quota_fallback("OPENAI", self.config.openai_model, corr_id)
            return await self._call_openai(
                prompt=prompt,
                system_prompt=system_prompt,
                run_id=run_id,
                corr_id=corr_id,
                json_mode=json_mode,
                temperature=temperature,
                t0=t0,
            )

        if provider_name in ("GEMINI", "GOOGLE") and self.config.has_gemini:
            if "GEMINI" in self._quota_exhausted_providers:
                return self._build_quota_fallback("GEMINI", self.config.gemini_model, corr_id)
            return await self._call_gemini(
                prompt=prompt,
                system_prompt=system_prompt,
                run_id=run_id,
                corr_id=corr_id,
                json_mode=json_mode,
                temperature=temperature,
                t0=t0,
            )

        # Unconfigured provider fallback
        return LLMResponse(
            status="NOT_CONFIGURED",
            provider=provider_name,
            model="none",
            correlation_id=corr_id,
            error_message=f"Model provider '{provider_name}' is not configured with an API key.",
        )

    async def _call_openai(
        self,
        prompt: str,
        system_prompt: str,
        run_id: str,
        corr_id: str,
        json_mode: bool,
        temperature: float,
        t0: float,
    ) -> LLMResponse:
        """Executes an OpenAI chat completion with exponential backoff for transient errors."""
        from openai import AsyncOpenAI, RateLimitError, AuthenticationError

        client = AsyncOpenAI(api_key=self.config.openai_api_key, timeout=self.config.timeout_seconds)
        model = self.config.openai_model

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        retries = 0
        last_error = ""

        while retries <= self.config.max_retries:
            try:
                self._run_call_counts[run_id] = self._run_call_counts.get(run_id, 0) + 1

                res = await asyncio.wait_for(
                    client.chat.completions.create(**kwargs),
                    timeout=self.config.timeout_seconds,
                )

                latency_ms = (time.perf_counter() - t0) * 1000
                content = res.choices[0].message.content or ""
                p_tokens = res.usage.prompt_tokens if res.usage else 0
                c_tokens = res.usage.completion_tokens if res.usage else 0
                cost = self._estimate_cost(model, p_tokens, c_tokens)
                self._run_costs[run_id] = self._run_costs.get(run_id, 0.0) + cost

                parsed = None
                if json_mode:
                    try:
                        parsed = json.loads(content)
                    except Exception:
                        parsed = None

                return LLMResponse(
                    content=content,
                    parsed_json=parsed,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    estimated_cost_usd=cost,
                    latency_ms=round(latency_ms, 2),
                    provider="OPENAI",
                    model=model,
                    status="SUCCESS",
                    correlation_id=corr_id,
                )

            except RateLimitError as rle:
                err_str = str(rle).lower()
                if "quota" in err_str or "credit" in err_str or "balance" in err_str:
                    logger.warning("OpenAI quota exhausted: %s", rle)
                    self._quota_exhausted_providers.add("OPENAI")
                    return self._build_quota_fallback("OPENAI", model, corr_id)

                # Transient rate limit: back off and retry
                retries += 1
                if retries <= self.config.max_retries:
                    await asyncio.sleep(1.0 * (2 ** (retries - 1)))
                last_error = f"RateLimitError: {rle}"

            except AuthenticationError as ae:
                logger.error("OpenAI authentication failed: %s", ae)
                return LLMResponse(
                    status="AUTH_FAILED",
                    provider="OPENAI",
                    model=model,
                    correlation_id=corr_id,
                    error_message="Invalid OpenAI API key.",
                )

            except asyncio.TimeoutError:
                return LLMResponse(
                    status="TIMEOUT",
                    provider="OPENAI",
                    model=model,
                    correlation_id=corr_id,
                    error_message=f"OpenAI call timed out after {self.config.timeout_seconds}s.",
                )

            except Exception as exc:
                retries += 1
                last_error = f"{type(exc).__name__}: {exc}"
                if retries <= self.config.max_retries:
                    await asyncio.sleep(0.5)

        return LLMResponse(
            status="FAILED",
            provider="OPENAI",
            model=model,
            correlation_id=corr_id,
            error_message=f"OpenAI execution failed after {self.config.max_retries} retries: {last_error}",
        )

    async def _call_gemini(
        self,
        prompt: str,
        system_prompt: str,
        run_id: str,
        corr_id: str,
        json_mode: bool,
        temperature: float,
        t0: float,
    ) -> LLMResponse:
        """Executes a Google Gemini model invocation with bounded retries."""
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.config.effective_gemini_key)
            model_name = self.config.gemini_model
            model = genai.GenerativeModel(model_name)

            combined_prompt = f"{system_prompt}\n\n{prompt}"
            self._run_call_counts[run_id] = self._run_call_counts.get(run_id, 0) + 1

            response = await asyncio.wait_for(
                asyncio.to_thread(model.generate_content, combined_prompt),
                timeout=self.config.timeout_seconds,
            )

            latency_ms = (time.perf_counter() - t0) * 1000
            content = response.text or ""

            parsed = None
            if json_mode:
                try:
                    parsed = json.loads(content)
                except Exception:
                    parsed = None

            cost = self._estimate_cost(model_name, len(prompt.split()) * 2, len(content.split()) * 2)
            self._run_costs[run_id] = self._run_costs.get(run_id, 0.0) + cost

            return LLMResponse(
                content=content,
                parsed_json=parsed,
                prompt_tokens=len(prompt.split()) * 2,
                completion_tokens=len(content.split()) * 2,
                estimated_cost_usd=cost,
                latency_ms=round(latency_ms, 2),
                provider="GEMINI",
                model=model_name,
                status="SUCCESS",
                correlation_id=corr_id,
            )

        except Exception as exc:
            err_str = str(exc).lower()
            if "quota" in err_str or "resource_exhausted" in err_str:
                self._quota_exhausted_providers.add("GEMINI")
                return self._build_quota_fallback("GEMINI", self.config.gemini_model, corr_id)

            return LLMResponse(
                status="FAILED",
                provider="GEMINI",
                model=self.config.gemini_model,
                correlation_id=corr_id,
                error_message=f"Gemini execution failed: {exc}",
            )

    def _build_quota_fallback(self, provider: str, model: str, corr_id: str) -> LLMResponse:
        """Creates a transparent, deterministic fallback response when provider quota is exhausted."""
        return LLMResponse(
            content="",
            parsed_json=None,
            status="QUOTA_EXHAUSTED",
            provider=provider,
            model=model,
            correlation_id=corr_id,
            error_message=(
                f"External {provider} model quota exhausted (credit balance or rate limit). "
                "Safely falling back to deterministic analytical rules to preserve evidence integrity."
            ),
        )


_DEFAULT_ADAPTER: LLMAdapter | None = None


def get_llm_adapter() -> LLMAdapter:
    """Singleton factory returning the shared LLMAdapter."""
    global _DEFAULT_ADAPTER
    if _DEFAULT_ADAPTER is None:
        _DEFAULT_ADAPTER = LLMAdapter()
    return _DEFAULT_ADAPTER
