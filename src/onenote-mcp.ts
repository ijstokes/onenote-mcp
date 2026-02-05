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
  getTokenStorageStatus,
  readAccessToken,
  writeAccessToken
} from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';
import { pickByNameOrId } from './lib/selection.js';
import { logger, logMetadata } from './lib/logger.js';
import {
  normalizeParams,
  toolInputSchemas,
  toolSchemas
} from './lib/tool-schemas.js';
import { getPageContent } from './lib/pages.js';

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

async function ensureGraphClient() {
  if (!graphClient) {
    if (!accessToken) {
      accessToken = await readAccessToken({ allowEnv: true });
    }
    if (!accessToken) {
      throw new Error(
        'Access token not found. Please save access token first.'
      );
    }
    graphClient = await createGraphClient(accessToken);
  }
  return graphClient;
}

async function createGraphClientWithAuth() {
  const existingToken =
    accessToken ?? (await readAccessToken({ allowEnv: true }));
  if (existingToken) {
    graphClient = await createGraphClient(existingToken);
    accessToken = existingToken;
    return { type: 'token', client: graphClient };
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
  {
    description: 'Start the Microsoft device-code authentication flow.',
    inputSchema: toolInputSchemas.authenticate
  },
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
          text: 'Already authenticated with an access token.'
        }
      ]
    };
  }
);

server.tool(
  'saveAccessToken',
  {
    description: 'Save a Microsoft Graph access token for later use.',
    inputSchema: toolInputSchemas.saveAccessToken
  },
  async (params) => {
    const { token } = normalizeParams(params, {
      token: ['accessToken', 'random_string']
    });
    const parsed = toolSchemas.saveAccessToken.safeParse({ token });
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
  'listNotebooks',
  {
    description: 'List all OneNote notebooks you can access.',
    inputSchema: toolInputSchemas.listNotebooks
  },
  async () => {
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
  }
);

server.tool(
  'getNotebook',
  {
    description: 'Get a single notebook by ID or name.',
    inputSchema: toolInputSchemas.getNotebook
  },
  async (params) => {
    const { notebookId, notebookName } = normalizeParams(params, {
      notebookId: ['id'],
      notebookName: ['name', 'title']
    });
    const parsed = toolSchemas.getNotebook.parse({ notebookId, notebookName });

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
  }
);

server.tool(
  'listSections',
  {
    description: 'List sections, optionally filtered by notebook.',
    inputSchema: toolInputSchemas.listSections
  },
  async (params) => {
    const { notebookId, notebookName } = normalizeParams(params, {
      notebookId: ['id'],
      notebookName: ['name', 'title']
    });
    const parsed = toolSchemas.listSections.parse({ notebookId, notebookName });

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
  }
);

server.tool(
  'listPages',
  {
    description: 'List pages, optionally filtered by notebook and/or section.',
    inputSchema: toolInputSchemas.listPages
  },
  async (params) => {
    const { notebookId, notebookName, sectionId, sectionName } =
      normalizeParams(params, {
        notebookId: ['notebook', 'id'],
        notebookName: ['notebookTitle', 'name'],
        sectionId: ['section'],
        sectionName: ['sectionTitle', 'name']
      });
    const parsed = toolSchemas.listPages.parse({
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
  }
);

server.tool(
  'getPage',
  {
    description: 'Get the full HTML content for a page.',
    inputSchema: toolInputSchemas.getPage
  },
  async (params) => {
    const { pageId, pageTitle } = normalizeParams(params, {
      pageId: ['id'],
      pageTitle: ['title', 'name']
    });
    const parsed = toolSchemas.getPage.parse({ pageId, pageTitle });

    const client = await ensureGraphClient();
    if (!accessToken) {
      accessToken = await readAccessToken({ allowEnv: true });
    }
    if (!accessToken) {
      throw new Error(
        'Access token not found. Please save access token first.'
      );
    }
    const content = await getPageContent(
      client,
      accessToken,
      { pageId: parsed.pageId, pageTitle: parsed.pageTitle },
      fetch
    );
    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }
);

server.tool(
  'createPage',
  {
    description: 'Create a new page in a section.',
    inputSchema: toolInputSchemas.createPage
  },
  async (params) => {
    const { notebookId, notebookName, sectionId, sectionName, title, html } =
      normalizeParams(params, {
        notebookId: ['notebook', 'id'],
        notebookName: ['notebookTitle', 'name'],
        sectionId: ['section', 'id'],
        sectionName: ['sectionTitle', 'name'],
        title: [],
        html: ['content']
      });
    const parsed = toolSchemas.createPage.parse({
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
  }
);

server.tool(
  'searchPages',
  {
    description: 'Search page titles across notebooks.',
    inputSchema: toolInputSchemas.searchPages
  },
  async (params) => {
    const { query } = normalizeParams(params, {
      query: ['searchTerm', 'random_string']
    });
    const parsed = toolSchemas.searchPages.safeParse({ query });
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
  }
);

server.tool(
  'info',
  {
    description: 'Return server version and runtime configuration details.',
    inputSchema: toolInputSchemas.info
  },
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
