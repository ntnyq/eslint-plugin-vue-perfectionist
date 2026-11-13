import { getCallIdentity } from '../vue/call-identity.ts'
import { MACROS } from './constants.ts'
import type { SourceCode } from '../../types/eslint.ts'
import type { SpecialCallClassifier } from '../sort-statements/types.ts'

/**
 * Recognize compiler macros only in the setup statement container.
 */
export function createMacroClassifier(
  sourceCode: SourceCode,
): SpecialCallClassifier {
  return (call, identity) => {
    if (!identity.isUnbound) {
      return undefined
    }
    if (identity.classificationName === 'withDefaults') {
      const first = call.arguments[0]
      if (first?.type === 'CallExpression') {
        const inner = getCallIdentity(first, sourceCode)
        if (inner?.isUnbound && inner.classificationName === 'defineProps') {
          return {
            selector: 'define-props',
            callName: 'defineProps',
          }
        }
      }
    }
    const selector = MACROS.get(identity.classificationName)
    return selector ? { selector } : undefined
  }
}
