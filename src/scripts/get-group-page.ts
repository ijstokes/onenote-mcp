#!/usr/bin/env node

import fetch from 'node-fetch';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { parseGroupPath, resolveGroupPath } from '../lib/group-paths.js';

const pathArg = process.argv.slice(2).join(' ').trim();
if (!pathArg) {
  console.error(
    'Usage: node get-group-page.js "<Group/Notebook/Section/Page>"\nExample: node get-group-page.js "Engineering/Sprint Notes/2024 Q4/Retro"'
  );
  process.exit(1);
}

async function getGroupPage() {
  try {
    const accessToken = await readAccessToken();
    if (!accessToken) {
      console.error('No access token found. Please authenticate first.');
      return;
    }

    const client = await createGraphClient(accessToken);
    const parsed = parseGroupPath(pathArg);

    if (!parsed.page) {
      console.error(
        'Path must include all four segments: Group/Notebook/Section/Page'
      );
      process.exit(1);
    }

    console.log(`Resolving path: ${pathArg}...`);
    const resolved = await resolveGroupPath(client, parsed);

    const url = `https://graph.microsoft.com/v1.0${resolved.onenoteRoot}/pages/${resolved.pageId}/content`;
    console.log(`Fetching page content...`);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} ${response.statusText}`
      );
    }

    const content = await response.text();
    const plainText = content
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('\n--- PAGE CONTENT ---\n');
    console.log(plainText);
    console.log('\n--- END OF CONTENT ---\n');
  } catch (error) {
    console.error(
      'Error getting group page:',
      (error as Error).message || error
    );
  }
}

getGroupPage();
