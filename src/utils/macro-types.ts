import { getCallIdentity, getSetupRange, unwrapExpression } from './ast.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { DefineMacrosTypeStyleMacro, SourceCode } from '../types/index.ts'

/**
 * Visits only compiler macro positions supported by the macro type rules.
 */
export function createMacroTypeVisitor(
  sourceCode: SourceCode,
  filename: string,
  check: (macro: DefineMacrosTypeStyleMacro, type: TSESTree.TypeNode) => void,
) {
  const setupRange = getSetupRange(sourceCode)
  if (!filename.endsWith('.vue') || !setupRange) {
    return {}
  }

  const [setupStart, setupEnd] = setupRange

  function inspect(expression: TSESTree.Node, allowDefaults = true) {
    const call = unwrapExpression(expression)
    if (
      call.type !== 'CallExpression' ||
      call.callee.type !== 'Identifier' ||
      call.range[0] < setupStart ||
      call.range[1] > setupEnd ||
      !getCallIdentity(call, sourceCode)?.isUnbound
    ) {
      return
    }
    const macro = call.callee.name
    if (allowDefaults && macro === 'withDefaults') {
      const argument = call.arguments[0]
      if (argument) {
        const inner = unwrapExpression(argument)
        if (
          inner.type === 'CallExpression' &&
          inner.callee.type === 'Identifier' &&
          inner.callee.name === 'defineProps'
        ) {
          inspect(inner, false)
        }
      }
      return
    }
    if (
      macro !== 'defineProps' &&
      macro !== 'defineEmits' &&
      macro !== 'defineSlots'
    ) {
      return
    }
    const types = call.typeArguments?.params
    if (call.arguments.length === 0 && types?.length === 1 && types[0]) {
      check(macro, types[0])
    }
  }

  return {
    Program(program: TSESTree.Program) {
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
    },
  }
}
