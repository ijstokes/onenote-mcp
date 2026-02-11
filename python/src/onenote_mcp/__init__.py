"""Python client for the OneNote MCP server.

Wraps the TypeScript MCP server via the MCP Python SDK over stdio transport.

Usage::

    from onenote_mcp import OneNoteClient

    async with OneNoteClient() as client:
        notebooks = await client.list_notebooks()
        print(notebooks)
"""

from .client import OneNoteClient

__all__ = ["OneNoteClient"]
