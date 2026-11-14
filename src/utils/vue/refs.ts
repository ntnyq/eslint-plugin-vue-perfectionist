import { getStaticStringValue, unwrapExpression } from '../ast/expressions.ts'
import { getRuntimeImportBinding } from './call-identity.ts'
import { getScriptVariableDefinitions } from './script-scope.ts'
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
export function getVueRuntimeApiName(
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
 * @param visibleDefinitions - The definitions visible at the ref usage site.
 * @param vueGlobals - The enabled Vue auto-import globals; defaults to an empty
 * list.
 * @returns Whether a single identifier declaration calls ref, shallowRef, or
 * useTemplateRef without later writes in scope.
 */
export function isVueRefVariable(
  variable: TSESLint.Scope.Variable | null | undefined,
  sourceCode: SourceCode,
  visibleDefinitions: readonly TSESLint.Scope.Definition[],
  vueGlobals: readonly string[] = [],
): boolean {
  const definitions: TSESLint.Scope.Definition[] = visibleDefinitions.filter(
    /**
     * Ignore types sharing the runtime binding's name.
     *
     * @param definition - The variable definition.
     * @returns Whether the definition can introduce a runtime value.
     */
    definition => definition.isVariableDefinition !== false,
  )

  if (
    !variable ||
    definitions.length !== 1 ||
    variable.references.some(
      /**
       * Detect writes to this binding, accounting for setup-local shadowing.
       *
       * @param reference - The variable reference.
       * @returns Whether it is a non-initializing write to a visible definition.
       */
      reference =>
        reference.isWrite() &&
        !reference.init &&
        reference.identifier.type === 'Identifier' &&
        getScriptVariableDefinitions(reference.identifier, sourceCode).some(
          /**
           * Match the write's binding to the ref declaration being checked.
           *
           * @param definition - The definition resolved for this write.
           * @returns Whether the write targets the same runtime binding.
           */
          definition => definitions.includes(definition),
        ),
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

  const api = getVueRuntimeApiName(initializer, sourceCode, vueGlobals)

  return (
    api !== undefined && ['ref', 'shallowRef', 'useTemplateRef'].includes(api)
  )
}
