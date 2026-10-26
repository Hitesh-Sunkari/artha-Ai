# ArthaAI — Master Requirements Traceability & Evidence Matrix

This matrix maps every architectural, technical, mathematical, and user interface requirement from the Master Implementation Prompt to active source files, REST endpoints, UI components, and verified test results.

---

## Traceability Matrix

| Requirement Area | Detailed Specification | Implementation File(s) | Endpoint / Component | Test & Evidence Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Agent Frameworks** | Google ADK and CrewAI together. No LangGraph or AutoGen. | `src/arthaai/orchestration/adk_coordinator.py`<br>`src/arthaai/orchestration/a2a_bridge.py` | `POST /research`<br>`POST /runs/{run_id}` | Tested in `verify_e2e_platform.py` [10/10]. A2A calls to CrewAI return 200 OK. |
| **Interoperability** | Official A2A Python SDK with Agent Cards and JSON-RPC. | `src/arthaai/orchestration/a2a_bridge.py` | `http://127.0.0.1:8001/rpc` | Agent cards verified; JSON-RPC task dispatches recorded in `a2a_communication_log.json`. |
| **Tool Calling** | Official FastMCP Python SDK (`mcp` library). | `src/arthaai/mcp/server.py` | `FastMCP("arthaai-research-tools")` | Tools: `query_market_data`, `retrieve_regulatory_evidence`, `compute_statutory_costs`. Documented in `mcp_evidence.md`. |
| **Shared State** | Typed, versioned Blackboard with monotonic versioning. | `src/arthaai/orchestration/blackboard.py` | `E:\ArthAI\data\blackboard\` | Tested with 24 monotonic versions in `blackboard_sample_state.json`. |
| **RAG Store** | Persistent ChromaDB vector database on local storage. | `src/arthaai/rag/chroma_store.py` | `GET /rag/manifest`<br>`POST /rag/search` | 13 chunks indexed across 10 authoritative sources. Tested in `verify_e2e_platform.py` [8/10]. |
| **Market Data** | Real Yahoo Finance data with local Parquet fallback caching. | `src/arthaai/data/yfinance_pipeline.py` | `data/parquet/ohlcv/` | Rate limit caught and gracefully handled with verified local Parquet bars. |
| **Safety Invariant** | Hardcoded `live_trading_enabled = False`. | `src/arthaai/core/config.py`<br>`src/arthaai/orchestration/blackboard.py` | `GET /ready` | Verified in `verify_e2e_platform.py` [2/10]: `live_trading_blocked: True`. |
| **Tax Compliance** | Finance Act 2024: 12.5% LTCG, 20% STCG, 0.1% STT. | `src/arthaai/mcp/server.py`<br>`src/arthaai/rag/chroma_store.py` | `StatCostBreakdown.tsx` | Tested in `verify_e2e_platform.py` [10/10]: statutory friction drag computed and displayed. |
| **Adversarial Guardrails** | Multi-tier input, tool, and output security guardrails. | `src/arthaai/orchestration/guardrails.py` | `InputGuardrail`<br>`ToolGuardrail`<br>`OutputGuardrail` | 14/14 unit tests passed in `tests/test_adversarial_guardrails.py`. Documented in `adversarial_test_report.md`. |
| **Portfolio Optimizer** | SLSQP solver with Ledoit-Wolf covariance shrinkage. | `src/arthaai/portfolio/optimizer.py`<br>`src/arthaai/portfolio/universe.py` | `POST /portfolio/optimize` | Generates 4 Pareto candidate portfolios with full suitability scores. Tested in `verify_e2e_platform.py` [4/10]. |
| **Simulation** | 5,000+ path Monte Carlo Geometric Brownian Motion. | `src/arthaai/portfolio/simulation.py` | `POST /portfolio/simulate` | Simulates wealth trajectories across P10, P50, and P90 percentiles. Tested in `verify_e2e_platform.py` [5/10]. |
| **Crisis Backtest** | Historical shock scenarios (2008 GFC, 2020 COVID, etc.). | `src/arthaai/portfolio/stress_test.py` | `POST /portfolio/stress-test` | 4 historical crises simulated with drawdown comparison vs Nifty 50. Tested in `verify_e2e_platform.py` [6/10]. |
| **Committee Chamber** | Multi-persona debate (Macro, Quant, Skeptic, CIO). | `src/arthaai/portfolio/committee.py` | `POST /committee/deliberate` | Multi-agent deliberation transcript and binding constraints generated. Tested in `verify_e2e_platform.py` [7/10]. |
| **Institutional UI** | 7-step portfolio workflow, deliberation room, explorer, copilot. | `frontend/src/pages/PortfolioPage.tsx`<br>`frontend/src/pages/CommitteePage.tsx`<br>`frontend/src/pages/EvidencePage.tsx`<br>`frontend/src/pages/TelemetryPage.tsx`<br>`frontend/src/components/CopilotDrawer.tsx` | React SPA (`npm run dev`) | Zero TypeScript errors (`npx tsc --noEmit` passed cleanly). Rich dark-mode financial terminal styling. |
| **Observability** | Multi-agent operational heatmap and token telemetry. | `src/arthaai/orchestration/observability.py` | `GET /runs/{run_id}/heatmap`<br>`GET /portfolio/telemetry` | Agent duration, retries, token consumption, and evidence completeness tracked. |
