"""Feature Dependency Graph (DAG) Engine.

Constructs directed dependency graphs between features, detects cycles and missing
inputs, produces deterministic topological computation sequences, and computes
cryptographic DAG hashes.
"""

import hashlib
import json
from collections import defaultdict
from typing import Any

from arthaai.features.core.definition import FeatureDefinition


class FeatureDependencyGraph:
    """Directed Acyclic Graph for managing dependencies between FeatureDefinitions."""

    def __init__(self) -> None:
        self._nodes: dict[str, FeatureDefinition] = {}
        # node -> set of nodes that it directly depends upon (prerequisites)
        self._dependencies: dict[str, set[str]] = defaultdict(set)
        # node -> set of nodes that depend upon it (downstream)
        self._dependents: dict[str, set[str]] = defaultdict(set)

    def add_feature(
        self,
        feature: FeatureDefinition,
        dependencies: list[str] | None = None,
    ) -> None:
        """Registers a FeatureDefinition in the graph.

        Raises ValueError if a feature with the same name is already registered.
        """
        if feature.name in self._nodes:
            raise ValueError(
                f"Duplicate feature registration: feature '{feature.name}' is already present in graph."
            )

        self._nodes[feature.name] = feature

        # If explicit dependencies not passed, infer from required_columns if they match known features
        deps = dependencies if dependencies is not None else []
        for dep in deps:
            self.add_dependency(feature.name, dep)

    def add_dependency(self, feature_name: str, depends_on: str) -> None:
        """Declares that feature_name requires depends_on to be evaluated first."""
        self._dependencies[feature_name].add(depends_on)
        self._dependents[depends_on].add(feature_name)

    @property
    def nodes(self) -> dict[str, FeatureDefinition]:
        """Returns registered nodes."""
        return dict(self._nodes)

    def get_dependencies(self, feature_name: str) -> set[str]:
        """Returns direct dependencies for a feature."""
        return set(self._dependencies.get(feature_name, set()))

    def get_dependents(self, feature_name: str) -> set[str]:
        """Returns direct dependents for a feature."""
        return set(self._dependents.get(feature_name, set()))

    def validate_dependencies_present(self) -> None:
        """Validates that all declared dependencies are present in the graph.

        Raises ValueError if any dependency is missing.
        """
        missing: list[str] = []
        for node, deps in self._dependencies.items():
            for dep in deps:
                if dep not in self._nodes:
                    missing.append(f"Feature '{node}' depends on missing feature '{dep}'")
        if missing:
            raise ValueError("Missing dependency error: " + "; ".join(missing))

    def detect_cycles(self) -> list[list[str]]:
        """Finds all cycles in the graph using Depth-First Search."""
        visited: set[str] = set()
        rec_stack: list[str] = []
        cycles: list[list[str]] = []

        all_nodes = sorted(self._nodes.keys())

        def dfs(node: str) -> None:
            visited.add(node)
            rec_stack.append(node)

            # Node depends on neighbor -> edge is neighbor -> node in calculation order
            # To detect cycles, follow node -> dependency
            for neighbor in sorted(self._dependencies.get(node, set())):
                if neighbor not in self._nodes:
                    continue  # Missing dependency handled separately
                if neighbor in rec_stack:
                    idx = rec_stack.index(neighbor)
                    cycle = rec_stack[idx:] + [neighbor]
                    cycles.append(cycle)
                elif neighbor not in visited:
                    dfs(neighbor)

            rec_stack.pop()

        for n in all_nodes:
            if n not in visited:
                dfs(n)

        return cycles

    def topological_sort(self) -> list[str]:
        """Produces a deterministic topological ordering of features for execution.

        Independent features at the same dependency depth are ordered lexicographically
        to guarantee 100% deterministic reproducibility across runs.

        Raises:
            ValueError: If missing dependencies or cyclic dependencies are detected.
        """
        self.validate_dependencies_present()

        cycles = self.detect_cycles()
        if cycles:
            cycle_str = " -> ".join(cycles[0])
            raise ValueError(f"Cyclic dependency detected in feature graph: {cycle_str}")

        # Kahn's algorithm with lexicographical queue tie-breaking
        # in_degree[node] = number of unresolved dependencies that node has
        in_degree: dict[str, int] = {node: len(self._dependencies[node]) for node in self._nodes}

        # Available nodes with 0 unresolved dependencies (sorted alphabetically)
        ready_queue: list[str] = sorted([node for node, deg in in_degree.items() if deg == 0])

        order: list[str] = []

        while ready_queue:
            # Pop smallest node lexicographically
            curr = ready_queue.pop(0)
            order.append(curr)

            # For each downstream dependent, decrement in-degree
            for downstream in sorted(self._dependents.get(curr, set())):
                in_degree[downstream] -= 1
                if in_degree[downstream] == 0:
                    ready_queue.append(downstream)
                    ready_queue.sort()  # Maintain strict lexicographical order

        if len(order) != len(self._nodes):
            raise ValueError("Topological sort failed: unresolved dependencies remain.")

        return order

    def deterministic_dict(self) -> dict[str, Any]:
        """Returns canonical dictionary representation of graph topology."""
        sorted_nodes = {k: self._nodes[k].deterministic_dict() for k in sorted(self._nodes.keys())}
        sorted_deps = {k: sorted(self._dependencies[k]) for k in sorted(self._dependencies.keys())}
        return {
            "nodes": sorted_nodes,
            "dependencies": sorted_deps,
        }

    def compute_fingerprint(self) -> str:
        """Computes a deterministic SHA-256 fingerprint of the dependency graph."""
        canonical_str = json.dumps(self.deterministic_dict(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
