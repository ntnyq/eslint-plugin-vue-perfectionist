import type {
  ComponentPropType,
  ComponentPropTypesTarget,
  RequireComponentPropsTarget,
} from '../../types/index.ts'

export interface CompiledPropConstraint {
  name: string
  types: ComponentPropType[]
  booleanCasting: boolean
}

/**
 * Normalize component or prop names to lowercase hyphenated spelling.
 *
 * @param name - The name to normalize.
 * @returns The name with noninitial uppercase letters prefixed by hyphens and
 * all letters lowercased.
 */
export function hyphenateName(name: string): string {
  return name.replace(/\B([A-Z])/gu, '-$1').toLowerCase()
}

/**
 * Normalize hyphenated prop aliases to camel-case names.
 *
 * @param name - The raw prop name.
 * @returns The name with each hyphen-word-character pair replaced by its
 * uppercase character.
 */
export function normalizePropName(name: string): string {
  return name.replace(
    /-(\w)/gu,
    /**
     * Convert a hyphenated character match to camel case.
     *
     * @param _ - The full hyphen-character match, which is unused.
     * @param character - The captured character following the hyphen.
     * @returns The uppercase character.
     */
    (_, character: string) => character.toUpperCase(),
  )
}

/**
 * Validate a configured component prop name and normalize its spelling.
 *
 * @param name - The raw prop contract name.
 * @returns The normalized prop name.
 * @throws {Error} If the name is empty, contains whitespace, or denotes a
 * reserved prop or event listener.
 */
export function validatePropName(name: string): string {
  const normalized = normalizePropName(name)
  if (
    !name ||
    /\s/u.test(name) ||
    [
      'class',
      'style',
      'key',
      'ref',
      'refFor',
      'refKey',
      'ref_for',
      'ref_key',
      'is',
    ].includes(normalized) ||
    /^on[^a-z]/u.test(normalized) ||
    normalized.startsWith('on:')
  ) {
    throw new Error(`Unsupported component prop contract: "${name}".`)
  }
  return normalized
}

/**
 * Compile required props by normalized component and prop name.
 *
 * @param targets - The configured component targets and required prop names.
 * @returns Component maps retaining the first raw spelling for each normalized
 * prop.
 * @throws {Error} If a configured prop name is unsupported.
 */
export function compileRequiredProps(
  targets: RequireComponentPropsTarget[],
): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>()
  for (const target of targets) {
    for (const component of target.components) {
      const key = hyphenateName(component)
      const props = result.get(key) ?? new Map<string, string>()
      for (const name of target.props) {
        const normalized = validatePropName(name)
        if (!props.has(normalized)) {
          props.set(normalized, name)
        }
      }
      result.set(key, props)
    }
  }
  return result
}

/**
 * Compile and merge component prop type contracts.
 *
 * @param targets - The configured component targets and type constraints.
 * @returns Component maps of normalized props and their deduplicated type
 * constraints.
 * @throws {Error} If a prop name is unsupported or normalized contracts
 * disagree on types or Boolean casting.
 */
export function compilePropTypes(
  targets: ComponentPropTypesTarget[],
): Map<string, Map<string, CompiledPropConstraint>> {
  const result = new Map<string, Map<string, CompiledPropConstraint>>()
  for (const target of targets) {
    for (const component of target.components) {
      const key = hyphenateName(component)
      const props = result.get(key) ?? new Map<string, CompiledPropConstraint>()
      for (const [name, constraint] of Object.entries(target.props)) {
        const normalized = validatePropName(name)
        const descriptor =
          typeof constraint === 'object' && !Array.isArray(constraint)
            ? constraint
            : { type: constraint }
        const types = [
          ...new Set(
            Array.isArray(descriptor.type)
              ? descriptor.type
              : [descriptor.type],
          ),
        ].sort()
        const booleanCasting = descriptor.booleanCasting ?? false
        const previous = props.get(normalized)
        if (
          previous &&
          (previous.types.join('|') !== types.join('|') ||
            previous.booleanCasting !== booleanCasting)
        ) {
          throw new Error(
            `Conflicting types for prop "${name}" on <${component}>.`,
          )
        }
        props.set(normalized, {
          name: previous?.name ?? name,
          types,
          booleanCasting,
        })
      }
      result.set(key, props)
    }
  }
  return result
}
