export type PreferOnScopeDisposeHook = 'onBeforeUnmount' | 'onUnmounted'

export interface PreferOnScopeDisposeOptions {
  /**
   * Regular expression source matching composable binding names. Defaults to '^use[A-Z]'.
   */
  functionPattern?: string
  /**
   * Lifecycle APIs to report. Replaces ['onUnmounted']; [] disables checks.
   */
  hooks?: PreferOnScopeDisposeHook[]
  /**
   * Exact composable binding names to exempt. Defaults to [].
   */
  ignoreNames?: string[]
  /**
   * Unbound Vue API names. Overrides shared autoImport; [] disables globals.
   */
  vueGlobals?: string[]
  /**
   * Modules exposing Vue APIs. Replaces ['vue']; [] disables imports.
   */
  vueImportSources?: string[]
}

export type PreferOnScopeDisposeMessageId = 'preferScopeDispose'
