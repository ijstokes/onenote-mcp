# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Codex, etc.) working in
this repository.

## Git Workflow Rules

- **NEVER commit or push directly to `main`.** All changes MUST be made on
  feature branches.
- Create feature branches with a descriptive name (e.g.
  `ijstokes/add-search-tool`).
- Push feature branches to the `fork` remote and create PRs on
  `ijstokes/onenote-mcp` against `main`.
- Do NOT create PRs on the upstream repo (`danosb/onenote-mcp`) unless
  explicitly asked.

## Project Overview

`mcp-server-onenote` is a TypeScript MCP (Model Context Protocol) server that
exposes Microsoft OneNote operations via the Microsoft Graph API. It supports
both personal notebooks (`/me/onenote`) and Microsoft 365 group notebooks
(`/groups/{id}/onenote`).

The project provides three interfaces with consistent naming:

1. **MCP tools** -- `src/onenote-mcp.ts` (primary, for LLM agents)
2. **CLI scripts** -- `src/scripts/` (for humans and shell automation)
3. **TypeScript library** -- `src/lib/` (for programmatic use in other TS/JS)

## Naming Conventions

### MCP Tool Names

Tool names **must** use `snake_case` (e.g. `list_notebooks`, `get_group_page`).
This follows the MCP ecosystem convention where >90% of tools use snake_case.
See: [MCP Server Naming Conventions](https://zazencodes.com/blog/mcp-server-naming-conventions)

### CLI Script Names

npm script names use `kebab-case` (e.g. `list-notebooks`, `list-group-pages`).

### TypeScript Identifiers

Internal TypeScript code uses `camelCase` for variables/functions and
`PascalCase` for types, following standard TS conventions. Only the
externally-visible MCP tool name strings are snake_case.

## Project Structure

```
src/
  onenote-mcp.ts          # MCP server entry point (registers all tools)
  lib/
    auth.ts               # Authentication (device code, token storage)
    config.ts             # Client ID, scopes
    groups.ts             # fetchAllGroups(), pickGroup()
    group-paths.ts        # parseGroupPath(), resolveGroupPath()
    logger.ts             # Pino logger setup
    onenote-paths.ts      # getOnenoteRoot() -- /me/onenote vs /groups/{id}/onenote
    pages.ts              # getPageContent() with configurable onenoteRoot
    pagination.ts         # fetchAll() -- paginated Graph API calls
    selection.ts          # pickByNameOrId() -- fuzzy name/ID matching
    token.ts              # Token expiry checking
    tool-schemas.ts       # Zod schemas + JSON-Schema for all MCP tools
  scripts/                # CLI entry points (one file per command)
tests/                    # Vitest unit tests
python/                   # Python client wrapper (see python/README.md)
```

## Development Commands

```bash
npm run build             # TypeScript compilation (tsc)
npm test                  # Run tests (vitest)
npm run lint              # ESLint
npm run format            # Prettier check
npm run format:write      # Prettier fix
npm start                 # Start MCP server
```

## MCP Tool Design Guidelines

Follow [Anthropic's tool design guidance](https://www.anthropic.com/engineering/writing-tools-for-agents):

- **Descriptions**: Write for an LLM audience. Include the expected path
  format, parameter semantics, and example values directly in the description
  and schema `description` fields. Make implicit domain knowledge explicit.
- **Parameter names**: Use unambiguous names (`notebook_id` not `id`).
- **Error messages**: Include actionable context. When a lookup fails, list
  available options (e.g. `"Group 'Foo' not found. Available: Bar, Baz"`).
- **Schemas**: Define both a Zod schema (for runtime validation inside
  handlers) and a JSON-Schema `toolInputSchemas` entry (for MCP discovery).
  Keep them in sync in `src/lib/tool-schemas.ts`.
- **Auth errors**: Wrap all tool handlers with `withAuthErrorHandling()` to
  auto-clear expired tokens and prompt re-authentication.

## Adding a New Tool

1. Add Zod schema + JSON-Schema in `src/lib/tool-schemas.ts`
2. Register `server.tool('snake_case_name', ...)` in `src/onenote-mcp.ts`
3. If the tool needs new library logic, add it in `src/lib/`
4. Add a corresponding CLI script in `src/scripts/` and npm script in
   `package.json`
5. Add tests in `tests/`
6. Update the tool table in `README.md`

## Graph API Endpoints Used

Personal notebooks:

- `GET /me/onenote/notebooks`
- `GET /me/onenote/notebooks/{id}/sections`
- `GET /me/onenote/sections`
- `GET /me/onenote/sections/{id}/pages`
- `GET /me/onenote/pages`
- `GET /me/onenote/pages/{id}/content`
- `POST /me/onenote/sections/{id}/pages`

Group notebooks:

- `GET /groups?$select=id,displayName`
- `GET /groups/{id}/onenote/notebooks`
- `GET /groups/{id}/onenote/notebooks/{id}/sections`
- `GET /groups/{id}/onenote/sections/{id}/pages`
- `GET /groups/{id}/onenote/pages`
- `GET /groups/{id}/onenote/pages/{id}/content`
- `POST /groups/{id}/onenote/sections/{id}/pages`

## Testing

Tests use Vitest. Run with `npm test`. Test files live in `tests/` and follow
the pattern `*.test.ts`. Focus on unit-testing pure library functions (path
parsing, selection logic, schema validation). MCP tool handlers are integration
points that compose library functions.

## Python Development

All Python package management uses **[uv](https://docs.astral.sh/uv/)**.

### Standard workflow

```bash
cd python
uv init                   # Initialize (only needed once; creates pyproject.toml + .venv)
uv add <package>          # Add a dependency (e.g. uv add mcp)
uv add --dev <package>    # Add a dev dependency (e.g. uv add --dev pytest)
source .venv/bin/activate # Activate the venv before running tests or scripts
pytest                    # Run Python tests
deactivate                # When done
```

### Rules

- **Never use `pip install` directly.** Always use `uv add` to add packages so
  they are tracked in `pyproject.toml` and `uv.lock`.
- **Always activate the venv** (`source .venv/bin/activate`) before running any
  Python commands (pytest, python, etc.).
- The `python/` directory is a self-contained Python package with its own
  `pyproject.toml` and `.venv`. It wraps the TypeScript MCP server via the MCP
  Python SDK over stdio transport.

## Pre-commit Hooks

This repo uses the [pre-commit](https://pre-commit.com/) framework for
pre-commit hooks. Configuration is in `.pre-commit-config.yaml`.

### Setup (once after cloning)

```bash
uv tool install pre-commit   # or: brew install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg
```

### What runs on commit

| Hook                        | Files                                     | What it does                           |
| --------------------------- | ----------------------------------------- | -------------------------------------- |
| trailing-whitespace         | all                                       | Remove trailing whitespace             |
| end-of-file-fixer           | all                                       | Ensure files end with newline          |
| check-yaml / check-json     | `*.yml`, `*.json`                         | Syntax validation                      |
| check-toml                  | `*.toml`                                  | TOML syntax validation                 |
| check-merge-conflict        | all                                       | Detect merge conflict markers          |
| check-added-large-files     | all                                       | Block files >500 KB                    |
| check-ast                   | `python/**/*.py`                          | Validate Python syntax                 |
| detect-private-key          | all                                       | Prevent committing private keys        |
| python-use-type-annotations | `python/**/*.py`                          | Enforce type annotations over comments |
| python-no-eval              | `python/**/*.py`                          | Forbid `eval()` in Python              |
| eslint                      | `*.ts`, `*.js`                            | Lint + auto-fix TypeScript             |
| prettier                    | `*.ts`, `*.js`, `*.json`, `*.md`, `*.yml` | Format                                 |
| ruff                        | `python/**/*.py`                          | Lint + auto-fix Python                 |
| ruff-format                 | `python/**/*.py`                          | Format Python                          |
| commitlint                  | commit message                            | Enforce conventional commits           |

### Manual full-repo check

```bash
pre-commit run --all-files
```

## Pre-existing Build Notes

The codebase has pre-existing TypeScript errors in `src/onenote-mcp.ts` due to
MCP SDK type mismatches (the `server.tool()` overload signatures changed
between SDK versions). These do not affect runtime behavior. There are also
type errors in some experimental scripts in `src/scripts/`. Do not attempt to
fix these unless specifically asked.
