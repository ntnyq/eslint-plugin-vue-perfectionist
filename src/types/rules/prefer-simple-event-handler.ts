export interface PreferSimpleEventHandlerOptions {
  /**
   * Allow ternary expressions throughout the handler. Default: false.
   */
  allowConditional?: boolean
  /**
   * Allow inline arrow and function expressions with simple bodies. Default: true.
   */
  allowInlineFunctions?: boolean
  /**
   * Allow logical expressions and logical assignments. Default: false.
   */
  allowLogical?: boolean
}

export type PreferSimpleEventHandlerMessageId =
  | 'expectedSingleOperation'
  | 'unexpectedConditional'
  | 'unexpectedInlineFunction'
  | 'unexpectedLogical'
  | 'unexpectedSequence'
  | 'unexpectedStatement'
