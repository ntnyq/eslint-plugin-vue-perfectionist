/**
 * Shallow value categories; arrays and null are distinct from objects.
 */
export type ComponentPropType =
  | 'array'
  | 'bigint'
  | 'boolean'
  | 'function'
  | 'null'
  | 'number'
  | 'object'
  | 'string'
  | 'symbol'
  | 'undefined'

export interface ComponentPropTypeDescriptor {
  /**
   * Allowed categories. Union order has no meaning.
   */
  type: ComponentPropType | ComponentPropType[]
  /**
   * Model Vue's empty-string / hyphenated-name Boolean casting.
   * Defaults to false; must match the actual component declaration.
   */
  booleanCasting?: boolean
}

export type ComponentPropTypeConstraint =
  | ComponentPropType
  | ComponentPropType[]
  | ComponentPropTypeDescriptor

export interface ComponentPropTypesTarget {
  /**
   * Explicit component names; PascalCase and kebab-case are equivalent.
   */
  components: string[]
  /**
   * Allowed types for supplied props, keyed by camelCase or kebab-case name.
   */
  props: Record<string, ComponentPropTypeConstraint>
}

export interface ComponentPropTypesOptions {
  /**
   * Component contracts. Defaults to []; an empty list disables checks.
   */
  targets?: ComponentPropTypesTarget[]
  /**
   * Handle values with unknown types. Defaults to 'ignore'.
   */
  unknownValues?: 'ignore' | 'report'
}

export type ComponentPropTypesMessageId =
  | 'invalidPropType'
  | 'possiblyInvalidPropType'
  | 'unverifiablePropType'
