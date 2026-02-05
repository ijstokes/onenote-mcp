type SelectionOptions = {
  nameKey?: string;
  idKey?: string;
  allowEmpty?: boolean;
};

type SelectionResult<T> = {
  item?: T;
  matches?: T[];
};

export function pickByNameOrId<T extends Record<string, any>>(
  items: T[],
  query: string | null | undefined,
  { nameKey = 'displayName', idKey = 'id', allowEmpty = false }: SelectionOptions = {}
): SelectionResult<T> {
  if (!items || items.length === 0) {
    return { matches: [] };
  }

  if (!query) {
    return allowEmpty ? { item: items[0] } : { matches: [] };
  }

  const normalizedQuery = query.toLowerCase();

  const exactMatches = items.filter(
    (item) => (item[nameKey] || '').toLowerCase() === normalizedQuery
  );
  if (exactMatches.length === 1) {
    return { item: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return { matches: exactMatches };
  }

  const partialMatches = items.filter((item) =>
    (item[nameKey] || '').toLowerCase().includes(normalizedQuery)
  );
  if (partialMatches.length === 1) {
    return { item: partialMatches[0] };
  }
  if (partialMatches.length > 1) {
    return { matches: partialMatches };
  }

  const idMatch = items.find((item) => item[idKey] === query);
  if (idMatch) {
    return { item: idMatch };
  }

  return { matches: [] };
}
