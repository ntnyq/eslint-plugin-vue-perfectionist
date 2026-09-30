export type RequireMacroTypeNameMacro =
  | 'defineEmits'
  | 'defineProps'
  | 'defineSlots'

export interface RequireMacroTypeNameOptions {
  /**
   * Exact call-site type names. Omitted keys default to Props, Emits, and Slots.
   * Set a macro to false to disable its naming requirement.
   */
  macros?: Partial<Record<RequireMacroTypeNameMacro, false | string>>
}

export type RequireMacroTypeNameMessageId =
  | 'expectedNamedType'
  | 'unexpectedTypeName'
