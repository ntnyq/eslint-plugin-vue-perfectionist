import { createRule } from '../utils/create-rule.ts'
import { getMacroTypeStyle } from '../utils/macro-type-style.ts'
import { createMacroTypeVisitor } from '../utils/macro-types.ts'
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import type {
  DefineMacrosTypeStyleMessageId,
  DefineMacrosTypeStyleOptions,
} from '../types/index.ts'

const styles = ['inline', 'local', 'imported'] as const
const styleSchema = {
  anyOf: [
    { type: 'string', enum: [...styles] },
    {
      type: 'array',
      items: { type: 'string', enum: [...styles] },
      minItems: 1,
      uniqueItems: true,
    },
    { type: 'boolean', enum: [false] },
  ],
} satisfies JSONSchema4

export const defineMacrosTypeStyle = createRule<
  [DefineMacrosTypeStyleOptions],
  DefineMacrosTypeStyleMessageId
>({
  name: 'define-macros-type-style',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'enforce declaration styles for Vue macro type arguments.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          macros: {
            description:
              'Allowed styles per macro. Omitted keys default to local.',
            type: 'object',
            properties: {
              defineProps: styleSchema,
              defineEmits: styleSchema,
              defineSlots: styleSchema,
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedTypeStyle:
        'Expected {{macro}} type argument to use {{expected}} style; found {{actual}}.',
      unsupportedTypeForm:
        'Expected {{macro}} type argument to use {{expected}} style; this type expression is not supported.',
      unknownTypeSource:
        'Cannot determine the declaration source of the {{macro}} type argument. Use an explicit local declaration or import.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    return createMacroTypeVisitor(
      context.sourceCode,
      context.filename,
      (macro, node) => {
        const allowed = options.macros?.[macro] ?? 'local'
        if (allowed === false) {
          return
        }
        const actual = getMacroTypeStyle(node, context.sourceCode)
        const expected = styles
          .filter(style => allowed.includes(style))
          .join(', ')
        if (actual === 'unknown') {
          context.report({
            node,
            messageId: 'unknownTypeSource',
            data: { macro },
          })
        } else if (actual === 'unsupported') {
          context.report({
            node,
            messageId: 'unsupportedTypeForm',
            data: { macro, expected },
          })
        } else if (!allowed.includes(actual)) {
          context.report({
            node,
            messageId: 'unexpectedTypeStyle',
            data: { macro, expected, actual },
          })
        }
      },
    )
  },
})
