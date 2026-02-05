import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tokenFilePath = path.join(os.tmpdir(), 'onenote-mcp-test-token.json');

vi.mock('../src/lib/config.js', () => ({
  tokenFilePath,
  tokenStorage: 'file',
  keychainService: 'onenote-mcp',
  keychainAccount: 'graph-access-token'
}));

import { readAccessToken, writeAccessToken } from '../src/lib/auth.js';

afterEach(() => {
  if (fs.existsSync(tokenFilePath)) {
    fs.unlinkSync(tokenFilePath);
  }
});

describe('auth file storage', () => {
  it('writes and reads token from file', async () => {
    await writeAccessToken('file-token');
    const token = await readAccessToken({ allowEnv: false });
    expect(token).toBe('file-token');
  });
});
