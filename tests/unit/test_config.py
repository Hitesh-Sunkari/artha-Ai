import pytest

from arthaai.core.config import AppConfig, Environment
from arthaai.core.errors import ConfigurationError


def test_default_config():
    config = AppConfig()
    assert config.environment == Environment.DEVELOPMENT
    assert not config.live_trading_enabled
    assert config.risk.max_daily_loss_pct == 0.02
    assert config.risk.fno_ban_enforced

def test_live_trading_guard_raises_error():
    # Attempting to enable live trading raises ConfigurationError in Step 1
    with pytest.raises(ConfigurationError, match="Live trading execution is strictly disabled"):
        AppConfig(environment=Environment.LIVE, live_trading_enabled=True)

    # Inconsistent settings
    with pytest.raises(ConfigurationError, match="live_trading_enabled cannot be True outside LIVE"):
        AppConfig(environment=Environment.PAPER, live_trading_enabled=True)

    with pytest.raises(ConfigurationError, match="Environment set to LIVE, but live_trading_enabled is False"):
        AppConfig(environment=Environment.LIVE, live_trading_enabled=False)

def test_environment_override(monkeypatch):
    monkeypatch.setenv("ARTHAAI_ENVIRONMENT", "paper")
    monkeypatch.setenv("ARTHAAI_LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("ARTHAAI_RISK_MAX_DAILY_LOSS_PCT", "0.03")

    config = AppConfig()
    assert config.environment == Environment.PAPER
    assert config.log_level == "DEBUG"
    assert config.risk.max_daily_loss_pct == 0.03
