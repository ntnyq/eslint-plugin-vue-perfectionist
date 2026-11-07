/**
 * Built-in Vue and VueUse API groups with known callback argument positions.
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

export interface CallbackTargetOptions {
  /**
   * Additional callback targets, independent of built-in groups.
   */
  customCallbacks?: CustomCallback[]
  /**
   * Original built-in export names to exclude. Custom entries still apply.
   */
  exclude?: string[]
  /**
   * Enabled built-in groups. Defaults to lifecycle and watch.
   */
  groups?: CallbackGroup[]
  /**
   * Unbound built-in API names supplied by auto-import tooling. Overrides the
   * shared autoImport setting; VueUse names still require vueuse to be enabled.
   */
  vueGlobals?: string[]
  /**
   * Modules exposing Vue's named APIs. Defaults to ["vue"].
   */
  vueImportSources?: string[]
  /**
   * Enable built-in VueUse callbacks. Overrides the shared vueuse setting,
   * which defaults to false. Custom callbacks are independent of this option.
   */
  vueuse?: boolean
}
