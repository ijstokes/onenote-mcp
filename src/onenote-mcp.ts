#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { DeviceCodeCredential } from '@azure/identity';
import type { Client } from '@microsoft/microsoft-graph-client';
import fetch from 'node-fetch';
import { clientId, scopes } from './lib/config.js';
import {
  createGraphClient,
  deleteAccessToken,
  getTokenStorageStatus,
  readAccessToken,
  writeAccessToken
} from './lib/auth.js';
import { isTokenExpired } from './lib/token.js';
import { fetchAll } from './lib/pagination.js';
import { pickByNameOrId } from './lib/selection.js';
import { logger, logMetadata } from './lib/logger.js';
import { normalizeParams, toolSchemas } from './lib/tool-schemas.js';
import { getPageContent } from './lib/pages.js';
import { formatPageContent, type OutputFormat } from './lib/format.js';
import { fetchAllGroups } from './lib/groups.js';
import { getOnenoteRoot } from './lib/onenote-paths.js';
import { parseGroupPath, resolveGroupPath } from './lib/group-paths.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

const getPackageVersion = () => {
  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? '0.0.0';
  } catch (error) {
    return '0.0.0';
  }
};

const server = new McpServer(
  {
    name: 'onenote',
    version: getPackageVersion(),
    description: 'OneNote MCP Server'
  },
  {
    capabilities: {
      tools: {
        listChanged: true
      }
    }
  }
);

let accessToken: string | null = null;
let graphClient: Client | null = null;
let lastAuthMessage: string | null = null;
let lastAuthStorageWarning: string | null = null;

function clearAuthState() {
  accessToken = null;
  graphClient = null;
}

function isAuthError(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error).toLowerCase();
  return (
    message.includes('401') ||
    message.includes('unauthorized') ||
    message.includes('lifetime validation failed') ||
    message.includes('invalid token') ||
    message.includes('token has expired')
  );
}

async function withAuthErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isAuthError(error)) {
      clearAuthState();
      await deleteAccessToken();
      throw new Error(
        `Authentication error: ${(error as Error).message}. Please call the 'authenticate' tool to sign in again.`
      );
    }
    throw error;
  }
}

async function ensureGraphClient() {
  if (graphClient && !isTokenExpired(accessToken)) {
    return graphClient;
  }

  if (isTokenExpired(accessToken)) {
    clearAuthState();
  }

  if (!accessToken) {
    const storedToken = await readAccessToken({ allowEnv: true });
    if (storedToken && !isTokenExpired(storedToken)) {
      accessToken = storedToken;
    }
  }

  if (!accessToken) {
    throw new Error(
      "No valid access token available. Please call the 'authenticate' tool to sign in."
    );
  }

  graphClient = await createGraphClient(accessToken);
  return graphClient;
}

async function createGraphClientWithAuth() {
  const existingToken =
    accessToken ?? (await readAccessToken({ allowEnv: true }));
  if (existingToken && !isTokenExpired(existingToken)) {
    graphClient = await createGraphClient(existingToken);
    accessToken = existingToken;
    return { type: 'token', client: graphClient };
  }

  if (existingToken && isTokenExpired(existingToken)) {
    logger.info(
      'Existing token has expired, starting new authentication flow.'
    );
    clearAuthState();
  }

  const credential = new DeviceCodeCredential({
    clientId,
    userPromptCallback: (info) => {
      lastAuthMessage = info.message;
      logger.info({ message: info.message }, 'Device code prompt received.');
    }
  });

  try {
    const tokenResponse = await credential.getToken(scopes);
    accessToken = tokenResponse.token;
    lastAuthStorageWarning = null;
    try {
      await writeAccessToken(accessToken);
    } catch (error) {
      lastAuthStorageWarning = (error as Error).message;
      logger.warn(
        { error },
        'Failed to persist token; continuing with in-memory token.'
      );
    }
    graphClient = await createGraphClient(accessToken);
    return { type: 'device_code', client: graphClient };
  } catch (error) {
    logger.error({ error }, 'Authentication error.');
    throw new Error(`Authentication failed: ${(error as Error).message}`);
  }
}

