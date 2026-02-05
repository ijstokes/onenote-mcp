import { createGraphClient } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';
import { pickByNameOrId } from '../lib/selection.js';

async function listPages() {
  try {
    const client = await createGraphClient();

    console.log('Fetching notebooks...');
    const notebooks = await fetchAll<any>(client, '/me/onenote/notebooks');

    if (notebooks.length === 0) {
      console.log('No notebooks found.');
      return;
    }

    const notebook = pickByNameOrId(notebooks, null, { allowEmpty: true }).item;
    if (!notebook) {
      console.log('No notebook selected.');
      return;
    }

    console.log(`Using notebook: "${notebook.displayName}"`);
    console.log(`Fetching sections in "${notebook.displayName}" notebook...`);
    const sections = await fetchAll<any>(
      client,
      `/me/onenote/notebooks/${notebook.id}/sections`
    );

    if (sections.length === 0) {
      console.log('No sections found in this notebook.');
      return;
    }

    const section = pickByNameOrId(sections, null, { allowEmpty: true }).item;
    if (!section) {
      console.log('No section selected.');
      return;
    }

    console.log(`Using section: "${section.displayName}"`);
    console.log(`Fetching pages in "${section.displayName}" section...`);
    const pages = await fetchAll<any>(
      client,
      `/me/onenote/sections/${section.id}/pages`
    );

    console.log(`\nPages in ${section.displayName}:`);
    console.log('=====================');

    if (pages.length === 0) {
      console.log('No pages found.');
    } else {
      pages.forEach((page, index) => {
        const createdAt = page.createdDateTime
          ? new Date(page.createdDateTime).toLocaleString()
          : 'Unknown';
        console.log(`${index + 1}. ${page.title} (Created: ${createdAt})`);
      });
    }
  } catch (error) {
    console.error('Error listing pages:', (error as Error).message || error);
  }
}

listPages();
