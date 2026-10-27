"""Thread-safe in-memory LRU cache for local research, calendar, and instrument lookups."""

import threading
from collections import OrderedDict
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


@dataclass(frozen=True)
class CacheKey:
    """Immutable cache key supporting arbitrary hashable arguments."""

    namespace: str
    key: str | tuple[Any, ...]


class LocalCache:
    """Thread-safe LRU cache with optional TTL."""

    def __init__(self, max_size: int = 1000, ttl_seconds: float | None = None) -> None:
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[CacheKey, tuple[Any, float]] = OrderedDict()
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0

    def get(self, key: CacheKey) -> Any | None:
        """Retrieves item from cache if present and unexpired."""
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            value, timestamp = self._cache[key]
            now = datetime.now(UTC).timestamp()

            if self.ttl_seconds is not None and (now - timestamp) > self.ttl_seconds:
                del self._cache[key]
                self._misses += 1
                return None

            self._cache.move_to_end(key)
            self._hits += 1
            return value

    def set(self, key: CacheKey, value: Any) -> None:
        """Inserts or updates an item in the cache."""
        with self._lock:
            now = datetime.now(UTC).timestamp()
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = (value, now)

            if len(self._cache) > self.max_size:
                self._cache.popitem(last=False)

    def delete(self, key: CacheKey) -> bool:
        """Removes key from cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        """Empties the cache."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    @property
    def stats(self) -> dict[str, int | float]:
        """Returns cache statistics."""
        with self._lock:
            total = self._hits + self._misses
            hit_ratio = (self._hits / total) if total > 0 else 0.0
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_ratio": hit_ratio,
            }
