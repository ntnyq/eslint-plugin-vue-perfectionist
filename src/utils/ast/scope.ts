import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

/**
 * Find the parser's reference for this exact identifier, preserving its
 * namespace.
 *
 * @param identifier - The exact identifier node whose reference is needed.
 * @param sourceCode - The source code providing lexical scope information.
 * @returns The matching reference in the current or an enclosing scope, or
 * undefined.
 */
export function findScopeReference(
  identifier: TSESTree.Node,
  sourceCode: SourceCode,
): TSESLint.Scope.Reference | undefined {
  let scope = sourceCode.getScope(identifier)
  let reference = scope.references.find(
    /**
     * Match a reference to the exact identifier node.
     *
     * @param item - The scope reference to inspect.
     * @returns Whether the reference belongs to the requested identifier.
     */
    item => item.identifier === identifier,
  )
  while (!reference && scope.upper) {
    scope = scope.upper
    reference = scope.references.find(
      /**
       * Match a reference to the exact identifier node.
       *
       * @param item - The scope reference to inspect.
       * @returns Whether the reference belongs to the requested identifier.
       */
      item => item.identifier === identifier,
    )
  }
  return reference
}
