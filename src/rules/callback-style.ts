import { ASTUtils } from '@typescript-eslint/utils'
import { CALLBACK_APIS } from '../constants/callback-style.ts'
import { getCallIdentity, unwrapExpression } from '../utils/ast.ts'
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
          groups: {
            description: 'Built-in API groups to check.',
            type: 'array',
            items: {
              type: 'string',
              enum: ['lifecycle', 'watch', 'cleanup', 'scheduler'],
            },
            uniqueItems: true,
          },
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
          exclude: {
            description: 'Original built-in API export names to exclude.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          vueGlobals: {
            description:
              'Unbound API names supplied by Vue auto-import tooling.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          vueImportSources: {
            description: 'Exact module specifiers exposing Vue APIs.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          customCallbacks: {
            description:
              'Additional callback positions matched by exact module and export names.',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string', minLength: 1 },
                name: { type: 'string', minLength: 1 },
                callbackIndices: {
                  type: 'array',
                  items: { type: 'integer', minimum: 0 },
                  minItems: 1,
                  uniqueItems: true,
                },
              },
              required: ['source', 'name', 'callbackIndices'],
              additionalProperties: false,
            },
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
    const vueSources = new Set(options.vueImportSources ?? ['vue'])
    const vueGlobals = new Set(options.vueGlobals)
    const excluded = new Set(options.exclude)
    const builtins = new Map(
      (options.groups ?? ['lifecycle', 'watch']).flatMap(group =>
        Object.entries(CALLBACK_APIS[group]).filter(
          ([name]) => !excluded.has(name),
        ),
      ),
    )

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

    return {
      CallExpression(node) {
        const identity = getCallIdentity(node, sourceCode)
        if (!identity) {
          return
        }
        // The shared sorting resolver names default imports by their local name.
        // Callback matching instead uses their actual export name, "default".
        const callee = unwrapExpression(node.callee)
        const definition =
          callee.type === 'Identifier'
            ? ASTUtils.findVariable(sourceCode.getScope(callee), callee)
                ?.defs[0]
            : undefined
        const name =
          definition?.type === 'ImportBinding' &&
          definition.node.type === 'ImportDefaultSpecifier'
            ? 'default'
            : identity.name
        const indices = new Set<number>()
        if (
          (identity.source !== undefined && vueSources.has(identity.source)) ||
          (identity.isUnbound && vueGlobals.has(name))
        ) {
          const index = builtins.get(name)
          if (index !== undefined) {
            indices.add(index)
          }
        }
        for (const custom of options.customCallbacks ?? []) {
          if (custom.source === identity.source && custom.name === name) {
            for (const index of custom.callbackIndices) {
              indices.add(index)
            }
          }
        }
        const spreadIndex = node.arguments.findIndex(
          argument => argument.type === 'SpreadElement',
        )
        for (const index of indices) {
          const argument = node.arguments[index]
          if (argument && (spreadIndex === -1 || index < spreadIndex)) {
            checkCallback(argument, name)
          }
        }
      },
    }
  },
})
