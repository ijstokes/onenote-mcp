import { describe, expect, it } from 'vitest';
import { normalizeParams, toolSchemas } from '../src/lib/tool-schemas.js';

describe('tool schemas', () => {
  it('normalizes alias parameters', () => {
    const params = { random_string: 'token-123' };
    const normalized = normalizeParams(params, { token: ['random_string'] });
    expect(normalized.token).toBe('token-123');
  });

  it('rejects missing required token', () => {
    const parsed = toolSchemas.save_access_token.safeParse({ token: '' });
    expect(parsed.success).toBe(false);
  });

  it('requires search query', () => {
    const parsed = toolSchemas.search_pages.safeParse({ query: '' });
    expect(parsed.success).toBe(false);
  });

  it('get_page accepts valid format and defaults to html', () => {
    const parsed = toolSchemas.get_page.parse({ pageTitle: 'Test' });
    expect(parsed.format).toBe('html');
  });

  it('get_page accepts explicit format', () => {
    const parsed = toolSchemas.get_page.parse({
      pageTitle: 'Test',
      format: 'markdown'
    });
    expect(parsed.format).toBe('markdown');
  });

  it('get_page rejects invalid format', () => {
    const parsed = toolSchemas.get_page.safeParse({
      pageTitle: 'Test',
      format: 'docx'
    });
    expect(parsed.success).toBe(false);
  });

  it('get_group_page accepts format parameter', () => {
    const parsed = toolSchemas.get_group_page.parse({
      path: 'Group/Notebook/Section/Page',
      format: 'text'
    });
    expect(parsed.format).toBe('text');
  });

  it('get_group_page defaults format to html', () => {
    const parsed = toolSchemas.get_group_page.parse({
      path: 'Group/Notebook/Section/Page'
    });
    expect(parsed.format).toBe('html');
  });
});
