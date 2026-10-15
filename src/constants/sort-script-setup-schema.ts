import { MODIFIERS, SELECTORS } from './sort-script-setup.ts'
import type { JSONSchema } from '@typescript-eslint/utils'

const SORT_TYPES = [
  'alphabetical',
  'natural',
  'line-length',
  'custom',
  'unsorted',
]
const regexPattern: JSONSchema.JSONSchema4 = {
  anyOf: [
    { type: 'string' },
    {
      additionalProperties: false,
      required: ['pattern'],
      type: 'object',
      properties: {
        flags: {
          type: 'string',
        },
        pattern: {
          type: 'string',
        },
      },
    },
  ],
}
const regex: JSONSchema.JSONSchema4 = {
  anyOf: [
    regexPattern,
    {
      items: regexPattern,
      minItems: 1,
      type: 'array',
    },
  ],
}
const newlines: JSONSchema.JSONSchema4 = {
  anyOf: [
    {
      minimum: 0,
      type: 'integer',
    },
    {
      enum: ['ignore'],
      type: 'string',
    },
  ],
}
const comment: JSONSchema.JSONSchema4 = {
  anyOf: [
    {
      type: 'boolean',
    },
    regex,
  ],
}
const overrides: Record<string, JSONSchema.JSONSchema4> = {
  newlinesInside: newlines,
  fallbackSort: {
    additionalProperties: false,
    required: ['type'],
    type: 'object',
    properties: {
      order: {
        enum: ['asc', 'desc'],
        type: 'string',
      },
      type: {
        enum: [...SORT_TYPES, 'subgroup-order'],
        type: 'string',
      },
    },
  },
  order: {
    enum: ['asc', 'desc'],
    type: 'string',
  },
  type: {
    enum: SORT_TYPES,
    type: 'string',
  },
}
const condition: Record<string, JSONSchema.JSONSchema4> = {
  callNamePattern: regex,
  elementNamePattern: regex,
  importSourcePattern: regex,
  modifiers: {
    minItems: 1,
    type: 'array',
    uniqueItems: true,
    items: {
      enum: MODIFIERS,
      type: 'string',
    },
  },
  selector: {
    enum: SELECTORS,
    type: 'string',
  },
}
const groupName: JSONSchema.JSONSchema4 = {
  minLength: 1,
  type: 'string',
}
const groupNames: JSONSchema.JSONSchema4 = {
  anyOf: [
    groupName,
    {
      items: groupName,
      minItems: 1,
      type: 'array',
    },
  ],
}

/**
 * Common sorting and partitioning options for the rule schema.
 */
export const COMMON_PROPERTIES: Record<string, JSONSchema.JSONSchema4> = {
  ...overrides,
  newlinesBetween: newlines,
  alphabet: {
    type: 'string',
  },
  ignoreCase: {
    type: 'boolean',
  },
  locales: {
    anyOf: [
      {
        minLength: 1,
        type: 'string',
      },
      {
        minItems: 1,
        type: 'array',
        items: {
          minLength: 1,
          type: 'string',
        },
      },
    ],
  },
  newlinesInside: {
    anyOf: [
      newlines,
      {
        enum: ['newlinesBetween'],
        type: 'string',
      },
    ],
  },
  partitionByComment: {
    anyOf: [
      comment,
      {
        additionalProperties: false,
        type: 'object',
        properties: {
          block: comment,
          line: comment,
        },
      },
    ],
  },
  partitionByNewLine: {
    type: 'boolean',
  },
  specialCharacters: {
    enum: ['keep', 'trim', 'remove'],
    type: 'string',
  },
}

/**
 * Rule option schema rejects unknown fields and unsupported upstream options.
 */
export const OPTIONS_SCHEMA = {
  additionalProperties: false,
  type: 'object',
  properties: {
    ...COMMON_PROPERTIES,
    vueImportSources: { items: groupName, type: 'array', uniqueItems: true },
    customGroups: {
      type: 'array',
      items: {
        anyOf: [
          {
            additionalProperties: false,
            required: ['groupName'],
            type: 'object',
            properties: {
              groupName,
              ...overrides,
              ...condition,
            },
          },
          {
            additionalProperties: false,
            required: ['groupName', 'anyOf'],
            type: 'object',
            properties: {
              groupName,
              ...overrides,
              anyOf: {
                minItems: 1,
                type: 'array',
                items: {
                  additionalProperties: false,
                  properties: condition,
                  type: 'object',
                },
              },
            },
          },
        ],
      },
    },
    fix: {
      enum: ['safe', 'none'],
      type: 'string',
    },
    groups: {
      type: 'array',
      items: {
        anyOf: [
          groupNames,
          {
            additionalProperties: false,
            required: ['group'],
            type: 'object',
            properties: {
              group: groupNames,
              ...overrides,
            },
          },
          {
            additionalProperties: false,
            required: ['newlinesBetween'],
            type: 'object',
            properties: {
              newlinesBetween: newlines,
            },
          },
        ],
      },
    },
    vueGlobals: {
      items: groupName,
      type: 'array',
      uniqueItems: true,
    },
  },
} satisfies JSONSchema.JSONSchema4
