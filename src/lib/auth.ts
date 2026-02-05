import fs from 'fs';
import { Client } from '@microsoft/microsoft-graph-client';
import {
  keychainAccount,
  keychainService,
  tokenFilePath,
  tokenStorage
} from './config.js';
import { logger } from './logger.js';

type TokenReadOptions = {
  allowEnv?: boolean;
};

let keytarModule: typeof import('keytar') | null | undefined;

async function getKeytar() {
  if (keytarModule !== undefined) {
    return keytarModule;
  }
  try {
    const imported = await import('keytar');
    keytarModule = (imported.default ?? imported) as typeof import('keytar');
  } catch (error) {
    keytarModule = null;
  }
  return keytarModule;
}

export async function readAccessToken(
  options: TokenReadOptions = {}
): Promise<string | null> {
  const { allowEnv = true } = options;
  if (allowEnv && process.env.GRAPH_ACCESS_TOKEN) {
    return process.env.GRAPH_ACCESS_TOKEN;
  }

  if (tokenStorage === 'env') {
    return null;
  }

  if (tokenStorage !== 'file') {
    const keytar = await getKeytar();
    if (keytar) {
      try {
        const token = await keytar.getPassword(keychainService, keychainAccount);
        if (token) {
          return token;
        }
      } catch (error) {
        logger.warn({ error }, 'Keychain read failed, falling back to file.');
      }
    }
  }

  if (!fs.existsSync(tokenFilePath)) {
    return null;
  }

  const tokenData = fs.readFileSync(tokenFilePath, 'utf8');
  try {
    const parsedToken = JSON.parse(tokenData) as { token?: string };
    return parsedToken.token ?? null;
  } catch (parseError) {
    return tokenData;
  }
}

export async function writeAccessToken(token: string): Promise<void> {
  if (tokenStorage === 'env') {
    throw new Error('Token storage is set to env-only.');
  }

  if (tokenStorage !== 'file') {
    const keytar = await getKeytar();
    if (keytar) {
      try {
        await keytar.setPassword(keychainService, keychainAccount, token);
        return;
      } catch (error) {
        logger.warn({ error }, 'Keychain write failed, falling back to file.');
      }
    }
  }

  fs.writeFileSync(tokenFilePath, JSON.stringify({ token }));
}

export async function createGraphClient(accessToken?: string): Promise<Client> {
  const token = accessToken || (await readAccessToken());
  if (!token) {
    throw new Error('Access token not found. Please authenticate first.');
  }

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => token
    }
  });
}

export async function getTokenStorageStatus() {
  const keytar = tokenStorage !== 'file' ? await getKeytar() : null;
  return {
    storageMode: tokenStorage,
    keychainAvailable: Boolean(keytar)
  };
}
