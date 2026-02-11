#!/usr/bin/env node

import { writeAccessToken } from '../lib/auth.js';

const token = process.argv[2];
if (!token) {
  console.error(
    'Usage: node save-access-token.js "<access-token>"\n\nSaves a Microsoft Graph access token for use by the MCP server and CLI tools.'
  );
  process.exit(1);
}

async function saveToken() {
  try {
    await writeAccessToken(token);
    console.log('Access token saved successfully.');
  } catch (error) {
    console.error(
      'Error saving access token:',
      (error as Error).message || error
    );
  }
}

saveToken();
