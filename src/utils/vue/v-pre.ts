import type { AST } from 'vue-eslint-parser'

/**
 * Check whether v-pre disables compilation on an element or its ancestors.
 *
 * @param element - The element to inspect.
 * @returns Whether the element is within a v-pre subtree.
 */
export function isInVPre(element: AST.VElement): boolean {
  let current: AST.VElement | AST.VDocumentFragment = element

  while (current.type === 'VElement') {
    if (
      current.startTag.attributes.some(attribute =>
        attribute.directive
          ? attribute.key.name.name === 'pre'
          : attribute.key.name === 'v-pre',
      )
    ) {
      return true
    }

    current = current.parent
  }

  return false
}
