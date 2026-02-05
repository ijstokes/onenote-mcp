import { z } from 'zod';

type InputSchema = {
  type: 'object';
  properties?: Record<
    string,
    { type: 'string'; description?: string; minLength?: number }
  >;
  required?: string[];
  additionalProperties?: boolean;
};

export const toolSchemas = {
  saveAccessToken: z.object({
    token: z.string().min(1)
  }),
  getNotebook: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional()
  }),
  listSections: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional()
  }),
  listPages: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    sectionName: z.string().min(1).optional()
  }),
  getPage: z.object({
    pageId: z.string().min(1).optional(),
    pageTitle: z.string().min(1).optional()
  }),
  createPage: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    sectionName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    html: z.string().min(1).optional()
  }),
  searchPages: z.object({
    query: z.string().min(1)
  })
};

const emptySchema: InputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {}
};

export const toolInputSchemas: Record<string, InputSchema> = {
  authenticate: emptySchema,
  info: emptySchema,
  listNotebooks: emptySchema,
  saveAccessToken: {
    type: 'object',
    additionalProperties: false,
    required: ['token'],
    properties: {
      token: {
        type: 'string',
        minLength: 1,
        description: 'Microsoft Graph access token to store.'
      }
    }
  },
  getNotebook: {
    type: 'object',
    additionalProperties: false,
    properties: {
      notebookId: {
        type: 'string',
        minLength: 1,
        description: 'Notebook ID to retrieve.'
      },
      notebookName: {
        type: 'string',
        minLength: 1,
        description: 'Notebook display name to retrieve.'
      }
    }
  },
  listSections: {
    type: 'object',
    additionalProperties: false,
    properties: {
      notebookId: {
        type: 'string',
        minLength: 1,
        description: 'Notebook ID to filter sections.'
      },
      notebookName: {
        type: 'string',
        minLength: 1,
        description: 'Notebook display name to filter sections.'
      }
    }
  },
  listPages: {
    type: 'object',
    additionalProperties: false,
    properties: {
      notebookId: {
        type: 'string',
        minLength: 1,
        description: 'Notebook ID to filter sections.'
      },
      notebookName: {
        type: 'string',
        minLength: 1,
        description: 'Notebook display name to filter sections.'
      },
      sectionId: {
        type: 'string',
        minLength: 1,
        description: 'Section ID to list pages.'
      },
      sectionName: {
        type: 'string',
        minLength: 1,
        description: 'Section name to list pages.'
      }
    }
  },
  getPage: {
    type: 'object',
    additionalProperties: false,
    properties: {
      pageId: {
        type: 'string',
        minLength: 1,
        description: 'Page ID to retrieve.'
      },
      pageTitle: {
        type: 'string',
        minLength: 1,
        description: 'Page title (partial match) to retrieve.'
      }
    }
  },
  createPage: {
    type: 'object',
    additionalProperties: false,
    properties: {
      notebookId: {
        type: 'string',
        minLength: 1,
        description: 'Notebook ID to scope the section lookup.'
      },
      notebookName: {
        type: 'string',
        minLength: 1,
        description: 'Notebook display name to scope the section lookup.'
      },
      sectionId: {
        type: 'string',
        minLength: 1,
        description: 'Section ID to create the page.'
      },
      sectionName: {
        type: 'string',
        minLength: 1,
        description: 'Section name to create the page.'
      },
      title: {
        type: 'string',
        minLength: 1,
        description: 'Page title.'
      },
      html: {
        type: 'string',
        minLength: 1,
        description: 'Full HTML body for the new page.'
      }
    }
  },
  searchPages: {
    type: 'object',
    additionalProperties: false,
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Search query used to match page titles.'
      }
    }
  }
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
