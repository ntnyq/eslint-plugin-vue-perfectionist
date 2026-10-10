export interface PreferFunctionResultPatternTarget {
  /**
   * Original export names, or "default" for a default import. Must not be empty.
   */
  names: string[]
  /**
   * JavaScript regular expression source, without delimiters or implicit anchors.
   */
  pattern: string
  /**
   * Exact module specifier used by the import.
   */
  source: string
  /**
   * Recognize unbound names in this target. Overrides the shared autoImport setting.
   */
  autoImport?: boolean
  /**
   * Check only calls with a boolean first type argument or literal first argument.
   * VueUse useToggle instead requires no arguments or one boolean literal and no
   * type arguments. Defaults to false.
   */
  booleanOnly?: boolean
  /**
   * Zero-based array destructuring position. Omit to check a direct binding.
   */
  returnIndex?: number
}

export interface PreferFunctionResultPatternOptions {
  /**
   * Replaces the default Vue ref/shallowRef and VueUse useToggle targets.
   * An empty array disables checks. Later targets override earlier ones for
   * the same method and binding position, before boolean filtering.
   */
  targets?: PreferFunctionResultPatternTarget[]
}

export type PreferFunctionResultPatternMessageId =
  'unexpectedFunctionResultPattern'
