/**
 * Vue compiler macros supported by define-macros-newline.
 */
export type DefineMacrosNewlineMacro =
  | 'defineEmits'
  | 'defineExpose'
  | 'defineOptions'
  | 'defineProps'
  | 'defineSlots'

export interface DefineMacrosNewlineOptions {
  /**
   * Replaces the default props, emits, slots, and expose macro list.
   * An empty array disables all checks.
   */
  macros?: DefineMacrosNewlineMacro[]
}

export type DefineMacrosNewlineMessageId = 'expectedNewlines'
