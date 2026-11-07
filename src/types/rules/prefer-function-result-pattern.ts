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
   * Vue computed also recognizes inline getters with an explicit boolean return
   * type or a syntactically boolean result.
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
   * Replaces all built-in targets, independently of the vueuse setting.
   * An empty array disables checks. Later targets override earlier ones for
   * the same method and binding position, before boolean filtering.
   */
  targets?: PreferFunctionResultPatternTarget[]
  /**
   * Enable the built-in VueUse useToggle target. Overrides the shared vueuse
   * setting, which defaults to false. Explicit targets are unaffected.
   */
  vueuse?: boolean
}

export type PreferFunctionResultPatternMessageId =
  'unexpectedFunctionResultPattern'
