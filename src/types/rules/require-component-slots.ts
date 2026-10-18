export interface RequireComponentSlotsTarget {
  /**
   * Explicit component names; PascalCase and kebab-case are equivalent.
   */
  components: string[]
  /**
   * Case-sensitive slot names that every matching usage must provide.
   * Use 'default' for the default slot.
   */
  slots: string[]
}

export interface RequireComponentSlotsOptions {
  /**
   * Component contracts. Defaults to []; an empty list disables checks.
   */
  targets?: RequireComponentSlotsTarget[]
  /**
   * Handle dynamic slot names that may satisfy a requirement.
   * Defaults to 'report'; 'ignore' suppresses only uncertain requirements.
   */
  unknownSlots?: 'ignore' | 'report'
}

export type RequireComponentSlotsMessageId =
  | 'missingSlot'
  | 'unverifiableRequiredSlot'
