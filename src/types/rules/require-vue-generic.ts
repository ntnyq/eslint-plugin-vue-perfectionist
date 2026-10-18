import type { ComponentPropValueConstraint } from './component-prop-values.ts'

export interface RequireVueGenericIgnoreCondition {
  /**
   * All listed props must be present and satisfy all their value constraints.
   */
  props: Record<string, ComponentPropValueConstraint>
}

export interface RequireVueGenericTarget {
  /**
   * Explicit component names; PascalCase and kebab-case are equivalent.
   * A normalized name may occur only once across all targets.
   */
  components: string[]
  /**
   * Any definitely matching condition exempts the usage. Defaults to [].
   */
  ignoreWhen?: RequireVueGenericIgnoreCondition[]
}

export interface RequireVueGenericOptions {
  /**
   * Components requiring explicit generic comments. Defaults to [] (no checks).
   */
  targets?: RequireVueGenericTarget[]
  /**
   * Handle uncertain exemption conditions. Defaults to 'report'.
   * 'ignore' skips usages that might satisfy an exemption.
   */
  unknownValues?: 'ignore' | 'report'
}

export type RequireVueGenericMessageId = 'missingVueGeneric'
