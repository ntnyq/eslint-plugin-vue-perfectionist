import { TSESLint } from '@typescript-eslint/utils'
import { expect, it, vi } from 'vitest'
import { getChildren } from '../../src/utils/ast/traversal.ts'
import { DEFAULT_OPTIONS } from '../../src/utils/sort-composable-body/constants.ts'
import { createDependencyAnalyzer } from '../../src/utils/sort-statements/dependencies.ts'
import { createPartitionCollector } from '../../src/utils/sort-statements/partitions.ts'
import { createSourceCode } from '../helpers/source-code.ts'
import type { TSESTree } from '@typescript-eslint/utils'

it.each([10, 200])(
  'indexes comments and repeated lexical names once across %i composables',
  count => {
    const sourceCode = createSourceCode(
      Array.from(
        { length: count },
        (_, index) => `
function useCounter${index}() {
  // input
  const input = 1
  const consumer = input
  function useNested() {
    // nested input
    const input = 2
    const consumer = input
  }
}`,
      ).join('\n'),
    )
    const bodies: TSESTree.Statement[][] = []
    function collect(node: TSESTree.Node) {
      if (node.type === 'FunctionDeclaration') {
        bodies.push(node.body.body)
      }
      getChildren(node, sourceCode).forEach(collect)
    }
    collect(sourceCode.ast)
    let rangeReads = 0
    let definitionReads = 0
    let variableCount = 0
    for (const comment of sourceCode.getAllComments()) {
      const range = comment.range
      Object.defineProperty(comment, 'range', {
        configurable: true,
        get() {
          rangeReads++
          return range
        },
      })
    }
    for (const scope of sourceCode.scopeManager?.scopes ?? []) {
      for (const variable of scope.variables) {
        variableCount++
        const definitions = variable.defs
        Object.defineProperty(variable, 'defs', {
          configurable: true,
          get() {
            definitionReads++
            return definitions
          },
        })
      }
    }
    const comments = vi.spyOn(TSESLint.SourceCode.prototype, 'getAllComments')
    const collectPartitions = createPartitionCollector(
      sourceCode,
      DEFAULT_OPTIONS,
      () => true,
      () => false,
    )
    const analyze = createDependencyAnalyzer(sourceCode, DEFAULT_OPTIONS)
    for (const body of bodies) {
      for (const partition of collectPartitions(body)) {
        const dependencies = analyze(partition)
        const input = partition.find(statement => statement.name === 'input')
        const consumer = partition.find(
          statement => statement.name === 'consumer',
        )
        expect(consumer && dependencies.get(consumer)).toEqual(new Set([input]))
      }
    }
    expect(comments).toHaveBeenCalledTimes(1)
    expect(definitionReads).toBeLessThan(variableCount * 3)
    expect(rangeReads).toBeLessThan(count * Math.ceil(Math.log2(count)) * 50)
    comments.mockRestore()
  },
)
