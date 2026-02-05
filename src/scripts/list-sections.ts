import { createGraphClient } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';
import { pickByNameOrId } from '../lib/selection.js';

async function listSections() {
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

    console.log(`\nSections in ${notebook.displayName} Notebook:`);
    console.log('============================');

    if (sections.length === 0) {
      console.log('No sections found.');
    } else {
      sections.forEach((section, index) => {
        console.log(`${index + 1}. ${section.displayName}`);
      });
    }
  } catch (error) {
    console.error('Error listing sections:', (error as Error).message || error);
  }
}

listSections();
