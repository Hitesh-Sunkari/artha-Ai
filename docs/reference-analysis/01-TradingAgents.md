# TradingAgents — Forensic Analysis
**Source:** https://github.com/TauricResearch/TradingAgents  
**Version Studied:** v0.4.0 (depth-1 clone, Sep 2026)  
**License:** Apache 2.0  
**Language:** Python 3.10+  

---

## 1. What Problem Does It Solve?

TradingAgents is a **multi-agent LLM financial trading framework** that orchestrates a "virtual trading firm" — a pipeline of specialized AI agents that collaboratively research, debate, and decide on trades for a given ticker and date. It converts raw market data into a final structured investment decision (Buy / Overweight / Hold / Underweight / Sell) using an internally structured debate + risk review.

---

## 2. Architecture Overview

```
TradingAgentsGraph (entry point)
  ├── LLM Clients (deep_think + quick_think)
  │     ├── OpenAI / Anthropic / Google / Bedrock
  ├── ToolNodes (LangGraph ToolNode wrappers)
  │     ├── market: [get_stock_data, get_indicators, get_verified_market_snapshot]
  │     ├── social: [get_news]
  │     ├── news: [get_news, get_global_news, get_insider_transactions, get_macro_indicators, get_prediction_markets]
  │     └── fundamentals: [get_fundamentals, get_balance_sheet, get_cashflow, get_income_statement]
  ├── Graph (LangGraph StateGraph)
  │     ├── Analysts (parallel): market, sentiment, news, fundamentals
  │     ├── Research Manager (debate judge)
  │     ├── Investment Debate (bull vs bear, configurable rounds)
  │     ├── Trader (translates plan → transaction proposal)
  │     ├── Risk Management (aggressive/conservative/neutral + judge)
  │     └── Portfolio Manager (final structured output)
  ├── Memory (TradingMemoryLog)
  │     ├── Append-only markdown file
  │     ├── Stores decisions + deferred reflections
  │     └── Point-in-time filtering for backtesting
  ├── Reflector (post-decision lesson generation)
  ├── SignalProcessor (extracts rating from prose)
  └── Checkpointer (SQLite, per-ticker, crash recovery)
```

---

## 3. Source Tree

```
tradingagents/
  agents/
    analysts/
      market_analyst.py       — OHLCV + technical indicators
      sentiment_analyst.py    — Reddit / StockTwits / social
      news_analyst.py         — NewsAPI / Insider / Macro
      fundamentals_analyst.py — Balance sheet / income / cashflow
      social_media_analyst.py — thin wrapper
    managers/
      research_manager.py     — debate judge
    researchers/
      bull_researcher.py
      bear_researcher.py
    risk_mgmt/
      aggr_agent.py
      cons_agent.py
      neutral_agent.py
      risk_manager.py         — risk debate judge
    trader/
      trader.py               — transaction proposal
    utils/
      agent_states.py         — AgentState, InvestDebateState, RiskDebateState
      agent_utils.py          — tool implementations
      memory.py               — TradingMemoryLog
      schemas.py              — Pydantic models: PortfolioRating, TraderProposal, PortfolioDecision, SentimentReport
      rating.py               — parse_rating(), is_review()
      structured.py           — structured output helpers
  dataflows/
    interface.py              — vendor router (route_to_vendor)
    y_finance.py              — yfinance wrapper (19 KB, primary)
    alpha_vantage*.py         — alpha vantage wrappers
    fred.py                   — FRED macro data
    polymarket.py             — Polymarket prediction markets
    reddit.py                 — Reddit social data (15 KB)
    stockstats_utils.py       — Technical indicators
    symbol_utils.py           — normalize_symbol()
    errors.py                 — NoMarketDataError, VendorNotConfiguredError, VendorRateLimitError
  graph/
    trading_graph.py          — TradingAgentsGraph (621 lines, main orchestrator)
    setup.py                  — GraphSetup (StateGraph builder)
    conditional_logic.py      — debate round counting
    propagation.py            — Propagator (initial state + graph args)
    reflection.py             — Reflector (post-run lesson generation)
    signal_processing.py      — SignalProcessor
    checkpointer.py           — SQLite LangGraph checkpointer
  llm_clients/
    __init__.py               — create_llm_client() factory
  default_config.py           — DEFAULT_CONFIG dict, env var overrides
  reporting.py                — Markdown report tree writer
```

