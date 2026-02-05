import { describe, expect, it, vi } from 'vitest';

const keytarMock = {
  getPassword: vi.fn(async () => 'keychain-token'),
  setPassword: vi.fn(async () => undefined)
};

vi.mock('keytar', () => ({
  default: keytarMock
}));

vi.mock('../src/lib/config.js', () => ({
  tokenFilePath: '/tmp/onenote-mcp-test-token.json',
  tokenStorage: 'keychain',
  tokenStorageConfigured: 'keychain',
  keychainService: 'onenote-mcp',
  keychainAccount: 'graph-access-token',
  logLevel: 'info',
  logFilePath: '/tmp/onenote-mcp-test.log',
  consoleLogging: false
}));

import { readAccessToken, writeAccessToken } from '../src/lib/auth.js';

describe('auth keychain storage', () => {
  it('reads token from keychain when available', async () => {
    const token = await readAccessToken({ allowEnv: false });
    expect(token).toBe('keychain-token');
    expect(keytarMock.getPassword).toHaveBeenCalled();
  });

  it('writes token to keychain', async () => {
    await writeAccessToken('new-token');
    expect(keytarMock.setPassword).toHaveBeenCalledWith(
      'onenote-mcp',
      'graph-access-token',
      'new-token'
    );
  });
});
