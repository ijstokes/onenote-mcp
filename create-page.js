import { createGraphClient } from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';
import { pickByNameOrId } from './lib/selection.js';

async function createPage() {
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

    // Create a new page
    console.log(`Creating a new page in "${section.displayName}" section...`);
    
    // Current date and time
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString();
    
    // Create simple HTML content
    const simpleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Created via MCP on ${formattedDate}</title>
        </head>
        <body>
          <h1>Created via MCP on ${formattedDate}</h1>
          <p>This page was created via the Microsoft Graph API at ${formattedTime}.</p>
          <p>This demonstrates that the OneNote MCP integration is working correctly!</p>
          <ul>
            <li>The authentication flow is working</li>
            <li>We can create new pages</li>
            <li>We can access existing notebooks</li>
          </ul>
        </body>
      </html>
    `;
    
    const response = await client
      .api(`/me/onenote/sections/${section.id}/pages`)
      .header("Content-Type", "application/xhtml+xml")
      .post(simpleHtml);
    
    console.log(`\nNew page created successfully:`);
    console.log(`Title: ${response.title}`);
    console.log(`Created: ${new Date(response.createdDateTime).toLocaleString()}`);
    console.log(`Link: ${response.links.oneNoteWebUrl.href}`);

  } catch (error) {
    console.error('Error creating page:', error.message || error);
  }
}

// Run the function
createPage(); 