---

## 4. Core Abstractions

### AgentState (TypedDict + MessagesState)
```python
class AgentState(MessagesState):
    company_of_interest: str
    asset_type: str           # "stock" | "crypto"
    instrument_context: str   # resolved identity (anti-hallucination)
    trade_date: str
    sender: str
    market_report: str
    sentiment_report: str
    news_report: str
    fundamentals_report: str
    investment_debate_state: InvestDebateState
    investment_plan: str
    trader_investment_plan: str
    risk_debate_state: RiskDebateState
    final_trade_decision: str
    past_context: str         # memory injection
```

### Data Models (Pydantic)
- `PortfolioRating` — enum: Buy/Overweight/Hold/Underweight/Sell
- `TraderAction` — enum: Buy/Hold/Sell
- `ResearchPlan` — recommendation + rationale + strategic_actions
- `TraderProposal` — action + reasoning + entry_price + stop_loss + position_sizing
- `PortfolioDecision` — rating + executive_summary + investment_thesis + price_target + time_horizon
- `SentimentReport` — overall_band + overall_score + confidence + narrative

### Vendor Router
- Categories: core_stock_apis, technical_indicators, fundamental_data, news_data, macro_data, prediction_markets
- Ordered fallback chain: yfinance → alpha_vantage (or configured)
- Optional categories (macro, prediction) degrade gracefully
- Returns `NO_DATA_AVAILABLE` sentinel string (agent-safe)

### Memory System
- Append-only markdown file
- Format: `[date | ticker | rating | raw% | alpha% | Nd | resolved:date]`
- Phase A: store decision (pending)
- Phase B: update with returns + reflection (deferred until next same-ticker run)
- Point-in-time filtering: backtest can't learn from future outcomes
- Rotation: optional max entry cap

---

## 5. API Surface

**Public entry point:**
```python
graph = TradingAgentsGraph(
    selected_analysts=["market", "social", "news", "fundamentals"],
    config=DEFAULT_CONFIG
)
final_state, signal = graph.propagate("AAPL", "2024-01-15", asset_type="stock")
```

**Config keys (most important):**
- `llm_provider`, `deep_think_llm`, `quick_think_llm`
- `max_debate_rounds`, `max_risk_discuss_rounds`
- `data_vendors` (per-category vendor selection)
- `benchmark_map` — includes `.NS` (Nifty 50) and `.BO` (Sensex) ✅ India-aware
- `memory_log_path`, `checkpoint_enabled`

---

## 6. Dependencies

| Package | Purpose |
|---------|---------|
| langgraph ≥ 0.4.8 | Graph orchestration (core dep) |
| langchain-core ≥ 0.3.81 | LLM abstraction |
| langchain-openai/anthropic/google-genai | Provider SDKs |
| yfinance ≥ 1.4.1 | Primary data vendor |
| stockstats ≥ 0.6.5 | Technical indicators |
| pandas ≥ 2.3.0 | Data manipulation |
| backtrader ≥ 1.9.78 | Listed but not used in core |
| pydantic | Schema validation |
| redis ≥ 6.2.0 | Listed (not yet integrated in studied version) |

---

## 7. Agent Architecture (Key Patterns)

### Debate Pattern
```
Research Analysts (parallel)
        ↓
  [market_report, sentiment_report, news_report, fundamentals_report]
        ↓
  InvestDebateState (bull vs bear, N rounds)
        ↓
  Research Manager (judge) → investment_plan
        ↓
  Trader → trader_investment_plan
        ↓
  RiskDebateState (aggressive / conservative / neutral, N rounds)
        ↓
  Portfolio Manager → final_trade_decision
```

