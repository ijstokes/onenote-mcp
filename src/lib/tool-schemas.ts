import { z } from 'zod';

export const toolSchemas = {
  save_access_token: z.object({
    token: z.string().min(1).describe('Microsoft Graph access token to store.')
  }),
  get_notebook: z.object({
    notebookId: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook ID to retrieve.'),
    notebookName: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook display name to retrieve.')
  }),
  list_sections: z.object({
    notebookId: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook ID to filter sections.'),
    notebookName: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook display name to filter sections.')
  }),
  list_pages: z.object({
    notebookId: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook ID to filter sections.'),
    notebookName: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook display name to filter sections.'),
    sectionId: z
      .string()
      .min(1)
      .optional()
      .describe('Section ID to list pages.'),
    sectionName: z
      .string()
      .min(1)
      .optional()
      .describe('Section name to list pages.')
  }),
  get_page: z.object({
    pageId: z.string().min(1).optional().describe('Page ID to retrieve.'),
    pageTitle: z
      .string()
      .min(1)
      .optional()
      .describe('Page title (partial match) to retrieve.'),
    format: z
      .enum(['html', 'text', 'markdown', 'pdf'])
      .optional()
      .default('html')
      .describe('Output format: html (default), text, markdown, or pdf.')
  }),
  create_page: z.object({
    notebookId: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook ID to scope the section lookup.'),
    notebookName: z
      .string()
      .min(1)
      .optional()
      .describe('Notebook display name to scope the section lookup.'),
    sectionId: z
      .string()
      .min(1)
      .optional()
      .describe('Section ID to create the page.'),
    sectionName: z
      .string()
      .min(1)
      .optional()
      .describe('Section name to create the page.'),
    title: z.string().min(1).optional().describe('Page title.'),
    html: z
      .string()
      .min(1)
      .optional()
      .describe('Full HTML body for the new page.')
  }),
  search_pages: z.object({
    query: z.string().min(1).describe('Search query used to match page titles.')
  }),
  list_group_notebooks: z.object({
    path: z.string().min(1).describe('Group name or ID. Example: "Engineering"')
  }),
  list_group_sections: z.object({
    path: z
      .string()
      .min(1)
      .describe('Path as "Group/Notebook". Example: "Engineering/Sprint Notes"')
  }),
  list_group_pages: z.object({
    path: z
      .string()
      .min(1)
      .describe(
        'Path as "Group/Notebook/Section". Example: "Engineering/Sprint Notes/2024 Q4"'
      )
  }),
  get_group_page: z.object({
    path: z
      .string()
      .min(1)
      .describe(
        'Path as "Group/Notebook/Section/Page". Example: "Engineering/Sprint Notes/2024 Q4/Retro"'
      ),
    format: z
      .enum(['html', 'text', 'markdown', 'pdf'])
      .optional()
      .default('html')
      .describe('Output format: html (default), text, markdown, or pdf.')
  }),
  create_group_page: z.object({
    path: z
      .string()
      .min(1)
      .describe(
        'Path as "Group/Notebook/Section". Example: "Engineering/Sprint Notes/2024 Q4"'
      ),
    title: z.string().optional().describe('Page title.'),
    html: z.string().optional().describe('Full HTML body for the new page.')
  }),
  search_group_pages: z.object({
    path: z
      .string()
      .min(1)
      .describe('Group name or ID. Example: "Engineering"'),
    query: z.string().min(1).describe('Search query used to match page titles.')
  })
};

export const getStringParam = (params: unknown, keys: string[]) => {
  if (!params || typeof params !== 'object') {
    return undefined;
  }
  for (const key of keys) {
    const value = (params as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

export const normalizeParams = <T extends Record<string, string[]>>(
  params: unknown,
  mapping: T
) => {
  const normalized: Record<string, string | undefined> = {};
  for (const [canonical, aliases] of Object.entries(mapping)) {
    normalized[canonical] = getStringParam(params, [canonical, ...aliases]);
  }
  return normalized;
};
