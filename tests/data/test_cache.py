"""Tests for LocalCache in src/arthaai/data/cache/."""

import time

from arthaai.data.cache.local_cache import CacheKey, LocalCache


def test_local_cache_get_set_delete():
    cache = LocalCache(max_size=10)
    key = CacheKey("instrument", "RELIANCE")

    assert cache.get(key) is None

    cache.set(key, {"name": "Reliance"})
    assert cache.get(key) == {"name": "Reliance"}

    assert cache.delete(key)
    assert cache.get(key) is None
    assert not cache.delete(key)


def test_local_cache_lru_eviction():
    cache = LocalCache(max_size=2)
    k1 = CacheKey("test", "1")
    k2 = CacheKey("test", "2")
    k3 = CacheKey("test", "3")

    cache.set(k1, "v1")
    cache.set(k2, "v2")
    # Access k1 so k2 becomes least recently used
    assert cache.get(k1) == "v1"

    # Insert k3 -> k2 should be evicted
    cache.set(k3, "v3")

    assert cache.get(k1) == "v1"
    assert cache.get(k2) is None
    assert cache.get(k3) == "v3"


def test_local_cache_ttl_expiration():
    cache = LocalCache(max_size=10, ttl_seconds=0.05)
    key = CacheKey("ttl", "quick")
    cache.set(key, "hello")

    assert cache.get(key) == "hello"
    time.sleep(0.06)
    assert cache.get(key) is None


def test_local_cache_stats():
    cache = LocalCache(max_size=10)
    k = CacheKey("stats", "item")
    cache.get(k)  # miss
    cache.set(k, "data")
    cache.get(k)  # hit

    stats = cache.stats
    assert stats["hits"] == 1
    assert stats["misses"] == 1
    assert stats["hit_ratio"] == 0.5
    assert stats["size"] == 1

    cache.clear()
    assert cache.stats["size"] == 0
