export interface NoComplexVForSourceOptions {
  /**
   * Allow calls in the source, member receivers, and computed keys. Default: true.
   * Call arguments and callback bodies are not checked.
   */
  allowCallExpression?: boolean
  /**
   * Allow primitive literals directly as the source. Default: true.
   * Does not restrict literals in member receivers, keys, or call arguments.
   */
  allowLiteral?: boolean
}

export type NoComplexVForSourceMessageId = 'unexpectedComplexSource'
