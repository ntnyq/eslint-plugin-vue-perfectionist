/**
 * Built-in Vue API groups with known callback argument positions.
 */
export type CallbackGroup = 'cleanup' | 'lifecycle' | 'scheduler' | 'watch'

export interface CustomCallback {
  /**
   * Zero-based callback argument positions.
   */
  callbackIndices: number[]
  /**
   * Original export name, or "default" for a default import.
   */
  name: string
  /**
   * Exact module specifier used by the import.
   */
  source: string
  /**
   * Recognize the unbound export name. Defaults to the shared autoImport setting.
   */
  autoImport?: boolean
}

export interface CallbackStyleOptions {
  /**
   * Whether arrow callbacks may have expression bodies. Defaults to block.
   */
  bodyStyle?: 'any' | 'block'
  /**
   * Additional callback targets, independent of built-in groups.
   */
  customCallbacks?: CustomCallback[]
  /**
   * Original built-in export names to exclude. Custom entries still apply.
   */
  exclude?: string[]
  /**
   * Whether inline ordinary functions are accepted. Defaults to arrow.
   */
  functionStyle?: 'any' | 'arrow'
  /**
   * Enabled built-in groups. Defaults to lifecycle and watch.
   */
  groups?: CallbackGroup[]
  /**
   * Unbound Vue API names supplied by auto-import tooling.
   */
  vueGlobals?: string[]
  /**
   * Modules exposing Vue's named APIs. Defaults to ["vue"].
   */
  vueImportSources?: string[]
}

export type CallbackStyleMessageId =
  | 'expectedArrowCallback'
  | 'expectedBlockBody'
  | 'expectedInlineCallback'
