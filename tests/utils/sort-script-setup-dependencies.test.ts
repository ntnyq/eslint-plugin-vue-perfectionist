import { parse } from '@typescript-eslint/parser'
import { expect, it } from 'vitest'
import { sortByDependencies } from '../../src/utils/sort-script-setup/dependencies.ts'
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
