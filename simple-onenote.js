import { createGraphClient } from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';

async function listNotebooks() {
  try {
    const client = createGraphClient();

    // Get notebooks
    console.log('Fetching notebooks...');
    const notebooks = await fetchAll(client, '/me/onenote/notebooks');
    
    console.log('\nYour OneNote Notebooks:');
    console.log('=======================');
    
    if (notebooks.length === 0) {
      console.log('No notebooks found.');
    } else {
      notebooks.forEach((notebook, index) => {
        console.log(`${index + 1}. ${notebook.displayName}`);
      });
    }

  } catch (error) {
    console.error('Error listing notebooks:', error.message || error);
  }
}

// Run the function
listNotebooks(); 