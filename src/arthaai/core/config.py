from enum import Enum
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from arthaai.core.errors import ConfigurationError


class Environment(str, Enum):
    DEVELOPMENT = "development"
    TEST = "test"
    RESEARCH = "research"
    PAPER = "paper"
    LIVE = "live"


class DatabaseConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ARTHAAI_DB_", extra="ignore")

    host: str = "localhost"
    port: int = 5432
    name: str = "arthaai"
    user: str = "postgres"
    password: str = "postgres"
    ssl_mode: str = "prefer"


class RedisConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ARTHAAI_REDIS_", extra="ignore")

    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: str | None = None


class RiskConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ARTHAAI_RISK_", extra="ignore")

    max_daily_loss_pct: float = Field(default=0.02, gt=0.0, le=0.10)
    max_single_stock_exposure_pct: float = Field(default=0.05, gt=0.0, le=0.25)
    fno_ban_enforced: bool = True
    circuit_breakers_enforced: bool = True


class DataConfig(BaseSettings):
    """Configuration for the data platform layer (Step 2).

    ARTHAAI_DATA_ROOT controls where all raw, Parquet, manifest, and quality
    files are written. Defaults to ./data/ relative to the working directory.
    This directory must never be committed to version control.
    """

    model_config = SettingsConfigDict(env_prefix="ARTHAAI_DATA_", extra="ignore")

    root: str = "./data"

    @property
    def raw_dir(self) -> Path:
        return Path(self.root) / "raw"

    @property
    def parquet_dir(self) -> Path:
        return Path(self.root) / "parquet"

    @property
    def manifests_dir(self) -> Path:
        return Path(self.root) / "manifests"

    @property
    def quality_dir(self) -> Path:
        return Path(self.root) / "quality"

    def ensure_dirs(self) -> None:
        """Creates all required subdirectories under data root."""
        subdirs = [
            self.raw_dir,
            self.parquet_dir / "market",
            self.parquet_dir / "trades",
            self.parquet_dir / "quotes",
            self.parquet_dir / "orderbook",
            self.parquet_dir / "options",
            self.parquet_dir / "news",
            self.parquet_dir / "corporate_actions",
            self.manifests_dir,
            self.quality_dir,
        ]
        for d in subdirs:
            d.mkdir(parents=True, exist_ok=True)


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ARTHAAI_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    environment: Environment = Environment.DEVELOPMENT
    live_trading_enabled: bool = False
    log_level: str = "INFO"
    correlation_id_header: str = "X-Correlation-ID"

    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    risk: RiskConfig = Field(default_factory=RiskConfig)
    data: DataConfig = Field(default_factory=DataConfig)

    @model_validator(mode="after")
    def guard_live_trading(self) -> "AppConfig":
        """Safety invariant: Live trading cannot be enabled without explicit multi-stage promotion."""
        if self.live_trading_enabled:
            if self.environment != Environment.LIVE:
                raise ConfigurationError("live_trading_enabled cannot be True outside LIVE environment.")
            # Live execution is disabled until Step N (broker integration)
            raise ConfigurationError(
                "Live trading execution is strictly disabled. "
                "Supported environments: development, test, research, paper."
            )
        if self.environment == Environment.LIVE and not self.live_trading_enabled:
            raise ConfigurationError("Environment set to LIVE, but live_trading_enabled is False.")
        return self
