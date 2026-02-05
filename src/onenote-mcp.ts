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
import { z } from 'zod';
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
      throw new Error('Access token not found. Please save access token first.');
    }
    graphClient = await createGraphClient(accessToken);
  }
  return graphClient;
}

async function createGraphClientWithAuth() {
  const existingToken = accessToken ?? (await readAccessToken({ allowEnv: true }));
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
      logger.warn({ error }, 'Failed to persist token; continuing with in-memory token.');
    }
    graphClient = await createGraphClient(accessToken);
    return { type: 'device_code', client: graphClient };
  } catch (error) {
    logger.error({ error }, 'Authentication error.');
    throw new Error(`Authentication failed: ${(error as Error).message}`);
  }
}

const getStringParam = (params: unknown, keys: string[]) => {
  if (!params || typeof params !== 'object') {
    return undefined;
  }
  for (const key of keys) {
    const value = (params as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const toolSchemas = {
  saveAccessToken: z.object({
    token: z.string().min(1)
  }),
  getNotebook: z.object({
    notebookId: z.string().optional(),
    notebookName: z.string().optional()
  }),
  listSections: z.object({
    notebookId: z.string().optional(),
    notebookName: z.string().optional()
  }),
  listPages: z.object({
    notebookId: z.string().optional(),
    notebookName: z.string().optional(),
    sectionId: z.string().optional(),
    sectionName: z.string().optional()
  }),
  getPage: z.object({
    pageId: z.string().optional(),
    pageTitle: z.string().optional()
  }),
  createPage: z.object({
    notebookId: z.string().optional(),
    notebookName: z.string().optional(),
    sectionId: z.string().optional(),
    sectionName: z.string().optional(),
    title: z.string().optional(),
    html: z.string().optional()
  }),
  searchPages: z.object({
    query: z.string().min(1)
  })
};

server.tool('authenticate', 'Start the authentication flow with Microsoft Graph', async () => {
  const result = await createGraphClientWithAuth();
  if (result.type === 'device_code') {
    const prompt = lastAuthMessage ?? 'Check your device login prompt for the code.';
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
});

server.tool('saveAccessToken', 'Save a Microsoft Graph access token for later use', async (params) => {
  const token = getStringParam(params, ['token', 'accessToken', 'random_string']);
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
});

server.tool('listNotebooks', 'List all OneNote notebooks', async () => {
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
});

server.tool('getNotebook', 'Get details of a specific notebook', async (params) => {
  const notebookId = getStringParam(params, ['notebookId', 'id']);
  const notebookName = getStringParam(params, ['notebookName', 'name', 'title']);
  const parsed = toolSchemas.getNotebook.parse({ notebookId, notebookName });

  const client = await ensureGraphClient();
  const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');
  const selection = pickByNameOrId(
    notebooks,
    parsed.notebookId ?? parsed.notebookName ?? null,
    { allowEmpty: true }
  );

  if (!selection.item) {
    throw new Error('Notebook not found.');
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(selection.item)
      }
    ]
  };
});

server.tool('listSections', 'List all sections in a notebook', async (params) => {
  const notebookId = getStringParam(params, ['notebookId', 'id']);
  const notebookName = getStringParam(params, ['notebookName', 'name', 'title']);
  const parsed = toolSchemas.listSections.parse({ notebookId, notebookName });

  const client = await ensureGraphClient();
  if (parsed.notebookId || parsed.notebookName) {
    const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');
    const selection = pickByNameOrId(
      notebooks,
      parsed.notebookId ?? parsed.notebookName ?? null,
      { allowEmpty: false }
    );
    if (!selection.item) {
      throw new Error('Notebook not found.');
    }
    const sections = await fetchAll<any>(
      client,
      `/me/onenote/notebooks/${selection.item.id}/sections`
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
});

server.tool('listPages', 'List all pages in a section', async (params) => {
  const notebookId = getStringParam(params, ['notebookId', 'notebook', 'id']);
  const notebookName = getStringParam(params, ['notebookName', 'notebookTitle', 'name']);
  const sectionId = getStringParam(params, ['sectionId', 'section']);
  const sectionName = getStringParam(params, ['sectionName', 'sectionTitle', 'name']);
  const parsed = toolSchemas.listPages.parse({
    notebookId,
    notebookName,
    sectionId,
    sectionName
  });

  const client = await ensureGraphClient();

  if (parsed.sectionId) {
    const pages = await fetchAll<any>(
      client,
      `/me/onenote/sections/${parsed.sectionId}/pages`
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

  let sectionsPath = '/me/onenote/sections';
  if (parsed.notebookId || parsed.notebookName) {
    const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');
    const selection = pickByNameOrId(
      notebooks,
      parsed.notebookId ?? parsed.notebookName ?? null,
      { allowEmpty: false }
    );
    if (!selection.item) {
      throw new Error('Notebook not found.');
    }
    sectionsPath = `/me/onenote/notebooks/${selection.item.id}/sections`;
  }

  const sections = await fetchAll<any>(client, sectionsPath);
  const sectionSelection = pickByNameOrId(
    sections,
    parsed.sectionName ?? null,
    { allowEmpty: true }
  );

  if (!sectionSelection.item) {
    throw new Error('Section not found.');
  }

  const pages = await fetchAll<any>(
    client,
    `/me/onenote/sections/${sectionSelection.item.id}/pages`
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(pages)
      }
    ]
  };
});

server.tool('getPage', 'Get the content of a page', async (params) => {
  const pageId = getStringParam(params, ['pageId', 'id']);
  const pageTitle = getStringParam(params, ['pageTitle', 'title', 'name']);
  const parsed = toolSchemas.getPage.parse({ pageId, pageTitle });

  const client = await ensureGraphClient();
  const pages = await fetchAll<any>(client, '/me/onenote/pages');
  let targetPage: any | undefined;

  if (parsed.pageId) {
    targetPage = pages.find((page) => page.id === parsed.pageId);
    if (!targetPage && parsed.pageId) {
      targetPage = pages.find(
        (page) => page.id?.includes(parsed.pageId) || parsed.pageId.includes(page.id)
      );
    }
  }

  if (!targetPage && parsed.pageTitle) {
    targetPage = pages.find((page) =>
      page.title?.toLowerCase().includes(parsed.pageTitle.toLowerCase())
    );
  }

  if (!targetPage) {
    targetPage = pages[0];
  }

  if (!targetPage) {
    throw new Error('Page not found.');
  }

  if (!accessToken) {
    accessToken = await readAccessToken({ allowEnv: true });
  }
  if (!accessToken) {
    throw new Error('Access token not found. Please save access token first.');
  }

  const url = `https://graph.microsoft.com/v1.0/me/onenote/pages/${targetPage.id}/content`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  return {
    content: [
      {
        type: 'text',
        text: content
      }
    ]
  };
});

server.tool('createPage', 'Create a new page in a section', async (params) => {
  const notebookId = getStringParam(params, ['notebookId', 'notebook', 'id']);
  const notebookName = getStringParam(params, ['notebookName', 'notebookTitle', 'name']);
  const sectionId = getStringParam(params, ['sectionId', 'section', 'id']);
  const sectionName = getStringParam(params, ['sectionName', 'sectionTitle', 'name']);
  const title = getStringParam(params, ['title']);
  const html = getStringParam(params, ['html', 'content']);
  const parsed = toolSchemas.createPage.parse({
    notebookId,
    notebookName,
    sectionId,
    sectionName,
    title,
    html
  });

  const client = await ensureGraphClient();

  let targetSectionId = parsed.sectionId;
  if (!targetSectionId) {
    let sectionsPath = '/me/onenote/sections';
    if (parsed.notebookId || parsed.notebookName) {
      const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');
      const selection = pickByNameOrId(
        notebooks,
        parsed.notebookId ?? parsed.notebookName ?? null,
        { allowEmpty: false }
      );
      if (!selection.item) {
        throw new Error('Notebook not found.');
      }
      sectionsPath = `/me/onenote/notebooks/${selection.item.id}/sections`;
    }

    const sections = await fetchAll<any>(client, sectionsPath);
    const sectionSelection = pickByNameOrId(
      sections,
      parsed.sectionName ?? null,
      { allowEmpty: true }
    );
    if (!sectionSelection.item) {
      throw new Error('Section not found.');
    }
    targetSectionId = sectionSelection.item.id;
  }

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
});

server.tool('searchPages', 'Search for pages across notebooks', async (params) => {
  const query = getStringParam(params, ['query', 'searchTerm', 'random_string']);
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
});

server.tool('info', 'Get server version and configuration status', async () => {
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
});

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
