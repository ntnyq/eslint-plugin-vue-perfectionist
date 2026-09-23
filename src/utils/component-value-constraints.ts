import { hyphenateName, validatePropName } from './component-prop-config.ts'
import type {
  ComponentPropScalar,
  ComponentPropValueConstraint,
  ComponentPropValuesTarget,
} from '../types/rules/component-prop-values.ts'
import type { PropValueVariant } from './component-prop-value.ts'

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

function compileConstraint(
  name: string,
  constraint: ComponentPropValueConstraint,
): CompiledValueConstraint {
  const { minimum, maximum, multipleOf, minLength, maxLength, pattern } =
    constraint
  const hasNumber = [minimum, maximum, multipleOf].some(
    value => value !== undefined,
  )
  const hasString = [minLength, maxLength, pattern].some(
    value => value !== undefined,
  )
  if (hasNumber && hasString) {
    throw new Error(`Cannot mix numeric and string constraints for "${name}".`)
  }
  if (
    [minimum, maximum, ...(constraint.enum ?? [])].some(
      value => typeof value === 'number' && !Number.isFinite(value),
    ) ||
    (multipleOf !== undefined &&
      (!Number.isSafeInteger(multipleOf) || multipleOf <= 0)) ||
    [minLength, maxLength].some(
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
      expected: `one of ${values.map(value => JSON.stringify(value)).join(', ')}`,
      accepts: value => values.includes(value),
    })
  }
  if (multipleOf !== undefined) {
    checks.push({
      expected: `a multiple of ${multipleOf}`,
      accepts: value => typeof value === 'number' && value % multipleOf === 0,
    })
  }
  if (minimum !== undefined) {
    checks.push({
      expected: `at least ${minimum}`,
      accepts: value => typeof value === 'number' && value >= minimum,
    })
  }
  if (maximum !== undefined) {
    checks.push({
      expected: `at most ${maximum}`,
      accepts: value => typeof value === 'number' && value <= maximum,
    })
  }
  if (minLength !== undefined) {
    checks.push({
      expected: `a string with at least ${minLength} Unicode code points`,
      accepts(value) {
        return typeof value === 'string' && [...value].length >= minLength
      },
    })
  }
  if (maxLength !== undefined) {
    checks.push({
      expected: `a string with at most ${maxLength} Unicode code points`,
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
      accepts: value => typeof value === 'string' && expression.test(value),
    })
  }
  return {
    name,
    signature: JSON.stringify(
      Object.entries(constraint)
        .map(([key, value]) => [
          key,
          key === 'enum' && Array.isArray(value)
            ? value.map(item => JSON.stringify(item)).sort()
            : value,
        ])
        .sort(([first], [second]) =>
          String(first).localeCompare(String(second)),
        ),
    ),
    checks,
    kind: hasNumber ? 'number' : hasString ? 'string' : undefined,
  }
}

export function compilePropValues(
  targets: ComponentPropValuesTarget[],
): Map<string, Map<string, CompiledValueConstraint>> {
  const result = new Map<string, Map<string, CompiledValueConstraint>>()
  for (const target of targets) {
    const entries = Object.entries(target.props).map(
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
    return checks.map(check => check.expected)
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
    .filter(check => !check.accepts(scalar))
    .map(check => check.expected)
}

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
