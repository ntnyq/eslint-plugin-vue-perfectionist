import { createRule } from '../utils/create-rule.ts'
import { createMacroClassifier } from '../utils/sort-script-setup/classify.ts'
import { resolveOptions } from '../utils/sort-script-setup/options.ts'
import { OPTIONS_SCHEMA } from '../utils/sort-script-setup/schema.ts'
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
import { getSetupRange } from '../utils/vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  SortScriptSetupMessageId,
  SortScriptSetupRuleOptions,
} from '../types/index.ts'

export const sortScriptSetup = createRule<
  SortScriptSetupRuleOptions,
  SortScriptSetupMessageId
>({
  name: 'sort-script-setup',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: true,
      description:
        'enforce consistent ordering of Vue 3 script setup statements.',
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
    const assignGroup = createGroupMatcher(groups, options, matchesPattern)
    const range = getSetupRange(context.sourceCode)

    if (!range || !groups.length) {
      return {}
    }

    const [setupStart, setupEnd] = range
    const compare = createStatementComparator(groups)

    function onProgramExit(program: TSESTree.Program) {
      const nodes = program.body.filter(
        node => node.range[0] >= setupStart && node.range[1] <= setupEnd,
      )
      const analyzeDependencies = createDependencyAnalyzer(
        context.sourceCode,
        options,
      )
      const collectPartitions = createPartitionCollector(
        context.sourceCode,
        options,
        assignGroup,
        matchesPattern,
        createMacroClassifier(context.sourceCode),
      )
      for (const partition of collectPartitions(nodes)) {
        const dependencies = analyzeDependencies(partition)
        reportPartition(
          partition,
          sortByDependencies(partition, dependencies, compare),
          context,
          options,
          groups,
        )
      }
    }
    return {
      'Program:exit': onProgramExit,
    }
  },
})
