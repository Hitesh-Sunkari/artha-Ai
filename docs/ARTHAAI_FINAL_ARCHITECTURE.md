# ArthaAI — Complete Architectural Blueprint & Data Pipeline
**Specification Version:** 1.0.0-Release Candidate  
**Status:** Architectural Blueprint (Pre-Implementation)  

---

## 1. End-to-End Pipeline Overview

```
[ 1. DATA ]
     │
     ▼ (Contract: MarketTick / BarStream)
[ 2. MARKET STATE ]
     │
     ▼ (Contract: MarketSnapshot / L2Ladder)
[ 3. QUANT ]
     │
     ▼ (Contract: QuantFeatureVector / RegimeClassification)
[ 4. ORDER FLOW ]
     │
     ▼ (Contract: OrderFlowMetrics / OFISignal)
[ 5. OPTIONS ]
     │
     ▼ (Contract: OptionChainSurface / MaxPainGreekReport)
[ 6. NEWS ]
     │
     ▼ (Contract: NewsItem / SentimentScore)
[ 7. RAG ]
     │
     ▼ (Contract: SynthesizedContextDocument)
[ 8. MULTI-AGENT ]
     │
     ▼ (Contract: AgentDebateConsensus)
[ 9. STRATEGY ]
     │
     ▼ (Contract: List[Insight])
[ 10. RISK ]
     │
     ▼ (Contract: VettedInsightStream / RiskApprovalToken)
[ 11. PORTFOLIO ]
     │
     ▼ (Contract: List[PortfolioTarget])
[ 12. EXECUTION ]
     │
     ▼ (Contract: List[OrderRequest] -> List[OrderFill])
[ 13. BACKTEST / PAPER ]
     │
     ▼ (Contract: ExecutionLog / FillLedger)
[ 14. EVALUATION ]
     │
     ▼ (Contract: PerformanceTearsheet / RiskAdjustedMetrics)
[ 15. EVOLUTION ]
     │
     ▼ (Contract: SynthesizedSkill / ParameterMutation)
[ 16. TRADINGVIEW / DASHBOARD ]
```

---

## 2. Interface and Data Contract for Every Pipeline Arrow

### Arrow 1: DATA → MARKET STATE
- **Source Interface:** `MarketDataProvider`
- **Target Consumer:** `MarketStateManager`
- **Data Contract:** `MarketTick` / `BarStream`
- **Contract Schema:**
  ```python
  class MarketTick(BaseModel):
      symbol: str
      exchange: str                    # NSE, BSE, NFO
      timestamp_ns: int                # Unix nanoseconds (from NautilusTrader pattern)
      last_price: float
      last_quantity: int
      total_volume: int
      open_interest: Optional[int] = None
      bid_price: float
      bid_qty: int
      ask_price: float
      ask_qty: int
  ```
- **Description:** Real-time raw feeds from broker WebSockets or Parquet files are ingested, sanitized, validated for non-zero timestamps and monotonicity, and passed to update current market state.

---

### Arrow 2: MARKET STATE → QUANT
- **Source Interface:** `MarketStateManager`
- **Target Consumer:** `FeatureEngine`
- **Data Contract:** `MarketSnapshot`
- **Contract Schema:**
  ```python
  class MarketSnapshot(BaseModel):
      symbol: str
      timestamp: datetime
      open: float
      high: float
      low: float
      close: float
      volume: int
      vwap: float
      rolling_bars: pl.DataFrame       # Last N bars in Polars format
  ```
- **Description:** Aggregated L1 price, OHLCV bars, and volume profiles are forwarded to the quantitative feature calculator.

---

### Arrow 3: QUANT → ORDER FLOW
- **Source Interface:** `FeatureEngine`
- **Target Consumer:** `OrderFlowEngine`
- **Data Contract:** `QuantFeatureVector`
- **Contract Schema:**
  ```python
  class QuantFeatureVector(BaseModel):
      symbol: str
      timestamp: datetime
      ema_fast: float
      ema_slow: float
      rsi_14: float
      atr_14: float
      supertrend_direction: int        # +1 (Bullish), -1 (Bearish)
      bollinger_bandwidth: float
      regime: str                      # "TRENDING_BULL", "MEAN_REVERTING", "HIGH_VOL"
  ```
- **Description:** Trend, volatility, and mean-reversion features calculated via SIMD-accelerated Polars expressions provide baseline market context for order book analysis.

---

### Arrow 4: ORDER FLOW → OPTIONS
- **Source Interface:** `OrderFlowEngine`
- **Target Consumer:** `OptionsEngine`
- **Data Contract:** `OrderFlowMetrics`
- **Contract Schema:**
  ```python
  class OrderFlowMetrics(BaseModel):
      symbol: str
      timestamp: datetime
      order_flow_imbalance_ofi: float  # Normalized [-1.0, +1.0]
      bid_ask_spread: float
      depth_ratio: float               # Top 5 bids total / Top 5 asks total
      institutional_block_detected: bool
      large_trades: List[Dict[str, Any]]
  ```
