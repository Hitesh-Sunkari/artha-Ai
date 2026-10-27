"""DataNormalizer abstract base class.

Normalization contract:
  - Pure: same raw input → same canonical output
  - Deterministic: no hidden state, no I/O side effects
  - Versioned: every normalizer carries a transform_version
  - Source-preserving: raw source_timestamp is never silently discarded
"""

from abc import ABC, abstractmethod
from typing import Any

CURRENT_TRANSFORM_VERSION = "1.0.0"


class DataNormalizer(ABC):
    """Abstract base for all normalizers.

    Each concrete normalizer handles one record type (OHLCV, Trade, Quote, etc.)
    and one provider format. Multiple normalizers may exist for the same record
    type if providers use incompatible formats.
    """

    @property
    @abstractmethod
    def transform_version(self) -> str:
        """Identifies this normalizer's version for lineage tracking."""
        ...

    @property
    @abstractmethod
    def source_schema(self) -> str:
        """Identifies the source format this normalizer handles, e.g. 'openbb.equity.ohlcv'."""
        ...

    @abstractmethod
    def normalize(self, raw: dict[str, Any]) -> Any:
        """Normalizes a raw provider dict into a canonical schema object.

        Must be pure and deterministic.
        Raises ValueError for invalid or unrecognizable input.
        """
        ...
