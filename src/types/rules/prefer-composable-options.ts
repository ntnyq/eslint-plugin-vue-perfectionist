export interface PreferComposableOptionsOptions {
  /**
   * JavaScript regular expression source matched against declaration bindings.
   * @default '^use[A-Z]'
   */
  functionPattern?: string
  /**
   * Exact binding names to exclude. An empty array excludes nothing.
   * @default []
   */
  ignoreNames?: string[]
  /**
   * Maximum number of positional parameters before the final options object.
   * @default 0
   */
  maxPositionalParams?: number
}

export type PreferComposableOptionsMessageId =
  | 'exceededMaxPositionalParams'
  | 'expectedOptionsObject'
  | 'unexpectedRestParameter'
  | 'unknownOptionsObject'
