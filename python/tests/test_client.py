"""Basic tests for the OneNote MCP Python client."""

import os

import pytest
from onenote_mcp.client import _default_server_command


def test_default_server_command_finds_entrypoint():
    """When run from within the repo, the entrypoint should resolve."""
    # This test only passes after 'npm run build' has been run
    dist = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "..", "dist", "onenote-mcp.js")
    )
    if not os.path.isfile(dist):
        pytest.skip("dist/onenote-mcp.js not found — run 'npm run build' first")

    command, args = _default_server_command()
    assert command is not None
    assert args[0].endswith("onenote-mcp.js")


def test_env_override(monkeypatch):
    """ONENOTE_MCP_SERVER env var should override the default path."""
    monkeypatch.setenv("ONENOTE_MCP_SERVER", "/tmp/custom-server.js")
    command, args = _default_server_command()
    assert args == ["/tmp/custom-server.js"]
