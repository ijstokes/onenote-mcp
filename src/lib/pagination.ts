export async function fetchAll<T>(client: { api: (path: string) => { get: () => Promise<any> } }, apiPath: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = apiPath;

  while (nextUrl) {
    const response = await client.api(nextUrl).get();
    if (Array.isArray(response.value)) {
      items.push(...response.value);
    }
    nextUrl = response['@odata.nextLink'] || null;
  }

  return items;
}
