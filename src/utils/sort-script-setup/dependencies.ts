import { isNil } from '@ntnyq/utils'
import { ASTUtils } from '@typescript-eslint/utils'
import { isFunction, unwrapExpression } from '../ast/expressions.ts'
import { getChildren } from '../ast/traversal.ts'
import { getCallIdentity } from '../vue/call-identity.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'
import type { ResolvedOptions, Statement } from './types.ts'

/**
 * Find a function node directly or through a variable initializer.
 *
 * @param node - The function or variable declarator to inspect.
 * @returns The function node, or undefined when the node does not initialize a
 * function.
 */
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
 *
 * @param node - The options argument, or undefined when omitted.
 * @param sourceCode - The source code providing scope information for static
 * evaluation.
 * @returns The static options object, an empty object for absent or nullish
 * options, or undefined when unresolved.
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

/**
 * Build runtime dependencies, following functions and callbacks executed
 * immediately.
 *
 * @param statements - The sortable statements to analyze.
 * @param sourceCode - The source code providing references, scopes, and visitor
 * keys.
 * @param options - The Vue import and global recognition options.
 * @returns Each statement mapped to the declarations it requires before
 * execution.
 */
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
        /**
         * Locate the statement that owns a scope variable declaration.
         *
         * @param candidate - The statement candidate.
         * @returns Whether it declares the variable name and contains a
         * corresponding definition.
         */
        candidate =>
          candidate.names.includes(variable.name) &&
          variable.defs.some(
            /**
             * Check whether a variable definition lies inside the candidate
             * statement.
             *
             * @param definition - The variable definition to inspect.
             * @returns Whether its declaration name is contained in the
             * statement range.
             */
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
    /**
     * Visit a called function directly or through its resolved local
     * definitions.
     *
     * @param node - The callee or callback expression, or undefined when
     * absent.
     */
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
    /**
     * Collect immediate runtime reads while avoiding deferred and recursive
     * functions.
     *
     * @param node - The AST node to visit.
     * @param executeFunction - Whether this function node executes immediately;
     * defaults to false.
     */
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
              source.elements.forEach(
                /**
                 * Visit a watch source array element as an immediately evaluated
                 * getter.
                 *
                 * @param element - The source element, or null for an array hole.
                 */
                element => visitFunction(element ?? undefined),
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
 *
 * @param statements - The statements in original order.
 * @param dependencies - The prerequisite statements required by each statement.
 * @param compare - The style comparator used to choose among ready statements.
 * @returns The dependency-respecting order, preserving original order for a
 * cyclic remainder.
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
      .filter(
        /**
         * Select a statement whose prerequisites have already left the pending
         * set.
         *
         * @param statement - The pending statement to inspect.
         * @returns Whether every dependency is already satisfied.
         */
        statement =>
          [...(dependencies.get(statement) ?? [])].every(
            /**
             * Check whether a prerequisite is no longer pending.
             *
             * @param dependency - The prerequisite statement.
             * @returns Whether the prerequisite is outside the remaining pending
             * set.
             */
            dependency => !pending.has(dependency),
          ),
      )
      .sort(compare)
    const next = ready[0]
    if (!next) {
      return [
        ...sorted,
        ...statements.filter(
          /**
           * Retain statements still pending when a dependency cycle prevents
           * progress.
           *
           * @param statement - The statement in original order.
           * @returns Whether the statement remains unsorted.
           */
          statement => pending.has(statement),
        ),
      ]
    }
    sorted.push(next)
    pending.delete(next)
  }
  return sorted
}
