import { getFunctionBindingName } from '../utils/ast/expressions.ts'
import { getBindingNames } from '../utils/ast/traversal.ts'
import { createRule } from '../utils/create-rule.ts'
import { resolveOptions } from '../utils/sort-composable-body/options.ts'
import { OPTIONS_SCHEMA } from '../utils/sort-composable-body/schema.ts'
import { createStatementComparator } from '../utils/sort-statements/compare.ts'
import {
  createDependencyAnalyzer,
  sortByDependencies,
} from '../utils/sort-statements/dependencies.ts'
import {
  createGroupMatcher,
  resolveGroups,
} from '../utils/sort-statements/groups.ts'
import { createPartitionCollector } from '../utils/sort-statements/partitions.ts'
import {
  reportPartition,
  STATEMENT_MESSAGES,
} from '../utils/sort-statements/report.ts'
import { createPatternMatcher } from '../utils/sort-statements/validation.ts'
import type {
  SortComposableBodyMessageId,
  SortComposableBodyRuleOptions,
} from '../types/index.ts'
import type { FunctionNode } from '../utils/ast/expressions.ts'

export const sortComposableBody = createRule<
  SortComposableBodyRuleOptions,
  SortComposableBodyMessageId
>({
  name: 'sort-composable-body',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce consistent ordering of direct statements in composable functions.',
    },
    fixable: 'code',
    schema: [OPTIONS_SCHEMA],
    defaultOptions: [{}],
    messages: STATEMENT_MESSAGES,
  },
  defaultOptions: [{}],
  create(context) {
    const options = resolveOptions(context)
    const matchesPattern = createPatternMatcher(options)
    const groups = resolveGroups(options)

    if (!groups.length) {
      return {}
    }

    const ignored = new Set(options.ignoreNames)
    const bodies: FunctionNode[] = []

    function collect(fn: FunctionNode) {
      const name = getFunctionBindingName(fn)

      if (
        !fn.generator &&
        fn.body.type === 'BlockStatement' &&
        name &&
        !ignored.has(name) &&
        matchesPattern(name, options.functionPattern)
      ) {
        bodies.push(fn)
      }
    }

    return {
      FunctionDeclaration: collect,
      FunctionExpression: collect,
      ArrowFunctionExpression: collect,
      'Program:exit': function () {
        const compare = createStatementComparator(groups)
        const assignGroup = createGroupMatcher(groups, options, matchesPattern)
        const collectPartitions = createPartitionCollector(
          context.sourceCode,
          options,
          assignGroup,
          matchesPattern,
        )
        const analyzeDependencies = createDependencyAnalyzer(
          context.sourceCode,
          options,
        )

        for (const fn of bodies) {
          if (fn.body.type !== 'BlockStatement') {
            continue
          }

          const parameterNames = new Set(fn.params.flatMap(getBindingNames))
          // A var redeclaration overwrites an existing input rather than
          // introducing a new initialization prerequisite.
          const partitions = collectPartitions(
            fn.body.body,
            statement =>
              statement.node.type === 'VariableDeclaration' &&
              statement.node.kind === 'var' &&
              statement.names.some(name => parameterNames.has(name)),
          )

          for (const partition of partitions) {
            const ordered = sortByDependencies(
              partition,
              analyzeDependencies(partition),
              compare,
            )

            reportPartition(partition, ordered, context, options, groups)
          }
        }
      },
    }
  },
})
