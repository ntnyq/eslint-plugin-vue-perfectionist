import { getChildren, isFunction, unwrapExpression } from './ast'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { SourceCode, Statement } from '../types'

function getFunctionBody(node: TSESTree.Node): TSESTree.Node | undefined {
  if (isFunction(node)) {
    return node
  }
  if (node.type === 'VariableDeclaration') {
    const init = node.declarations[0]?.init
    if (init) {
      return getFunctionBody(unwrapExpression(init))
    }
  }
  return undefined
}

export function buildDependencies(
  statements: Statement[],
  sourceCode: SourceCode,
): Map<Statement, Set<Statement>> {
  const references = new Map<TSESTree.Node, TSESLint.Scope.Reference>()
  const declarations = new Map<TSESLint.Scope.Variable, Statement>()
  for (const scope of sourceCode.scopeManager?.scopes ?? []) {
    for (const reference of scope.references) {
      references.set(reference.identifier, reference)
    }
    for (const variable of scope.variables) {
      const statement = statements.find(
        candidate =>
          candidate.names.includes(variable.name) &&
          variable.defs.some(
            definition =>
              definition.name.range[0] >= candidate.node.range[0] &&
              definition.name.range[1] <= candidate.node.range[1],
          ),
      )
      if (statement) {
        declarations.set(variable, statement)
      }
    }
  }
  const dependencies = new Map<Statement, Set<Statement>>()
  for (const statement of statements) {
    const required = new Set<Statement>()
    dependencies.set(statement, required)
    if (statement.selector === 'type' || statement.selector === 'interface') {
      continue
    }
    const visitedFunctions = new Set<TSESTree.Node>()
    const visit = (node: TSESTree.Node, executeFunction = false): void => {
      if (isFunction(node) && !executeFunction) {
        return
      }
      if (isFunction(node)) {
        if (visitedFunctions.has(node)) {
          return
        }
        visitedFunctions.add(node)
      }
      const reference = references.get(node)
      if (
        reference?.resolved &&
        reference.isRead() &&
        reference.isValueReference !== false
      ) {
        const dependency = declarations.get(reference.resolved)
        if (
          dependency &&
          dependency !== statement &&
          dependency.node.type !== 'FunctionDeclaration'
        ) {
          required.add(dependency)
        }
      }
      if (node.type === 'CallExpression') {
        const callee = unwrapExpression(node.callee)
        if (isFunction(callee)) {
          visit(callee, true)
        } else {
          const variable = references.get(callee)?.resolved
          const declaration = variable ? declarations.get(variable) : undefined
          const fn = declaration ? getFunctionBody(declaration.node) : undefined
          if (fn) {
            visit(fn, true)
          }
        }
        // watchEffect and customRef factories may execute immediately.
        if (
          (statement.selector === 'watch' &&
            ['watchEffect', 'watchSyncEffect'].includes(
              statement.callName ?? '',
            )) ||
          statement.callName === 'customRef'
        ) {
          for (const argument of node.arguments) {
            if (isFunction(argument)) {
              visit(argument, true)
            }
          }
        }
      }
      for (const child of getChildren(node, sourceCode)) {
        visit(child)
      }
    }
    visit(statement.node)
  }
  return dependencies
}

/**
 * Stable topological selection prefers style order only among ready statements.
 * A cyclic remainder is kept verbatim instead of forcing an invalid move.
 */
export function sortByDependencies(
  statements: Statement[],
  dependencies: Map<Statement, Set<Statement>>,
  compare: (left: Statement, right: Statement) => number,
): Statement[] {
  const pending = new Set(statements)
  const sorted: Statement[] = []
  while (pending.size) {
    const ready = [...pending]
      .filter(statement =>
        [...(dependencies.get(statement) ?? [])].every(
          dependency => !pending.has(dependency),
        ),
      )
      .sort(compare)
    const next = ready[0]
    if (!next) {
      return [
        ...sorted,
        ...statements.filter(statement => pending.has(statement)),
      ]
    }
    sorted.push(next)
    pending.delete(next)
  }
  return sorted
}
