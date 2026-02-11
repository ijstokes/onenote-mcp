#!/usr/bin/env node

import { createGraphClient } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';

const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.error(
    'Usage: node search-pages.js "<search query>"\nExample: node search-pages.js "meeting notes"'
  );
  process.exit(1);
}

async function searchPages() {
  try {
    const client = await createGraphClient();

    console.log(`Searching for pages matching "${query}"...`);
    const pages = await fetchAll<any>(client, '/me/onenote/pages');

    const matches = pages.filter(
      (p) => p.title && p.title.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      console.log('No matching pages found.');
      return;
    }

    console.log(`\nFound ${matches.length} matching page(s):`);
    console.log('='.repeat(40));
    matches.forEach((page, index) => {
      console.log(`${index + 1}. ${page.title} (id: ${page.id})`);
    });
  } catch (error) {
    console.error('Error searching pages:', (error as Error).message || error);
  }
}

searchPages();
