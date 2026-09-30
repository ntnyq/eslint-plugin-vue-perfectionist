export type DefineMacrosTypeStyleMacro =
  | 'defineEmits'
  | 'defineProps'
  | 'defineSlots'

export type DefineMacrosTypeStyle = 'imported' | 'inline' | 'local'

export interface DefineMacrosTypeStyleOptions {
  /**
   * Allowed declaration styles per macro. Omitted keys default to local.
   * Arrays replace the macro default; false disables that macro.
   */
  macros?: Partial<
    Record<
      DefineMacrosTypeStyleMacro,
      false | DefineMacrosTypeStyle | DefineMacrosTypeStyle[]
    >
  >
}

export type DefineMacrosTypeStyleMessageId =
  | 'unexpectedTypeStyle'
  | 'unknownTypeSource'
  | 'unsupportedTypeForm'
