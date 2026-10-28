import { unwrapExpression } from '../ast/expressions.ts'
import { getCallIdentity } from './call-identity.ts'
import { getSetupRange } from './script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'
import type { DefineMacrosTypeStyleMacro } from '../../types/index.ts'

/**
 * Visits only compiler macro positions supported by the macro type rules.
 *
 * @param sourceCode - The source code providing the script setup range and
 * lexical scopes.
 * @param filename - The filename used to restrict analysis to Vue SFCs.
 * @param check - The handler invoked with the macro name and its sole type
 * argument.
 * @returns A program visitor, or an empty visitor outside a Vue script setup
 * block.
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

  /**
   * Inspect a top-level expression for an unshadowed type-only compiler macro.
   *
   * @param expression - The expression to inspect, including TypeScript
   * wrappers.
   * @param allowDefaults - Whether one withDefaults wrapper may be unwrapped;
   * defaults to true.
   */
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
    switch (macro) {
      case 'defineProps':
      case 'defineEmits':
      case 'defineSlots':
        break
      default:
        return
    }
    const types = call.typeArguments?.params
    if (call.arguments.length === 0 && types?.length === 1 && types[0]) {
      check(macro, types[0])
    }
  }

  return {
    /**
     * Inspect top-level expressions and variable initializers for supported
     * macros.
     *
     * @param program - The merged SFC program.
     */
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
