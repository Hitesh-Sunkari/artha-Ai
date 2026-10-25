# ArthaAI — Core Engine Interfaces & Data Contracts
**Version:** 1.0.0-Draft  
**Language:** Python 3.11+ (Type-Annotated Pydantic v2 & Abstract Base Classes)  

---

## 1. Architectural Philosophy

ArthaAI enforces an **inversion-of-control interface layer**. All proprietary business logic, quantitative models, and multi-agent systems interact exclusively through these stable, abstract interfaces. No external library (e.g. NautilusTrader, LangGraph, KiteConnect) is ever referenced directly within the strategy or risk logic.

---

## 2. Core Abstract Interfaces

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, AsyncGenerator, Union
from datetime import datetime, date
from pydantic import BaseModel, Field
from enum import Enum
import polars as pl

# ==========================================
# 1. DATA CONTRACTS & VALUE OBJECTS
# ==========================================

class AssetClass(str, Enum):
    EQUITY = "EQUITY"
    INDEX = "INDEX"
    FUTURE = "FUTURE"
    OPTION = "OPTION"
    COMMODITY = "COMMODITY"
    CURRENCY = "CURRENCY"

class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"
    STOP_LOSS_MARKET = "STOP_LOSS_MARKET"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class OptionType(str, Enum):
    CALL = "CE"
    PUT = "PE"

class Instrument(BaseModel):
    symbol: str
    exchange: str                       # NSE, BSE, NFO, BFO, MCX
    asset_class: AssetClass
    lot_size: int = 1
    tick_size: float = 0.05
    expiry: Optional[date] = None
    strike: Optional[float] = None
    option_type: Optional[OptionType] = None

class MarketSnapshot(BaseModel):
    symbol: str
    timestamp: datetime
    last_price: float
    open: float
    high: float
    low: float
    close: float
    volume: int
    oi: Optional[int] = None            # Open Interest for F&O
    vwap: Optional[float] = None
    depth: Optional[Dict[str, Any]] = None  # Level 2 Top 5 Bids/Asks

