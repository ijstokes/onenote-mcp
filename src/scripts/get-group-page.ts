#!/usr/bin/env node

import fs from 'fs';
import fetch from 'node-fetch';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { parseGroupPath, resolveGroupPath } from '../lib/group-paths.js';
import { formatPageContent, type OutputFormat } from '../lib/format.js';

const args = process.argv.slice(2);
const formatFlag = args.find((a) => a.startsWith('--format='));
const format = (formatFlag?.split('=')[1] ?? 'text') as OutputFormat;
const pathArg = args
  .filter((a) => !a.startsWith('--format='))
  .join(' ')
  .trim();

if (!pathArg) {
  console.error(
    'Usage: node get-group-page.js "<Group/Notebook/Section/Page>" [--format=html|text|markdown|pdf]\nExample: node get-group-page.js "Engineering/Sprint Notes/2024 Q4/Retro" --format=markdown'
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

    const html = await response.text();
    const output = await formatPageContent(html, format);

    if (format === 'pdf') {
      const filename = `${parsed.page!.replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`;
      fs.writeFileSync(filename, Buffer.from(output, 'base64'));
      console.log(`\nPDF written to ${filename}`);
    } else {
      console.log('\n--- PAGE CONTENT ---\n');
      console.log(output);
      console.log('\n--- END OF CONTENT ---\n');
    }
  } catch (error) {
    console.error(
      'Error getting group page:',
      (error as Error).message || error
    );
  }
}

getGroupPage();
