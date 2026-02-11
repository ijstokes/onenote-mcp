# onenote-mcp (Python)

Python client for the [OneNote MCP server](../README.md). Wraps the TypeScript
MCP server via the [MCP Python SDK](https://pypi.org/project/mcp/) over stdio
transport.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (the TypeScript server must be built first)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Python 3.12+ (managed by uv; minimum 3.11)

## Installation

```bash
# From the repo root, build the TypeScript server
npm run build

# Set up the Python environment
cd python
uv sync                    # Creates .venv and installs all dependencies
source .venv/bin/activate  # Activate the virtual environment
```

## Usage

```python
import asyncio
from onenote_mcp import OneNoteClient

async def main():
    async with OneNoteClient() as client:
        # List notebooks
        result = await client.list_notebooks()
        print(result)

        # Search pages
        result = await client.search_pages("meeting notes")
        print(result)

        # Get a group page
        result = await client.get_group_page("Engineering/Sprint Notes/2024 Q4/Retro")
        print(result)

asyncio.run(main())
```

## Configuration

By default, the client looks for `dist/onenote-mcp.js` relative to the Python
package location (assuming it lives inside the `onenote-mcp` repo).

Override the server entrypoint:

```bash
export ONENOTE_MCP_SERVER=/path/to/onenote-mcp.js
```

Or pass it directly:

```python
client = OneNoteClient(
    server_command="node",
    server_args=["/path/to/onenote-mcp.js"],
)
```

## Available Methods

### Personal Notebooks

| Method                                                  | Description                 |
| ------------------------------------------------------- | --------------------------- |
| `authenticate()`                                        | Start device-code auth flow |
| `save_access_token(token)`                              | Save a Graph access token   |
| `list_notebooks()`                                      | List all notebooks          |
| `get_notebook(notebook_id=, notebook_name=)`            | Get notebook details        |
| `list_sections(notebook_id=, notebook_name=)`           | List sections               |
| `list_pages(notebook_id=, section_id=, ...)`            | List pages                  |
| `get_page(page_id=, page_title=)`                       | Get page HTML content       |
| `create_page(notebook_id=, section_id=, title=, html=)` | Create a page               |
| `search_pages(query)`                                   | Search page titles          |
| `info()`                                                | Server version and config   |

### Group Notebooks

| Method                                   | Path Format                     | Description                |
| ---------------------------------------- | ------------------------------- | -------------------------- |
| `list_groups()`                          | —                               | List groups with notebooks |
| `list_group_notebooks(path)`             | `"Group"`                       | List notebooks in group    |
| `list_group_sections(path)`              | `"Group/Notebook"`              | List sections              |
| `list_group_pages(path)`                 | `"Group/Notebook/Section"`      | List pages                 |
| `get_group_page(path)`                   | `"Group/Notebook/Section/Page"` | Get page content           |
| `create_group_page(path, title=, html=)` | `"Group/Notebook/Section"`      | Create a page              |
| `search_group_pages(path, query)`        | `"Group"`                       | Search pages               |

### Generic

| Method                       | Description               |
| ---------------------------- | ------------------------- |
| `call_tool(name, arguments)` | Call any MCP tool by name |

## Testing

```bash
cd python
uv sync                    # Ensure dependencies are up to date
source .venv/bin/activate  # Activate the virtual environment
pytest
```
