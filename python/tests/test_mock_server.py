"""Integration tests using an in-memory mock MCP server.

Uses FastMCP + create_connected_server_and_client_session from the MCP SDK
to test OneNoteClient methods without spawning a real server process.
"""

from __future__ import annotations

import json

import pytest
from mcp.server.fastmcp import FastMCP
from mcp.shared.memory import create_connected_server_and_client_session
from onenote_mcp.client import OneNoteClient

# ── Mock server setup ───────────────────────────────────────────────

MOCK_NOTEBOOKS = [
    {"id": "nb-1", "displayName": "Work"},
    {"id": "nb-2", "displayName": "Personal"},
]

MOCK_SECTIONS = [
    {"id": "sec-1", "displayName": "Meeting Notes", "notebookId": "nb-1"},
    {"id": "sec-2", "displayName": "Ideas", "notebookId": "nb-2"},
]

MOCK_PAGES = [
    {"id": "pg-1", "title": "Sprint Retro", "sectionId": "sec-1"},
    {"id": "pg-2", "title": "Project Plan", "sectionId": "sec-1"},
]

MOCK_GROUPS = [
    {"id": "grp-1", "displayName": "Engineering", "notebookCount": 2},
    {"id": "grp-2", "displayName": "Marketing", "notebookCount": 1},
]


def create_mock_server() -> FastMCP:
    """Create a FastMCP server that mimics the OneNote MCP tools."""
    mcp = FastMCP("mock-onenote")

    @mcp.tool()
    def authenticate() -> str:
        return json.dumps({"status": "authenticated", "user": "test@example.com"})

    @mcp.tool()
    def save_access_token(token: str) -> str:
        return json.dumps({"status": "saved", "token_length": len(token)})

    @mcp.tool()
    def list_notebooks() -> str:
        return json.dumps(MOCK_NOTEBOOKS)

    @mcp.tool()
    def get_notebook(
        notebookId: str = "",  # noqa: N803
        notebookName: str = "",  # noqa: N803
    ) -> str:
        for nb in MOCK_NOTEBOOKS:
            if nb["id"] == notebookId or nb["displayName"] == notebookName:
                return json.dumps(nb)
        return json.dumps({"error": "not found"})

    @mcp.tool()
    def list_sections(
        notebookId: str = "",  # noqa: N803
        notebookName: str = "",  # noqa: N803
    ) -> str:
        return json.dumps(MOCK_SECTIONS)

    @mcp.tool()
    def list_pages(
        notebookId: str = "",  # noqa: N803
        notebookName: str = "",  # noqa: N803
        sectionId: str = "",  # noqa: N803
        sectionName: str = "",  # noqa: N803
    ) -> str:
        return json.dumps(MOCK_PAGES)

    @mcp.tool()
    def get_page(
        pageId: str = "",  # noqa: N803
        pageTitle: str = "",  # noqa: N803
    ) -> str:
        return json.dumps(
            {
                "id": pageId or "pg-1",
                "title": pageTitle or "Sprint Retro",
                "html": "<p>Page content</p>",
            }
        )

    @mcp.tool()
    def create_page(
        notebookId: str = "",  # noqa: N803
        notebookName: str = "",  # noqa: N803
        sectionId: str = "",  # noqa: N803
        sectionName: str = "",  # noqa: N803
        title: str = "",
        html: str = "",
    ) -> str:
        return json.dumps({"id": "pg-new", "title": title})

    @mcp.tool()
    def search_pages(query: str) -> str:
        matches = [p for p in MOCK_PAGES if query.lower() in p["title"].lower()]
        return json.dumps(matches)

    @mcp.tool()
    def info() -> str:
        return json.dumps({"version": "0.1.0-mock", "status": "ok"})

    @mcp.tool()
    def list_groups() -> str:
        return json.dumps(MOCK_GROUPS)

    @mcp.tool()
    def list_group_notebooks(path: str) -> str:
        return json.dumps([{"id": "gnb-1", "displayName": "Team Notes"}])

    @mcp.tool()
    def list_group_sections(path: str) -> str:
        return json.dumps([{"id": "gsec-1", "displayName": "Q4 2024"}])

    @mcp.tool()
    def list_group_pages(path: str) -> str:
        return json.dumps([{"id": "gpg-1", "title": "Retro"}])

    @mcp.tool()
    def get_group_page(path: str) -> str:
        return json.dumps(
            {"id": "gpg-1", "title": "Retro", "html": "<p>Group page</p>"}
        )

    @mcp.tool()
    def create_group_page(path: str, title: str = "", html: str = "") -> str:
        return json.dumps({"id": "gpg-new", "title": title})

    @mcp.tool()
    def search_group_pages(path: str, query: str) -> str:
        return json.dumps([{"id": "gpg-1", "title": "Retro"}])

    return mcp


# ── Fixtures ────────────────────────────────────────────────────────


@pytest.fixture
async def mock_client():
    """Create a OneNoteClient backed by an in-memory mock server."""
    server = create_mock_server()
    async with create_connected_server_and_client_session(server) as session:
        client = OneNoteClient.__new__(OneNoteClient)
        client._session = session
        client._cm_stack = []
        yield client


# ── Helper to extract text from MCP result ──────────────────────────


def result_json(result) -> dict | list:
    """Extract JSON from an MCP CallToolResult."""
    text = result.content[0].text
    return json.loads(text)


