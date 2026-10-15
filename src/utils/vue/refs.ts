import { getStaticStringValue, unwrapExpression } from '../ast/expressions.ts'
import { getRuntimeImportBinding } from './call-identity.ts'
import {
  getScriptVariableDefinitions,
  isInScriptRange,
} from './script-scope.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

/**
 * Recognize Vue runtime imports and explicitly enabled auto-import globals.
 *
 * @param call - The direct or namespace call to inspect.
 * @param sourceCode - The source code used to resolve script import bindings.
 * @param vueGlobals - The explicitly enabled unbound Vue API names; defaults to
 * an empty list.
 * @returns The Vue export or enabled global name, or undefined when the call is
 * not recognized.
 */
export function getVueRefApi(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
  vueGlobals: readonly string[] = [],
): string | undefined {
  const callee = unwrapExpression(call.callee)
  if (callee.type === 'Identifier') {
    const definitions = getScriptVariableDefinitions(callee, sourceCode)
    const binding = getRuntimeImportBinding(definitions[0])
    if (!definitions.length && vueGlobals.includes(callee.name)) {
      return callee.name
    }
    if (binding?.source === 'vue' && binding.kind === 'named') {
      return binding.exportedName
    }
  }
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier'
  ) {
    const binding = getRuntimeImportBinding(
      getScriptVariableDefinitions(callee.object, sourceCode)[0],
    )
    if (binding?.source === 'vue' && binding.kind === 'namespace') {
      return !callee.computed && callee.property.type === 'Identifier'
        ? callee.property.name
        : getStaticStringValue(callee.property)
    }
  }
  return undefined
}

/**
 * Check whether a variable is initialized once by a recognized Vue ref API.
 *
 * @param variable - The scope variable to inspect, or nullish when unresolved.
 * @param sourceCode - The source code used to resolve the initializer call.
 * @param declarationRange - The optional script-block range restricting
 * declarations and writes.
 * @param vueGlobals - The enabled Vue auto-import globals; defaults to an empty
 * list.
 * @returns Whether a single identifier declaration calls ref, shallowRef, or
 * useTemplateRef without later writes in scope.
 */
export function isVueRefVariable(
  variable: TSESLint.Scope.Variable | null | undefined,
  sourceCode: SourceCode,
  declarationRange?: TSESTree.Range,
  vueGlobals: readonly string[] = [],
): boolean {
  // vue-eslint-parser merges same-name bindings from both script blocks.
  // Only declarations and writes in the selected block belong to a setup ref.
  /**
   * Check whether a node belongs to the selected declaration range.
   *
   * @param node - The declaration or reference node.
   * @returns Whether the node is in range, or true when no range restriction is
   * supplied.
   */
  const isInRange = (node: TSESTree.Node) =>
    !declarationRange || isInScriptRange(node, declarationRange)
  const definitions = variable?.defs.filter(
    /**
     * Keep variable definitions in the selected script block.
     *
     * @param definition - The variable definition.
     * @returns Whether its declaration belongs to the selected range.
     */
    definition => isInRange(definition.node),
  )
  if (
    !variable ||
    definitions?.length !== 1 ||
    variable.references.some(
      /**
       * Detect a write after initialization within the selected script block.
       *
       * @param reference - The variable reference.
       * @returns Whether it is a non-initializing write in range.
       */
      reference =>
        reference.isWrite() &&
        !reference.init &&
        isInRange(reference.identifier),
    )
  ) {
    return false
  }
  const definition = definitions[0]
  if (
    definition?.type !== 'Variable' ||
    definition.node.id.type !== 'Identifier' ||
    !definition.node.init
  ) {
    return false
  }
  const initializer = unwrapExpression(definition.node.init)
  if (initializer.type !== 'CallExpression') {
    return false
  }
  const api = getVueRefApi(initializer, sourceCode, vueGlobals)
  return (
    api !== undefined && ['ref', 'shallowRef', 'useTemplateRef'].includes(api)
  )
}
