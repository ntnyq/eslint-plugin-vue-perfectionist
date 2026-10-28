import { unwrapExpression } from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { resolveVueGlobals } from '../utils/vue/globals.ts'
import { getScriptVariableDefinitions } from '../utils/vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../types/eslint.ts'
import type {
  PreferOnScopeDisposeMessageId,
  PreferOnScopeDisposeOptions,
} from '../types/index.ts'

/**
 * Find the nearest function body and its public declaration or variable name.
 * Nested callbacks and class execution contexts are separate boundaries.
 *
 * @param node - The hook registration call.
 * @returns The containing function's binding name, when supported.
 */
function getComposableName(node: TSESTree.CallExpression): string | undefined {
  let ancestor: TSESTree.Node | undefined = node.parent
  while (ancestor) {
    if (ancestor.type === 'ClassBody' || ancestor.type === 'StaticBlock') {
      return undefined
    }
    switch (ancestor.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        if (
          node.range[0] < ancestor.body.range[0] ||
          node.range[1] > ancestor.body.range[1]
        ) {
          return undefined
        }
        if (ancestor.type === 'FunctionDeclaration') {
          return ancestor.id?.name
        }
        const fn = ancestor
        let binding: TSESTree.Node | undefined = fn.parent
        // The variable's name defines the convention, not an inner function name.
        while (binding && unwrapExpression(binding) === fn) {
          binding = binding.parent
        }
        return binding?.type === 'VariableDeclarator' &&
          binding.id.type === 'Identifier' &&
          binding.init &&
          unwrapExpression(binding.init) === fn
          ? binding.id.name
          : undefined
      }
    }
    ancestor = ancestor.parent
  }
  return undefined
}

/**
 * Vue uses the current component instance when the target evaluates to undefined.
 *
 * @param node - The explicit target argument.
 * @param sourceCode - The source code used to resolve shadowed bindings.
 * @returns Whether the target is syntactically known to use Vue's default.
 */
function isDefaultTarget(node: TSESTree.Node, sourceCode: SourceCode): boolean {
  const target = unwrapExpression(node)
  if (target.type === 'UnaryExpression' && target.operator === 'void') {
    return true
  }
  return (
    target.type === 'Identifier' &&
    target.name === 'undefined' &&
    getScriptVariableDefinitions(target, sourceCode).length === 0
  )
}

export const preferOnScopeDispose = createRule<
  [PreferOnScopeDisposeOptions],
  PreferOnScopeDisposeMessageId
>({
  name: 'prefer-on-scope-dispose',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require scope-based cleanup in named Vue composables.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          functionPattern: {
            description:
              'JavaScript regular expression source matching composable names.',
            type: 'string',
            format: 'regex',
          },
          ignoreNames: {
            description: 'Exact composable binding names to exclude.',
            type: 'array',
            items: { type: 'string', minLength: 1 },
            uniqueItems: true,
          },
          hooks: {
            description:
              'Lifecycle APIs to report, replacing the default onUnmounted list.',
            type: 'array',
            items: { type: 'string', enum: ['onUnmounted', 'onBeforeUnmount'] },
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
      preferScopeDispose:
        'Prefer onScopeDispose() over {{hook}}() in "{{name}}" for scope-owned cleanup. Keep the lifecycle hook when component unmount timing is required.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const pattern = new RegExp(options.functionPattern ?? '^use[A-Z]')
    const ignored = new Set(options.ignoreNames)
    const hooks = new Set<string>(options.hooks ?? ['onUnmounted'])
    const sources = new Set(options.vueImportSources ?? ['vue'])
    const globals = new Set(
      resolveVueGlobals(
        context.settings,
        ['onUnmounted', 'onBeforeUnmount'],
        options.vueGlobals,
      ),
    )
    return {
      CallExpression(node) {
        // Unknown targets may select another component. Explicit undefined
        // still selects Vue's default current instance.
        const target = node.arguments[1]
        if (
          node.arguments.length < 1 ||
          node.arguments.length > 2 ||
          node.arguments[0]?.type === 'SpreadElement' ||
          (target && !isDefaultTarget(target, sourceCode))
        ) {
          return
        }
        const identity = getCallIdentity(node, sourceCode)
        if (!identity) {
          return
        }
        const hook = identity.exportedName ?? identity.name
        if (
          !hooks.has(hook) ||
          !(identity.source
            ? sources.has(identity.source)
            : identity.isUnbound && globals.has(hook))
        ) {
          return
        }
        const name = getComposableName(node)
        if (name && pattern.test(name) && !ignored.has(name)) {
          context.report({
            node: node.callee,
            messageId: 'preferScopeDispose',
            data: { name, hook },
          })
        }
      },
    }
  },
})
