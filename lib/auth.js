import fs from 'fs';
import { Client } from '@microsoft/microsoft-graph-client';
import { tokenFilePath } from './config.js';

export function readAccessToken({ allowEnv = true } = {}) {
  if (allowEnv && process.env.GRAPH_ACCESS_TOKEN) {
    return process.env.GRAPH_ACCESS_TOKEN;
  }

  if (!fs.existsSync(tokenFilePath)) {
    return null;
  }

  const tokenData = fs.readFileSync(tokenFilePath, 'utf8');

  try {
    const parsedToken = JSON.parse(tokenData);
    return parsedToken.token;
  } catch (parseError) {
    return tokenData;
  }
}

export function writeAccessToken(token) {
  fs.writeFileSync(tokenFilePath, JSON.stringify({ token }));
}

export function createGraphClient(accessToken) {
  const token = accessToken || readAccessToken();
  if (!token) {
    throw new Error('Access token not found. Please authenticate first.');
  }

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => token
    }
  });
}