- **Description:** Level 2 / Level 3 depth metrics and institutional prints inform derivatives positioning.

---

### Arrow 5: OPTIONS → NEWS
- **Source Interface:** `OptionsEngine`
- **Target Consumer:** `NewsProvider`
- **Data Contract:** `OptionChainSurface`
- **Contract Schema:**
  ```python
  class OptionChainSurface(BaseModel):
      underlying_symbol: str
      spot_price: float
      atm_iv: float
      skew_25d: float                  # 25-delta Put IV - 25-delta Call IV
      pcr_volume: float                # Put-Call Ratio by volume
      pcr_oi: float                    # Put-Call Ratio by Open Interest
      max_pain_strike: float
      gamma_flip_level: float          # Strike where market maker gamma turns negative
  ```
- **Description:** Options positioning and dealer hedging vulnerabilities are paired with unstructured news scanning.

---

### Arrow 6: NEWS → RAG
- **Source Interface:** `NewsProvider`
- **Target Consumer:** `RAGEngine`
- **Data Contract:** `RawNewsFeed`
- **Contract Schema:**
  ```python
  class RawNewsFeed(BaseModel):
      article_id: str
      timestamp: datetime
      headline: str
      summary: str
      source: str                      # LiveMint, MoneyControl, RBI, SEBI
      related_symbols: List[str]
      sentiment_score: float           # -1.0 to +1.0
  ```
- **Description:** External live news events and regulatory releases are collected for contextual indexing.

---

### Arrow 7: RAG → MULTI-AGENT
- **Source Interface:** `RAGEngine`
- **Target Consumer:** `MultiAgentCoordinator`
- **Data Contract:** `SynthesizedContextDocument`
- **Contract Schema:**
  ```python
  class SynthesizedContextDocument(BaseModel):
      query_symbol: str
      retrieved_news: List[str]
      historical_analogs: List[str]    # Past market conditions with similar OFI/skew
      regulatory_constraints: List[str]# F&O ban list, circuit breaker limits, margin changes
      client_profile_rules: List[str]  # Max risk per trade, prohibited sectors
  ```
- **Description:** SQLite FTS5 full-text search synthesizes historical precedent, compliance restrictions, and verified facts into a compact prompt payload.

---

### Arrow 8: MULTI-AGENT → STRATEGY
- **Source Interface:** `MultiAgentCoordinator` (TradingAgents personas + LangGraph DAG + Paperclip governance)
- **Target Consumer:** `StrategyEngine`
- **Data Contract:** `AgentDebateConsensus`
- **Contract Schema:**
  ```python
  class AgentDebateConsensus(BaseModel):
      symbol: str
      bull_thesis: str
      bear_thesis: str
      risk_concerns: List[str]
      macro_score: float               # -1.0 to +1.0
      quant_score: float               # -1.0 to +1.0
      sentiment_score: float           # -1.0 to +1.0
      final_stance: str                # "STRONG_BUY", "LEAN_BUY", "HOLD", "LEAN_SELL", "STRONG_SELL"
      confidence: float                # 0.0 to 1.0
      token_burn: int                  # Tracked token spend for this debate
  ```
- **Description:** Structured consensus distilled from the multi-agent debate (Bull, Bear, Risk, Macro, Execution specialists) is passed to the strategy engine.

---

### Arrow 9: STRATEGY → RISK
- **Source Interface:** `StrategyEngine` (QC LEAN 5-stage Alpha step)
- **Target Consumer:** `RiskEngine`
- **Data Contract:** `List[Insight]`
- **Contract Schema:**
  ```python
  class Insight(BaseModel):
      insight_id: str
      symbol: str
      direction: InsightDirection      # BULLISH, BEARISH, NEUTRAL
      confidence: float                # 0.0 to 1.0
      expected_magnitude_pct: float
      horizon_seconds: int
      suggested_stop_loss: float
      source_strategy: str
  ```
- **Description:** Strategy emits standardized quantitative predictions (Insights).

---

### Arrow 10: RISK → PORTFOLIO
- **Source Interface:** `RiskEngine`
- **Target Consumer:** `PortfolioManager`
- **Data Contract:** `VettedInsightStream`
- **Contract Schema:**
  ```python
  class VettedInsightStream(BaseModel):
      approved_insights: List[Insight]
      rejected_insights: List[Tuple[Insight, str]] # Insight + Rejection Reason
      max_allowed_portfolio_leverage: float
      current_portfolio_var_95: float
      circuit_breaker_active: bool
  ```
- **Description:** Risk engine validates daily drawdown limits, maximum single-stock exposure, and SEBI margin requirements before passing approved signals to Portfolio Construction.

