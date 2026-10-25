from arthaai.core.errors import (
    ArthaAIError,
    ConfigurationError,
    DataError,
    EventError,
    InstrumentError,
    MarketClockError,
    MarketRuleError,
    PointInTimeError,
    ValidationError,
)


def test_exception_hierarchy():
    exceptions = [
        ValidationError("validation failed"),
        DataError("corrupt data"),
        MarketRuleError("unresolved rule"),
        PointInTimeError("future leakage"),
        ConfigurationError("invalid config"),
        EventError("event dispatch failed"),
        InstrumentError("invalid instrument"),
        MarketClockError("calendar error"),
    ]

    for exc in exceptions:
        assert isinstance(exc, ArthaAIError)
        assert isinstance(exc, Exception)
        assert str(exc)
