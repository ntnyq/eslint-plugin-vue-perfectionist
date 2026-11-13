import { unwrapExpression } from '../ast/expressions.ts'
import { getCallIdentity } from './call-identity.ts'
import { getSetupRange, isInScriptRange } from './script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

type SetupMacroCall = TSESTree.CallExpression & {
  callee: TSESTree.Identifier
}

/**
 * Preserve the original call node while narrowing its direct unbound callee.
 */
function isSetupMacroCandidate(
  node: TSESTree.Node,
  sourceCode: SourceCode,
  setupRange: TSESTree.Range,
): node is SetupMacroCall {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    isInScriptRange(node, setupRange) &&
    getCallIdentity(node, sourceCode)?.isUnbound === true
  )
}

/**
 * Read direct unbound setup calls, unwrapping withDefaults only around
 * defineProps. Consumers retain their macro and argument-shape policies.
 *
 * @param program - The merged SFC program.
 * @param sourceCode - The source providing lexical scope information.
 * @param setupRange - The complete script setup content range.
 * @param defaultsPolicy - Whether withDefaults must have exactly two arguments.
 * @returns Candidate calls in source order, excluding nested execution contexts.
 */
export function getSetupMacroCandidates(
  program: TSESTree.Program,
  sourceCode: SourceCode,
  setupRange: TSESTree.Range,
  defaultsPolicy: 'any-arity' | 'two-arguments',
): SetupMacroCall[] {
  const calls: SetupMacroCall[] = []

  /**
   * Inspect a direct macro position without traversing arbitrary expressions.
   *
   * @param expression - The expression to inspect.
   * @param allowDefaults - Whether a withDefaults wrapper is accepted.
   */
  function inspect(expression: TSESTree.Node, allowDefaults = true) {
    const call = unwrapExpression(expression)
    if (!isSetupMacroCandidate(call, sourceCode, setupRange)) {
      return
    }
    if (allowDefaults && call.callee.name === 'withDefaults') {
      const argument = call.arguments[0]
      const inner = argument && unwrapExpression(argument)
      if (
        (defaultsPolicy === 'any-arity' || call.arguments.length === 2) &&
        inner?.type === 'CallExpression' &&
        inner.callee.type === 'Identifier' &&
        inner.callee.name === 'defineProps'
      ) {
        inspect(inner, false)
      }
      return
    }
    calls.push(call)
  }

  for (const statement of program.body) {
    if (statement.type === 'ExpressionStatement') {
      inspect(statement.expression)
    } else if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations) {
        if (declaration.init) {
          inspect(declaration.init)
        }
      }
    }
  }
  return calls
}

/**
 * Collect unbound model-contract macros in top-level setup positions.
 *
 * @param program - The merged SFC program.
 * @param sourceCode - The source providing parser services and lexical scopes.
 * @param filename - The filename used to exclude standalone scripts.
 * @returns Props, emits, and model calls; withDefaults requires two arguments.
 */
export function getSetupMacroCalls(
  program: TSESTree.Program,
  sourceCode: SourceCode,
  filename: string,
): TSESTree.CallExpression[] {
  const range = getSetupRange(sourceCode)
  if (!filename.endsWith('.vue') || !range) {
    return []
  }
  return getSetupMacroCandidates(
    program,
    sourceCode,
    range,
    'two-arguments',
  ).filter(call =>
    ['defineProps', 'defineEmits', 'defineModel'].includes(call.callee.name),
  )
}
