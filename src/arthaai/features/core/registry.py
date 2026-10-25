"""Feature Registry Contract.

Provides centralized, versioned, validated registration and discovery for FeatureDefinitions.
Enforces uniqueness, validates non-deterministic features, supports multi-dimensional
indexing, and calculates deterministic cryptographic registry fingerprints.
"""

import hashlib
import json
from typing import Any

from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.features.core.base import FeatureStatus, FeatureType
from arthaai.features.core.dag import FeatureDependencyGraph
from arthaai.features.core.definition import FeatureDefinition


class FeatureRegistry:
    """Central repository of validated, versioned FeatureDefinitions."""

    def __init__(self) -> None:
        # Key: (name, version) -> FeatureDefinition
        self._registry: dict[tuple[str, str], FeatureDefinition] = {}
        # Key: name -> list of registered versions (sorted ascending)
        self._versions: dict[str, list[str]] = {}
        # Dependency mapping: feature_name -> list of dependencies
        self._dependencies: dict[str, list[str]] = {}

    def register(
        self,
        feature: FeatureDefinition,
        dependencies: list[str] | None = None,
    ) -> None:
        """Registers a FeatureDefinition.

        Raises ValueError if:
        - (name, version) already exists.
        - The feature is non-deterministic without an explicit random_seed.
        """
        key = (feature.name, feature.version)
        if key in self._registry:
            raise ValueError(
                f"Duplicate feature registration: '{feature.name}' version '{feature.version}' "
                "is already registered in FeatureRegistry."
            )

        if not feature.is_deterministic and feature.random_seed is None:
            raise ValueError(
                f"Feature '{feature.name}' is marked as non-deterministic but provides no random_seed. "
                "Deterministic research reproducibility requires an explicit seed."
            )

        self._registry[key] = feature

        if feature.name not in self._versions:
            self._versions[feature.name] = []
        self._versions[feature.name].append(feature.version)
        self._versions[feature.name].sort()

        if dependencies is not None:
            self._dependencies[feature.name] = list(dependencies)
        elif feature.name not in self._dependencies:
            self._dependencies[feature.name] = []

    def get(self, name: str, version: str | None = None) -> FeatureDefinition:
        """Retrieves a registered FeatureDefinition by name and optional version.

        If version is omitted, returns the latest registered version string.
        Raises KeyError if feature not found.
        """
        if name not in self._versions or not self._versions[name]:
            raise KeyError(f"Feature '{name}' is not registered in FeatureRegistry.")

        target_version = version if version is not None else self._versions[name][-1]
        key = (name, target_version)
        if key not in self._registry:
            raise KeyError(
                f"Feature '{name}' version '{target_version}' is not registered. "
                f"Available versions: {self._versions[name]}"
            )
        return self._registry[key]

    def has(self, name: str, version: str | None = None) -> bool:
        """Checks if a feature exists in registry."""
        if name not in self._versions:
            return False
        if version is None:
            return len(self._versions[name]) > 0
        return (name, version) in self._registry

    def list_features(self) -> list[FeatureDefinition]:
        """Returns all registered features sorted canonically by name and version."""
        sorted_keys = sorted(self._registry.keys())
        return [self._registry[k] for k in sorted_keys]

    def get_by_type(self, feature_type: FeatureType) -> list[FeatureDefinition]:
        """Filters features by FeatureType."""
        return [f for f in self.list_features() if f.feature_type == feature_type]

    def get_by_status(self, status: FeatureStatus) -> list[FeatureDefinition]:
        """Filters features by lifecycle FeatureStatus."""
        return [f for f in self.list_features() if f.status == status]

    def get_by_dataset(self, dataset_name: str) -> list[FeatureDefinition]:
        """Filters features that require the specified dataset."""
        return [f for f in self.list_features() if dataset_name in f.required_datasets]

    def get_by_provenance(self, provenance: FieldProvenance) -> list[FeatureDefinition]:
        """Filters features by FieldProvenance."""
        return [f for f in self.list_features() if f.provenance == provenance]

    def get_dependencies(self, feature_name: str) -> set[str]:
        """Returns direct dependencies for a feature name."""
        return set(self._dependencies.get(feature_name, []))

    def get_execution_order(self, feature_names: list[str] | None = None) -> list[str]:
        """Returns a deterministic topological calculation order for features.

        If feature_names is None, orders all latest registered features.
        """
        dag = FeatureDependencyGraph()
        target_names = feature_names if feature_names is not None else list(self._versions.keys())

        for name in target_names:
            feat = self.get(name)
            dag.add_feature(feat, dependencies=self._dependencies.get(name, []))

        return dag.topological_sort()

    def deterministic_dict(self) -> dict[str, Any]:
        """Returns a canonical dictionary of registry state."""
        return {
            f"{name}@{version}": feat.deterministic_dict()
            for (name, version), feat in sorted(self._registry.items())
        }

    def compute_fingerprint(self) -> str:
        """Computes a deterministic SHA-256 fingerprint of the entire registry state."""
        canonical_str = json.dumps(self.deterministic_dict(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
