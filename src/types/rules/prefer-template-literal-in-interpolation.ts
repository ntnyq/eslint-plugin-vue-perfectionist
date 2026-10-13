export interface PreferTemplateLiteralInInterpolationOptions {
  /**
   * Also report fragments that cannot be safely fixed.
   * @default false
   */
  reportUnfixable?: boolean
}

export type PreferTemplateLiteralInInterpolationMessageId =
  'expectedTemplateLiteral'
