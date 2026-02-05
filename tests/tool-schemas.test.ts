import { describe, expect, it } from 'vitest';
import { normalizeParams, toolSchemas } from '../src/lib/tool-schemas.js';

describe('tool schemas', () => {
  it('normalizes alias parameters', () => {
    const params = { random_string: 'token-123' };
    const normalized = normalizeParams(params, { token: ['random_string'] });
    expect(normalized.token).toBe('token-123');
  });

  it('rejects missing required token', () => {
    const parsed = toolSchemas.saveAccessToken.safeParse({ token: '' });
    expect(parsed.success).toBe(false);
  });

  it('requires search query', () => {
    const parsed = toolSchemas.searchPages.safeParse({ query: '' });
    expect(parsed.success).toBe(false);
  });
});
