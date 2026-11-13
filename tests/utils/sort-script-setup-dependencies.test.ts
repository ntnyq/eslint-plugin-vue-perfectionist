import { parse } from '@typescript-eslint/parser'
import { expect, it } from 'vitest'
import { classifyStatement } from '../../src/utils/sort-script-setup/classify.ts'
import { DEFAULT_OPTIONS } from '../../src/utils/sort-script-setup/constants.ts'
import {
  createDependencyAnalyzer,
  sortByDependencies,
} from '../../src/utils/sort-script-setup/dependencies.ts'
import { createSourceCode } from '../helpers/source-code.ts'
import type { Statement } from '../../src/utils/sort-script-setup/types.ts'

function createStatements(names: string[]): Statement[] {
  const node = parse('const value = 0').body[0]
  if (!node) {
    throw new Error('Expected a statement fixture.')
  }

  return names.map((name, index) => ({
    node,
    name,
    names: [name],
    index,
    group: 0,
    subgroup: 0,
    modifiers: [],
    selector: 'constant',
    start: 0,
    end: 0,
    size: 0,
  }))
}

it.each([1, 150])(
  'indexes declarations without quadratic name lookups across %i partitions',
  partitionCount => {
    const size = 300
    const sourceCode = createSourceCode(
      Array.from(
        { length: size / 2 },
        (_, index) => `const a${index} = 0\nconst b${index} = a${index}`,
      ).join('\n'),
    )
    const statements = sourceCode.ast.body.flatMap((node, index) => {
      const statement = classifyStatement(
        node,
        sourceCode,
        DEFAULT_OPTIONS,
        index,
      )
      return statement ? [statement] : []
    })
    let nameReads = 0
    let variableCount = 0
    for (const scope of sourceCode.scopeManager?.scopes ?? []) {
      for (const variable of scope.variables) {
        const name = variable.name
        variableCount++
        Object.defineProperty(variable, 'name', {
          configurable: true,
          get() {
            nameReads++
            return name
          },
        })
      }
    }
    const analyze = createDependencyAnalyzer(sourceCode, DEFAULT_OPTIONS)
    const partitionSize = size / partitionCount
    for (let offset = 0; offset < size; offset += partitionSize) {
      const partition = statements.slice(offset, offset + partitionSize)
      const dependencies = analyze(partition)
      for (let index = 1; index < partition.length; index += 2) {
        const declaration = partition[index - 1]
        const consumer = partition[index]
        expect(consumer && dependencies.get(consumer)).toEqual(
          new Set([declaration]),
        )
      }
    }
    // Count work rather than elapsed time so this remains stable across CI hosts.
    expect(nameReads).toBeLessThan(variableCount * 5 + size * 5)
    const consumer = statements[1]
    expect(consumer && analyze([consumer]).get(consumer)).toEqual(new Set())
  },
)

it.each([
  {
    description: 'newly ready statements compete with the existing ready queue',
    names: ['z', 'a', 'b', 'c'],
    prerequisites: { a: ['b'], b: ['c'] },
    expected: ['c', 'b', 'a', 'z'],
  },
  {
    description:
      'a cyclic remainder and its blocked dependents keep source order',
    names: ['z', 'b', 'a', 'd', 'c'],
    prerequisites: { b: ['a'], a: ['b'], d: ['a'] },
    expected: ['c', 'z', 'b', 'a', 'd'],
  },
  {
    description:
      'self dependencies remain blocked while external dependencies are satisfied',
    names: ['b', 'a', 'c'],
    prerequisites: { b: ['b'], a: ['outside'] },
    expected: ['a', 'c', 'b'],
  },
  {
    description:
      'comparator ties retain source precedence as dependencies become ready',
    names: ['z', 'a', 'b', 'c'],
    prerequisites: { z: ['b'], b: ['c'] },
    expected: ['a', 'c', 'b', 'z'],
    ties: true,
  },
])('$description', ({ names, prerequisites, expected, ties }) => {
  const statements = createStatements(names)
  const external = createStatements(['outside'])
  const byName = new Map(
    [...statements, ...external].map(item => [item.name, item]),
  )
  const graph: Record<string, string[]> = prerequisites
  const dependencies = new Map(
    statements.map(statement => [
      statement,
      new Set(
        (graph[statement.name] ?? []).flatMap(name => {
          const prerequisite = byName.get(name)
          return prerequisite ? [prerequisite] : []
        }),
      ),
    ]),
  )
  expect(
    sortByDependencies(statements, dependencies, (left, right) =>
      ties ? 0 : left.name.localeCompare(right.name),
    ).map(statement => statement.name),
  ).toEqual(expected)
  expect(statements.map(statement => statement.name)).toEqual(names)
})

it.each([false, true])(
  'avoids quadratic comparisons with sparse dependencies: %s',
  withDependencies => {
    const size = 1000
    const statements = createStatements(
      Array.from({ length: size }, (_, index) =>
        String(size - index).padStart(4, '0'),
      ),
    )
    const dependencies = new Map(
      statements.map((statement, index) => [
        statement,
        new Set(
          withDependencies && index % 4 === 0
            ? statements.slice(index + 1, index + 2)
            : [],
        ),
      ]),
    )
    let comparisons = 0
    const sorted = sortByDependencies(
      statements,
      dependencies,
      (left, right) => {
        comparisons++
        return left.name.localeCompare(right.name)
      },
    )
    expect(sorted.map(statement => statement.name)).toEqual(
      statements.map(statement => statement.name).toSorted(),
    )
    expect(comparisons).toBeLessThan(size * Math.ceil(Math.log2(size)) * 2)
  },
)
