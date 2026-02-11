#!/usr/bin/env node

import { createGraphClient } from '../lib/auth.js';
import { parseGroupPath, resolveGroupPath } from '../lib/group-paths.js';

const args = process.argv.slice(2);
const pathArg = args[0];
const title = args[1];

if (!pathArg) {
  console.error(
    'Usage: node create-group-page.js "<Group/Notebook/Section>" ["Page Title"]\nExample: node create-group-page.js "Engineering/Sprint Notes/2024 Q4" "Retro Notes"'
  );
  process.exit(1);
}

async function createGroupPage() {
  try {
    const client = await createGraphClient();
    const parsed = parseGroupPath(pathArg);

    if (!parsed.section) {
      console.error(
        'Path must include at least three segments: Group/Notebook/Section'
      );
      process.exit(1);
    }

    console.log(`Resolving path: ${pathArg}...`);
    const resolved = await resolveGroupPath(client, parsed);

    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString();
    const pageTitle = title || `Created via CLI on ${formattedDate}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pageTitle}</title>
        </head>
        <body>
          <h1>${pageTitle}</h1>
          <p>Created via the OneNote MCP CLI at ${formattedTime} on ${formattedDate}.</p>
        </body>
      </html>
    `;

    console.log(`Creating page "${pageTitle}" in ${pathArg}...`);
    const response = await client
      .api(`${resolved.onenoteRoot}/sections/${resolved.sectionId}/pages`)
      .header('Content-Type', 'application/xhtml+xml')
      .post(html);

    console.log('\nPage created successfully:');
    console.log(`Title:   ${response.title}`);
    console.log(
      `Created: ${new Date(response.createdDateTime).toLocaleString()}`
    );
    if (response.links?.oneNoteWebUrl?.href) {
      console.log(`Link:    ${response.links.oneNoteWebUrl.href}`);
    }
  } catch (error) {
    console.error(
      'Error creating group page:',
      (error as Error).message || error
    );
  }
}

createGroupPage();
