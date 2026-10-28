import { ESLintUtils } from '@typescript-eslint/utils'
import {
  getStaticStringValue,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { createInjectionKeyTypeChecker } from '../utils/injection-key.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { resolveVueGlobals } from '../utils/vue/globals.ts'
import { getScriptVariableDefinitions } from '../utils/vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  RequireInjectionKeyMessageId,
  RequireInjectionKeyOptions,
} from '../types/index.ts'

export const requireInjectionKey = createRule<
  [RequireInjectionKeyOptions],
  RequireInjectionKeyMessageId
>({
  name: 'require-injection-key',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'disallow string keys in Vue provide and inject calls.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          strict: {
            description:
              'Require a Vue InjectionKey type using complete TypeScript parser services.',
            type: 'boolean',
          },
          allowStrings: {
            description: 'Exact string keys allowed for third-party contracts.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          vueGlobals: {
            description:
              'Unbound API names overriding shared auto-import recognition.',
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
      expectedInjectionKey:
        'Expected a Vue InjectionKey<T> in {{name}}(); received {{type}}. Declare a shared key with an explicit InjectionKey<T> type.',
      unexpectedStringKey:
        'Use a shared symbol key instead of the string "{{key}}" in {{name}}(). In TypeScript, declare it as InjectionKey<T>.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const sources = new Set(options.vueImportSources ?? ['vue'])
    const globals = new Set(
      resolveVueGlobals(
        context.settings,
        ['provide', 'inject'],
        options.vueGlobals,
      ),
    )
    const allowed = new Set(options.allowStrings)
    const services = options.strict
      ? ESLintUtils.getParserServices(context)
      : undefined
    const checker = services?.program.getTypeChecker()
    const isInjectionKey =
      services && createInjectionKeyTypeChecker(services.program, allowed)

    /**
     * Follow immutable local aliases without evaluating code or crossing files.
     *
     * @param node - The key expression or alias initializer.
     * @param seen - Declarations already visited on this resolution path.
     * @returns The known string key, or undefined for unsupported expressions.
     */
    function resolveString(
      node: TSESTree.Node,
      seen = new Set<TSESTree.Node>(),
    ): string | undefined {
      const expression = unwrapExpression(node)
      const literal = getStaticStringValue(expression)
      if (literal !== undefined || expression.type !== 'Identifier') {
        return literal
      }
      const definitions = getScriptVariableDefinitions(expression, sourceCode)
      const definition = definitions[0]
      if (
        definitions.length !== 1 ||
        definition?.type !== 'Variable' ||
        definition.parent.kind !== 'const'
      ) {
        return undefined
      }
      const declaration = definition.node
      if (
        declaration.id.type !== 'Identifier' ||
        !declaration.init ||
        seen.has(declaration)
      ) {
        return undefined
      }
      seen.add(declaration)
      return resolveString(declaration.init, seen)
    }

    return {
      CallExpression(node) {
        const key = node.arguments[0]
        if (!key || key.type === 'SpreadElement') {
          return
        }
        const identity = getCallIdentity(node, sourceCode)
        if (!identity) {
          return
        }
        const name = identity.exportedName ?? identity.name
        if (
          !['provide', 'inject'].includes(name) ||
          !(identity.source
            ? sources.has(identity.source)
            : identity.isUnbound && globals.has(name))
        ) {
          return
        }
        const value = resolveString(key)
        if (value !== undefined) {
          if (!allowed.has(value)) {
            context.report({
              node: key,
              messageId: 'unexpectedStringKey',
              data: { name, key: value },
            })
          }
          return
        }
        if (services && checker && isInjectionKey) {
          const type = checker.getTypeAtLocation(
            services.esTreeNodeToTSNodeMap.get(key),
          )
          if (!isInjectionKey(type)) {
            context.report({
              node: key,
              messageId: 'expectedInjectionKey',
              data: { name, type: checker.typeToString(type) },
            })
          }
        }
      },
    }
  },
})
