import { getSetupRange } from './script-scope.ts'
import { getSetupMacroCandidates } from './setup-macros.ts'
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

  return {
    Program(program: TSESTree.Program) {
      for (const call of getSetupMacroCandidates(
        program,
        sourceCode,
        setupRange,
        'any-arity',
      )) {
        const macro = call.callee.name
        switch (macro) {
          case 'defineProps':
          case 'defineEmits':
          case 'defineSlots':
            break
          default:
            continue
        }
        const types = call.typeArguments?.params
        if (call.arguments.length === 0 && types?.length === 1 && types[0]) {
          check(macro, types[0])
        }
      }
    },
  }
}
