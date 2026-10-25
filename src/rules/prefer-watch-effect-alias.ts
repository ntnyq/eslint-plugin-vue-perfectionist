import {
  getStaticStringValue,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { resolveVueGlobals } from '../utils/vue/globals.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  PreferWatchEffectAliasMessageId,
  PreferWatchEffectAliasOptions,
} from '../types/index.ts'

/**
 * Read the final flush property without evaluating options or unknown keys.
 *
 * @param node - The inline options object.
 * @returns The static flush value, or undefined when it cannot be established.
 */
function getFlush(node: TSESTree.ObjectExpression): string | undefined {
  let flush: string | undefined
  for (const property of node.properties) {
    if (property.type === 'SpreadElement') {
      return undefined
    }
    const key =
      !property.computed && property.key.type === 'Identifier'
        ? property.key.name
        : getStaticStringValue(property.key)
    if (key === undefined) {
      return undefined
    }
    if (key === 'flush') {
      flush =
        property.kind === 'init' && !property.method
          ? getStaticStringValue(property.value)
          : undefined
    }
  }
  return flush
}

export const preferWatchEffectAlias = createRule<
  [PreferWatchEffectAliasOptions],
  PreferWatchEffectAliasMessageId
>({
  name: 'prefer-watch-effect-alias',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require dedicated aliases for post and sync watch effects.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          vueGlobals: {
            description:
              'Unbound API names, overriding shared auto-import recognition.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          vueImportSources: {
            description:
              'Exact module specifiers replacing the default vue source.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      preferredAlias:
        'Prefer "{{alias}}" over "watchEffect" with flush: "{{flush}}".',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const sources = new Set(options.vueImportSources ?? ['vue'])
    const globals = new Set(
      resolveVueGlobals(context.settings, ['watchEffect'], options.vueGlobals),
    )

    return {
      CallExpression(node) {
        if (
          node.arguments.length !== 2 ||
          node.arguments[0]?.type === 'SpreadElement'
        ) {
          return
        }
        const identity = getCallIdentity(node, sourceCode)
        if (
          !identity ||
          (identity.exportedName ?? identity.name) !== 'watchEffect'
        ) {
          return
        }
        const isVueApi =
          (identity.source !== undefined && sources.has(identity.source)) ||
          (identity.isUnbound && globals.has('watchEffect'))
        if (!isVueApi) {
          return
        }
        const argument = node.arguments[1]
        const object = argument && unwrapExpression(argument)
        if (object?.type !== 'ObjectExpression') {
          return
        }
        const flush = getFlush(object)
        if (flush !== 'post' && flush !== 'sync') {
          return
        }
        context.report({
          node: node.callee,
          messageId: 'preferredAlias',
          data: {
            alias: flush === 'post' ? 'watchPostEffect' : 'watchSyncEffect',
            flush,
          },
        })
      },
    }
  },
})
