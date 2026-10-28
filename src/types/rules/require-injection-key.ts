export interface RequireInjectionKeyOptions {
  /**
   * Exact string keys allowed for third-party contracts. Defaults to [].
   */
  allowStrings?: string[]
  /**
   * Require Vue InjectionKey types using complete TypeScript parser services.
   * Defaults to false, preserving syntax-only string checks.
   */
  strict?: boolean
  /**
   * Unbound Vue API names. Overrides shared autoImport; [] disables globals.
   */
  vueGlobals?: string[]
  /**
   * Modules exposing Vue APIs. Replaces ['vue']; [] disables imports.
   */
  vueImportSources?: string[]
}

export type RequireInjectionKeyMessageId =
  | 'expectedInjectionKey'
  | 'unexpectedStringKey'