async function resolveNotebook(
  client: Client,
  notebookId?: string,
  notebookName?: string
) {
  const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');
  const selection = pickByNameOrId(
    notebooks,
    notebookId ?? notebookName ?? null,
    { allowEmpty: false }
  );

  if (!selection.item) {
    throw new Error('Notebook not found.');
  }

  return selection.item;
}

async function resolveSectionId(
  client: Client,
  {
    notebookId,
    notebookName,
    sectionId,
    sectionName
  }: {
    notebookId?: string;
    notebookName?: string;
    sectionId?: string;
    sectionName?: string;
  }
) {
  if (sectionId) {
    return sectionId;
  }

  let sectionsPath = '/me/onenote/sections';
  if (notebookId || notebookName) {
    const notebook = await resolveNotebook(client, notebookId, notebookName);
    sectionsPath = `/me/onenote/notebooks/${notebook.id}/sections`;
  }

  const sections = await fetchAll<any>(client, sectionsPath);
  const selection = pickByNameOrId(sections, sectionName ?? null, {
    allowEmpty: true
  });

  if (!selection.item) {
    throw new Error('Section not found.');
  }

  return selection.item.id;
}

server.tool(
  'authenticate',
  'Start the Microsoft device-code authentication flow.',
  async () => {
    const result = await createGraphClientWithAuth();
    if (result.type === 'device_code') {
      const prompt =
        lastAuthMessage ?? 'Check your device login prompt for the code.';
      const warning = lastAuthStorageWarning
        ? ` Token storage warning: ${lastAuthStorageWarning}`
        : '';
      return {
        content: [
          {
            type: 'text',
            text: `Authentication started. ${prompt}${warning}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Already authenticated with a valid access token.'
        }
      ]
    };
  }
);

server.tool(
  'save_access_token',
  'Save a Microsoft Graph access token for later use.',
  toolSchemas.save_access_token.shape,
  async (params) => {
    const { token } = normalizeParams(params, {
      token: ['accessToken', 'random_string']
    });
    const parsed = toolSchemas.save_access_token.safeParse({ token });
    if (!parsed.success) {
      throw new Error('Missing required parameter: token');
    }

    await writeAccessToken(parsed.data.token);
    accessToken = parsed.data.token;
    graphClient = await createGraphClient(accessToken);

    return {
      content: [
        {
          type: 'text',
          text: 'Access token saved successfully.'
        }
      ]
    };
  }
);

server.tool(
  'list_notebooks',
  'List all OneNote notebooks you can access.',
  async () =>
    withAuthErrorHandling(async () => {
      const client = await ensureGraphClient();
      const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(notebooks)
          }
        ]
      };
    })
);

server.tool(
  'get_notebook',
  'Get a single notebook by ID or name.',
  toolSchemas.get_notebook.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { notebookId, notebookName } = normalizeParams(params, {
        notebookId: ['id'],
        notebookName: ['name', 'title']
      });
      const parsed = toolSchemas.get_notebook.parse({
        notebookId,
        notebookName
      });

      const client = await ensureGraphClient();
      const selection = await resolveNotebook(
        client,
        parsed.notebookId,
        parsed.notebookName
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(selection)
          }
        ]
      };
    })
);

server.tool(
  'list_sections',
  'List sections, optionally filtered by notebook.',
  toolSchemas.list_sections.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { notebookId, notebookName } = normalizeParams(params, {
        notebookId: ['id'],
        notebookName: ['name', 'title']
      });
      const parsed = toolSchemas.list_sections.parse({
        notebookId,
        notebookName
      });

      const client = await ensureGraphClient();
      if (parsed.notebookId || parsed.notebookName) {
        const selection = await resolveNotebook(
          client,
          parsed.notebookId,
          parsed.notebookName
        );
        const sections = await fetchAll<any>(
          client,
          `/me/onenote/notebooks/${selection.id}/sections`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sections)
            }
          ]
        };
      }

      const sections = await fetchAll<any>(client, '/me/onenote/sections');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sections)
          }
        ]
      };
    })
);

server.tool(
  'list_pages',
  'List pages, optionally filtered by notebook and/or section.',
  toolSchemas.list_pages.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { notebookId, notebookName, sectionId, sectionName } =
        normalizeParams(params, {
          notebookId: ['notebook', 'id'],
          notebookName: ['notebookTitle', 'name'],
          sectionId: ['section'],
          sectionName: ['sectionTitle', 'name']
        });
      const parsed = toolSchemas.list_pages.parse({
        notebookId,
        notebookName,
        sectionId,
        sectionName
      });

      const client = await ensureGraphClient();

      const targetSectionId = await resolveSectionId(client, {
        notebookId: parsed.notebookId,
        notebookName: parsed.notebookName,
        sectionId: parsed.sectionId,
        sectionName: parsed.sectionName
      });

      const pages = await fetchAll<any>(
        client,
        `/me/onenote/sections/${targetSectionId}/pages`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(pages)
          }
        ]
      };
    })
);

server.tool(
  'get_page',
  'Get the full HTML content for a page.',
  toolSchemas.get_page.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { pageId, pageTitle, format } = normalizeParams(params, {
        pageId: ['id'],
        pageTitle: ['title', 'name'],
        format: ['outputFormat', 'output_format']
      });
      const parsed = toolSchemas.get_page.parse({ pageId, pageTitle, format });

      const client = await ensureGraphClient();
      if (!accessToken) {
        throw new Error(
          "No valid access token available. Please call the 'authenticate' tool to sign in."
        );
      }
      const html = await getPageContent(
        client,
        accessToken,
        { pageId: parsed.pageId, pageTitle: parsed.pageTitle },
        fetch
      );
      const output = await formatPageContent(
        html,
        parsed.format as OutputFormat
      );
      const text =
        parsed.format === 'pdf'
          ? `data:application/pdf;base64,${output}`
          : output;
      return {
        content: [
          {
            type: 'text',
            text
          }
        ]
      };
    })
);

server.tool(
  'create_page',
  'Create a new page in a section.',
  toolSchemas.create_page.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { notebookId, notebookName, sectionId, sectionName, title, html } =
        normalizeParams(params, {
          notebookId: ['notebook', 'id'],
          notebookName: ['notebookTitle', 'name'],
          sectionId: ['section', 'id'],
          sectionName: ['sectionTitle', 'name'],
          title: [],
          html: ['content']
        });
      const parsed = toolSchemas.create_page.parse({
        notebookId,
        notebookName,
        sectionId,
        sectionName,
        title,
        html
      });

      const client = await ensureGraphClient();

      const targetSectionId = await resolveSectionId(client, {
        notebookId: parsed.notebookId,
        notebookName: parsed.notebookName,
        sectionId: parsed.sectionId,
        sectionName: parsed.sectionName
      });

      const pageTitle = parsed.title ?? 'New Page';
      const pageHtml =
        parsed.html ??
        `<!DOCTYPE html>
<html>
  <head>
    <title>${pageTitle}</title>
  </head>
  <body>
    <p>${pageTitle}</p>
  </body>
</html>`;

      const response = await client
        .api(`/me/onenote/sections/${targetSectionId}/pages`)
        .header('Content-Type', 'application/xhtml+xml')
        .post(pageHtml);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response)
          }
        ]
      };
    })
);

server.tool(
  'search_pages',
  'Search page titles across notebooks.',
  toolSchemas.search_pages.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { query } = normalizeParams(params, {
        query: ['searchTerm', 'random_string']
      });
      const parsed = toolSchemas.search_pages.safeParse({ query });
      if (!parsed.success) {
        throw new Error('Missing required parameter: query');
      }

      const client = await ensureGraphClient();
      const pages = await fetchAll<any>(client, '/me/onenote/pages');
      const filteredPages = pages.filter((page) =>
        page.title?.toLowerCase().includes(parsed.data.query.toLowerCase())
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filteredPages)
          }
        ]
      };
    })
);

server.tool(
  'list_groups',
  'List all Microsoft 365 groups that have OneNote notebooks.',
  async () =>
    withAuthErrorHandling(async () => {
      const client = await ensureGraphClient();
      const groups = await fetchAllGroups(client);

      const groupsWithNotebooks: Array<{
        id: string;
        displayName: string;
        notebookCount: number;
      }> = [];

      for (const group of groups) {
        try {
          const notebooks = await client
            .api(
              `${getOnenoteRoot({ scope: 'group', groupId: group.id })}/notebooks`
            )
            .get();
          if (notebooks.value && notebooks.value.length > 0) {
            groupsWithNotebooks.push({
              id: group.id,
              displayName: group.displayName,
              notebookCount: notebooks.value.length
            });
          }
        } catch {
          // Skip groups without OneNote access
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(groupsWithNotebooks)
          }
        ]
      };
    })
);

server.tool(
  'list_group_notebooks',
  'List notebooks in a group. Path: "GroupName".',
  toolSchemas.list_group_notebooks.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { path } = normalizeParams(params, { path: [] });
      const parsed = toolSchemas.list_group_notebooks.parse({ path });
      const groupPath = parseGroupPath(parsed.path);

      const client = await ensureGraphClient();
      const resolved = await resolveGroupPath(client, {
        group: groupPath.group
      });

      const notebooks = await fetchAll<any>(
        client,
        `${resolved.onenoteRoot}/notebooks`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(notebooks)
          }
        ]
      };
    })
);

server.tool(
  'list_group_sections',
  'List sections in a group notebook. Path: "GroupName/NotebookName".',
  toolSchemas.list_group_sections.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { path } = normalizeParams(params, { path: [] });
      const parsed = toolSchemas.list_group_sections.parse({ path });
      const groupPath = parseGroupPath(parsed.path);

      if (!groupPath.notebook) {
        throw new Error(
          'Path must include a notebook. Use "GroupName/NotebookName".'
        );
      }

      const client = await ensureGraphClient();
      const resolved = await resolveGroupPath(client, {
        group: groupPath.group,
        notebook: groupPath.notebook
      });

      const sections = await fetchAll<any>(
        client,
        `${resolved.onenoteRoot}/notebooks/${resolved.notebookId}/sections`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sections)
          }
        ]
      };
    })
);

server.tool(
  'list_group_pages',
  'List pages in a group section. Path: "GroupName/NotebookName/SectionName".',
  toolSchemas.list_group_pages.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { path } = normalizeParams(params, { path: [] });
      const parsed = toolSchemas.list_group_pages.parse({ path });
      const groupPath = parseGroupPath(parsed.path);

      if (!groupPath.section) {
        throw new Error(
          'Path must include a section. Use "GroupName/NotebookName/SectionName".'
        );
      }

      const client = await ensureGraphClient();
      const resolved = await resolveGroupPath(client, {
        group: groupPath.group,
        notebook: groupPath.notebook,
        section: groupPath.section
      });

      const pages = await fetchAll<any>(
        client,
        `${resolved.onenoteRoot}/sections/${resolved.sectionId}/pages`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(pages)
          }
        ]
      };
    })
);

server.tool(
  'get_group_page',
  'Get the full HTML content of a group page. Path: "GroupName/NotebookName/SectionName/PageTitle".',
  toolSchemas.get_group_page.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { path, format } = normalizeParams(params, {
        path: [],
        format: ['outputFormat', 'output_format']
      });
      const parsed = toolSchemas.get_group_page.parse({ path, format });
      const groupPath = parseGroupPath(parsed.path);

      if (!groupPath.page) {
        throw new Error(
          'Path must include a page. Use "GroupName/NotebookName/SectionName/PageTitle".'
        );
      }

      const client = await ensureGraphClient();
      if (!accessToken) {
        throw new Error(
          "No valid access token available. Please call the 'authenticate' tool to sign in."
        );
      }

      const resolved = await resolveGroupPath(client, {
        group: groupPath.group,
        notebook: groupPath.notebook,
        section: groupPath.section
      });

      const html = await getPageContent(
        client,
        accessToken,
        { pageTitle: groupPath.page },
        fetch,
        `${resolved.onenoteRoot}/sections/${resolved.sectionId}`
      );
      const output = await formatPageContent(
        html,
        parsed.format as OutputFormat
      );
      const text =
        parsed.format === 'pdf'
          ? `data:application/pdf;base64,${output}`
          : output;

      return {
        content: [
          {
            type: 'text',
            text
          }
        ]
      };
    })
);

server.tool(
  'create_group_page',
  'Create a new page in a group section. Path: "GroupName/NotebookName/SectionName".',
  toolSchemas.create_group_page.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { path, title, html } = normalizeParams(params, {
        path: [],
        title: [],
        html: ['content']
      });
      const parsed = toolSchemas.create_group_page.parse({ path, title, html });
      const groupPath = parseGroupPath(parsed.path);

      if (!groupPath.section) {
        throw new Error(
          'Path must include a section. Use "GroupName/NotebookName/SectionName".'
        );
      }

      const client = await ensureGraphClient();
      const resolved = await resolveGroupPath(client, {
        group: groupPath.group,
        notebook: groupPath.notebook,
        section: groupPath.section
      });

      const pageTitle = parsed.title ?? 'New Page';
      const pageHtml =
        parsed.html ??
        `<!DOCTYPE html>
<html>
  <head>
    <title>${pageTitle}</title>
  </head>
  <body>
    <p>${pageTitle}</p>
  </body>
</html>`;

      const response = await client
        .api(`${resolved.onenoteRoot}/sections/${resolved.sectionId}/pages`)
        .header('Content-Type', 'application/xhtml+xml')
        .post(pageHtml);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response)
          }
        ]
      };
    })
);

server.tool(
  'search_group_pages',
  'Search page titles across a group\'s notebooks. Path: "GroupName".',
  toolSchemas.search_group_pages.shape,
  async (params) =>
    withAuthErrorHandling(async () => {
      const { path, query } = normalizeParams(params, {
        path: [],
        query: ['searchTerm']
      });
      const parsed = toolSchemas.search_group_pages.parse({ path, query });
      const groupPath = parseGroupPath(parsed.path);

      const client = await ensureGraphClient();
      const resolved = await resolveGroupPath(client, {
        group: groupPath.group
      });

      const pages = await fetchAll<any>(
        client,
        `${resolved.onenoteRoot}/pages`
      );
      const filteredPages = pages.filter((page: any) =>
        page.title?.toLowerCase().includes(parsed.query.toLowerCase())
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filteredPages)
          }
        ]
      };
    })
);

server.tool(
  'info',
  'Return server version and runtime configuration details.',
  async () => {
    const storageStatus = await getTokenStorageStatus();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            version: getPackageVersion(),
            tokenStorage: storageStatus,
            logging: logMetadata,
            env: {
              clientIdConfigured: Boolean(process.env.CLIENT_ID),
              graphAccessTokenSet: Boolean(process.env.GRAPH_ACCESS_TOKEN)
            }
          })
        }
      ]
    };
  }
);

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Server started successfully.');
  } catch (error) {
    logger.error({ error }, 'Error starting server.');
    process.exit(1);
  }
}

main();
