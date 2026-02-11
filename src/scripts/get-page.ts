#!/usr/bin/env node

import fs from 'fs';
import fetch from 'node-fetch';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';
import { formatPageContent, type OutputFormat } from '../lib/format.js';

const args = process.argv.slice(2);
const formatFlag = args.find((a) => a.startsWith('--format='));
const format = (formatFlag?.split('=')[1] ?? 'text') as OutputFormat;
const pageTitle = args.filter((a) => !a.startsWith('--format=')).join(' ');

if (!pageTitle) {
  console.error(
    'Please provide a page title as argument. Example: node get-page.js "Questions" --format=markdown'
  );
  process.exit(1);
}

async function getPageContent() {
  try {
    const accessToken = await readAccessToken();
    if (!accessToken) {
      console.error('No access token found');
      return;
    }

    const client = await createGraphClient(accessToken);

    console.log(`Searching for page with title: "${pageTitle}"...`);
    const pages = await fetchAll<any>(client, '/me/onenote/pages');

    if (!pages || pages.length === 0) {
      console.error('No pages found');
      return;
    }

    const page = pages.find(
      (p) => p.title && p.title.toLowerCase().includes(pageTitle.toLowerCase())
    );

    if (!page) {
      console.error(`No page found with title containing "${pageTitle}"`);
      console.log('Available pages:');
      pages.forEach((p) => console.log(`- ${p.title}`));
      return;
    }

    console.log(`Found page: "${page.title}" (ID: ${page.id})`);

    const url = `https://graph.microsoft.com/v1.0/me/onenote/pages/${page.id}/content`;
    console.log(`Fetching content from: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();
    console.log(`Content received! Length: ${html.length} characters`);

    const output = await formatPageContent(html, format);

    if (format === 'pdf') {
      const filename = `${page.title.replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`;
      fs.writeFileSync(filename, Buffer.from(output, 'base64'));
      console.log(`\nPDF written to ${filename}`);
    } else {
      console.log('\n--- PAGE CONTENT ---\n');
      console.log(output);
      console.log('\n--- END OF CONTENT ---\n');
    }
  } catch (error) {
    console.error('Error:', (error as Error).message || error);
  }
}

getPageContent();
