/**
 * Vue template reference usage sites checked by prefer-ref-pattern.
 */
export type RefPatternTarget = 'render' | 'template' | 'useTemplateRef'

export interface PreferRefPatternOptions {
  /**
   * JavaScript regular expression source, without delimiters or implicit anchors.
   */
  pattern?: string
  /**
   * Usage sites to check. An empty array disables all checks.
   */
  targets?: RefPatternTarget[]
}

export type PreferRefPatternMessageId = 'unexpectedRefPattern'