class InsightDirection(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"

class Insight(BaseModel):
    insight_id: str
    symbol: str
    created_at: datetime
    direction: InsightDirection
    confidence: float = Field(ge=0.0, le=1.0)     # 0.0 to 1.0 score
    expected_magnitude_pct: Optional[float] = None
    horizon_seconds: int = 3600                   # Prediction time horizon
    source_agent: str                             # e.g. "OrderFlowAgent", "MacroAgent"
    reasoning_summary: str

class PortfolioTarget(BaseModel):
    symbol: str
    target_weight: float = Field(ge=-1.0, le=1.0) # -1.0 (100% short) to +1.0 (100% long)
    target_quantity: Optional[int] = None
    allocated_capital: float
    rebalance_urgency: str = "NORMAL"             # IMMEDIATE, NORMAL, END_OF_DAY

class OrderRequest(BaseModel):
    order_id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    price: Optional[float] = None
    stop_price: Optional[float] = None
    tag: str = "ArthaAI"

class OrderFill(BaseModel):
    fill_id: str
    order_id: str
    symbol: str
    side: OrderSide
    quantity: int
    price: float
    fees: float
    timestamp: datetime

class Position(BaseModel):
    symbol: str
    quantity: int
    average_entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float

# ==========================================
# 2. MARKET DATA & FEATURE INTERFACES
# ==========================================

class MarketDataProvider(ABC):
    @abstractmethod
    async def get_historical_bars(
        self, symbol: str, start: datetime, end: datetime, timeframe: str
    ) -> pl.DataFrame:
        """Returns historical OHLCV data as high-performance Polars DataFrame."""
        pass

    @abstractmethod
    async def get_latest_snapshot(self, symbol: str) -> MarketSnapshot:
        """Returns real-time L1/L2 market snapshot."""
        pass

    @abstractmethod
    async def stream_ticks(self, symbols: List[str]) -> AsyncGenerator[MarketSnapshot, None]:
        """Real-time WebSocket streaming generator."""
        pass

class FeatureEngine(ABC):
    @abstractmethod
    def compute_technical_indicators(self, df: pl.DataFrame) -> pl.DataFrame:
        """Appends EMA, RSI, Supertrend, ATR, VWAP features via Polars/Numba."""
        pass

    @abstractmethod
    def compute_market_regime(self, df: pl.DataFrame) -> Dict[str, Any]:
        """Classifies regime: Trending Bullish, Trending Bearish, Mean-Reverting, High-Vol."""
        pass

class OrderFlowEngine(ABC):
    @abstractmethod
    def compute_ofi(self, depth_data: pl.DataFrame) -> float:
        """Computes Order Flow Imbalance (OFI) from Level 2/Level 3 depth changes."""
        pass

    @abstractmethod
    def detect_institutional_flow(self, trades_df: pl.DataFrame) -> List[Dict[str, Any]]:
        """Identifies iceberg orders, block deals, and sweep orders."""
        pass

class OptionsEngine(ABC):
    @abstractmethod
    def compute_greeks(
        self, spot: float, strike: float, time_to_expiry_years: float,
        risk_free_rate: float, iv: float, option_type: OptionType
    ) -> Dict[str, float]:
        """Computes Delta, Gamma, Theta, Vega, Rho using Black-76 / Bjerksund-Stensland."""
        pass

    @abstractmethod
    def calculate_max_pain(self, option_chain_df: pl.DataFrame) -> float:
        """Calculates NSE Max Pain strike for the current weekly/monthly expiry."""
        pass

class NewsProvider(ABC):
    @abstractmethod
    async def fetch_latest_news(self, symbols: List[str], limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches live financial news, RBI announcements, and corporate disclosures."""
        pass

class RAGEngine(ABC):
    @abstractmethod
    async def index_documents(self, docs: List[Dict[str, Any]]) -> None:
        """Indexes company annual reports, SEBI filings, and macroeconomic updates."""
        pass

    @abstractmethod
    async def retrieve_context(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Hybrid search (SQLite FTS5 + dense vector embeddings) for market research."""
        pass

# ==========================================
# 3. MULTI-AGENT & STRATEGY INTERFACES
# ==========================================

class AgentMessage(BaseModel):
    sender: str
    recipient: str
    content: str
    data_payload: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AgentState(BaseModel):
    session_id: str
    target_symbol: str
    active_regime: str
    macro_context: str
    technical_signals: Dict[str, Any]
    order_flow_metrics: Dict[str, Any]
    options_skew: Dict[str, Any]
    bull_arguments: List[str] = []
    bear_arguments: List[str] = []
    risk_objections: List[str] = []
    consensus_decision: Optional[str] = None
    messages: List[AgentMessage] = []

class Agent(ABC):
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def role(self) -> str:
        pass

    @abstractmethod
    async def execute_step(self, state: AgentState) -> AgentState:
        """Executes one step of analysis, returning modified state."""
        pass

class Strategy(ABC):
    @abstractmethod
    async def generate_insights(self, snapshot: MarketSnapshot, state: AgentState) -> List[Insight]:
        """Generates trading insights using quant indicators and agent consensus."""
        pass

# ==========================================
# 4. PORTFOLIO, RISK & EXECUTION
# ==========================================

class RiskEngine(ABC):
    @abstractmethod
    def validate_target(
        self, target: PortfolioTarget, current_positions: List[Position], portfolio_nav: float
    ) -> bool:
        """Pre-trade risk filter: Max position size, daily drawdown, VaR limit, margin check."""
        pass

    @abstractmethod
    def check_kill_switches(self, current_nav: float, initial_nav: float) -> bool:
        """Emergency circuit breaker. Returns True if all trading must immediately halt."""
        pass

class Portfolio(ABC):
    @abstractmethod
    def optimize_allocations(
        self, insights: List[Insight], current_positions: List[Position], available_cash: float
    ) -> List[PortfolioTarget]:
        """Converts raw Alpha Insights into mathematically sized PortfolioTargets."""
        pass

    @abstractmethod
    def get_positions(self) -> List[Position]:
        pass

    @abstractmethod
    def get_nav(self) -> float:
        pass

class ExecutionEngine(ABC):
    @abstractmethod
    async def submit_order(self, order: OrderRequest) -> str:
        """Submits order to live broker adapter or simulation matching engine."""
        pass

    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        pass

    @abstractmethod
    async def stream_fills(self) -> AsyncGenerator[OrderFill, None]:
        pass

# ==========================================
# 5. BACKTEST, EVALUATION & EVOLUTION
# ==========================================

class BacktestEngine(ABC):
    @abstractmethod
    async def run_vectorized(
        self, symbols: List[str], start: datetime, end: datetime, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """High-speed Polars/Numba parameter grid screening across 10,000 combinations."""
        pass

    @abstractmethod
    async def run_event_driven(
        self, strategy: Strategy, start: datetime, end: datetime
    ) -> Dict[str, Any]:
        """High-fidelity tick simulation using NautilusTrader execution backend."""
        pass

class PaperTradingEngine(ABC):
    @abstractmethod
    async def start_paper_session(self, initial_capital: float = 1_000_000.0) -> None:
        """Runs live market data against simulated matching engine without real capital."""
        pass

class EvaluationEngine(ABC):
    @abstractmethod
    def compute_performance_tearsheet(self, fills: List[OrderFill], equity_curve: pl.DataFrame) -> Dict[str, Any]:
        """Computes Sharpe, Sortino, Max Drawdown, Calmar, Win Rate, Profit Factor, Alpha, Beta."""
        pass

class EvolutionEngine(ABC):
    @abstractmethod
    async def distill_skill(self, task_trace: Dict[str, Any], evaluation_score: float) -> Optional[str]:
        """Synthesizes winning strategy adaptations into persistent procedural skills."""
        pass
```
