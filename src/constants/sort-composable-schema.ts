import type { JSONSchema } from '@typescript-eslint/utils'

const PATTERN = {
  format: 'regex',
  type: 'string',
} satisfies JSONSchema.JSONSchema4
const NAME = { minLength: 1, type: 'string' } satisfies JSONSchema.JSONSchema4
const NAMES = {
  items: NAME,
  type: 'array',
  uniqueItems: true,
} satisfies JSONSchema.JSONSchema4
const KIND = {
  enum: ['state', 'method'],
  type: 'string',
} satisfies JSONSchema.JSONSchema4
const NEWLINES = {
  anyOf: [
    { minimum: 0, type: 'integer' },
    { enum: ['ignore'], type: 'string' },
  ],
} satisfies JSONSchema.JSONSchema4
const OVERRIDES = {
  newlinesInside: {
    description: 'Blank lines within a group; defaults to zero.',
    ...NEWLINES,
  },
  order: {
    description: 'Within-group comparison direction; defaults to asc.',
    enum: ['asc', 'desc'],
    type: 'string',
  },
  type: {
    description: 'Comparison within a group; defaults to unsorted.',
    enum: ['unsorted', 'alphabetical', 'natural', 'name-length'],
    type: 'string',
  },
} satisfies Record<string, JSONSchema.JSONSchema4>

export const SORT_COMPOSABLE_PROPERTIES = {
  ...OVERRIDES,
  customGroups: {
    description: 'First-match subdivisions of confirmed member categories.',
    type: 'array',
    items: {
      additionalProperties: false,
      required: ['groupName', 'selector'],
      type: 'object',
      properties: {
        elementNamePattern: PATTERN,
        groupName: NAME,
        selector: KIND,
      },
    },
  },
  fix: {
    description: 'Safe whitespace fixes or diagnostics only; defaults to safe.',
    enum: ['safe', 'none'],
    type: 'string',
  },
  functionPattern: {
    description: 'Composable name pattern; defaults to ^use[A-Z].',
    ...PATTERN,
  },
  groups: {
    description: 'Replace default groups; empty disables ordering and spacing.',
    type: 'array',
    items: {
      anyOf: [
        NAME,
        { ...NAMES, minItems: 1 },
        {
          additionalProperties: false,
          required: ['group'],
          type: 'object',
          properties: {
            ...OVERRIDES,
            group: { anyOf: [NAME, { ...NAMES, minItems: 1 }] },
          },
        },
        {
          additionalProperties: false,
          properties: { newlinesBetween: NEWLINES },
          required: ['newlinesBetween'],
          type: 'object',
        },
      ],
    },
  },
  ignoreNames: {
    description: 'Exact normalized names to exclude; empty excludes nothing.',
    ...NAMES,
  },
  memberKinds: {
    description: 'First-match fallback classifications; empty infers nothing.',
    type: 'array',
    items: {
      additionalProperties: false,
      required: ['functionPattern', 'elementNamePattern', 'kind'],
      type: 'object',
      properties: {
        elementNamePattern: PATTERN,
        functionPattern: PATTERN,
        kind: KIND,
      },
    },
  },
  newlinesBetween: {
    description: 'Blank lines between groups; defaults to one.',
    ...NEWLINES,
  },
  typeInformation: {
    description: 'Require full TypeScript services; disabled by default.',
    type: 'boolean',
  },
  unknownMembers: {
    description: 'Whether to report unknown member kinds; defaults to ignore.',
    enum: ['ignore', 'report'],
    type: 'string',
  },
} satisfies Record<string, JSONSchema.JSONSchema4>
