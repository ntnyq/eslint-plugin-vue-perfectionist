import { inferPropValue } from './component-props/value.ts'
import type { AST } from 'vue-eslint-parser'
import type { SourceCode } from '../types/eslint.ts'

type TextFragmentNode = AST.VText | AST.VExpressionContainer

/**
 * Exclude contexts with different text parsing or whitespace semantics.
 *
 * @param element - The element whose text would be replaced.
 * @returns Whether the element and all ancestors preserve the required parsing
 * and whitespace behavior.
 */
export function isInterpolationContext(element: AST.VElement): boolean {
  let current: AST.VElement | AST.VDocumentFragment = element
  while (current.type === 'VElement') {
    if (
      current.namespace !== 'http://www.w3.org/1999/xhtml' ||
      [
        'pre',
        'textarea',
        'title',
        'script',
        'style',
        'xmp',
        'iframe',
        'noembed',
        'noframes',
        'noscript',
        'plaintext',
        'listing',
      ].includes(current.name) ||
      current.startTag.attributes.some(
        /**
         * Detect an attribute that changes template parsing or text rendering.
         *
         * @param attribute - The attribute on the current ancestor.
         * @returns Whether the attribute prevents interpolation replacement.
         */
        attribute =>
          attribute.directive
            ? ['pre', 'text', 'html'].includes(attribute.key.name.name)
            : attribute.key.name === 'v-pre' ||
              (current.parent?.type === 'VDocumentFragment' &&
                attribute.key.name === 'lang' &&
                attribute.value?.value !== 'html'),
      )
    ) {
      return false
    }
    current = current.parent
  }
  return true
}

/**
 * Comments are omitted from VElement.children, so range gaps also end a run.
 * Keep outer whitespace-only nodes outside the replacement range.
 *
 * @param element - The element whose direct children are inspected.
 * @returns Runs containing both interpolation and nonblank text, trimmed of
 * outer whitespace-only nodes.
 */
export function getTextFragments(element: AST.VElement): TextFragmentNode[][] {
  const fragments: TextFragmentNode[][] = []
  let fragment: TextFragmentNode[] = []
  /**
   * Trim the current text run, retain it when eligible, and reset the
   * accumulator.
   */
  function flush() {
    while (fragment[0]?.type === 'VText' && !fragment[0].value.trim()) {
      fragment.shift()
    }
    while (fragment.at(-1)?.type === 'VText') {
      const last = fragment.at(-1)
      if (last?.type !== 'VText' || last.value.trim()) {
        break
      }
      fragment.pop()
    }
    if (
      fragment.some(
        /**
         * Identify an interpolation container in the current text run.
         *
         * @param node - The text fragment node to inspect.
         * @returns Whether the node is an expression container.
         */
        node => node.type === 'VExpressionContainer',
      ) &&
      fragment.some(
        /**
         * Identify text that contributes non-whitespace content.
         *
         * @param node - The text fragment node to inspect.
         * @returns The trimmed text for text nodes, or false for expression
         * containers.
         */
        node => node.type === 'VText' && node.value.trim(),
      )
    ) {
      fragments.push(fragment)
    }
    fragment = []
  }
  for (const child of element.children) {
    if (child.type !== 'VText' && child.type !== 'VExpressionContainer') {
      flush()
      continue
    }
    const previous = fragment.at(-1)
    if (previous && previous.range[1] !== child.range[0]) {
      flush()
    }
    fragment.push(child)
  }
  flush()
  return fragments
}

/**
 * Escape JavaScript syntax, HTML entity introducers and Vue delimiters. Decoded
 * text must not be decoded for a second time inside interpolation.
 *
 * @param value - The decoded template text to escape.
 * @returns Text with syntax-sensitive characters replaced by Unicode escapes.
 */
function escapeTemplateText(value: string): string {
  return value.replace(
    /[\\`$<>&{}\u{2028}\u{2029}]/gu,
    /**
     * Encode one syntax-sensitive character as a Unicode escape.
     *
     * @param character - The matched character.
     * @returns The escaped code point padded to at least four hexadecimal
     * digits.
     */
    character =>
      `\\u${(character.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`,
  )
}

/**
 * Detect line comments that make expression replacement unsafe.
 *
 * @param node - The interpolation container to inspect.
 * @returns Whether a line comment lies inside the container or its document
 * cannot be located.
 */
function hasLineComment(node: AST.VExpressionContainer): boolean {
  let parent = node.parent
  while (parent.type === 'VElement') {
    parent = parent.parent
  }
  return (
    parent.type !== 'VDocumentFragment' ||
    parent.comments.some(
      /**
       * Check whether a line comment is contained in the interpolation.
       *
       * @param comment - The document comment to inspect.
       * @returns Whether the comment is a line comment inside the container
       * range.
       */
      comment =>
        comment.type === 'Line' &&
        comment.range[0] >= node.range[0] &&
        comment.range[1] <= node.range[1],
    )
  )
}

/**
 * Build a template literal interpolation only when text conversion is safe.
 *
 * @param fragment - The adjacent text and interpolation nodes to merge.
 * @param sourceCode - The source code used to preserve original expression
 * text.
 * @returns The replacement interpolation, or undefined for unsafe whitespace,
 * comments, values, or delimiters.
 */
export function createInterpolationReplacement(
  fragment: TextFragmentNode[],
  sourceCode: SourceCode,
): string | undefined {
  let content = ''
  for (const node of fragment) {
    if (node.type === 'VText') {
      // Avoid depending on the application's condense/preserve compiler option.
      if (/[\t\r\n\f]| {2}/u.test(node.value)) {
        return undefined
      }
      content += escapeTemplateText(node.value)
      continue
    }
    if (!node.expression || hasLineComment(node)) {
      return undefined
    }
    // Even `undefined` can be a template-local or component binding. Do not
    // infer identifiers without a reliable template-to-script type mapping.
    const value = inferPropValue(
      node.expression,
      /**
       * Keep identifier values unresolved without a reliable template scope
       * mapping.
       *
       * @returns False, so an identifier named undefined is not assumed to be the
       * global value.
       */
      () => false,
    )
    if (
      value.unknown ||
      !value.variants.length ||
      value.variants.some(
        /**
         * Reject value types whose rendering is not safely preserved by
         * interpolation.
         *
         * @param variant - The inferred expression variant.
         * @returns Whether the variant is outside the supported primitive and
         * nullish types.
         */
        variant =>
          ![
            'string',
            'number',
            'boolean',
            'bigint',
            'null',
            'undefined',
          ].includes(variant.type),
      )
    ) {
      return undefined
    }
    const raw = sourceCode.text.slice(...node.range)
    if (!raw.startsWith('{{') || !raw.endsWith('}}')) {
      return undefined
    }
    // Preserve block comments and parentheses. Detect line comments from the
    // parser above: their delimiters can be spelled using HTML entities.
    const expression = raw.slice(2, -2).trim()
    const nullable = value.variants.some(
      /**
       * Detect variants requiring empty-string fallback during interpolation.
       *
       * @param variant - The inferred expression variant.
       * @returns Whether the variant is null or undefined.
       */
      variant => ['null', 'undefined'].includes(variant.type),
    )
    content += `\${(${expression})${nullable ? " ?? ''" : ''}}`
  }
  // A static brace next to a substitution must never close Vue interpolation.
  return `{{ \`${content}\` }}`
}
