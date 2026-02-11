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
  save_access_token: z.object({
    token: z.string().min(1)
  }),
  get_notebook: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional()
  }),
  list_sections: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional()
  }),
  list_pages: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    sectionName: z.string().min(1).optional()
  }),
  get_page: z.object({
    pageId: z.string().min(1).optional(),
    pageTitle: z.string().min(1).optional()
  }),
  create_page: z.object({
    notebookId: z.string().min(1).optional(),
    notebookName: z.string().min(1).optional(),
    sectionId: z.string().min(1).optional(),
    sectionName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    html: z.string().min(1).optional()
  }),
  search_pages: z.object({
    query: z.string().min(1)
  }),
  list_group_notebooks: z.object({
    path: z.string().min(1)
  }),
  list_group_sections: z.object({
    path: z.string().min(1)
  }),
  list_group_pages: z.object({
    path: z.string().min(1)
  }),
  get_group_page: z.object({
    path: z.string().min(1)
  }),
  create_group_page: z.object({
    path: z.string().min(1),
    title: z.string().optional(),
    html: z.string().optional()
  }),
  search_group_pages: z.object({
    path: z.string().min(1),
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
  list_notebooks: emptySchema,
  save_access_token: {
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
  get_notebook: {
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
  list_sections: {
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
  list_pages: {
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
  get_page: {
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
  create_page: {
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
  search_pages: {
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
  },
  list_groups: emptySchema,
  list_group_notebooks: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        minLength: 1,
        description: 'Group name or ID. Example: "Engineering"'
      }
    }
  },
  list_group_sections: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        minLength: 1,
        description:
          'Path as "Group/Notebook". Example: "Engineering/Sprint Notes"'
      }
    }
  },
  list_group_pages: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        minLength: 1,
        description:
          'Path as "Group/Notebook/Section". Example: "Engineering/Sprint Notes/2024 Q4"'
      }
    }
  },
  get_group_page: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        minLength: 1,
        description:
          'Path as "Group/Notebook/Section/Page". Example: "Engineering/Sprint Notes/2024 Q4/Retro"'
      }
    }
  },
  create_group_page: {
    type: 'object',
    additionalProperties: false,
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        minLength: 1,
        description:
          'Path as "Group/Notebook/Section". Example: "Engineering/Sprint Notes/2024 Q4"'
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
  search_group_pages: {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'query'],
    properties: {
      path: {
        type: 'string',
        minLength: 1,
        description: 'Group name or ID. Example: "Engineering"'
      },
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
