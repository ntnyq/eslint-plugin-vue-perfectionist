import type { JSONSchema } from '@typescript-eslint/utils'

export const PROP_VALUE_CONSTRAINT_SCHEMA: JSONSchema.JSONSchema4 = {
  additionalProperties: false,
  minProperties: 1,
  type: 'object',
  properties: {
    maximum: { description: 'Inclusive numeric upper bound.', type: 'number' },
    minimum: { description: 'Inclusive numeric lower bound.', type: 'number' },
    enum: {
      description: 'Allowed scalar values without coercion.',
      items: { type: ['string', 'number', 'boolean', 'null'] },
      minItems: 1,
      type: 'array',
      uniqueItems: true,
    },
    maxLength: {
      description: 'Maximum Unicode code point count.',
      maximum: Number.MAX_SAFE_INTEGER,
      minimum: 0,
      type: 'integer',
    },
    minLength: {
      description: 'Minimum Unicode code point count.',
      maximum: Number.MAX_SAFE_INTEGER,
      minimum: 0,
      type: 'integer',
    },
    multipleOf: {
      description: 'Positive safe integer divisor of a finite number.',
      maximum: Number.MAX_SAFE_INTEGER,
      minimum: 1,
      type: 'integer',
    },
    pattern: {
      description: 'Unicode regular expression source without delimiters.',
      type: 'string',
    },
  },
}
