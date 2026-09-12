import { OPTIONS_SCHEMA } from '../constants/index.ts'
import {
  buildDependencies,
  collectPartitions,
  createRule,
  createStatementComparator,
  getSetupRange,
  reportPartition,
  resolveGroups,
  resolveOptions,
  sortByDependencies,
} from '../utils/index.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { MessageId, RuleOptions } from '../types/index.ts'

export const sortScriptSetup = createRule<RuleOptions, MessageId>({
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
    messages: {
      unexpectedGroupOrder:
        'Expected "{{name}}" ({{group}}) to come before "{{before}}".',
      unexpectedOrder: 'Expected "{{name}}" to come before "{{before}}".',
      unsafeReorder:
        'Expected "{{name}}" ({{group}}) to come before "{{before}}"; this move cannot be safely fixed automatically.',
      unexpectedNewlinesBetween:
        'Expected {{count}} empty lines between groups.',
      unexpectedNewlinesInside:
        'Expected {{count}} empty lines inside the group.',
    },
  },
  defaultOptions: [{}],
  create(context) {
    const options = resolveOptions(context)
    const groups = resolveGroups(options)
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
      for (const partition of collectPartitions(
        nodes,
        context.sourceCode,
        options,
        groups,
      )) {
        const dependencies = buildDependencies(
          partition,
          context.sourceCode,
          options,
        )
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
