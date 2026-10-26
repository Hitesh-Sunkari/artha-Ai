# ArthaAI — FastMCP Tool Integration & Evidence

This document provides evidence of the official Model Context Protocol (FastMCP) server implementation, tool definitions, input/output schemas, and execution verification.

---

## 1. FastMCP Server Overview
- **Implementation**: `src/arthaai/mcp/server.py`
- **SDK**: Official `mcp` FastMCP Python SDK (`FastMCP("arthaai-research-tools")`)
- **Protocol Binding**: JSON-RPC 2.0 over standard I/O / in-process client bridge (`AsyncMCPClient`)
- **Safety Invariant**: Strict parameter validation, zero synthetic data fabrication, and honest fallback provenance disclosure.

---

## 2. Registered MCP Tools

### 2.1 `query_market_data`
Queries normalized historical OHLCV data for NSE/BSE securities using the `YahooFinancePipeline`.

- **Input Parameters**:
  - `symbol` (string, required): NSE/BSE ticker symbol (e.g. `RELIANCE`, `RELIANCE.NS`, `TCS.BO`).
  - `as_of_time` (string, optional): Point-in-time ISO timestamp. Strictly bounds historical data to eliminate lookahead bias.
  - `period_days` (integer, default=365): Number of lookback days.
- **Output Schema**:
  ```json
  {
    "symbol": "RELIANCE.NS",
    "data_mode": "HISTORICAL_CACHED",
    "as_of_time": "2026-10-26T12:00:00Z",
    "bars_count": 248,
    "latest_close": 1285.50,
    "annualized_return_pct": 14.2,
    "annualized_volatility_pct": 19.5,
    "max_drawdown_pct": -34.5,
    "rsi_14d": 54.2,
    "provenance_note": "Rate limit fallback to verified local Parquet store"
  }
  ```

### 2.2 `retrieve_regulatory_evidence`
Queries the persistent `ChromaRAGStore` for authoritative regulatory, statutory, and corporate disclosure documents.

- **Input Parameters**:
  - `query` (string, required): Semantic search query (e.g., `"SEBI LODR Regulation 30"`).
  - `symbol` (string, optional): Filter by associated corporate ticker.
  - `doc_type` (string, optional): Filter by category (`STATUTORY`, `POLICY`, `FILING`, `SURVEILLANCE`).
  - `limit` (integer, default=5): Maximum chunks to return.
- **Output Schema**:
  ```json
  {
    "query": "SEBI LODR Regulation 30",
    "matches_count": 3,
    "results": [
      {
        "doc_id": "SEBI-LODR-REG30-MATERIALITY",
        "title": "SEBI LODR Regulation 30: Disclosure of Material Events",
        "source_authority": "Securities and Exchange Board of India (SEBI)",
        "effective_date": "2015-12-01",
        "relevance_score": 0.2233,
        "citation_uri": "rag://regulatory/sebi_lodr#SEBI-LODR-REG30-MATERIALITY",
        "sanitized_snippet": "<UNTRUSTED_STATUTORY_DOCUMENT id=\"SEBI-LODR-REG30-MATERIALITY\"..."
      }
    ]
  }
  ```

### 2.3 `compute_statutory_costs`
Computes exact Indian statutory taxes and friction drag according to the Finance (No. 2) Act 2024.

- **Input Parameters**:
  - `trade_value_inr` (float, required): Total transaction value.
  - `holding_period_months` (integer, required): Investment holding duration.
  - `unrealized_gain_inr` (float, required): Capital gain amount.
- **Output Schema**:
  ```json
  {
    "trade_value_inr": 1000000.0,
    "stt_rate_pct": 0.10,
    "stt_amount_inr": 1000.0,
    "capital_gain_type": "LTCG",
    "tax_rate_pct": 12.5,
    "tax_amount_inr": 18750.0,
    "total_friction_inr": 19750.0,
    "friction_drag_pct": 0.1186,
    "statutory_act": "Finance (No. 2) Act 2024"
  }
  ```

### 2.4 `compute_quant_metrics`
Computes mathematical risk metrics: Value-at-Risk (VaR 95%, 99%), Conditional VaR (Expected Shortfall), Sharpe Ratio, Sortino Ratio, and Calmar Ratio.

---

## 3. Rate-Limit Resilience Evidence
When Yahoo Finance public rate limits trigger (`YFRateLimitError: Too Many Requests`), the FastMCP market data pipeline:
1. Catches the exception transparently without crashing.
2. Falls back to verified local Parquet bars in `data/parquet/ohlcv/{symbol}.parquet`.
3. Sets `data_mode = "HISTORICAL_CACHED"`.
4. Discloses honest data provenance in the tool result payload and Blackboard state.
