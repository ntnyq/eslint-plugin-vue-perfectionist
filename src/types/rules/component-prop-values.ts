/**
 * Supported enum values; numbers must be finite.
 */
export type ComponentPropScalar = boolean | number | string | null

/**
 * Lightweight value constraints, not a JSON Schema implementation.
 * All configured constraints must hold. Numeric and string constraints cannot mix.
 */
export interface ComponentPropValueConstraint {
  /**
   * Nonempty list of allowed scalar values, compared without coercion.
   */
  enum?: ComponentPropScalar[]
  /**
   * Inclusive finite numeric upper bound.
   */
  maximum?: number
  /**
   * Inclusive maximum Unicode code point count. Implies a string value.
   */
  maxLength?: number
  /**
   * Inclusive finite numeric lower bound.
   */
  minimum?: number
  /**
   * Inclusive minimum Unicode code point count. Implies a string value.
   */
  minLength?: number
  /**
   * Positive safe integer divisor. Implies a finite number value.
   */
  multipleOf?: number
  /**
   * JavaScript regular expression source, compiled with the Unicode flag.
   * No implicit anchors or type coercion.
   */
  pattern?: string
}

export interface ComponentPropValuesTarget {
  /**
   * Explicit component names; PascalCase and kebab-case are equivalent.
   */
  components: string[]
  /**
   * Constraints for supplied props, keyed by camelCase or kebab-case name.
   */
  props: Record<string, ComponentPropValueConstraint>
}

export interface ComponentPropValuesOptions {
  /**
   * Component contracts. Defaults to []; an empty list disables checks.
   */
  targets?: ComponentPropValuesTarget[]
  /**
   * Handle values that cannot be established statically. Defaults to 'ignore'.
   */
  unknownValues?: 'ignore' | 'report'
}

export type ComponentPropValuesMessageId =
  | 'invalidPropValue'
  | 'possiblyInvalidPropValue'
  | 'unverifiablePropValue'
