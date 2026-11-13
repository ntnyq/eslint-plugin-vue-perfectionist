import type { JSONSchema } from '@typescript-eslint/utils'

export const COMPONENT_NAMES_SCHEMA: JSONSchema.JSONSchema4 = {
  description: 'Explicit component names, with PascalCase/kebab-case matching.',
  items: { minLength: 1, pattern: '^\\S+$', type: 'string' },
  minItems: 1,
  type: 'array',
  uniqueItems: true,
}
