/**
 * Require directly returned composable fields to expose local bindings.
 */
export interface RequireComposableReturnBindingsOptions {
  /**
   * Allow public keys to differ from binding names. Defaults to true.
   */
  allowAliases?: boolean
  /**
   * Allow bindings from the current function's parameters. Defaults to false.
   */
  allowParameters?: boolean
  /**
   * Regular expression matching function binding names. Defaults to ^use[A-Z].
   */
  functionPattern?: string
  /**
   * Exact function binding names to exclude. Empty excludes nothing.
   */
  ignoreNames?: string[]
}

export type RequireComposableReturnBindingsMessageId =
  | 'dynamicKey'
  | 'expectedBinding'
  | 'nonLocalBinding'
  | 'prototypeSetter'
  | 'unexpectedAlias'
  | 'unexpectedParameter'
  | 'unexpectedSpread'
