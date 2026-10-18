import { ASTUtils } from '@typescript-eslint/utils'
import {
  getStaticStringValue,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { resolveVueGlobals } from '../utils/vue/globals.ts'
import { hasVueServices } from '../utils/vue/parser-services.ts'
import { isInScriptRange } from '../utils/vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  PreferFunctionDeclarationMessageId,
  PreferFunctionDeclarationOptions,
} from '../types/index.ts'

type FunctionContainer =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression

/**
 * Locate the owner of an expression through TypeScript wrappers.
 *
 * @param node - The unwrapped expression.
 * @returns The first parent outside the expression's wrappers.
 */
function getExpressionParent(node: TSESTree.Node): TSESTree.Node | undefined {
  let outer = node
  while (outer.parent && unwrapExpression(outer.parent) === node) {
    outer = outer.parent
  }
  return outer.parent
}

export const preferFunctionDeclaration = createRule<
  [PreferFunctionDeclarationOptions],
  PreferFunctionDeclarationMessageId
>({
  name: 'prefer-function-declaration',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'require function declarations at the top level of SFCs and composables.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          scopes: {
            description: 'Containers to check; empty disables all checks.',
            type: 'array',
            items: { type: 'string', enum: ['sfc', 'composables'] },
            uniqueItems: true,
          },
          functionPattern: {
            description: 'Regular expression source for composable names.',
            type: 'string',
            format: 'regex',
          },
          ignoreNames: {
            description:
              'Exact composable names to exclude; empty excludes none.',
            type: 'array',
            items: { type: 'string', minLength: 1 },
            uniqueItems: true,
          },
          allowTypeAnnotation: {
            description:
              'Allow function bindings with variable type annotations.',
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedFunctionDeclaration:
        'Expected "{{name}}" to use a function declaration.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const scopes = new Set(options.scopes ?? ['sfc', 'composables'])
    const pattern = new RegExp(options.functionPattern ?? '^use[A-Z]')
    const ignored = new Set(options.ignoreNames)
    const services = sourceCode.parserServices
    const scriptRanges: TSESTree.Range[] = []
    if (scopes.has('sfc') && hasVueServices(services)) {
      for (const child of services.getDocumentFragment()?.children ?? []) {
        if (
          child.type === 'VElement' &&
          child.name === 'script' &&
          child.endTag
        ) {
          scriptRanges.push([child.startTag.range[1], child.endTag.range[0]])
        }
      }
    }
    const vueGlobals = resolveVueGlobals(context.settings, ['defineComponent'])

    function isDefineComponent(call: TSESTree.CallExpression) {
      const identity = getCallIdentity(call, sourceCode)
      return (
        identity &&
        (identity.exportedName ?? identity.name) === 'defineComponent' &&
        (identity.source === 'vue' ||
          (identity.isUnbound && vueGlobals.includes(identity.name)))
      )
    }

    function isComponentObject(node: TSESTree.ObjectExpression) {
      const parent = getExpressionParent(node)
      return (
        parent?.type === 'ExportDefaultDeclaration' ||
        (parent?.type === 'CallExpression' &&
          parent.arguments[0] &&
          unwrapExpression(parent.arguments[0]) === node &&
          isDefineComponent(parent))
      )
    }

    function isComponentSetup(node: FunctionContainer) {
      const parent = getExpressionParent(node)
      if (parent?.type === 'CallExpression') {
        return (
          parent.arguments[0] &&
          unwrapExpression(parent.arguments[0]) === node &&
          isDefineComponent(parent)
        )
      }
      return (
        parent?.type === 'Property' &&
        parent.kind === 'init' &&
        (ASTUtils.getPropertyName(parent) ??
          getStaticStringValue(parent.key)) === 'setup' &&
        parent.parent.type === 'ObjectExpression' &&
        isComponentObject(parent.parent)
      )
    }

    function isComposable(node: FunctionContainer) {
      const parent = getExpressionParent(node)
      const name =
        node.type === 'FunctionDeclaration'
          ? node.id?.name
          : parent?.type === 'VariableDeclarator' &&
              parent.id.type === 'Identifier' &&
              parent.init &&
              unwrapExpression(parent.init) === node
            ? parent.id.name
            : undefined
      return name !== undefined && pattern.test(name) && !ignored.has(name)
    }

    return {
      VariableDeclarator(node) {
        if (
          node.id.type !== 'Identifier' ||
          !node.init ||
          (options.allowTypeAnnotation && node.id.typeAnnotation)
        ) {
          return
        }
        const initializer = unwrapExpression(node.init)
        if (
          initializer.type !== 'ArrowFunctionExpression' &&
          initializer.type !== 'FunctionExpression'
        ) {
          return
        }
        const declaration = node.parent
        let parent = declaration.parent
        if (parent.type === 'ExportNamedDeclaration') {
          parent = parent.parent
        }
        const isSfc = scriptRanges.some(range => isInScriptRange(node, range))
        let isTarget = isSfc && parent.type === 'Program'
        if (parent.type === 'BlockStatement') {
          const container = parent.parent
          switch (container.type) {
            case 'FunctionDeclaration':
            case 'FunctionExpression':
            case 'ArrowFunctionExpression':
              if (container.body === parent) {
                isTarget =
                  (scopes.has('composables') && isComposable(container)) ||
                  Boolean(isSfc && isComponentSetup(container))
              }
          }
        }
        if (isTarget) {
          context.report({
            node: node.id,
            messageId: 'expectedFunctionDeclaration',
            data: { name: node.id.name },
          })
        }
      },
    }
  },
})
