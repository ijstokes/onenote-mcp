"""OneNote MCP client — thin wrapper around the MCP Python SDK.

Connects to the TypeScript MCP server over stdio and exposes every
tool as a Python async method.
"""

from __future__ import annotations

import os
import shutil
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def _default_server_command() -> tuple[str, list[str]]:
    """Resolve the Node.js command and entrypoint for the MCP server."""
    node = shutil.which("node")
    if not node:
        raise FileNotFoundError(
            "Node.js not found on PATH. Install it from https://nodejs.org/"
        )

    # Allow override via env var
    entrypoint = os.environ.get("ONENOTE_MCP_SERVER")
    if entrypoint:
        return node, [entrypoint]

    # Default: assume the Python package lives inside the onenote-mcp repo
    here = os.path.dirname(os.path.abspath(__file__))
    dist_entry = os.path.normpath(
        os.path.join(here, "..", "..", "..", "dist", "onenote-mcp.js")
    )
    if os.path.isfile(dist_entry):
        return node, [dist_entry]

    raise FileNotFoundError(
        f"MCP server entrypoint not found at {dist_entry}. "
        "Build the TypeScript server with 'npm run build' first, "
        "or set ONENOTE_MCP_SERVER to the path of onenote-mcp.js."
    )


class OneNoteClient:
    """Async context manager that connects to the OneNote MCP server.

    Usage::

        async with OneNoteClient() as client:
            notebooks = await client.list_notebooks()
            page = await client.get_page(pageTitle="My Page")
    """

    def __init__(
        self,
        *,
        server_command: str | None = None,
        server_args: list[str] | None = None,
        env: dict[str, str] | None = None,
    ) -> None:
        if server_command and server_args is not None:
            self._command = server_command
            self._args = server_args
        else:
            self._command, self._args = _default_server_command()
        self._env = env
        self._session: ClientSession | None = None
        self._cm_stack: list[Any] = []

    async def __aenter__(self) -> OneNoteClient:
        params = StdioServerParameters(
            command=self._command,
            args=self._args,
            env=self._env,
        )
        # stdio_client returns an async context manager yielding (read, write)
        cm = stdio_client(params)
        read, write = await cm.__aenter__()
        self._cm_stack.append(cm)

        session = ClientSession(read, write)
        await session.__aenter__()
        self._cm_stack.append(session)
        await session.initialize()
        self._session = session
        return self

    async def __aexit__(self, *exc: Any) -> None:
        for cm in reversed(self._cm_stack):
            await cm.__aexit__(*exc)
        self._cm_stack.clear()
        self._session = None

    async def call_tool(
        self, name: str, arguments: dict[str, Any] | None = None
    ) -> Any:
        """Call any MCP tool by name and return the result."""
        if not self._session:
            raise RuntimeError("Client not connected. Use 'async with' context.")
        result = await self._session.call_tool(name, arguments or {})
        return result

    # ── Personal notebook helpers ──────────────────────────────

    async def authenticate(self) -> Any:
        """Start the Microsoft device-code authentication flow."""
        return await self.call_tool("authenticate")

    async def save_access_token(self, token: str) -> Any:
        """Save a Microsoft Graph access token."""
        return await self.call_tool("save_access_token", {"token": token})

    async def list_notebooks(self) -> Any:
        """List all OneNote notebooks."""
        return await self.call_tool("list_notebooks")

    async def get_notebook(
        self,
        *,
        notebook_id: str | None = None,
        notebook_name: str | None = None,
    ) -> Any:
        """Get details of a specific notebook."""
        args: dict[str, str] = {}
        if notebook_id:
            args["notebookId"] = notebook_id
        if notebook_name:
            args["notebookName"] = notebook_name
        return await self.call_tool("get_notebook", args)

    async def list_sections(
        self,
        *,
        notebook_id: str | None = None,
        notebook_name: str | None = None,
    ) -> Any:
        """List sections, optionally filtered by notebook."""
        args: dict[str, str] = {}
        if notebook_id:
            args["notebookId"] = notebook_id
        if notebook_name:
            args["notebookName"] = notebook_name
        return await self.call_tool("list_sections", args)

    async def list_pages(
        self,
        *,
        notebook_id: str | None = None,
        notebook_name: str | None = None,
        section_id: str | None = None,
        section_name: str | None = None,
    ) -> Any:
        """List pages, optionally filtered by notebook and/or section."""
        args: dict[str, str] = {}
        if notebook_id:
            args["notebookId"] = notebook_id
        if notebook_name:
            args["notebookName"] = notebook_name
        if section_id:
            args["sectionId"] = section_id
        if section_name:
            args["sectionName"] = section_name
        return await self.call_tool("list_pages", args)

    async def get_page(
        self,
        *,
        page_id: str | None = None,
        page_title: str | None = None,
        format: str | None = None,  # noqa: A002
    ) -> Any:
        """Get the complete HTML content of a page."""
        args: dict[str, str] = {}
        if page_id:
            args["pageId"] = page_id
        if page_title:
            args["pageTitle"] = page_title
        if format:
            args["format"] = format
        return await self.call_tool("get_page", args)

    async def create_page(
        self,
        *,
        notebook_id: str | None = None,
        notebook_name: str | None = None,
        section_id: str | None = None,
        section_name: str | None = None,
        title: str | None = None,
        html: str | None = None,
    ) -> Any:
        """Create a new page with HTML content in a section."""
        args: dict[str, str] = {}
        if notebook_id:
            args["notebookId"] = notebook_id
        if notebook_name:
            args["notebookName"] = notebook_name
        if section_id:
            args["sectionId"] = section_id
        if section_name:
            args["sectionName"] = section_name
        if title:
            args["title"] = title
        if html:
            args["html"] = html
        return await self.call_tool("create_page", args)

    async def search_pages(self, query: str) -> Any:
        """Search page titles across notebooks."""
        return await self.call_tool("search_pages", {"query": query})

    async def info(self) -> Any:
        """Report server version, configuration, and dependency status."""
        return await self.call_tool("info")

    # ── Group notebook helpers ─────────────────────────────────

    async def list_groups(self) -> Any:
        """List Microsoft 365 groups with OneNote notebooks."""
        return await self.call_tool("list_groups")

    async def list_group_notebooks(self, path: str) -> Any:
        """List notebooks in a group. Path: 'GroupName'."""
        return await self.call_tool("list_group_notebooks", {"path": path})

    async def list_group_sections(self, path: str) -> Any:
        """List sections in a group notebook. Path: 'Group/Notebook'."""
        return await self.call_tool("list_group_sections", {"path": path})

    async def list_group_pages(self, path: str) -> Any:
        """List pages in a group section. Path: 'Group/Notebook/Section'."""
        return await self.call_tool("list_group_pages", {"path": path})

    async def get_group_page(
        self,
        path: str | None = None,
        *,
        group_id: str | None = None,
        notebook_name: str | None = None,
        section_name: str | None = None,
        page_name: str | None = None,
        format: str | None = None,  # noqa: A002
    ) -> Any:
        """Get full HTML content of a group page.

        Provide either a slash-delimited *path* ('Group/Notebook/Section/Page')
        or individual keyword arguments (group_id, notebook_name, section_name,
        page_name).
        """
        args: dict[str, str] = {}
        if path:
            args["path"] = path
        if group_id:
            args["groupId"] = group_id
        if notebook_name:
            args["notebookName"] = notebook_name
        if section_name:
            args["sectionName"] = section_name
        if page_name:
            args["pageName"] = page_name
        if format:
            args["format"] = format
        return await self.call_tool("get_group_page", args)

    async def create_group_page(
        self,
        path: str,
        *,
        title: str | None = None,
        html: str | None = None,
    ) -> Any:
        """Create a page in a group section. Path: 'Group/Notebook/Section'."""
        args: dict[str, str] = {"path": path}
        if title:
            args["title"] = title
        if html:
            args["html"] = html
        return await self.call_tool("create_group_page", args)

    async def search_group_pages(self, path: str, query: str) -> Any:
        """Search page titles in a group. Path: 'GroupName'."""
        return await self.call_tool(
            "search_group_pages", {"path": path, "query": query}
        )
