import ast
import os


def get_imported_modules(filepath: str) -> set[str]:
    """Parses a Python file with AST and extracts normalized imported module names."""
    with open(filepath, encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read(), filename=filepath)
        except SyntaxError:
            return set()

    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                # Add the base module
                imports.add(node.module)
                # Also add the specific imported symbol as fully-qualified path
                for alias in node.names:
                    imports.add(f"{node.module}.{alias.name}")
    return imports

def matches_banned_prefix(imported_mod: str, banned_prefix: str) -> bool:
    """Accurately checks if imported_mod is or is within banned_prefix (respecting dot boundaries)."""
    return imported_mod == banned_prefix or imported_mod.startswith(banned_prefix + ".")

FORBIDDEN_LAYER_IMPORTS = {
    # Core domain must have zero dependencies on upper layers or external infrastructure
    "src/arthaai/core": [
        "fastapi",
        "starlette",
        "uvicorn",
        "langgraph",
        "langchain",
        "openbb",
        "nautilus_trader",
        "vectorbt",
        "arthaai.strategy",
        "arthaai.data",
        "arthaai.features",
        "arthaai.microstructure",
        "arthaai.options",
        "arthaai.intelligence",
        "arthaai.backtest",
        "arthaai.evaluation",
        "arthaai.control_plane",
        "arthaai.evolution",
        "arthaai.integrations",
        "arthaai.gateway",
    ],
    # Strategy layer must remain framework-neutral and backend-independent
    "src/arthaai/strategy": [
        "fastapi",
        "starlette",
        "uvicorn",
        "langgraph",
        "langchain",
        "openbb",
        "nautilus_trader",
        "vectorbt",
        "arthaai.backtest",
        "arthaai.gateway",
        "arthaai.integrations",
    ],
    # Features and microstructure must not depend on strategy or execution
    "src/arthaai/features": [
        "fastapi",
        "langgraph",
        "arthaai.strategy",
        "arthaai.backtest",
        "arthaai.gateway",
    ],
    # Data layer must not depend on strategy, backtest, or gateway
    "src/arthaai/data": [
        "fastapi",
        "starlette",
        "uvicorn",
        "langgraph",
        "langchain",
        "arthaai.strategy",
        "arthaai.backtest",
        "arthaai.gateway",
    ],
    # Integrations must not depend on strategy, backtest, or gateway
    "src/arthaai/integrations": [
        "fastapi",
        "starlette",
        "uvicorn",
        "langgraph",
        "langchain",
        "arthaai.strategy",
        "arthaai.backtest",
        "arthaai.gateway",
    ],
}

def test_ast_forbidden_import_boundaries():
    violations: list[str] = []
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    for relative_folder, banned_prefixes in FORBIDDEN_LAYER_IMPORTS.items():
        folder_path = os.path.join(base_dir, os.path.normpath(relative_folder))
        if not os.path.exists(folder_path):
            continue

        for root, _, files in os.walk(folder_path):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    imported_mods = get_imported_modules(filepath)
                    for imp in imported_mods:
                        for banned in banned_prefixes:
                            if matches_banned_prefix(imp, banned):
                                rel_file = os.path.relpath(filepath, base_dir)
                                violations.append(
                                    f"Architecture violation: '{rel_file}' imports forbidden module '{imp}' (banned: '{banned}')"
                                )

    assert not violations, "\n".join(violations)

def test_ast_normalization_distinguishes_similar_prefixes():
    """Unit test for the import matcher ensuring 'arthaai.strategy' doesn't match 'arthaai.strategy_foo'."""
    assert matches_banned_prefix("arthaai.strategy", "arthaai.strategy")
    assert matches_banned_prefix("arthaai.strategy.base", "arthaai.strategy")
    assert matches_banned_prefix("arthaai.strategy.risk.base", "arthaai.strategy")
    assert not matches_banned_prefix("arthaai.strategy_helpers", "arthaai.strategy")
    assert not matches_banned_prefix("arthaai.strategyx", "arthaai.strategy")
