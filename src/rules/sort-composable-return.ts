import { unwrapExpression } from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import {
  getComposableFunctionName,
  getReturnOwner,
} from '../utils/sort-composable/ast.ts'
import { createMemberClassifier } from '../utils/sort-composable/classify.ts'
import {
  createComposableReporter,
  SORT_COMPOSABLE_MESSAGES,
} from '../utils/sort-composable/report.ts'
import { SORT_COMPOSABLE_PROPERTIES } from '../utils/sort-composable/schema.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  SortComposableReturnMessageId,
  SortComposableReturnOptions,
} from '../types/index.ts'
import type { ComposableFunction } from '../utils/sort-composable/ast.ts'

export const sortComposableReturn = createRule<
  [SortComposableReturnOptions],
  SortComposableReturnMessageId
>({
  name: 'sort-composable-return',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce grouping of composable return members by state and method.',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: SORT_COMPOSABLE_PROPERTIES,
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
    const ignored = new Set(options.ignoreNames)

    function check(
      fn: ComposableFunction | undefined,
      value: TSESTree.Node | null,
    ) {
      if (!fn || !value || fn.generator) {
        return
      }
      const name = getComposableFunctionName(fn)
      const object = unwrapExpression(value)
      if (
        name &&
        pattern.test(name) &&
        !ignored.has(name) &&
        object.type === 'ObjectExpression'
      ) {
        report(object, name, classifier.propertyKind)
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
