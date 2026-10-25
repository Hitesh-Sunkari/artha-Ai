from abc import ABC, abstractmethod
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from arthaai.control_plane.market_rules.registry import MarketRuleSet
from arthaai.core.market.snapshot import MarketState
from arthaai.core.portfolio.position import PortfolioState, PortfolioTarget
from arthaai.core.signals.insight import AlphaSignal


class RiskDecision(BaseModel):
    model_config = ConfigDict(frozen=True)

    decision_id: str
    target_id: str = Field(..., description="ID of originating PortfolioTarget")
    timestamp: datetime = Field(..., description="Timestamp of risk assessment (UTC)")
    approved: bool
    target_position: int
    maximum_position: int
    maximum_loss: float
    reason: str
    risk_checks: dict[str, bool] = Field(default_factory=dict)
    rule_version: str = Field(..., description="Version of the MarketRuleSet applied")
    rule_set_id: str = Field(..., description="Identifier of the specific MarketRuleSet applied")

class RiskEngine(ABC):
    @abstractmethod
    def evaluate(
        self,
        portfolio_state: PortfolioState,
        market_state: MarketState,
        signal: AlphaSignal,
        target: PortfolioTarget,
        market_rules: MarketRuleSet,
    ) -> RiskDecision:
        """Evaluates risk constraints and produces an audited RiskDecision."""
        pass