### Tool Call Pattern
Each analyst node uses LangGraph `ToolNode`. The agent calls tools, receives results, then generates its report. Tools return structured strings (not dataframes) so LLM can read them.

### Checkpointing
- SQLite-backed LangGraph checkpointer
- Per `(ticker, date, graph-shape)` thread_id
- Resume on crash: `checkpoint_input()` returns None to resume

---

## 8. Data Providers

| Vendor | Data Type | API Key Required |
|--------|-----------|-----------------|
| yfinance | OHLCV, financials, news, insider | No |
| Alpha Vantage | OHLCV, indicators, fundamentals, news | Yes |
| FRED | Macro (Fed rates, CPI, GDP, unemployment) | Yes |
| Polymarket | Prediction markets | No |
| Reddit | r/WallStreetBets, r/stocks, r/investing | No |
| StockTwits | Social sentiment | No |

---

## 9. Testing

```
tests/
  unit/           — isolated, no external calls
  integration/    — requires API keys
  smoke/          — quick sanity checks
```
Uses pytest, markers for test category. 

---

## 10. Performance Characteristics

- **Latency per trade decision:** 60–300s (LLM-bound, configurable debate rounds)
- **Parallelism:** Analyst nodes run in parallel within LangGraph
- **Backtesting:** Serial (one date at a time), no vectorization
- **Memory:** Low (markdown file); SQLite for checkpointing
- **Scaling:** Not designed for high-throughput; research/signal generation tool

---

## 11. Observability

- `reporting.py`: markdown report tree per ticker/date
- JSON state logs per run
- LangGraph streaming for debug output
- Rich CLI output via `typer` + `rich`

---

## 12. Configuration

- Single `DEFAULT_CONFIG` dict
- `TRADINGAGENTS_*` env var overrides
- `.env` file support via `python-dotenv`
- Per-run config override via dict

---

## 13. What Should ArthaAI Reuse?

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Multi-agent debate pattern | INSPIRED | Core concept is excellent; reimplement with ArthaAI interfaces |
| AgentState TypedDict + MessagesState | ADAPTED | Extend for Indian market fields |
| Pydantic schemas (PortfolioRating, TraderProposal, PortfolioDecision) | ADAPTED | Add Indian instrument types |
| TradingMemoryLog (append-only + deferred reflection) | ADAPTED | Solid pattern; add vector retrieval |
| Vendor router (route_to_vendor) | INSPIRED | Reimplement with ArthaAI MarketDataProvider interface |
| Benchmark map (.NS, .BO) | DIRECT_USE | Already has NSE/BSE support |
| LangGraph as orchestration backbone | DIRECT_DEPENDENCY | MIT, mature, battle-tested |
| SentimentReport Pydantic model | ADAPTED | Extend for Indian sources (NSEIndia, MoneyControl) |
| Checkpointer pattern | INSPIRED | Use LangGraph native checkpointing |

## 14. What Should ArthaAI Avoid?

| Component | Reason |
|-----------|--------|
| yfinance as primary data | Unreliable for Indian data; NSE/BSE adapter needed |
| Flat markdown memory file | Doesn't scale; replace with vector + SQLite hybrid |
| No vectorized backtesting | Serial propagate() not suitable for strategy research |
| No streaming data | No tick-level or intraday capability |
| Redis listed but unused | Don't inherit dead code |
| backtrader dependency | Listed but unused; introduces weight |

## 15. What Dependencies Would It Introduce?

If used as pip dep: langgraph, langchain-*, pydantic, yfinance, pandas, stockstats, redis, backtrader.

**Risk:** langchain-* ecosystem changes frequently; pinned versions may conflict with ArthaAI's own LangChain usage.

## 16. License

Apache 2.0 — permissive. Can be used, modified, redistributed commercially. Must include license notice.

## 17. Maintenance Risks

- Actively maintained (v0.4.0, Sep 2026)
- Tied to langchain/langgraph ecosystem velocity
- yfinance is community-maintained, frequently breaks
- No formal SLA; research project, not production system
