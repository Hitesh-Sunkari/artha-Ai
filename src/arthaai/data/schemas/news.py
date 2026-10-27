"""NewsArticle — canonical news and announcement schema.

LLM sentiment analysis is NOT implemented here.
The future sentiment agent will consume NewsArticle from this canonical layer.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.raw_record import DataMode


class NewsArticle(BaseModel):
    """Canonical news article record.

    published_time: timestamp from the original news source (UTC)
    availability_time: when the article became available in the ArthaAI system (UTC)
    These two times differ for wire services with republishing delays.
    """

    model_config = ConfigDict(frozen=True)

    article_id: str = Field(..., description="Provider-assigned unique article identifier")
    source: str = Field(..., description="News source/provider, e.g. 'nse_announcements', 'moneycontrol', 'reuters'")
    headline: str = Field(..., description="Original article headline, unmodified")
    body: str | None = Field(default=None, description="Full article body if available; None if summary-only")
    url: str | None = Field(default=None, description="Original article URL")
    language: str = Field(default="en", description="ISO 639-1 language code")

    # Time semantics — all UTC
    published_time: datetime = Field(..., description="Original publication timestamp (UTC)")
    availability_time: datetime = Field(..., description="When article became available in ArthaAI (UTC)")

    # Instrument linkage
    symbols: list[str] = Field(default_factory=list, description="Trading symbols mentioned in the article")
    exchanges: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list, description="Named entities (companies, persons, indices)")

    # Categories
    categories: list[str] = Field(default_factory=list, description="Provider-assigned categories")
    tags: list[str] = Field(default_factory=list)

    # Content integrity
    checksum: str | None = Field(default=None, description="SHA-256 of headline+body for deduplication")

    # Provenance
    data_mode: DataMode
    schema_version: str = "1.0.0"
    transform_version: str = "1.0.0"
    availability_time_inferred: bool = Field(
        default=False,
        description="True if availability_time was inferred rather than explicitly observed from data feed"
    )

    # Future sentiment hook (NOT implemented in Step 2)
    # sentiment_score: float | None — populated by future sentiment agent
    # sentiment_model: str | None — identifies which model/version scored this article

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps(cls, data: object) -> object:
        if isinstance(data, dict):
            for ts in ("published_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)
        return data
