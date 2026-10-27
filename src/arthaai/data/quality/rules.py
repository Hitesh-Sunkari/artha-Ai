"""Data quality engine base classes and reporting contracts."""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class QualitySeverity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class QualityResult(BaseModel):
    """Result of evaluating a single data quality check on a record or dataset."""

    model_config = ConfigDict(frozen=True)

    rule_name: str
    severity: QualitySeverity
    passed: bool
    details: str
    record_index: int | None = None
    symbol: str | None = None
    field: str | None = None
    metric_value: float | None = None


class QualityReport(BaseModel):
    """Aggregated report of all quality checks executed against a dataset."""

    model_config = ConfigDict(frozen=True)

    dataset_name: str
    total_records: int
    is_valid: bool
    results: list[QualityResult] = Field(default_factory=list)

    @property
    def errors(self) -> list[QualityResult]:
        return [r for r in self.results if not r.passed and r.severity == QualitySeverity.ERROR]

    @property
    def warnings(self) -> list[QualityResult]:
        return [r for r in self.results if not r.passed and r.severity == QualitySeverity.WARNING]

    @property
    def infos(self) -> list[QualityResult]:
        return [r for r in self.results if not r.passed and r.severity == QualitySeverity.INFO]

    @property
    def error_count(self) -> int:
        return len(self.errors)

    @property
    def warning_count(self) -> int:
        return len(self.warnings)


class QualityRule(ABC):
    """Abstract base class for all quality rules."""

    @property
    @abstractmethod
    def rule_name(self) -> str:
        """Name of the quality rule."""
        pass

    @property
    @abstractmethod
    def severity(self) -> QualitySeverity:
        """Severity of rule failure."""
        pass

    @abstractmethod
    def evaluate(self, records: list[Any]) -> list[QualityResult]:
        """Evaluates records and returns a list of QualityResults."""
        pass
