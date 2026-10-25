import { getCaseConverter } from 'uncase'
import {
  getStaticStringValue,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getSetupMacroCalls } from '../utils/vue/setup-macros.ts'
import type {
  DefineModelNameCasingMessageId,
  DefineModelNameCasingOptions,
} from '../types/index.ts'

export const defineModelNameCasing = createRule<
  [DefineModelNameCasingOptions],
  DefineModelNameCasingMessageId
>({
  name: 'define-model-name-casing',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'enforce casing for explicit defineModel names.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          casing: {
            type: 'string',
            enum: ['camelCase', 'PascalCase', 'kebab-case', 'snake_case'],
            description:
              'Casing used for explicit model names. Defaults to camelCase.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedNameCasing: 'Expected model name "{{name}}" to use {{casing}}.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const casing = options.casing ?? 'camelCase'
    const convert = getCaseConverter(casing)
    return {
      Program(program) {
        for (const call of getSetupMacroCalls(
          program,
          context.sourceCode,
          context.filename,
        )) {
          if (
            call.callee.type !== 'Identifier' ||
            call.callee.name !== 'defineModel' ||
            call.arguments.length > 2
          ) {
            continue
          }
          const argument = call.arguments[0]
          if (!argument) {
            continue
          }
          const node = unwrapExpression(argument)
          const name = getStaticStringValue(node)
          if (name !== undefined && convert(name).changed) {
            context.report({
              node,
              messageId: 'unexpectedNameCasing',
              data: { name, casing },
            })
          }
        }
      },
    }
  },
})
