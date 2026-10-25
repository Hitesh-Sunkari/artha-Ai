"""ArthaAI Domain Exception Hierarchy."""


class ArthaAIError(Exception):
    """Base exception for all ArthaAI runtime and domain errors."""
    pass


class ValidationError(ArthaAIError):
    """Raised when data contract validation fails."""
    pass


class DataError(ArthaAIError):
    """Raised when data quality checks or data loading fails."""
    pass


class DataProviderError(ArthaAIError):
    """Raised when a data provider is unavailable, misconfigured, or returns unexpected data."""
    pass


class DataQualityError(ArthaAIError):
    """Raised when a dataset fails quality validation at ERROR severity."""
    pass


class StorageError(ArthaAIError):
    """Raised when Parquet, JSONL, or any storage operation fails."""
    pass


class RegistryError(ArthaAIError):
    """Raised when a dataset or provider registry operation fails."""
    pass


class CalendarError(ArthaAIError):
    """Raised when a market calendar lookup fails or coverage is missing."""
    pass


class MarketRuleError(ArthaAIError):
    """Raised when a market rule resolution fails or violation occurs."""
    pass


class PointInTimeError(ArthaAIError):
    """Raised when point-in-time causality is violated (e.g. look-ahead data)."""
    pass


class ConfigurationError(ArthaAIError):
    """Raised when application configuration is invalid or missing."""
    pass


class EventError(ArthaAIError):
    """Raised when event handling, publishing, or serialization fails."""
    pass


class InstrumentError(ArthaAIError):
    """Raised when instrument lifecycle, dates, or specifications are invalid."""
    pass


class MarketClockError(ArthaAIError):
    """Raised when market session or calendar calculations fail."""
    pass


class ResearchEligibilityError(ArthaAIError):
    """Raised when a dataset fails preconditions required for quantitative research."""
    pass
