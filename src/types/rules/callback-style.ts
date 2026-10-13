import type { CallbackTargetOptions } from '../callback.ts'

export interface CallbackStyleOptions extends CallbackTargetOptions {
  /**
   * Whether arrow callbacks may have expression bodies. Defaults to block.
   */
  bodyStyle?: 'any' | 'block'
  /**
   * Whether inline ordinary functions are accepted. Defaults to arrow.
   */
  functionStyle?: 'any' | 'arrow'
}

export type CallbackStyleMessageId =
  | 'expectedArrowCallback'
  | 'expectedBlockBody'
  | 'expectedInlineCallback'
