import { unwrapExpression } from '../utils/ast/expressions.ts'
import { classifyComposableParameter } from '../utils/composable-options.ts'
import { createRule } from '../utils/create-rule.ts'
import { filterScriptDefinitions } from '../utils/vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  PreferComposableOptionsMessageId,
  PreferComposableOptionsOptions,
} from '../types/index.ts'

export const preferComposableOptions = createRule<
  [PreferComposableOptionsOptions],
  PreferComposableOptionsMessageId
>({
  name: 'prefer-composable-options',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require a final options object for composable parameters.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxPositionalParams: {
            description: 'Maximum number of leading positional parameters.',
            type: 'integer',
            minimum: 0,
          },
          functionPattern: {
            description:
              'JavaScript regular expression source for binding names.',
            type: 'string',
            format: 'regex',
          },
          ignoreNames: {
            description:
              'Exact binding names to exclude; empty excludes nothing.',
            type: 'array',
            items: { type: 'string', minLength: 1 },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedOptionsObject:
        'Expected "{{name}}" to end with an options object. Keep at most {{max}} leading positional parameters and move the remaining inputs into named fields.',
      exceededMaxPositionalParams:
        'Expected "{{name}}" to have at most {{max}} positional parameters before its options object; found {{count}}. Move the extra inputs into that object.',
      unexpectedRestParameter:
        'Move the rest parameter of "{{name}}" into an options field; top-level rest parameters bypass the positional limit.',
      unknownOptionsObject:
        'Cannot confirm the final parameter of "{{name}}" is an options object using syntax alone. Use object destructuring or a supported local object type; keep at most {{max}} leading positional parameters.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    if (/\.d\.[cm]?ts$/iu.test(context.filename)) {
      return {}
    }
    const sourceCode = context.sourceCode
    const max = options.maxPositionalParams ?? 0
    const pattern = new RegExp(options.functionPattern ?? '^use[A-Z]')
    const ignored = new Set(options.ignoreNames)

    function check(name: string, parameters: TSESTree.Parameter[]) {
      if (!pattern.test(name) || ignored.has(name)) {
        return
      }
      const params = parameters.filter(
        param => param.type !== 'Identifier' || param.name !== 'this',
      )
      const last = params.at(-1)
      if (!last) {
        return
      }
      const rest = params.find(param => param.type === 'RestElement')
      if (rest) {
        context.report({
          node: rest,
          messageId: 'unexpectedRestParameter',
          data: { name },
        })
        return
      }
      const kind = classifyComposableParameter(last, sourceCode)
      if (kind === 'options') {
        const count = params.length - 1
        const excess = params[max]
        if (count > max && excess) {
          context.report({
            node: excess,
            messageId: 'exceededMaxPositionalParams',
            data: { name, max, count },
          })
        }
      } else if (params.length > 1 || params.length > max) {
        context.report({
          node: last,
          messageId:
            kind === 'unknown'
              ? 'unknownOptionsObject'
              : 'expectedOptionsObject',
          data: { name, max },
        })
      }
    }

    function checkDeclaration(
      node: TSESTree.FunctionDeclaration | TSESTree.TSDeclareFunction,
    ) {
      if (!node.id || node.declare) {
        return
      }
      // Only overloads with an implementation belong to this first version.
      const definitions = filterScriptDefinitions(
        sourceCode
          .getDeclaredVariables(node)
          .flatMap(variable => variable.defs),
        node,
        sourceCode,
      )
      if (node.type === 'TSDeclareFunction') {
        if (
          !definitions.some(
            definition => definition.node.type === 'FunctionDeclaration',
          )
        ) {
          return
        }
      } else if (
        definitions.some(
          definition => definition.node.type === 'TSDeclareFunction',
        )
      ) {
        return
      }
      check(node.id.name, node.params)
    }

    return {
      FunctionDeclaration: checkDeclaration,
      TSDeclareFunction: checkDeclaration,
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier' || !node.init) {
          return
        }
        const initializer = unwrapExpression(node.init)
        if (
          initializer.type === 'ArrowFunctionExpression' ||
          initializer.type === 'FunctionExpression'
        ) {
          check(node.id.name, initializer.params)
        }
      },
    }
  },
})
