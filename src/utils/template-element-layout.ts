import type { AST } from 'vue-eslint-parser'
import type { TemplateElementLayout } from '../types/index.ts'

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'caption',
  'center',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'html',
  'legend',
  'li',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'search',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
])

const INLINE_TAGS = new Set([
  'a',
  'abbr',
  'area',
  'audio',
  'b',
  'bdi',
  'bdo',
  'br',
  'button',
  'canvas',
  'cite',
  'code',
  'data',
  'datalist',
  'del',
  'dfn',
  'em',
  'embed',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'map',
  'mark',
  'meter',
  'object',
  'optgroup',
  'option',
  'output',
  'picture',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'select',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'track',
  'u',
  'var',
  'video',
  'wbr',
])

const PRESERVED_TAGS = new Set([
  'pre',
  'textarea',
  'script',
  'style',
  'xmp',
  'listing',
  'plaintext',
])

/**
 * Native spelling stays case-sensitive, so components such as Pre are unknown.
 */
export function getNativeElementLayout(
  name: string,
): TemplateElementLayout | 'unknown' {
  if (PRESERVED_TAGS.has(name)) {
    return 'preserve'
  }

  if (BLOCK_TAGS.has(name)) {
    return 'block'
  }

  return INLINE_TAGS.has(name) ? 'inline' : 'unknown'
}

/**
 * These syntax contexts cannot be reclassified by project layout groups.
 */
export function isPreservedElement(node: AST.VElement): boolean {
  return (
    node.namespace !== 'http://www.w3.org/1999/xhtml' ||
    PRESERVED_TAGS.has(node.rawName) ||
    (node.parent.type === 'VDocumentFragment' &&
      node.startTag.attributes.some(
        attribute =>
          !attribute.directive &&
          attribute.key.name === 'lang' &&
          attribute.value?.value !== 'html',
      )) ||
    node.startTag.attributes.some(attribute =>
      attribute.directive
        ? attribute.key.name.name === 'pre'
        : attribute.key.name === 'v-pre',
    )
  )
}
