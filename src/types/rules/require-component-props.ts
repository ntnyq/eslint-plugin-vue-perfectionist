export interface RequireComponentPropsTarget {
  /**
   * Explicit component names; PascalCase and kebab-case are equivalent.
   */
  components: string[]
  /**
   * Props that each matching component usage must provide.
   */
  props: string[]
}

export interface RequireComponentPropsOptions {
  /**
   * Component contracts. Defaults to []; an empty list disables checks.
   */
  targets?: RequireComponentPropsTarget[]
  /**
   * Handle bindings that may provide a required prop. Defaults to 'report'.
   */
  unknownBindings?: 'ignore' | 'report'
}

export type RequireComponentPropsMessageId =
  | 'missingProp'
  | 'unverifiableRequiredProp'
