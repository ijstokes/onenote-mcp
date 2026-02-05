import { fetchAll } from './pagination.js';

type GraphClient = {
  api: (path: string) => { get: () => Promise<any> };
};

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
};

type FetchLike = (
  url: string,
  init: { headers: Record<string, string> }
) => Promise<FetchResponse>;

type PageSelection = {
  pageId?: string;
  pageTitle?: string;
};

const selectPage = (pages: any[], { pageId, pageTitle }: PageSelection) => {
  let targetPage: any | undefined;

  if (pageId) {
    targetPage = pages.find((page) => page.id === pageId);
    if (!targetPage) {
      targetPage = pages.find(
        (page) => page.id?.includes(pageId) || pageId.includes(page.id)
      );
    }
  }

  if (!targetPage && pageTitle) {
    targetPage = pages.find((page) =>
      page.title?.toLowerCase().includes(pageTitle.toLowerCase())
    );
  }

  if (!targetPage) {
    targetPage = pages[0];
  }

  if (!targetPage) {
    throw new Error('Page not found.');
  }

  return targetPage;
};

export async function getPageContent(
  client: GraphClient,
  accessToken: string,
  selection: PageSelection,
  fetchImpl: FetchLike
) {
  if (!accessToken) {
    throw new Error('Access token not found. Please save access token first.');
  }

  const pages = await fetchAll<any>(client, '/me/onenote/pages');
  const targetPage = selectPage(pages, selection);

  const url = `https://graph.microsoft.com/v1.0/me/onenote/pages/${targetPage.id}/content`;
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! Status: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}
