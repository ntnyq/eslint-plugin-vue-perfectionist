import type {
  ComponentPropType,
  ComponentPropTypesTarget,
} from '../types/index.ts'

export interface CompiledPropConstraint {
  name: string
  types: ComponentPropType[]
  booleanCasting: boolean
}

export function hyphenateName(name: string): string {
  return name.replace(/\B([A-Z])/gu, '-$1').toLowerCase()
}

export function normalizePropName(name: string): string {
  return name.replace(/-(\w)/gu, (_, character: string) =>
    character.toUpperCase(),
  )
}

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
