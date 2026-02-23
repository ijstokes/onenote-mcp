# OneNote MCP Server

Does what it says on the tin: MCP server for Microsoft OneNote.  Utilizes native keychain, supports
shared Notebooks, provides CLI and Python API.

## What Does This Do?

This server allows AI assistants to:

- Access your OneNote notebooks, sections, and pages
- Create new pages in your notebooks
- Search through your notes
- Read complete note content, including HTML formatting and text
- Analyze and summarize your notes directly

All of this happens directly through the AI interface without you having to switch contexts.

## Features

- Authentication with Microsoft OneNote using device code flow (no Azure setup needed)
- List all notebooks, sections, and pages
- Create new pages with HTML content
- Read complete page content, including HTML formatting
- Extract text content for AI analysis and summaries
- Summarize content of all pages in a single operation
- Read full content of all pages in a readable format
- Search across your notes

## Provenance

Forked from [danosb/onenote-mcp](https://github.com/danosb/onenote-mcp) which was forked
from [ZubeidHendricks/azure-onenote-mcp-server](https://github.com/ZubeidHendricks/azure-onenote-mcp-server).
Pretty heavy refactoring & feature additions in this version.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (current LTS recommended)
- [uv](https://docs.astral.sh/uv/) (for Python client development)
- Python 3.12+ (managed by uv; minimum 3.11)
- An active Microsoft account with access to OneNote
- Git (install from [git-scm.com](https://git-scm.com/))

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/onenote-mcp.git
cd onenote-mcp
```

### Step 2: Install Project Dependencies

```bash
npm install
```

### Step 3: Build the Server

```bash
npm run build
```

### Step 4: Start the MCP Server

```bash
npm start
```

If you install this package as a dependency, you can also run the CLI entrypoint:

```bash
onenote-mcp
```

This will start the MCP server, and you'll see a message:

```
Server started successfully.
Use the "authenticate" tool to start the authentication flow,
or use "save_access_token" if you already have a token.
```

### Step 5: Authenticate Through Your AI Assistant

Once the server is running, you can authenticate directly through your AI assistant:

1. In Cursor, Anthropic's Claude Desktop, or any MCP-compatible assistant, ask to authenticate with OneNote:

   ```
   Can you authenticate with my OneNote account?
   ```

2. The AI will trigger the authentication flow and provide you with:
   - A URL (typically microsoft.com/devicelogin)
   - A code to enter

3. Go to the URL, enter the code, and sign in with your Microsoft account

4. After successful authentication, you can start using OneNote with your AI assistant

## Available MCP Tools

Once authenticated, the following tools are available for AI assistants to use.
Tool names use `snake_case` per MCP ecosystem convention.

### Personal Notebook Tools

| Tool Name           | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `authenticate`      | Start the Microsoft device-code authentication flow         |
| `save_access_token` | Save a Microsoft Graph access token for later use           |
| `list_notebooks`    | Get a list of all your OneNote notebooks                    |
| `get_notebook`      | Get details of a specific notebook by ID or name            |
| `list_sections`     | List sections, optionally filtered by notebook              |
| `list_pages`        | List pages, optionally filtered by notebook and/or section  |
| `get_page`          | Get the complete HTML content of a specific page            |
| `create_page`       | Create a new page with HTML content in a section            |
| `search_pages`      | Search page titles across your notebooks                    |
| `info`              | Report server version, configuration, and dependency status |

### Group Notebook Tools

Group tools use a path-based interface: `"GroupName/NotebookName/SectionName/PageTitle"`.

| Tool Name              | Path Depth                    | Description                                      |
| ---------------------- | ----------------------------- | ------------------------------------------------ |
| `list_groups`          | --                            | List Microsoft 365 groups with OneNote notebooks |
| `list_group_notebooks` | `Group`                       | List notebooks in a group                        |
| `list_group_sections`  | `Group/Notebook`              | List sections in a group notebook                |
| `list_group_pages`     | `Group/Notebook/Section`      | List pages in a group section                    |
| `get_group_page`       | `Group/Notebook/Section/Page` | Get full HTML content of a group page            |
| `create_group_page`    | `Group/Notebook/Section`      | Create a new page in a group section             |
| `search_group_pages`   | `Group`                       | Search page titles across a group's notebooks    |

## MCP Tool Schemas

Tools use explicit, validated schemas. Key inputs include:

- `save_access_token`: `token` (string, required)
- `get_notebook`: `notebookId` or `notebookName` (optional)
- `list_sections`: `notebookId` or `notebookName` (optional)
- `list_pages`: `notebookId`/`notebookName` and/or `sectionId`/`sectionName` (optional)
- `get_page`: `pageId` or `pageTitle` (optional)
- `create_page`: `notebookId`/`notebookName`, `sectionId`/`sectionName`, `title`, `html` (optional)
- `search_pages`: `query` (string, required)
- `list_group_notebooks`: `path` (e.g. `"Engineering"`)
- `list_group_sections`: `path` (e.g. `"Engineering/Sprint Notes"`)
- `list_group_pages`: `path` (e.g. `"Engineering/Sprint Notes/2024 Q4"`)
- `get_group_page`: `path` (e.g. `"Engineering/Sprint Notes/2024 Q4/Retro"`)
- `create_group_page`: `path`, `title`, `html` (optional)
- `search_group_pages`: `path` + `query` (both required)

## Additional CLI Tools

Every MCP tool has a corresponding CLI script. Additional debugging scripts are also provided.

### Personal Notebook CLI

| Script                                   | Description                                        |
| ---------------------------------------- | -------------------------------------------------- |
| `npm run auth`                           | Authenticate via device code flow                  |
| `npm run save-access-token -- "<token>"` | Save a Microsoft Graph access token                |
| `npm run info`                           | Show server version, config, and dependency status |
| `npm run list-notebooks`                 | List all your OneNote notebooks                    |
| `npm run get-notebook -- "<name or id>"` | Get details of a specific notebook                 |
| `npm run list-sections`                  | List sections in a notebook                        |
| `npm run list-pages`                     | List pages in a section                            |
| `npm run get-page -- "<page title>"`     | Print plain text content for a page                |
| `npm run create-page`                    | Create a new page interactively                    |
| `npm run search-pages -- "<query>"`      | Search page titles across notebooks                |

### Group Notebook CLI

| Script                                                              | Description                                      |
| ------------------------------------------------------------------- | ------------------------------------------------ |
| `npm run list-groups`                                               | List Microsoft 365 groups with OneNote notebooks |
| `npm run list-group-notebooks -- "<group>"`                         | List notebooks in a group                        |
| `npm run list-group-sections -- "<group>" ["notebook"]`             | List sections in a group notebook                |
| `npm run list-group-pages -- "<group>" "<section>"`                 | List pages in a group section                    |
| `npm run get-group-page -- "<Group/Notebook/Section/Page>"`         | Print plain text content for a group page        |
| `npm run create-group-page -- "<Group/Notebook/Section>" ["title"]` | Create a new page in a group section             |
| `npm run search-group-pages -- "<group>" "<query>"`                 | Search page titles in a group                    |

### Debugging Scripts

| Script                               | Description                                     |
| ------------------------------------ | ----------------------------------------------- |
| `npm run get-page-content`           | Inspect multiple fetch strategies for page HTML |
| `npm run simple-page-content`        | Verify raw page content retrieval               |
| `npm run get-all-page-contents`      | Summarize all pages                             |
| `npm run get-all-page-contents-full` | Print full HTML for all pages                   |
| `npm run read-all-pages`             | Read full content in a readable format          |

## Example Interactions

Here are some examples of how you can interact with the OneNote MCP through your AI assistant:

```
User: Can you show me my OneNote notebooks?
AI: (uses list_notebooks) I found 3 notebooks: "Work", "Personal", and "Projects"

User: What sections are in my Projects notebook?
AI: (uses list_sections) Your Projects notebook has the following sections: "Active Projects", "Ideas", and "Completed"

User: Create a new page in Projects with today's date as the title
AI: (uses create_page) I've created a new page titled "2025-04-12" in your Projects notebook

User: Find all my notes about machine learning
AI: (uses search_pages) I found 5 pages with content related to machine learning...

User: Can you read and summarize my notes on the "Project Requirements" page?
AI: (uses get_page) Based on your "Project Requirements" page, here's a summary...

User: What groups have OneNote notebooks?
AI: (uses list_groups) I found 2 groups: "Engineering" (3 notebooks), "Marketing" (1 notebook)

User: Show me the sections in the Engineering group's Sprint Notes notebook
AI: (uses list_group_sections with path "Engineering/Sprint Notes") Found 4 sections: "2024 Q3", "2024 Q4", "2025 Q1", "2025 Q2"

User: Read the retro page from Q4
AI: (uses get_group_page with path "Engineering/Sprint Notes/2024 Q4/Retro") Here's the retrospective...
```

## Advanced: Direct Script Usage

For testing or development purposes, you can also use the provided scripts directly:

```bash
# Build before running scripts
npm run build

# Authenticate with Microsoft
npm run auth

# Server info
npm run info

# Personal notebooks
npm run list-notebooks
npm run get-notebook -- "Work"
npm run list-sections
npm run list-pages
npm run get-page -- "Meeting Notes"
npm run create-page
npm run search-pages -- "project planning"

# Group notebooks (shared/team notebooks)
npm run list-groups
npm run list-group-notebooks -- "Engineering Design"
npm run list-group-sections -- "Engineering Design" "Engineering Design Notebook"
npm run list-group-pages -- "Engineering Design" "Market Landscape"
npm run get-group-page -- "Engineering/Sprint Notes/2024 Q4/Retro"
npm run create-group-page -- "Engineering/Sprint Notes/2024 Q4" "New Retro"
npm run search-group-pages -- "Engineering" "retro"

# Summarize content of all pages
npm run get-all-page-contents

# Read full content of all pages
npm run read-all-pages
```

## Configuration

Environment variables are read from `.env` if present:

- `CLIENT_ID`: Microsoft app client ID (optional; defaults to the Azure public client ID)
- `GRAPH_ACCESS_TOKEN`: Use an existing token instead of device-code auth
- `ONENOTE_MCP_TOKEN_STORAGE`: `keychain` (default), `file`, or `env`
- `ONENOTE_MCP_LOG_FILE`: log file path override
- `ONENOTE_MCP_LOG_LEVEL`: `info`, `debug`, etc.
- `ONENOTE_MCP_CONSOLE_LOGGING`: `true` to enable console logging

## Security Notes

- Authentication tokens are stored in the OS keychain via `keytar` by default (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Set `ONENOTE_MCP_TOKEN_STORAGE=file` to use `.access-token.txt` instead
- Set `ONENOTE_MCP_TOKEN_STORAGE=env` to disable token persistence and rely on `GRAPH_ACCESS_TOKEN`
- Tokens grant access to your OneNote data, so keep them secure
- Tokens expire after some time, requiring re-authentication
- No Azure setup or API keys are required

## Guiding Principles

This server is designed and maintained according to the following MCP best-practice references:

- https://modelcontextprotocol.info/docs/best-practices/
- https://www.merge.dev/blog/mcp-tool-schema
- https://steipete.me/posts/2025/mcp-best-practices
- https://www.linkedin.com/pulse/mcp-tool-descriptions-overview-examples-best-practices-merge-api-ptgue/
- https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/
- https://zazencodes.com/blog/mcp-server-naming-conventions

## Using with AI Assistants

### Setup for Cursor

1. Clone this repository and follow the installation steps below
2. Build the server: `npm run build`
3. Start the MCP server: `npm start`
4. Register the server in Cursor:
   - Open Cursor preferences (Cmd+, on Mac or Ctrl+, on Windows)
   - Go to the "MCP" tab
   - Add a new MCP server with these settings:
     - Name: `onenote`
     - Command: `node`
   - Args: `["/path/to/your/onenote-mcp/dist/onenote-mcp.js"]` (use absolute path)

   Here's the complete JSON configuration example:

   ```json
   {
     "mcpServers": {
       "onenote": {
         "command": "node",
         "args": ["/absolute/path/to/your/onenote-mcp/dist/onenote-mcp.js"],
         "env": {}
       }
     }
   }
   ```

5. Restart Cursor
6. In Cursor, you can now interact with your OneNote data using natural language:

```
Can you show me my OneNote notebooks?
Create a new page in my first notebook with a summary of this conversation
Find notes related to "project planning" in my OneNote
```

The first time you ask about OneNote, the AI will guide you through the authentication process.

### Setup for Claude Desktop (or other MCP-compatible assistants)

1. Clone this repository and follow the installation steps below
2. Build the server: `npm run build`
3. Start the MCP server: `npm start`
4. In the Claude Desktop settings, add the OneNote MCP server:
   - Name: `onenote`
   - Command: `node`

- Args: `["/path/to/your/onenote-mcp/dist/onenote-mcp.js"]` (use absolute path)

JSON configuration example:

```json
{
  "mcpServers": {
    "onenote": {
      "command": "node",
      "args": ["/absolute/path/to/your/onenote-mcp/dist/onenote-mcp.js"],
      "env": {}
    }
  }
}
```

5. You can now ask Claude to interact with your OneNote data

### Setup for Claude Code

1. Clone this repository and follow the installation steps below
2. Build the server: `npm run build`
3. Start the MCP server: `npm start`
4. Add the MCP server configuration to `~/.claude.json`:

```json
{
  "mcpServers": {
    "onenote": {
      "command": "node",
      "args": ["/absolute/path/to/your/onenote-mcp/dist/onenote-mcp.js"],
      "env": {}
    }
  }
}
```

5. Restart Claude Code and use the OneNote tools


## Versioning and Releases

Versioning follows SemVer and is sourced from `package.json`. Tag releases with:

```bash
npm run release:tag
```

See `CHANGELOG.md` for release notes.

## Testing

```bash
npm test
```

## Troubleshooting

### Authentication Issues

- If authentication fails, make sure you're using a modern browser without tracking prevention
- Try clearing browser cookies and cache
- If you get "expired_token" errors, restart the authentication process
- On Linux, `keytar` requires Secret Service (e.g., `gnome-keyring`); use `ONENOTE_MCP_TOKEN_STORAGE=file` to bypass

### Server Won't Start

- Verify Node.js is installed (version 18+): `node --version`
- Make sure all dependencies are installed: `npm install`
- Ensure the MCP SDK dependencies are installed via npm

### AI Can't Connect to the Server

- Ensure the MCP server is running (`npm start`)
- Check your AI assistant's settings to make sure it's configured to use MCP
- For Cursor, make sure it's the latest version that supports MCP

## License

This project is licensed under the MIT License - see the LICENSE file for details
