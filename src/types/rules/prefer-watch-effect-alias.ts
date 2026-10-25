export interface PreferWatchEffectAliasOptions {
  /**
   * Unbound API names supplied by auto-import tooling. Replaces the shared
   * autoImport setting; an empty array disables global recognition. Explicitly
   * include watchPostEffect or watchSyncEffect to authorize fixing to that global.
   */
  vueGlobals?: string[]
  /**
   * Exact modules exposing Vue's named APIs. Replaces the default ["vue"].
   * An empty array disables imported API recognition.
   */
  vueImportSources?: string[]
}

export type PreferWatchEffectAliasMessageId = 'preferredAlias'
