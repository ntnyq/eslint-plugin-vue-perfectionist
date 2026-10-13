import { inferPropValue } from './component-prop-value.ts'
import type { AST } from 'vue-eslint-parser'
import type { SourceCode } from '../types/index.ts'

type TextFragmentNode = AST.VText | AST.VExpressionContainer

/**
 * Exclude contexts with different text parsing or whitespace semantics.
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
      current.startTag.attributes.some(attribute =>
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
 */
export function getTextFragments(element: AST.VElement): TextFragmentNode[][] {
  const fragments: TextFragmentNode[][] = []
  let fragment: TextFragmentNode[] = []
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
      fragment.some(node => node.type === 'VExpressionContainer') &&
      fragment.some(node => node.type === 'VText' && node.value.trim())
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
 * Escape JavaScript syntax, HTML entity introducers and Vue delimiters.
 * Decoded text must not be decoded for a second time inside interpolation.
 */
function escapeTemplateText(value: string): string {
  return value.replace(
    /[\\`$<>&{}\u{2028}\u{2029}]/gu,
    character =>
      `\\u${(character.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`,
  )
}

function hasLineComment(node: AST.VExpressionContainer): boolean {
  let parent = node.parent
  while (parent.type === 'VElement') {
    parent = parent.parent
  }
  return (
    parent.type !== 'VDocumentFragment' ||
    parent.comments.some(
      comment =>
        comment.type === 'Line' &&
        comment.range[0] >= node.range[0] &&
        comment.range[1] <= node.range[1],
    )
  )
}

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
    const value = inferPropValue(node.expression, () => false)
    if (
      value.unknown ||
      !value.variants.length ||
      value.variants.some(
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
    const nullable = value.variants.some(variant =>
      ['null', 'undefined'].includes(variant.type),
    )
    content += `\${(${expression})${nullable ? " ?? ''" : ''}}`
  }
  // A static brace next to a substitution must never close Vue interpolation.
  return `{{ \`${content}\` }}`
}
