import type { CallbackTargetOptions } from '../callback.ts'

export interface MaxLinesPerCallbackOptions extends CallbackTargetOptions {
  /**
   * Maximum physical lines per inline callback, including its signature and
   * braces. Defaults to 20.
   */
  max?: number
  /**
   * Exclude whitespace-only lines. Defaults to false.
   */
  skipBlankLines?: boolean
  /**
   * Exclude lines containing only comments and whitespace. Defaults to false.
   */
  skipComments?: boolean
}

export type MaxLinesPerCallbackMessageId = 'exceededMaxLines'
