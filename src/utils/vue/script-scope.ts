import { ASTUtils } from '@typescript-eslint/utils'
import { hasVueServices } from './parser-services.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

/**
 * Locate the content range of a complete script setup block.
 *
 * @param sourceCode - The source code exposing Vue document parser services.
 * @returns The range between the script setup tags, or undefined when
 * unavailable or incomplete.
 */
export function getSetupRange(
  sourceCode: SourceCode,
): TSESTree.Range | undefined {
  if (!hasVueServices(sourceCode.parserServices)) {
    return undefined
  }
  const fragment = sourceCode.parserServices.getDocumentFragment()
  const setup = fragment?.children.find(
    /**
     * Find a script element with a setup attribute.
     *
     * @param node - The document fragment child.
     * @returns Whether the node is a script setup element.
     */
    node =>
      node.type === 'VElement' &&
      node.name === 'script' &&
      node.startTag.attributes.some(
        /**
         * Recognize the static setup attribute on a script element.
         *
         * @param attribute - The script attribute.
         * @returns Whether it is a non-directive setup attribute.
         */
        attribute => !attribute.directive && attribute.key.name === 'setup',
      ),
  )
  if (setup?.type !== 'VElement' || !setup.endTag) {
    return undefined
  }
  return [setup.startTag.range[1], setup.endTag.range[0]]
}

/**
 * Check containment in one script block of the merged SFC program.
 *
 * @param node - The AST node to inspect.
 * @param range - The inclusive containment bounds for the script content.
 * @returns Whether the entire node range lies within the script range.
 */
export function isInScriptRange(
  node: TSESTree.Node,
  range: TSESTree.Range,
): boolean {
  return node.range[0] >= range[0] && node.range[1] <= range[1]
}

/**
 * Recover runtime scope from the Vue parser's merged top-level definitions.
 * Setup locals shadow module bindings; imports from either script are hoisted.
 *
 * @param identifier - The runtime identifier to resolve.
 * @param sourceCode - The source code providing lexical scope and script setup
 * boundaries.
 * @returns The visible definitions, retaining type-only definitions when no
 * runtime definition exists.
 */
export function getScriptVariableDefinitions(
  identifier: TSESTree.Identifier,
  sourceCode: SourceCode,
): TSESLint.Scope.Definition[] {
  const variable = ASTUtils.findVariable(
    sourceCode.getScope(identifier),
    identifier,
  )
  const definitions = variable?.defs ?? []
  const setupRange = getSetupRange(sourceCode)
  if (!setupRange) {
    return definitions
  }
  /**
   * Check whether a node belongs to the current script setup block.
   *
   * @param node - The declaration or reference node.
   * @returns Whether the node is contained in the script setup range.
   */
  const isSetup = (node: TSESTree.Node) => isInScriptRange(node, setupRange)
  const runtimeDefinitions = definitions.filter(
    /**
     * Keep scope definitions that may introduce runtime variables.
     *
     * @param definition - The resolved scope definition.
     * @returns Whether the definition is not explicitly type-only.
     */
    definition => definition.isVariableDefinition !== false,
  )
  // Keep type-only bindings when there is no value binding, so they do not
  // accidentally opt into auto-import recognition.
  const candidates = runtimeDefinitions.length
    ? runtimeDefinitions
    : definitions
  if (isSetup(identifier)) {
    const local = candidates.filter(
      /**
       * Select local setup definitions that shadow ordinary script bindings.
       *
       * @param definition - The candidate scope definition.
       * @returns Whether it is a non-import definition inside script setup.
       */
      definition =>
        definition.type !== 'ImportBinding' && isSetup(definition.node),
    )
    if (local.length) {
      return local
    }
  }
  return candidates.filter(
    /**
     * Keep hoisted imports and ordinary script definitions.
     *
     * @param definition - The candidate scope definition.
     * @returns Whether it is an import or lies outside script setup.
     */
    definition =>
      definition.type === 'ImportBinding' || !isSetup(definition.node),
  )
}

/**
 * Vue's parser can merge top-level bindings from both scripts. Setup bindings
 * shadow ordinary-script bindings only for references inside script setup.
 *
 * @template Definition - A scope definition carrying the declaration node to
 * locate.
 * @param definitions - The candidate definitions from the merged parser scope.
 * @param reference - The reference whose script context determines visibility.
 * @param sourceCode - The source code providing the script setup range.
 * @returns Setup definitions when they shadow the reference, otherwise ordinary
 * script definitions; all candidates when no setup range exists.
 */
export function filterScriptDefinitions<
  Definition extends { node: TSESTree.Node },
>(
  definitions: Definition[],
  reference: TSESTree.Node,
  sourceCode: SourceCode,
): Definition[] {
  const setupRange = getSetupRange(sourceCode)
  if (!setupRange) {
    return definitions
  }
  /**
   * Check whether a node belongs to the current script setup block.
   *
   * @param node - The declaration or reference node.
   * @returns Whether the node is contained in the script setup range.
   */
  const isSetup = (node: TSESTree.Node) => isInScriptRange(node, setupRange)
  const setupDefinitions = definitions.filter(
    /**
     * Select definitions declared inside script setup.
     *
     * @param definition - The candidate definition.
     * @returns Whether its declaration lies inside script setup.
     */
    definition => isSetup(definition.node),
  )
  if (isSetup(reference) && setupDefinitions.length) {
    return setupDefinitions
  }
  return definitions.filter(
    /**
     * Select definitions declared outside script setup.
     *
     * @param definition - The candidate definition.
     * @returns Whether its declaration lies outside script setup.
     */
    definition => !isSetup(definition.node),
  )
}
