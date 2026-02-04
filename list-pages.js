import { createGraphClient } from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';
import { pickByNameOrId } from './lib/selection.js';

async function listPages() {
  try {
    const client = createGraphClient();

    // First, get all notebooks
    console.log('Fetching notebooks...');
    const notebooks = await fetchAll(client, '/me/onenote/notebooks');
    
    if (notebooks.length === 0) {
      console.log('No notebooks found.');
      return;
    }

    // Use the first notebook (you can modify this to select a specific notebook)
    const notebook = pickByNameOrId(notebooks, null, { allowEmpty: true }).item;
    console.log(`Using notebook: "${notebook.displayName}"`);

    // Get sections in the selected notebook
    console.log(`Fetching sections in "${notebook.displayName}" notebook...`);
    const sections = await fetchAll(client, `/me/onenote/notebooks/${notebook.id}/sections`);
    
    if (sections.length === 0) {
      console.log('No sections found in this notebook.');
      return;
    }

    // Use the first section (you can modify this to select a specific section)
    const section = pickByNameOrId(sections, null, { allowEmpty: true }).item;
    console.log(`Using section: "${section.displayName}"`);

    // Get pages in the section
    console.log(`Fetching pages in "${section.displayName}" section...`);
    const pages = await fetchAll(client, `/me/onenote/sections/${section.id}/pages`);
    
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
    console.error('Error listing pages:', error.message || error);
  }
}

// Run the function
listPages(); 