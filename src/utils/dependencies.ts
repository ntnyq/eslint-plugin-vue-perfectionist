import { isNil } from '@ntnyq/utils'
import { ASTUtils } from '@typescript-eslint/utils'
import {
  getCallIdentity,
  getChildren,
  isFunction,
  unwrapExpression,
} from './ast.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { ResolvedOptions, SourceCode, Statement } from '../types/index.ts'

function getFunctionBody(node: TSESTree.Node): TSESTree.Node | undefined {
  if (isFunction(node)) {
    return node
  }
  if (node.type === 'VariableDeclarator' && node.init) {
    return getFunctionBody(unwrapExpression(node.init))
  }
  return undefined
}

/**
 * Missing options are known defaults; unresolved options may enable immediate
 * execution, so callers must conservatively keep their callback dependencies.
 */
function getCallOptions(
  node: TSESTree.Node | undefined,
  sourceCode: SourceCode,
): object | undefined {
  if (!node) {
    return {}
  }
  const result = ASTUtils.getStaticValue(
    unwrapExpression(node),
    sourceCode.getScope(node),
  )
  if (!result) {
    return undefined
  }
  if (isNil(result.value)) {
    return {}
  }
  return typeof result.value === 'object' ? result.value : undefined
}

export function buildDependencies(
  statements: Statement[],
  sourceCode: SourceCode,
  options: ResolvedOptions,
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
    const visitFunction = (node: TSESTree.Node | undefined) => {
      if (!node) {
        return
      }
      const expression = unwrapExpression(node)
      if (isFunction(expression)) {
        visit(expression, true)
        return
      }
      const variable = references.get(expression)?.resolved
      for (const definition of variable?.defs ?? []) {
        if (!['FunctionName', 'Variable'].includes(definition.type)) {
          continue
        }
        const fn = getFunctionBody(definition.node)
        if (fn) {
          visit(fn, true)
        }
      }
    }
    function visit(node: TSESTree.Node, executeFunction = false) {
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
        visitFunction(node.callee)
        const identity = getCallIdentity(node, sourceCode)
        const isVueCall =
          identity &&
          ((identity.source &&
            options.vueImportSources.includes(identity.source)) ||
            (identity.isUnbound && options.vueGlobals.includes(identity.name)))
        if (isVueCall) {
          const first = node.arguments[0]
          if (identity.name === 'watch') {
            const source = first ? unwrapExpression(first) : undefined
            if (source?.type === 'ArrayExpression') {
              source.elements.forEach(element =>
                visitFunction(element ?? undefined),
              )
            } else {
              visitFunction(source)
            }
            const callOptions = getCallOptions(node.arguments[2], sourceCode)
            if (
              !callOptions ||
              ('immediate' in callOptions && callOptions.immediate)
            ) {
              visitFunction(node.arguments[1])
            }
          } else if (identity.name === 'watchEffect') {
            const callOptions = getCallOptions(node.arguments[1], sourceCode)
            if (
              !callOptions ||
              !('flush' in callOptions) ||
              callOptions.flush !== 'post'
            ) {
              visitFunction(first)
            }
          } else if (['watchSyncEffect', 'customRef'].includes(identity.name)) {
            visitFunction(first)
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
