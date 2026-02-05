import fs from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testTokenPath = vi.hoisted(() => '/tmp/onenote-mcp-test-token.json');

vi.mock('../src/lib/config.js', () => ({
  tokenFilePath: testTokenPath,
  tokenStorage: 'file',
  tokenStorageConfigured: 'file',
  keychainService: 'onenote-mcp',
  keychainAccount: 'graph-access-token',
  logLevel: 'info',
  logFilePath: '/tmp/onenote-mcp-test.log',
  consoleLogging: false
}));

import { readAccessToken, writeAccessToken } from '../src/lib/auth.js';

afterEach(() => {
  if (fs.existsSync(testTokenPath)) {
    fs.unlinkSync(testTokenPath);
  }
});

describe('auth file storage', () => {
  it('writes and reads token from file', async () => {
    await writeAccessToken('file-token');
    const token = await readAccessToken({ allowEnv: false });
    expect(token).toBe('file-token');
  });
});
