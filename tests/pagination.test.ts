import { describe, expect, it } from 'vitest';
import { fetchAll } from '../src/lib/pagination.js';

describe('fetchAll', () => {
  it('fetches paginated results until nextLink is empty', async () => {
    const calls: string[] = [];
    const responses: Record<string, any> = {
      '/start': { value: [{ id: 1 }], '@odata.nextLink': '/next' },
      '/next': { value: [{ id: 2 }], '@odata.nextLink': null }
    };

    const client = {
      api: (path: string) => ({
        get: async () => {
          calls.push(path);
          return responses[path];
        }
      })
    };

    const result = await fetchAll(client, '/start');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(calls).toEqual(['/start', '/next']);
  });
});
