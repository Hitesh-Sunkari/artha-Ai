import ast
import os


def extract_internal_imports(filepath: str, base_pkg: str = "arthaai") -> set[str]:
    """Extracts internal imported submodules starting with base_pkg from a file."""
    with open(filepath, encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read(), filename=filepath)
        except SyntaxError:
            return set()

    internal_imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.startswith(base_pkg + "."):
                    internal_imports.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.startswith(base_pkg):
                internal_imports.add(node.module)
    return internal_imports

def get_module_name_from_path(filepath: str, src_root: str) -> str:
    """Converts a file path like src/arthaai/core/orders/order.py to arthaai.core.orders.order."""
    rel = os.path.relpath(filepath, src_root)
    no_ext, _ = os.path.splitext(rel)
    parts = no_ext.split(os.sep)
    if parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)

def build_dependency_graph(src_root: str, base_pkg: str = "arthaai") -> dict[str, set[str]]:
    """Builds a directed dependency graph of internal modules."""
    graph: dict[str, set[str]] = {}
    pkg_dir = os.path.join(src_root, base_pkg)

    for root, _, files in os.walk(pkg_dir):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                mod_name = get_module_name_from_path(filepath, src_root)
                imported_mods = extract_internal_imports(filepath, base_pkg)

                # Normalize to package/module nodes present in graph
                normalized_deps = set()
                for imp in imported_mods:
                    if imp != mod_name:
                        normalized_deps.add(imp)

                graph[mod_name] = normalized_deps
    return graph

def find_cycles(graph: dict[str, set[str]]) -> list[list[str]]:
    """Finds all elementary cycles in a directed graph using DFS."""
    visited: set[str] = set()
    rec_stack: list[str] = []
    cycles: list[list[str]] = []

    def dfs(node: str):
        visited.add(node)
        rec_stack.append(node)

        for neighbor in graph.get(node, []):
            # Resolve neighbor if it's a sub-symbol or parent
            matched_neighbor = None
            if neighbor in graph:
                matched_neighbor = neighbor
            else:
                # Try prefix match if neighbor is a function/class inside module
                for potential in graph:
                    if neighbor.startswith(potential + "."):
                        matched_neighbor = potential
                        break

            if matched_neighbor:
                if matched_neighbor in rec_stack:
                    idx = rec_stack.index(matched_neighbor)
                    cycle = rec_stack[idx:] + [matched_neighbor]
                    cycles.append(cycle)
                elif matched_neighbor not in visited:
                    dfs(matched_neighbor)

        rec_stack.pop()

    for n in list(graph.keys()):
        if n not in visited:
            dfs(n)

    return cycles

def test_no_circular_dependencies_in_source_tree():
    """Validates that the source tree forms a strict Directed Acyclic Graph (DAG)."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_root = os.path.join(base_dir, "src")

    graph = build_dependency_graph(src_root)
    cycles = find_cycles(graph)

    cycle_messages = []
    for c in cycles:
        cycle_messages.append("Cycle detected: " + " -> ".join(c))

    assert not cycles, "\n".join(cycle_messages)

def test_cycle_detector_catches_synthetic_cycles():
    """Unit test for the cycle detection algorithm itself."""
    synthetic_graph = {
        "mod_a": {"mod_b"},
        "mod_b": {"mod_c"},
        "mod_c": {"mod_a"},  # Cycle: a -> b -> c -> a
        "mod_d": {"mod_e"},
        "mod_e": set(),
    }
    cycles = find_cycles(synthetic_graph)
    assert len(cycles) > 0
    assert cycles[0][0] == cycles[0][-1]
