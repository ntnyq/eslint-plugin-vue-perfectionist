import { createOptionsSchema } from '../sort-statements/schema.ts'
import { BODY_SELECTORS } from './constants.ts'

const statementSchema = createOptionsSchema(BODY_SELECTORS)

/**
 * Body options share statement sorting semantics and add binding-name selection.
 */
export const OPTIONS_SCHEMA = {
  ...statementSchema,
  properties: {
    ...statementSchema.properties,
    functionPattern: {
      type: 'string',
      description:
        'Regular expression source selecting function binding names.',
    },
    ignoreNames: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
      description: 'Exact binding names excluded from body sorting.',
    },
  },
} as const
