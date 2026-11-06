import { unwrapExpression } from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { createMemberClassifier } from '../utils/sort-composable/classify.ts'
import {
  createComposableReporter,
  SORT_COMPOSABLE_MESSAGES,
} from '../utils/sort-composable/report.ts'
import { SORT_COMPOSABLE_PROPERTIES } from '../utils/sort-composable/schema.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { getScriptVariableDefinitions } from '../utils/vue/script-scope.ts'
import type {
  SortComposableDestructureMessageId,
  SortComposableDestructureOptions,
} from '../types/index.ts'

export const sortComposableDestructure = createRule<
  [SortComposableDestructureOptions],
  SortComposableDestructureMessageId
>({
  name: 'sort-composable-destructure',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce grouping of destructured composable members by state and method.',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          ...SORT_COMPOSABLE_PROPERTIES,
          importSourcePattern: {
            description:
              'Only match resolved import sources satisfying this regular expression.',
            type: 'string',
            format: 'regex',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: SORT_COMPOSABLE_MESSAGES,
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const classifier = createMemberClassifier(context, options)
    const report = createComposableReporter(context, options)
    const pattern = new RegExp(options.functionPattern ?? '^use[A-Z]')
    const sourcePattern =
      options.importSourcePattern === undefined
        ? undefined
        : new RegExp(options.importSourcePattern)
    const ignored = new Set(options.ignoreNames)
    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern' || !node.init) {
          return
        }
        const initializer = unwrapExpression(node.init)
        const awaited = initializer.type === 'AwaitExpression'
        const call = awaited
          ? unwrapExpression(initializer.argument)
          : initializer
        if (call.type !== 'CallExpression') {
          return
        }
        const callee = unwrapExpression(call.callee)
        const identity = getCallIdentity(call, context.sourceCode)
        if (!identity || (callee.type !== 'Identifier' && !identity.source)) {
          return
        }
        if (callee.type === 'Identifier') {
          const definitions = getScriptVariableDefinitions(
            callee,
            context.sourceCode,
          )
          if (
            definitions.some(
              definition => definition.type === 'ImportBinding',
            ) &&
            !identity.source
          ) {
            return
          }
        }
        const name =
          callee.type === 'Identifier' && identity.exportedName === 'default'
            ? identity.localName
            : identity.name
        if (
          !pattern.test(name) ||
          ignored.has(name) ||
          (sourcePattern &&
            (!identity.source || !sourcePattern.test(identity.source)))
        ) {
          return
        }
        report(node.id, name, (_, memberName) =>
          classifier.consumedPropertyKind(call, memberName, awaited),
        )
      },
    }
  },
})
