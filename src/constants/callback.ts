import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema'

/**
 * Shared callback target options for style and length rules.
 */
export const CALLBACK_TARGET_SCHEMA = {
  customCallbacks: {
    type: 'array',
    description:
      'Additional callback positions matched by exact module and export names.',
    items: {
      additionalProperties: false,
      required: ['source', 'name', 'callbackIndices'],
      type: 'object',
      properties: {
        name: { minLength: 1, type: 'string' },
        source: { minLength: 1, type: 'string' },
        autoImport: {
          description: 'Override the shared autoImport setting.',
          type: 'boolean',
        },
        callbackIndices: {
          items: { minimum: 0, type: 'integer' },
          minItems: 1,
          type: 'array',
          uniqueItems: true,
        },
      },
    },
  },
  exclude: {
    description: 'Original built-in API export names to exclude.',
    items: { type: 'string' },
    type: 'array',
    uniqueItems: true,
  },
  groups: {
    description: 'Built-in API groups to check.',
    type: 'array',
    uniqueItems: true,
    items: {
      enum: ['lifecycle', 'watch', 'cleanup', 'scheduler'],
      type: 'string',
    },
  },
  vueGlobals: {
    description: 'Unbound API names supplied by Vue auto-import tooling.',
    items: { type: 'string' },
    type: 'array',
    uniqueItems: true,
  },
  vueImportSources: {
    description: 'Exact module specifiers exposing Vue APIs.',
    items: { type: 'string' },
    type: 'array',
    uniqueItems: true,
  },
} satisfies Record<string, JSONSchema4>
