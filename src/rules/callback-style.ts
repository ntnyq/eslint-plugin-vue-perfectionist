import { CALLBACK_TARGET_SCHEMA } from '../constants/callback.ts'
import { unwrapExpression } from '../utils/ast.ts'
import { createCallbackVisitor } from '../utils/callback.ts'
import { createRule } from '../utils/create-rule.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  CallbackStyleMessageId,
  CallbackStyleOptions,
} from '../types/index.ts'

export const callbackStyle = createRule<
  [CallbackStyleOptions],
  CallbackStyleMessageId
>({
  name: 'callback-style',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce inline callback function and body styles for Vue APIs.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          ...CALLBACK_TARGET_SCHEMA,
          functionStyle: {
            description:
              'Whether to require arrow functions or accept any inline function.',
            type: 'string',
            enum: ['arrow', 'any'],
          },
          bodyStyle: {
            description: 'Whether to require block bodies for arrow callbacks.',
            type: 'string',
            enum: ['block', 'any'],
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedInlineCallback: 'Expected an inline callback for "{{name}}".',
      expectedArrowCallback: 'Expected an arrow callback for "{{name}}".',
      expectedBlockBody: 'Expected a block body for the "{{name}}" callback.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const functionStyle = options.functionStyle ?? 'arrow'
    const bodyStyle = options.bodyStyle ?? 'block'

    function checkCallback(argument: TSESTree.Node, name: string) {
      const callback = unwrapExpression(argument)
      if (callback.type === 'FunctionExpression') {
        if (functionStyle === 'arrow') {
          context.report({
            node: callback,
            messageId: 'expectedArrowCallback',
            data: { name },
          })
        }
        return
      }
      if (callback.type !== 'ArrowFunctionExpression') {
        context.report({
          node: callback,
          messageId: 'expectedInlineCallback',
          data: { name },
        })
        return
      }
      if (bodyStyle === 'any' || callback.body.type === 'BlockStatement') {
        return
      }
      context.report({
        node: callback.body,
        messageId: 'expectedBlockBody',
        data: { name },
        fix(fixer) {
          const arrow = sourceCode.getTokenBefore(
            callback.body,
            token => token.value === '=>',
          )
          if (!arrow) {
            return null
          }
          // Include parentheses and comments outside the expression's AST range.
          // Parenthesizing the returned text prevents ASI and preserves sequences.
          const range: TSESTree.Range = [arrow.range[1], callback.range[1]]
          const body = sourceCode.text.slice(...range).trim()
          return fixer.replaceTextRange(range, ` { return (${body}) }`)
        },
      })
    }

    return createCallbackVisitor(
      sourceCode,
      context.settings,
      options,
      checkCallback,
    )
  },
})
