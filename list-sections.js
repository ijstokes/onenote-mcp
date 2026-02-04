import { createGraphClient } from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';
import { pickByNameOrId } from './lib/selection.js';

async function listSections() {
  try {
    const client = createGraphClient();

    // First, let's get all notebooks
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
    console.error('Error listing sections:', error.message || error);
  }
}

// Run the function
listSections(); 