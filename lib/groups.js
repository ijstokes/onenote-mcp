import { fetchAll } from './pagination.js';
import { pickByNameOrId } from './selection.js';

export async function fetchAllGroups(client) {
  return fetchAll(client, '/groups?$select=id,displayName');
}

export function pickGroup(groups, query) {
  return pickByNameOrId(groups, query);
}
