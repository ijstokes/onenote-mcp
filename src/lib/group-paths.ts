import { fetchAllGroups, pickGroup } from './groups.js';
import { getOnenoteRoot } from './onenote-paths.js';
import { fetchAll } from './pagination.js';
import { pickByNameOrId } from './selection.js';

type GraphClient = {
  api: (path: string) => { get: () => Promise<any> };
};

export type ParsedGroupPath = {
  group: string;
  notebook?: string;
  section?: string;
  page?: string;
};

export type ResolvedGroupPath = {
  groupId: string;
  onenoteRoot: string;
  notebookId?: string;
  sectionId?: string;
  pageId?: string;
};

export function parseGroupPath(path: string): ParsedGroupPath {
  if (!path || !path.trim()) {
    throw new Error('Path must not be empty.');
  }

  const trimmed = path.replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    throw new Error('Path must not be empty.');
  }

  const segments = trimmed.split('/');

  const result: ParsedGroupPath = { group: segments[0] };
  if (segments[1]) result.notebook = segments[1];
  if (segments[2]) result.section = segments[2];
  if (segments[3]) result.page = segments[3];

  return result;
}

function formatAvailable(items: any[], key = 'displayName'): string {
  const names = items.map((item) => item[key]).filter(Boolean);
  return names.length > 0 ? ` Available: ${names.join(', ')}` : '';
}

export async function resolveGroupPath(
  client: GraphClient,
  parsed: ParsedGroupPath
): Promise<ResolvedGroupPath> {
  const groups = (await fetchAllGroups(client)) as Record<string, any>[];
  const groupSelection = pickGroup(groups, parsed.group);
  if (!groupSelection.item) {
    throw new Error(
      `Group '${parsed.group}' not found.${formatAvailable(groups)}`
    );
  }

  const groupId = groupSelection.item.id;
  const onenoteRoot = getOnenoteRoot({ scope: 'group', groupId });
  const result: ResolvedGroupPath = { groupId, onenoteRoot };

  if (!parsed.notebook) return result;

  const notebooks = await fetchAll<any>(client, `${onenoteRoot}/notebooks`);
  const notebookSelection = pickByNameOrId(notebooks, parsed.notebook);
  if (!notebookSelection.item) {
    throw new Error(
      `Notebook '${parsed.notebook}' not found in group '${parsed.group}'.${formatAvailable(notebooks)}`
    );
  }
  result.notebookId = notebookSelection.item.id;

  if (!parsed.section) return result;

  const sections = await fetchAll<any>(
    client,
    `${onenoteRoot}/notebooks/${result.notebookId}/sections`
  );
  const sectionSelection = pickByNameOrId(sections, parsed.section);
  if (!sectionSelection.item) {
    throw new Error(
      `Section '${parsed.section}' not found in notebook '${parsed.notebook}'.${formatAvailable(sections)}`
    );
  }
  result.sectionId = sectionSelection.item.id;

  if (!parsed.page) return result;

  const pages = await fetchAll<any>(
    client,
    `${onenoteRoot}/sections/${result.sectionId}/pages`
  );
  const pageSelection = pickByNameOrId(pages, parsed.page, {
    nameKey: 'title'
  });
  if (!pageSelection.item) {
    throw new Error(
      `Page '${parsed.page}' not found in section '${parsed.section}'.${formatAvailable(pages, 'title')}`
    );
  }
  result.pageId = pageSelection.item.id;

  return result;
}
