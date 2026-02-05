import { createGraphClient } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';
import { pickByNameOrId } from '../lib/selection.js';

async function createPage() {
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
    console.log(`Creating a new page in "${section.displayName}" section...`);

    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString();

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
      .header('Content-Type', 'application/xhtml+xml')
      .post(simpleHtml);

    console.log('\nNew page created successfully:');
    console.log(`Title: ${response.title}`);
    console.log(
      `Created: ${new Date(response.createdDateTime).toLocaleString()}`
    );
    console.log(`Link: ${response.links.oneNoteWebUrl.href}`);
  } catch (error) {
    console.error('Error creating page:', (error as Error).message || error);
  }
}

createPage();
