/**
 * Template layout intent, independent of the rendered CSS display value.
 */
export type TemplateElementLayout = 'block' | 'inline' | 'preserve'

/**
 * Exact, case-sensitive source tag names sharing a layout policy.
 */
export interface TemplateElementLayoutGroup {
  /**
   * Layout intent; preserve skips the entire subtree.
   */
  layout: TemplateElementLayout
  /**
   * Raw tag names, without glob, regex, import, or dynamic :is resolution.
   */
  tags: string[]
}

export interface ConsistentTemplateElementLayoutOptions {
  /**
   * Only report by default. Safe enables closing-tag whitespace fixes only.
   */
  fix?: 'never' | 'safe'
  /**
   * Extend or override built-in roles. Last matching group wins; an empty
   * array retains native defaults. Built-in preserved contexts stay skipped.
   */
  groups?: TemplateElementLayoutGroup[]
  /**
   * Keep formatter escapes at whitespace-sensitive boundaries by default.
   * Strict mode also reports split closing tags there.
   */
  mode?: 'compatible' | 'strict'
}

export type ConsistentTemplateElementLayoutMessageId =
  | 'expectedContentLayout'
  | 'expectedSiblingNewline'
  | 'expectedSingleLineEndTag'
