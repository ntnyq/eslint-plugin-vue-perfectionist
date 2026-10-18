/**
 * Containers whose direct function bindings require declarations.
 */
export type PreferFunctionDeclarationScope = 'composables' | 'sfc'

export interface PreferFunctionDeclarationOptions {
  /**
   * Allow function bindings with a variable type annotation. Default: false.
   */
  allowTypeAnnotation?: boolean
  /**
   * Regular expression source for composable binding names. Default: '^use[A-Z]'.
   */
  functionPattern?: string
  /**
   * Exact composable container names to exclude. Default: [].
   */
  ignoreNames?: string[]
  /**
   * Replaces the default ['sfc', 'composables']; an empty array disables checks.
   */
  scopes?: PreferFunctionDeclarationScope[]
}

export type PreferFunctionDeclarationMessageId = 'expectedFunctionDeclaration'
