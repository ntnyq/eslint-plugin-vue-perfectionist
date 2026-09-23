import type { JSONSchema } from '@typescript-eslint/utils'

export const COMPONENT_NAMES_SCHEMA: JSONSchema.JSONSchema4 = {
  description: 'Explicit component names, with PascalCase/kebab-case matching.',
  items: { minLength: 1, pattern: '^\\S+$', type: 'string' },
  minItems: 1,
  type: 'array',
  uniqueItems: true,
}

export const PROP_TYPE_SCHEMA: JSONSchema.JSONSchema4 = {
  type: 'string',
  enum: [
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'function',
    'bigint',
    'symbol',
    'null',
    'undefined',
  ],
}

export const PROP_TYPES_SCHEMA: JSONSchema.JSONSchema4 = {
  anyOf: [
    PROP_TYPE_SCHEMA,
    { items: PROP_TYPE_SCHEMA, minItems: 1, type: 'array', uniqueItems: true },
  ],
}
