import { hyphenateName } from './config.ts'
import type { ComponentPropType } from '../../types/rules/component-prop-types.ts'
import type { CompiledPropConstraint } from './config.ts'
import type { PropValue } from './value.ts'

interface PropTypeAnalysis {
  actual: ComponentPropType[]
  invalid: ComponentPropType[]
}

/**
 * Apply configured Vue Boolean casting without widening unknown values into
 * certain types. Unknown strings may remain strings or be cast to booleans.
 *
 * @param value - The inferred prop variants and uncertainty.
 * @param propName - The prop name used to recognize Vue Boolean casting.
 * @param constraint - The accepted types and Boolean casting policy.
 * @returns Sorted unique possible types and the subset rejected by the
 * constraint.
 */
export function analyzePropTypes(
  value: PropValue,
  propName: string,
  constraint: CompiledPropConstraint,
): PropTypeAnalysis {
  const actual = [
    ...new Set(
      value.variants.flatMap(
        /**
         * Apply Vue Boolean casting to one known value variant.
         *
         * @param variant - The inferred prop variant.
         * @returns The possible runtime types after the configured casting
         * policy.
         */
        variant => {
          if (!constraint.booleanCasting || variant.type !== 'string') {
            return [variant.type]
          }
          if (variant.stringValue === undefined) {
            return ['string', 'boolean'] as const
          }
          return [
            variant.stringValue === '' ||
            variant.stringValue === hyphenateName(propName)
              ? ('boolean' as const)
              : ('string' as const),
          ]
        },
      ),
    ),
  ].sort()
  const invalid = actual.filter(
    /**
     * Identify inferred types excluded by the contract.
     *
     * @param type - The possible runtime prop type.
     * @returns Whether the configured accepted types exclude this type.
     */
    type => !constraint.types.includes(type),
  )
  return {
    actual,
    invalid,
  }
}
