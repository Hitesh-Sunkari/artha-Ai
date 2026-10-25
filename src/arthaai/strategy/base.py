from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from arthaai.core.instruments.contracts import Instrument
from arthaai.core.market.snapshot import MarketState
from arthaai.core.portfolio.position import PortfolioState, PortfolioTarget
from arthaai.core.signals.insight import AlphaSignal


class Universe(ABC):
    @abstractmethod
    def select_instruments(self, as_of_time: datetime) -> list[Instrument]:
        """Selects point-in-time tradable instruments."""
        pass

class AlphaModel(ABC):
    @abstractmethod
    def generate_signals(self, market_state: MarketState, features: dict[str, Any]) -> list[AlphaSignal]:
        """Generates raw directional/relative AlphaSignals."""
        pass

class PortfolioConstructionModel(ABC):
    @abstractmethod
    def create_targets(
        self,
        signals: list[AlphaSignal],
        portfolio_state: PortfolioState,
        as_of_time: datetime,
    ) -> list[PortfolioTarget]:
        """Transforms AlphaSignals into sized PortfolioTargets."""
        pass

class ExecutionIntent(BaseModel):
    """Specification of how a target should be physically routed."""
    model_config = ConfigDict(frozen=True)

    intent_id: str
    target_id: str
    instrument: Instrument
    urgency: str = "NORMAL"  # "IMMEDIATE", "NORMAL", "PASSIVE", "TWAP"
    max_slippage_pct: float = 0.005

class Strategy(ABC):
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def version(self) -> str:
        pass

    @abstractmethod
    def on_market_state(
        self,
        market_state: MarketState,
        portfolio_state: PortfolioState,
    ) -> list[AlphaSignal]:
        """Processes market state and outputs AlphaSignals."""
        pass
