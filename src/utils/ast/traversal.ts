import { isArray, isString } from '@ntnyq/utils'
import { isFunction } from './expressions.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

/**
 * Check the minimum AST node shape required for child traversal.
 *
 * @param value - The candidate visitor-key value.
 * @returns Whether the value has a string node type and an array range.
 */
function isNode(value: unknown): value is TSESTree.Node {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    isString(value.type) &&
    'range' in value &&
    isArray(value.range)
  )
}

/**
 * Collect direct AST children using the parser-provided visitor keys.
 *
 * @param node - The parent node to inspect.
 * @param sourceCode - The source code supplying visitor keys.
 * @returns The direct child nodes in visitor-key order.
 */
export function getChildren(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): TSESTree.Node[] {
  const children: TSESTree.Node[] = []
  for (const key of sourceCode.visitorKeys[node.type] ?? []) {
    const value: unknown = Reflect.get(node, key)
    if (isArray(value)) {
      children.push(...value.filter(isNode))
    } else if (isNode(value)) {
      children.push(value)
    }
  }
  return children
}

/**
 * Find await expressions or awaited loops outside nested functions.
 *
 * @param node - The root of the subtree to inspect.
 * @param sourceCode - The source code supplying visitor keys.
 * @returns Whether the subtree contains an await that is not inside a function.
 */
export function containsTopLevelAwait(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  if (isFunction(node)) {
    return false
  }
  if (
    node.type === 'AwaitExpression' ||
    (node.type === 'ForOfStatement' && node.await)
  ) {
    return true
  }
  return getChildren(node, sourceCode).some(
    /**
     * Search a child subtree for an await outside nested functions.
     *
     * @param child - The child node to inspect.
     * @returns Whether the child contains a top-level await.
     */
    child => containsTopLevelAwait(child, sourceCode),
  )
}

/**
 * Collect names introduced by an identifier or destructuring pattern.
 *
 * @param node - The binding pattern to inspect.
 * @returns The bound names in pattern order, or an empty array for unsupported
 * nodes.
 */
export function getBindingNames(node: TSESTree.Node): string[] {
  switch (node.type) {
    case 'Identifier':
      return [node.name]
    case 'ArrayPattern':
      return node.elements.flatMap(
        /**
         * Collect names from an array binding element while ignoring holes.
         *
         * @param element - The binding element, or null for an array hole.
         * @returns The names introduced by the element.
         */
        element => (element ? getBindingNames(element) : []),
      )
    case 'ObjectPattern':
      return node.properties.flatMap(
        /**
         * Collect names from an object binding property or rest element.
         *
         * @param property - The property or rest element to inspect.
         * @returns The names introduced by its value or rest argument.
         */
        property =>
          getBindingNames(
            property.type === 'Property' ? property.value : property.argument,
          ),
      )
    case 'AssignmentPattern':
      return getBindingNames(node.left)
    case 'RestElement':
      return getBindingNames(node.argument)
    default:
      return []
  }
}
