from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.strategy.base import Strategy


class BacktestArtifact(BaseModel):
    model_config = ConfigDict(frozen=True)

    artifact_id: str
    run_id: str
    created_at: datetime = Field(default_factory=now_utc)
    dataset_version: str = Field(..., description="Immutable version of the historical dataset used")
    strategy_version: str = Field(..., description="Semantic/git version of the strategy executed")
    config_version: str = Field(..., description="Configuration and parameter version")
    metrics: dict[str, float] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)

class ResearchBackend(ABC):
    @abstractmethod
    async def run(
        self,
        strategy: Strategy,
        symbols: list[str],
        start_date: datetime,
        end_date: datetime,
        config: dict[str, Any],
    ) -> BacktestArtifact:
        """Executes simulation without coupling strategy code to engine internals."""
        pass

    @abstractmethod
    def validate(self, artifact: BacktestArtifact) -> bool:
        """Validates simulation artifact for integrity and anti-bias compliance."""
        pass

    @abstractmethod
    def metrics(self, artifact: BacktestArtifact) -> dict[str, float]:
        """Extracts standardized evaluation metrics."""
        pass

    @abstractmethod
    def artifacts(self, run_id: str) -> list[BacktestArtifact]:
        """Returns generated artifacts for a run."""
        pass
