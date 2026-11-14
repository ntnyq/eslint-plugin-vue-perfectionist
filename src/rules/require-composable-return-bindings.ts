import {
  getFunctionBindingName,
  getReturnOwner,
  isFunctionNode,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import {
  getMemberName,
  isPrototypeSetter,
} from '../utils/ast/object-members.ts'
import { findScopeReference } from '../utils/ast/scope.ts'
import { createRule } from '../utils/create-rule.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  RequireComposableReturnBindingsMessageId,
  RequireComposableReturnBindingsOptions,
} from '../types/index.ts'
import type { FunctionNode } from '../utils/ast/expressions.ts'

export const requireComposableReturnBindings = createRule<
  [RequireComposableReturnBindingsOptions],
  RequireComposableReturnBindingsMessageId
>({
  name: 'require-composable-return-bindings',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require composable return fields to expose local bindings.',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          functionPattern: {
            description: 'Function binding pattern; defaults to ^use[A-Z].',
            type: 'string',
            format: 'regex',
          },
          ignoreNames: {
            description:
              'Exact function names to exclude; empty excludes nothing.',
            type: 'array',
            items: { type: 'string', minLength: 1 },
            uniqueItems: true,
          },
          allowAliases: {
            description:
              'Allow public keys to differ from bindings; defaults to true.',
            type: 'boolean',
          },
          allowParameters: {
            description:
              'Allow current function parameter bindings; defaults to false.',
            type: 'boolean',
          },
        },
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedBinding:
        'Declare the value of "{{key}}" outside the return object and expose its binding.',
      nonLocalBinding:
        'Binding "{{name}}" must be declared inside composable "{{functionName}}".',
      unexpectedAlias:
        'Return key "{{key}}" must match binding "{{name}}" when allowAliases is false.',
      unexpectedParameter:
        'Parameter "{{name}}" cannot be exposed directly unless allowParameters is true.',
      unexpectedSpread:
        'Expose individual local bindings instead of spreading into the return object.',
      dynamicKey: 'Use a static public key in the composable return object.',
      prototypeSetter:
        'Expose ordinary fields instead of setting the return object prototype.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const pattern = new RegExp(options.functionPattern ?? '^use[A-Z]')
    const ignored = new Set(options.ignoreNames)

    function check(fn: FunctionNode | undefined, value: TSESTree.Node | null) {
      if (!fn || !value || fn.generator) {
        return
      }

      const functionName = getFunctionBindingName(fn)
      const object = unwrapExpression(value)

      if (
        !functionName ||
        !pattern.test(functionName) ||
        ignored.has(functionName) ||
        object.type !== 'ObjectExpression'
      ) {
        return
      }

      for (const member of object.properties) {
        if (member.type === 'SpreadElement') {
          context.report({ node: member, messageId: 'unexpectedSpread' })
          continue
        }

        const key = getMemberName(member)

        if (key === undefined) {
          context.report({ node: member.key, messageId: 'dynamicKey' })
          continue
        }

        if (isPrototypeSetter(member)) {
          context.report({ node: member, messageId: 'prototypeSetter' })
          continue
        }

        const binding = unwrapExpression(member.value)

        if (
          member.method ||
          member.kind !== 'init' ||
          binding.type !== 'Identifier'
        ) {
          context.report({
            node: member,
            messageId: 'expectedBinding',
            data: { key },
          })
          continue
        }

        const definitions =
          findScopeReference(binding, context.sourceCode)?.resolved?.defs ?? []
        const parameter = definitions.some(
          def => def.type === 'Parameter' && def.node === fn,
        )
        const local = definitions.some(def => {
          if (
            ![
              'Variable',
              'FunctionName',
              'ClassName',
              'CatchClause',
              'TSEnumName',
            ].includes(def.type)
          ) {
            return false
          }

          // Start outside the declaration: a local function's own node is not
          // the function that owns its binding.
          let parent: TSESTree.Node | undefined = def.node.parent

          while (parent) {
            if (isFunctionNode(parent)) {
              return parent === fn
            }

            parent = parent.parent
          }

          return false
        })

        if (parameter && !options.allowParameters) {
          context.report({
            node: binding,
            messageId: 'unexpectedParameter',
            data: { name: binding.name },
          })
        } else if (!parameter && !local) {
          context.report({
            node: binding,
            messageId: 'nonLocalBinding',
            data: { name: binding.name, functionName },
          })
        } else if (options.allowAliases === false && key !== binding.name) {
          context.report({
            node: member.key,
            messageId: 'unexpectedAlias',
            data: { key, name: binding.name },
          })
        }
      }
    }

    return {
      ReturnStatement(node) {
        check(getReturnOwner(node), node.argument)
      },
      ArrowFunctionExpression(node) {
        check(node, node.body)
      },
    }
  },
})