---

### Arrow 11: PORTFOLIO → EXECUTION
- **Source Interface:** `PortfolioManager`
- **Target Consumer:** `ExecutionEngine`
- **Data Contract:** `List[PortfolioTarget]`
- **Contract Schema:**
  ```python
  class PortfolioTarget(BaseModel):
      symbol: str
      target_weight: float             # e.g. +0.08 (8% long allocation)
      target_quantity: int             # Number of shares / lots
      order_urgency: str               # "IMMEDIATE_TAKER", "PASSIVE_MAKER", "TWAP_30MIN"
      max_slippage_pct: float
  ```
- **Description:** Portfolio optimization model (Black-Litterman / Equal Risk Contribution) determines exact position quantities and execution urgency.

---

### Arrow 12: EXECUTION → BACKTEST / PAPER
- **Source Interface:** `ExecutionEngine` (NautilusTrader LiveNode or Simulator)
- **Target Consumer:** `SimulationEnvironment` / `BrokerRouter`
- **Data Contract:** `OrderRequest` → `OrderFill`
- **Contract Schema:**
  ```python
  class OrderRequest(BaseModel):
      order_id: str
      symbol: str
      side: OrderSide
      order_type: OrderType
      quantity: int
      price: Optional[float]
      routing_venue: str               # "SIMULATOR", "ZERODHA_KITE", "ANGEL_SMARTAPI"

  class OrderFill(BaseModel):
      fill_id: str
      order_id: str
      symbol: str
      side: OrderSide
      fill_quantity: int
      fill_price: float
      brokerage_fee: float
      stt_tax: float
      exchange_turnover_fee: float
      timestamp: datetime
  ```
- **Description:** Orders are matched against the simulated L2/L3 order book in backtest mode or dispatched via secure broker API in live mode, generating granular fill ledgers.

---

### Arrow 13: BACKTEST / PAPER → EVALUATION
- **Source Interface:** `SimulationEnvironment`
- **Target Consumer:** `EvaluationEngine`
- **Data Contract:** `ExecutionLog`
- **Contract Schema:**
  ```python
  class ExecutionLog(BaseModel):
      strategy_id: str
      start_date: datetime
      end_date: datetime
      all_fills: List[OrderFill]
      equity_curve: pl.DataFrame       # Timestamp, PortfolioValue, Cash, UnrealizedPnL
      slippage_realized: float
  ```
- **Description:** Complete chronological trade history and equity timestamps are provided for statistical evaluation.

---

### Arrow 14: EVALUATION → EVOLUTION
- **Source Interface:** `EvaluationEngine`
- **Target Consumer:** `EvolutionEngine`
- **Data Contract:** `PerformanceTearsheet`
- **Contract Schema:**
  ```python
  class PerformanceTearsheet(BaseModel):
      sharpe_ratio: float
      sortino_ratio: float
      max_drawdown_pct: float
      calmar_ratio: float
      profit_factor: float
      win_rate: float
      total_trades: int
      cagr: float
      passes_hurdle_rate: bool         # E.g. Sharpe > 1.8 and Max DD < 12%
  ```
- **Description:** Quantitative performance scorecards evaluate whether an algorithm meets production standards or requires automated adaptation.

---

### Arrow 15: EVOLUTION → STRATEGY / KNOWLEDGE BASE
- **Source Interface:** `EvolutionEngine` (Hermes closed-loop skill distillation)
- **Target Consumer:** `StrategyRegistry` / `AgentPromptCatalog`
- **Data Contract:** `SynthesizedSkill`
- **Contract Schema:**
  ```python
  class SynthesizedSkill(BaseModel):
      skill_id: str
      source_task: str
      optimized_parameters: Dict[str, Any]
      reasoning_refinement: str
      generated_code_path: str         # `skills/auto_generated/nifty_expiry_straddle_v2.py`
      test_validation_passed: bool
  ```
- **Description:** If an algorithm or prompt strategy demonstrates superior edge, the evolution engine codifies its parameters and reasoning rules into permanent, version-controlled procedural skills.

---

### Arrow 16: PIPELINE → TRADINGVIEW / DASHBOARD
- **Source Interface:** `FastAPI Realtime Gateway` (Paperclip-adapted React UI + WebSockets)
- **Target Consumer:** `Frontend User Interface` / `TradingView Lightweight Charts`
- **Data Contract:** `WebSocketUIStream`
- **Contract Schema:**
  ```python
  class WebSocketUIStream(BaseModel):
      event_type: str                  # "TICK", "ORDER_UPDATE", "AGENT_DEBATE", "RISK_ALERT"
      timestamp: datetime
      payload: Dict[str, Any]
  ```
- **Description:** Live candlesticks, order book depth charts, agent debate transcripts, token burn monitors, and portfolio PnL are broadcast via WebSockets to the web dashboard.
