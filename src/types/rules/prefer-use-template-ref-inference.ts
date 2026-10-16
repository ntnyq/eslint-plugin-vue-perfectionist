export interface PreferUseTemplateRefInferenceOptions {
  /**
   * Template ref keys allowed to retain explicit type arguments.
   * Exact, case-sensitive matches. Defaults to an empty array.
   */
  ignoreRefs?: string[]
}

export type PreferUseTemplateRefInferenceMessageId = 'unexpectedTypeArguments'
