export type NoComplexTemplateExpressionDirective =
  | 'bind'
  | 'else-if'
  | 'html'
  | 'if'
  | 'memo'
  | 'model'
  | 'show'
  | 'text'

export interface NoComplexTemplateExpressionOptions {
  /**
   * Check mustache interpolation expressions. Defaults to true.
   */
  checkInterpolations?: boolean
  /**
   * Directive values to check. Replaces ['if', 'else-if', 'show', 'bind']; [] disables directive checks.
   */
  directives?: NoComplexTemplateExpressionDirective[]
  /**
   * Skip expressions referencing v-for or slot variables. Defaults to false.
   */
  ignoreScopeReferences?: boolean
  /**
   * Maximum nested conditional expressions, including their tests. Defaults to 1.
   */
  maxConditionalDepth?: number
  /**
   * Maximum total &&, ||, and ?? operators per expression. Defaults to 2.
   */
  maxLogicalExpressions?: number
}

export type NoComplexTemplateExpressionMessageId =
  | 'tooDeepConditional'
  | 'tooManyLogicalExpressions'
