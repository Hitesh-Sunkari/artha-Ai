"""Feature Core Enums, Policies, and Foundation Types.

Defines strongly-typed contracts for feature classification, lifecycle status,
warmup behavior, missing-data handling, and numerical stability.
"""

from enum import Enum


class FeatureType(str, Enum):
    """Categorization of quantitative features."""

    PRICE = "PRICE"
    RETURNS = "RETURNS"
    MOMENTUM = "MOMENTUM"
    TREND = "TREND"
    VOLATILITY = "VOLATILITY"
    VOLUME = "VOLUME"
    ORDER_FLOW = "ORDER_FLOW"
    MICROSTRUCTURE = "MICROSTRUCTURE"
    OPTIONS = "OPTIONS"
    GREEKS = "GREEKS"
    MARKET_STRUCTURE = "MARKET_STRUCTURE"
    BREADTH = "BREADTH"
    CROSS_ASSET = "CROSS_ASSET"
    REGIME = "REGIME"
    COMPOSITE = "COMPOSITE"


class FeatureStatus(str, Enum):
    """Lifecycle status of a feature definition."""

    DRAFT = "DRAFT"
    EXPERIMENTAL = "EXPERIMENTAL"
    VALIDATED = "VALIDATED"
    PRODUCTION_CANDIDATE = "PRODUCTION_CANDIDATE"
    PRODUCTION = "PRODUCTION"
    DEPRECATED = "DEPRECATED"
    BLOCKED = "BLOCKED"


class WarmupPolicy(str, Enum):
    """Warmup behavior and requirements for historical calculations."""

    EXACT = "EXACT"                  # Exactly `lookback` observations required
    EXPONENTIAL = "EXPONENTIAL"      # Multiplier (e.g. 3x-5x lookback) for EMA asymptotic convergence
    NONE = "NONE"                    # Point-in-time calculation (0 warmup required)


class MissingDataPolicy(str, Enum):
    """Policy when required input data is missing or incomplete.

    NON-NEGOTIABLE: Never silently zero-fill missing data.
    """

    EMIT_UNAVAILABLE = "EMIT_UNAVAILABLE"  # Emit NaN/None with FieldProvenance.UNAVAILABLE
    DROP = "DROP"                          # Exclude record from evaluation
    RAISE = "RAISE"                        # Raise explicit DataUnavailableError


class NumericalStabilityPolicy(str, Enum):
    """Behavior under numerical edge cases (zero division, log <= 0, inf).

    NON-NEGOTIABLE: No silent corruption or arbitrary replacement.
    """

    EMIT_NAN_OR_NULL = "EMIT_NAN_OR_NULL"  # Return NaN / None and record stability flag
    CLIP_TO_BOUNDS = "CLIP_TO_BOUNDS"      # Bound within theoretical limits (e.g. RSI in [0, 100])
    EPSILON_GUARD = "EPSILON_GUARD"        # Add standard epsilon (1e-12) to denominator, flag provenance
    RAISE_ON_SINGULARITY = "RAISE_ON_SINGULARITY"  # Raise NumericalStabilityError


class FeatureFrequency(str, Enum):
    """Canonical representation of feature frequency / timeframe."""

    TICK = "TICK"
    SECOND_1 = "1S"
    MINUTE_1 = "1M"
    MINUTE_3 = "3M"
    MINUTE_5 = "5M"
    MINUTE_15 = "15M"
    MINUTE_30 = "30M"
    HOUR_1 = "1H"
    DAILY = "1D"
    WEEKLY = "1W"
    MONTHLY = "1MN"
    EVENT_DRIVEN = "EVENT_DRIVEN"
