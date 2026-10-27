"""ProviderRegistry — registers and looks up provider adapter instances."""

from arthaai.core.errors import RegistryError
from arthaai.data.providers.base import ProviderMetadata


class ProviderRegistry:
    """Registers named provider adapter instances.

    Adapters are registered under a string name. Consumers look up by name
    and cast to the appropriate protocol.
    """

    def __init__(self) -> None:
        self._providers: dict[str, object] = {}
        self._metadata: dict[str, ProviderMetadata] = {}

    def register(self, name: str, adapter: object, metadata: ProviderMetadata) -> None:
        if name in self._providers:
            raise RegistryError(f"Provider '{name}' is already registered. Use update() to replace.")
        self._providers[name] = adapter
        self._metadata[name] = metadata

    def update(self, name: str, adapter: object, metadata: ProviderMetadata) -> None:
        """Replace an existing provider registration."""
        self._providers[name] = adapter
        self._metadata[name] = metadata

    def get(self, name: str) -> object:
        if name not in self._providers:
            raise RegistryError(
                f"Provider '{name}' not registered. "
                f"Available: {sorted(self._providers.keys())}"
            )
        return self._providers[name]

    def get_metadata(self, name: str) -> ProviderMetadata:
        if name not in self._metadata:
            raise RegistryError(f"No metadata found for provider '{name}'.")
        return self._metadata[name]

    def list_providers(self) -> list[str]:
        return sorted(self._providers.keys())

    def __contains__(self, name: str) -> bool:
        return name in self._providers
