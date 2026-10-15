import { hyphenateName, validatePropName } from './config.ts'
import type {
  ComponentPropScalar,
  ComponentPropValueConstraint,
  ComponentPropValuesTarget,
} from '../../types/rules/component-prop-values.ts'
import type { PropValueVariant } from './value.ts'

interface ValueCheck {
  expected: string
  accepts: (value: ComponentPropScalar) => boolean
}

export interface CompiledValueConstraint {
  name: string
  signature: string
  checks: ValueCheck[]
  kind: 'number' | 'string' | undefined
}

/**
 * Compile a scalar value constraint into reusable checks and a canonical
 * signature.
 *
 * @param name - The raw prop name used in diagnostics.
 * @param constraint - The configured scalar value constraints.
 * @returns The compiled checks, comparison signature, and required scalar kind.
 * @throws {Error} If numeric and string constraints are mixed or bounds are
 * invalid.
 * @throws {SyntaxError} If the configured pattern is not a valid Unicode
 * regular expression.
 */
function compileConstraint(
  name: string,
  constraint: ComponentPropValueConstraint,
): CompiledValueConstraint {
  const { minimum, maximum, multipleOf, minLength, maxLength, pattern } =
    constraint
  const hasNumber = [minimum, maximum, multipleOf].some(
    /**
     * Detect an explicitly configured constraint.
     *
     * @param value - The optional constraint setting.
     * @returns Whether the setting is defined.
     */
    value => value !== undefined,
  )
  const hasString = [minLength, maxLength, pattern].some(
    /**
     * Detect an explicitly configured constraint.
     *
     * @param value - The optional constraint setting.
     * @returns Whether the setting is defined.
     */
    value => value !== undefined,
  )
  if (hasNumber && hasString) {
    throw new Error(`Cannot mix numeric and string constraints for "${name}".`)
  }
  if (
    [minimum, maximum, ...(constraint.enum ?? [])].some(
      /**
       * Reject non-finite numeric constraint values.
       *
       * @param value - The bound or enum candidate.
       * @returns Whether the value is a non-finite number.
       */
      value => typeof value === 'number' && !Number.isFinite(value),
    ) ||
    (multipleOf !== undefined &&
      (!Number.isSafeInteger(multipleOf) || multipleOf <= 0)) ||
    [minLength, maxLength].some(
      /**
       * Reject invalid Unicode code point length bounds.
       *
       * @param value - The optional length bound.
       * @returns Whether the bound is defined but is not a nonnegative safe
       * integer.
       */
      value =>
        value !== undefined && (!Number.isSafeInteger(value) || value < 0),
    ) ||
    (minimum !== undefined && maximum !== undefined && minimum > maximum) ||
    (minLength !== undefined &&
      maxLength !== undefined &&
      minLength > maxLength)
  ) {
    throw new Error(`Invalid value constraint bounds for "${name}".`)
  }
  const checks: ValueCheck[] = []
  if (constraint.enum) {
    const values = constraint.enum
    checks.push({
      expected: `one of ${values
        .map(
          /**
           * Serialize an enum candidate for a diagnostic.
           *
           * @param value - The permitted scalar value.
           * @returns The JSON representation of the scalar.
           */
          value => JSON.stringify(value),
        )
        .join(', ')}`,
      /**
       * Check membership in the configured scalar enum.
       *
       * @param value - The scalar prop value.
       * @returns Whether the value is an allowed enum member.
       */
      accepts: value => values.includes(value),
    })
  }
  if (multipleOf !== undefined) {
    checks.push({
      expected: `a multiple of ${multipleOf}`,
      /**
       * Check an exact numeric multiple constraint.
       *
       * @param value - The scalar prop value.
       * @returns Whether the value is numeric and divisible by the configured
       * multiple.
       */
      accepts: value => typeof value === 'number' && value % multipleOf === 0,
    })
  }
  if (minimum !== undefined) {
    checks.push({
      expected: `at least ${minimum}`,
      /**
       * Check the inclusive numeric minimum.
       *
       * @param value - The scalar prop value.
       * @returns Whether the value is numeric and meets the minimum.
       */
      accepts: value => typeof value === 'number' && value >= minimum,
    })
  }
  if (maximum !== undefined) {
    checks.push({
      expected: `at most ${maximum}`,
      /**
       * Check the inclusive numeric maximum.
       *
       * @param value - The scalar prop value.
       * @returns Whether the value is numeric and meets the maximum.
       */
      accepts: value => typeof value === 'number' && value <= maximum,
    })
  }
  if (minLength !== undefined) {
    checks.push({
      expected: `a string with at least ${minLength} Unicode code points`,
      /**
       * Check the minimum string length in Unicode code points.
       *
       * @param value - The scalar prop value.
       * @returns Whether the value is a string containing at least the required
       * number of code points.
       */
      accepts(value) {
        return typeof value === 'string' && [...value].length >= minLength
      },
    })
  }
  if (maxLength !== undefined) {
    checks.push({
      expected: `a string with at most ${maxLength} Unicode code points`,
      /**
       * Check the maximum string length in Unicode code points.
       *
       * @param value - The scalar prop value.
       * @returns Whether the value is a string containing no more than the
       * allowed number of code points.
       */
      accepts(value) {
        return typeof value === 'string' && [...value].length <= maxLength
      },
    })
  }
  if (pattern !== undefined) {
    // Compile once per configured contract, never once per template usage.
    const expression = new RegExp(pattern, 'u')
    checks.push({
      expected: `a string matching /${pattern}/u`,
      /**
       * Check the compiled Unicode pattern against a string value.
       *
       * @param value - The scalar prop value.
       * @returns Whether the value is a string matching the configured pattern.
       */
      accepts: value => typeof value === 'string' && expression.test(value),
    })
  }
  return {
    name,
    signature: JSON.stringify(
      Object.entries(constraint)
        .map(
          /**
           * Canonicalize a constraint entry for conflict detection.
           *
           * @param entry - The constraint key and its configured value.
           * @param entry."0" - The constraint key.
           * @param entry."1" - The configured constraint value.
           * @returns The key-value pair with enum members serialized and sorted.
           */
          ([key, value]) => [
            key,
            key === 'enum' && Array.isArray(value)
              ? value
                  .map(
                    /**
                     * Serialize an enum member for order-independent comparison.
                     *
                     * @param item - The scalar enum member.
                     * @returns The JSON representation used in the canonical signature.
                     */
                    item => JSON.stringify(item),
                  )
                  .sort()
              : value,
          ],
        )
        .sort(
          /**
           * Order canonical constraint entries by key.
           *
           * @param left - The first constraint entry.
           * @param left."0" - The first constraint key.
           * @param right - The second constraint entry.
           * @param right."0" - The second constraint key.
           * @returns A negative, zero, or positive number according to key order.
           */
          ([first], [second]) => String(first).localeCompare(String(second)),
        ),
    ),
    checks,
    kind: hasNumber ? 'number' : hasString ? 'string' : undefined,
  }
}

