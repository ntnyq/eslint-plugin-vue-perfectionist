import { unwrapExpression } from '../ast/expressions.ts'
import { getCallIdentity } from './call-identity.ts'
import { getSetupRange, isInScriptRange } from './script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

/**
 * Collect unbound compiler macro calls in top-level setup positions.
 *
 * @param program - The merged SFC program.
 * @param sourceCode - The source providing parser services and lexical scopes.
 * @param filename - The filename used to exclude standalone scripts.
 * @returns Direct initializer and expression calls, unwrapping withDefaults
 * only around defineProps.
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
  const setupRange = range
  const calls: TSESTree.CallExpression[] = []

  /**
   * Inspect a direct macro position without traversing arbitrary expressions.
   *
   * @param expression - The expression to inspect.
   * @param allowDefaults - Whether a withDefaults wrapper is accepted.
   */
  function inspect(expression: TSESTree.Node, allowDefaults = true) {
    const call = unwrapExpression(expression)
    if (
      call.type !== 'CallExpression' ||
      call.callee.type !== 'Identifier' ||
      !isInScriptRange(call, setupRange) ||
      !getCallIdentity(call, sourceCode)?.isUnbound
    ) {
      return
    }
    if (allowDefaults && call.callee.name === 'withDefaults') {
      const argument = call.arguments[0]
      const inner = argument && unwrapExpression(argument)
      if (
        call.arguments.length === 2 &&
        inner?.type === 'CallExpression' &&
        inner.callee.type === 'Identifier' &&
        inner.callee.name === 'defineProps'
      ) {
        inspect(inner, false)
      }
      return
    }
    if (
      ['defineProps', 'defineEmits', 'defineModel'].includes(call.callee.name)
    ) {
      calls.push(call)
    }
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
