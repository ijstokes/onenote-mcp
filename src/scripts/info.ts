#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTokenStorageStatus } from '../lib/auth.js';
import {
  logFilePath,
  logLevel,
  consoleLogging,
  scopes
} from '../lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');

async function showInfo() {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const storage = await getTokenStorageStatus();

    console.log('OneNote MCP Server Info');
    console.log('='.repeat(40));
    console.log(`Version:          ${pkg.version}`);
    console.log(`Name:             ${pkg.name}`);
    console.log(
      `Token storage:    ${storage.storageMode} (configured: ${storage.configuredStorage})`
    );
    console.log(
      `Keychain:         ${storage.keychainAvailable ? 'available' : 'not available'}`
    );
    console.log(`Log file:         ${logFilePath}`);
    console.log(`Log level:        ${logLevel}`);
    console.log(`Console logging:  ${consoleLogging}`);
    console.log(`Scopes:           ${scopes.join(', ')}`);
  } catch (error) {
    console.error('Error:', (error as Error).message || error);
  }
}

showInfo();
