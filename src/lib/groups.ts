import { fetchAll } from './pagination.js';
import { pickByNameOrId } from './selection.js';

export async function fetchAllGroups(client: {
  api: (path: string) => { get: () => Promise<any> };
}) {
  return fetchAll(client, '/groups?$select=id,displayName');
}

export function pickGroup<T extends Record<string, any>>(
  groups: T[],
  query: string
) {
  return pickByNameOrId(groups, query);
}
