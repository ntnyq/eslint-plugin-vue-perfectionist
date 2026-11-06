export interface RestrictedHtmlElement {
  /**
   * Exact lowercase native HTML name. Vue structure tags are not accepted.
   */
  name: string
  /**
   * Optional hint appended to the default diagnostic. Default: no hint.
   */
  message?: string
}

export interface NoRestrictedHtmlElementsOptions {
  /**
   * Native elements to disallow. Default: []; an empty array checks nothing.
   * For repeated names, the last entry supplies the diagnostic hint.
   */
  elements?: (string | RestrictedHtmlElement)[]
}

export type NoRestrictedHtmlElementsMessageId = 'restrictedHtmlElement'
