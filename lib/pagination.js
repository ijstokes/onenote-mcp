export async function fetchAll(client, apiPath) {
  const items = [];
  let nextUrl = apiPath;

  while (nextUrl) {
    const response = await client.api(nextUrl).get();
    if (Array.isArray(response.value)) {
      items.push(...response.value);
    }
    nextUrl = response['@odata.nextLink'] || null;
  }

  return items;
}