/**
 * Compile and merge scalar value contracts for each component.
 *
 * @param targets - The configured component targets and value constraints.
 * @returns Component maps of normalized props and compiled value checks.
 * @throws {Error} If a prop name or constraint is invalid, or normalized
 * contracts conflict.
 * @throws {SyntaxError} If a configured pattern is not a valid Unicode regular
 * expression.
 */
export function compilePropValues(
  targets: ComponentPropValuesTarget[],
): Map<string, Map<string, CompiledValueConstraint>> {
  const result = new Map<string, Map<string, CompiledValueConstraint>>()
  for (const target of targets) {
    const entries = Object.entries(target.props).map(
      /**
       * Validate and compile one configured prop contract.
       *
       * @param entry - The raw prop name and its value constraint.
       * @param entry."0" - The raw prop name.
       * @param entry."1" - The configured value constraint.
       * @returns The normalized name paired with the compiled constraint.
       * @throws {Error} If the prop name or constraint is invalid.
       * @throws {SyntaxError} If the pattern is not a valid Unicode regular
       * expression.
       */
      ([name, constraint]) =>
        [validatePropName(name), compileConstraint(name, constraint)] as const,
    )
    for (const component of target.components) {
      const key = hyphenateName(component)
      const props =
        result.get(key) ?? new Map<string, CompiledValueConstraint>()
      for (const [normalized, constraint] of entries) {
        const previous = props.get(normalized)
        if (previous && previous.signature !== constraint.signature) {
          throw new Error(
            `Conflicting values for prop "${constraint.name}" on <${component}>.`,
          )
        }
        props.set(normalized, previous ?? constraint)
      }
      result.set(key, props)
    }
  }
  return result
}

/**
 * Undefined means the concrete scalar is unknown; an empty array means valid.
 *
 * @param variant - The inferred type and optional concrete scalar.
 * @param constraint - The compiled value constraint to enforce.
 * @returns Failure descriptions, an empty array when valid, or undefined when
 * the scalar is unknown.
 */
export function getValueFailures(
  variant: PropValueVariant,
  constraint: CompiledValueConstraint,
): string[] | undefined {
  const { kind, checks } = constraint
  if (kind && variant.type !== kind) {
    return [kind === 'number' ? 'a finite number' : 'a string']
  }
  if (!['string', 'number', 'boolean', 'null'].includes(variant.type)) {
    return checks.map(
      /**
       * Read the expectation used to describe a failed value check.
       *
       * @param check - The compiled scalar check.
       * @returns The human-readable expected value description.
       */
      check => check.expected,
    )
  }
  const value = variant.value ?? variant.stringValue
  // Null is a known enum candidate, not an unresolved value.
  const scalar = variant.type === 'null' ? null : value
  if (scalar === undefined) {
    return undefined
  }
  if (typeof scalar === 'number' && !Number.isFinite(scalar)) {
    return ['a finite number']
  }
  return checks
    .filter(
      /**
       * Select checks rejected by the known scalar value.
       *
       * @param check - The compiled scalar check.
       * @returns Whether the scalar fails the check.
       */
      check => !check.accepts(scalar),
    )
    .map(
      /**
       * Read the expectation used to describe a failed value check.
       *
       * @param check - The compiled scalar check.
       * @returns The human-readable expected value description.
       */
      check => check.expected,
    )
}

/**
 * Describe a prop variant for a diagnostic without inventing an unknown value.
 *
 * @param variant - The inferred variant to describe.
 * @returns The concrete scalar representation when known, otherwise the variant
 * type.
 */
export function describePropVariant(variant: PropValueVariant): string {
  if (variant.type === 'null') {
    return 'null'
  }
  const value = variant.value ?? variant.stringValue
  return value === undefined
    ? variant.type
    : typeof value === 'number'
      ? String(value)
      : JSON.stringify(value)
}
