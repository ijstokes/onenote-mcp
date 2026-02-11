#!/usr/bin/env node

import { createGraphClient } from '../lib/auth.js';
import { fetchAllGroups, pickGroup } from '../lib/groups.js';
import { getOnenoteRoot } from '../lib/onenote-paths.js';
import { fetchAll } from '../lib/pagination.js';

const groupQuery = process.argv[2];
const searchQuery = process.argv.slice(3).join(' ').trim();

if (!groupQuery || !searchQuery) {
  console.error(
    'Usage: node search-group-pages.js "<group name or id>" "<search query>"\nExample: node search-group-pages.js "Engineering" "retro"'
  );
  process.exit(1);
}

async function searchGroupPages() {
  try {
    const client = await createGraphClient();

    console.log('Fetching groups...');
    const groups = (await fetchAllGroups(client)) as Record<string, any>[];

    const selection = pickGroup(groups, groupQuery);
    if (!selection.item) {
      console.log(`No group found matching "${groupQuery}".`);
      if (groups.length > 0) {
        console.log('Available groups:');
        groups.forEach((g, i) => console.log(`  ${i + 1}. ${g.displayName}`));
      }
      return;
    }

    const group = selection.item;
    const onenoteRoot = getOnenoteRoot({ scope: 'group', groupId: group.id });

    console.log(
      `Searching pages in group "${group.displayName}" for "${searchQuery}"...`
    );
    const pages = await fetchAll<any>(client, `${onenoteRoot}/pages`);

    const matches = pages.filter(
      (p) =>
        p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())
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
    console.error(
      'Error searching group pages:',
      (error as Error).message || error
    );
  }
}

searchGroupPages();
