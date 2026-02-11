#!/usr/bin/env node

import { createGraphClient } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';
import { pickByNameOrId } from '../lib/selection.js';

const notebookQuery = process.argv.slice(2).join(' ').trim();
if (!notebookQuery) {
  console.error(
    'Usage: node get-notebook.js "<notebook name or id>"\nExample: node get-notebook.js "Work"'
  );
  process.exit(1);
}

async function getNotebook() {
  try {
    const client = await createGraphClient();

    console.log('Fetching notebooks...');
    const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');

    const selection = pickByNameOrId(notebooks, notebookQuery);
    if (!selection.item) {
      console.log(`No notebook found matching "${notebookQuery}".`);
      if (notebooks.length > 0) {
        console.log('Available notebooks:');
        notebooks.forEach((nb, index) => {
          console.log(`  ${index + 1}. ${nb.displayName} (id: ${nb.id})`);
        });
      }
      return;
    }

    const nb = selection.item;
    console.log('\nNotebook Details:');
    console.log('='.repeat(40));
    console.log(`Name:      ${nb.displayName}`);
    console.log(`ID:        ${nb.id}`);
    console.log(`Created:   ${nb.createdDateTime}`);
    console.log(`Modified:  ${nb.lastModifiedDateTime}`);
    if (nb.links?.oneNoteWebUrl?.href) {
      console.log(`Link:      ${nb.links.oneNoteWebUrl.href}`);
    }
  } catch (error) {
    console.error('Error getting notebook:', (error as Error).message || error);
  }
}

getNotebook();
