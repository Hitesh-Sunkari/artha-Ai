"""Tests for ProviderRegistry in src/arthaai/data/providers/registry.py."""

import pytest

from arthaai.core.errors import RegistryError
from arthaai.data.providers.base import ProviderCapability
from arthaai.data.providers.registry import ProviderRegistry
from arthaai.integrations.simulated_adapter import SIMULATED_PROVIDER_METADATA, SimulatedAdapter


def test_provider_registry():
    registry = ProviderRegistry()
    adapter = SimulatedAdapter()

    assert "simulated" not in registry

    registry.register("simulated", adapter, SIMULATED_PROVIDER_METADATA)
    assert "simulated" in registry

    # Lookup
    fetched = registry.get("simulated")
    assert fetched is adapter

    meta = registry.get_metadata("simulated")
    assert meta.name == "simulated"
    assert ProviderCapability.HISTORICAL_OHLCV_EQUITY in meta.capabilities

    # Duplicate registration
    with pytest.raises(RegistryError, match="already registered"):
        registry.register("simulated", adapter, SIMULATED_PROVIDER_METADATA)

    # Missing lookup
    with pytest.raises(RegistryError, match="not registered"):
        registry.get("unknown_provider")

    with pytest.raises(RegistryError, match="No metadata found"):
        registry.get_metadata("unknown_provider")

    # Update
    new_adapter = SimulatedAdapter(seed=999)
    registry.update("simulated", new_adapter, SIMULATED_PROVIDER_METADATA)
    assert registry.get("simulated") is new_adapter
    assert registry.list_providers() == ["simulated"]