# ── Tests ───────────────────────────────────────────────────────────


class TestPersonalNotebooks:
    @pytest.mark.anyio
    async def test_authenticate(self, mock_client):
        result = await mock_client.authenticate()
        data = result_json(result)
        assert data["status"] == "authenticated"

    @pytest.mark.anyio
    async def test_save_access_token(self, mock_client):
        result = await mock_client.save_access_token("test-token-123")
        data = result_json(result)
        assert data["status"] == "saved"
        assert data["token_length"] == 14

    @pytest.mark.anyio
    async def test_list_notebooks(self, mock_client):
        result = await mock_client.list_notebooks()
        data = result_json(result)
        assert len(data) == 2
        assert data[0]["displayName"] == "Work"
        assert data[1]["displayName"] == "Personal"

    @pytest.mark.anyio
    async def test_get_notebook_by_name(self, mock_client):
        result = await mock_client.get_notebook(notebook_name="Work")
        data = result_json(result)
        assert data["id"] == "nb-1"
        assert data["displayName"] == "Work"

    @pytest.mark.anyio
    async def test_get_notebook_by_id(self, mock_client):
        result = await mock_client.get_notebook(notebook_id="nb-2")
        data = result_json(result)
        assert data["displayName"] == "Personal"

    @pytest.mark.anyio
    async def test_list_sections(self, mock_client):
        result = await mock_client.list_sections(notebook_name="Work")
        data = result_json(result)
        assert len(data) == 2
        assert data[0]["displayName"] == "Meeting Notes"

    @pytest.mark.anyio
    async def test_list_pages(self, mock_client):
        result = await mock_client.list_pages(
            notebook_name="Work", section_name="Meeting Notes"
        )
        data = result_json(result)
        assert len(data) == 2
        assert data[0]["title"] == "Sprint Retro"

    @pytest.mark.anyio
    async def test_get_page_by_title(self, mock_client):
        result = await mock_client.get_page(page_title="Sprint Retro")
        data = result_json(result)
        assert data["title"] == "Sprint Retro"
        assert "<p>" in data["html"]

    @pytest.mark.anyio
    async def test_get_page_by_id(self, mock_client):
        result = await mock_client.get_page(page_id="pg-1")
        data = result_json(result)
        assert data["id"] == "pg-1"

    @pytest.mark.anyio
    async def test_create_page(self, mock_client):
        result = await mock_client.create_page(
            notebook_name="Work",
            section_name="Meeting Notes",
            title="New Page",
            html="<p>Hello</p>",
        )
        data = result_json(result)
        assert data["id"] == "pg-new"
        assert data["title"] == "New Page"

    @pytest.mark.anyio
    async def test_search_pages(self, mock_client):
        result = await mock_client.search_pages("retro")
        data = result_json(result)
        assert len(data) == 1
        assert data[0]["title"] == "Sprint Retro"

    @pytest.mark.anyio
    async def test_search_pages_no_results(self, mock_client):
        result = await mock_client.search_pages("nonexistent")
        data = result_json(result)
        assert data == []

    @pytest.mark.anyio
    async def test_info(self, mock_client):
        result = await mock_client.info()
        data = result_json(result)
        assert data["version"] == "0.1.0-mock"
        assert data["status"] == "ok"


class TestGroupNotebooks:
    @pytest.mark.anyio
    async def test_list_groups(self, mock_client):
        result = await mock_client.list_groups()
        data = result_json(result)
        assert len(data) == 2
        assert data[0]["displayName"] == "Engineering"

    @pytest.mark.anyio
    async def test_list_group_notebooks(self, mock_client):
        result = await mock_client.list_group_notebooks("Engineering")
        data = result_json(result)
        assert len(data) == 1
        assert data[0]["displayName"] == "Team Notes"

    @pytest.mark.anyio
    async def test_list_group_sections(self, mock_client):
        result = await mock_client.list_group_sections("Engineering/Team Notes")
        data = result_json(result)
        assert data[0]["displayName"] == "Q4 2024"

    @pytest.mark.anyio
    async def test_list_group_pages(self, mock_client):
        result = await mock_client.list_group_pages("Engineering/Team Notes/Q4 2024")
        data = result_json(result)
        assert data[0]["title"] == "Retro"

    @pytest.mark.anyio
    async def test_get_group_page(self, mock_client):
        result = await mock_client.get_group_page(
            "Engineering/Team Notes/Q4 2024/Retro"
        )
        data = result_json(result)
        assert data["title"] == "Retro"
        assert "<p>" in data["html"]

    @pytest.mark.anyio
    async def test_create_group_page(self, mock_client):
        result = await mock_client.create_group_page(
            "Engineering/Team Notes/Q4 2024",
            title="New Group Page",
            html="<p>Group content</p>",
        )
        data = result_json(result)
        assert data["id"] == "gpg-new"
        assert data["title"] == "New Group Page"

    @pytest.mark.anyio
    async def test_search_group_pages(self, mock_client):
        result = await mock_client.search_group_pages("Engineering", "retro")
        data = result_json(result)
        assert len(data) == 1
        assert data[0]["title"] == "Retro"


class TestClientLifecycle:
    def test_call_tool_without_connection_raises(self):
        """Calling a tool without async-with should raise RuntimeError."""
        client = OneNoteClient()
        with pytest.raises(RuntimeError, match="not connected"):
            import asyncio

            asyncio.run(client.call_tool("list_notebooks"))
