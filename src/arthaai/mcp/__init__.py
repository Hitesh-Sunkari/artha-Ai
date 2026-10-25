"""Model Context Protocol (MCP) server and client tools for ArthaAI."""

from arthaai.mcp.server import (
    MCPClient,
    calculate_statutory_costs,
    get_mcp_client,
    mcp_server,
    query_market_data,
)

__all__ = [
    "mcp_server",
    "query_market_data",
    "calculate_statutory_costs",
    "MCPClient",
    "get_mcp_client",
]
