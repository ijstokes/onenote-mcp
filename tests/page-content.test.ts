import { describe, expect, it, vi } from 'vitest';
import { getPageContent } from '../src/lib/pages.js';

describe('getPageContent', () => {
  it('fetches page HTML using graph pages and fetch', async () => {
    const client = {
      api: (path: string) => ({
        get: async () => {
          if (path !== '/me/onenote/pages') {
            return { value: [] };
          }
          return { value: [{ id: 'page-1', title: 'Test Page' }] };
        }
      })
    };

    const fetchMock = vi.fn(
      async (_url: string, _init: { headers: Record<string, string> }) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '<html>page</html>'
      })
    );

    const content = await getPageContent(
      client,
      'token-123',
      { pageTitle: 'Test' },
      fetchMock
    );

    expect(content).toBe('<html>page</html>');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.microsoft.com/v1.0/me/onenote/pages/page-1/content',
      {
        headers: {
          Authorization: 'Bearer token-123'
        }
      }
    );
  });
});
