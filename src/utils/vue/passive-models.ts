import { ASTUtils } from '@typescript-eslint/utils'
import {
  getOuterExpression,
  getStaticStringValue,
  unwrapExpression,
} from '../ast/expressions.ts'
import { getCallIdentity } from './call-identity.ts'
import { hasGlobalWrite } from './global-writes.ts'
import {
  getScriptVariableDefinitions,
  getSetupRange,
  isInScriptRange,
} from './script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

/**
 * Associate a direct, unreassigned identifier with its setup macro initializer.
 *
 * @param argument - The argument passed to useVModel.
 * @param macro - The already recognized setup macro.
 * @param sourceCode - The source providing runtime scope definitions.
 * @returns Whether the argument still refers to that macro's result.
 */
function isMacroBinding(
  argument: TSESTree.Node,
  macro: TSESTree.CallExpression,
  sourceCode: SourceCode,
): boolean {
  const identifier = unwrapExpression(argument)
  if (identifier.type !== 'Identifier') {
    return false
  }
  const definitions = getScriptVariableDefinitions(identifier, sourceCode)
  const definition = definitions[0]
  if (
    definitions.length !== 1 ||
    definition?.type !== 'Variable' ||
    definition.node.id.type !== 'Identifier' ||
    !definition.node.init ||
    definition.node.range[1] > identifier.range[0]
  ) {
    return false
  }
  const variable = sourceCode.getDeclaredVariables(definition.node)[0]
  if (
    !variable ||
    variable.references.some(
      reference =>
        reference.isWrite() &&
        !reference.init &&
        reference.identifier.type === 'Identifier' &&
        getScriptVariableDefinitions(reference.identifier, sourceCode).includes(
          definition,
        ),
    )
  ) {
    return false
  }
  let initializer = unwrapExpression(definition.node.init)
  if (
    initializer.type === 'CallExpression' &&
    initializer.callee.type === 'Identifier' &&
    initializer.callee.name === 'withDefaults' &&
    initializer.arguments.length === 2 &&
    getCallIdentity(initializer, sourceCode)?.isUnbound &&
    initializer.arguments[0]
  ) {
    initializer = unwrapExpression(initializer.arguments[0])
  }
  return initializer === macro
}

/**
 * Confirm the final passive and eventName values without evaluating options.
 * Unknown writes invalidate both values until explicitly overwritten.
 *
 * @param options - The fourth argument passed to useVModel.
 * @param name - The model prop name.
 * @returns Whether passive is literally true and the update event matches.
 */
function hasPassiveOptions(options: TSESTree.Node, name: string): boolean {
  const object = unwrapExpression(options)
  if (object.type !== 'ObjectExpression') {
    return false
  }
  let passive = false
  let eventName: string | undefined = `update:${name}`
  for (const property of object.properties) {
    const key =
      property.type === 'Property'
        ? ASTUtils.getPropertyName(property)
        : undefined
    if (property.type === 'Property' && property.kind !== 'init') {
      // VueUse reads clone before passive; an accessor can mutate other options.
      return false
    }
    if (
      property.type === 'Property' &&
      key === '__proto__' &&
      !property.computed &&
      !property.method &&
      !property.shorthand
    ) {
      const prototype = unwrapExpression(property.value)
      if (prototype.type !== 'Literal' || prototype.value !== null) {
        // Inherited accessors can mutate even explicitly declared own options.
        return false
      }
    }
    if (typeof key !== 'string') {
      passive = false
      eventName = undefined
      continue
    }
    if (property.type !== 'Property') {
      continue
    }
    const value = unwrapExpression(property.value)
    if (key === 'passive') {
      passive =
        property.kind === 'init' &&
        !property.method &&
        value.type === 'Literal' &&
        value.value === true
    } else if (key === 'eventName') {
      eventName =
        property.kind === 'init' && !property.method
          ? getStaticStringValue(value)
          : undefined
    }
  }
  return passive && eventName === `update:${name}`
}

/**
 * Detect syntax that makes an unbound useVModel's runtime identity uncertain.
 *
 * @param sourceCode - The source providing lexical references and script scopes.
 * @returns Whether global writes or an unbound direct eval prevent recognition.
 */
function hasUncertainVModelGlobal(sourceCode: SourceCode): boolean {
  return (
    hasGlobalWrite(sourceCode, 'useVModel') ||
    (sourceCode.scopeManager?.scopes.some(scope =>
      scope.references.some(reference => {
        const identifier = reference.identifier
        if (
          identifier.type !== 'Identifier' ||
          identifier.name !== 'eval' ||
          getScriptVariableDefinitions(identifier, sourceCode).some(
            definition => definition.isVariableDefinition !== false,
          )
        ) {
          return false
        }
        const expression = getOuterExpression(identifier)
        const parent = expression.parent
        return (
          parent?.type === 'CallExpression' &&
          parent.callee === expression &&
          !parent.optional
        )
      }),
    ) ??
      true)
  )
}

/**
 * Collect passive VueUse models from direct setup initializers and statements.
 * Only matching props/emits bindings and statically confirmed options qualify.
 *
 * @param program - The merged SFC program.
 * @param sourceCode - The source providing script scopes and setup boundaries.
 * @param propCall - The component's recognized defineProps call.
 * @param emitCall - The component's recognized defineEmits call.
 * @param autoImport - Whether an unbound useVModel name is enabled.
 * @returns The model names whose passive synchronization should be retained.
 */
export function getPassiveModelNames(
  program: TSESTree.Program,
  sourceCode: SourceCode,
  propCall: TSESTree.CallExpression,
  emitCall: TSESTree.CallExpression,
  autoImport: boolean,
): Set<string> {
  const names = new Set<string>()
  const range = getSetupRange(sourceCode)
  if (!range) {
    return names
  }
  const setupRange = range
  const hasUncertainGlobal = autoImport && hasUncertainVModelGlobal(sourceCode)

  /**
   * Inspect a direct setup call without traversing nested execution contexts.
   *
   * @param expression - The initializer or expression statement to inspect.
   */
  function inspect(expression: TSESTree.Node) {
    const call = unwrapExpression(expression)
    if (
      call.type !== 'CallExpression' ||
      !isInScriptRange(call, setupRange) ||
      call.arguments.length !== 4
    ) {
      return
    }
    const identity = getCallIdentity(call, sourceCode)
    if (
      !identity ||
      (identity.exportedName ?? identity.name) !== 'useVModel' ||
      (identity.source !== '@vueuse/core' &&
        (!identity.isUnbound || !autoImport || hasUncertainGlobal))
    ) {
      return
    }
    const [props, key, emit, options] = call.arguments
    const name = key && getStaticStringValue(key)
    if (
      props &&
      emit &&
      options &&
      name &&
      isMacroBinding(props, propCall, sourceCode) &&
      isMacroBinding(emit, emitCall, sourceCode) &&
      hasPassiveOptions(options, name)
    ) {
      names.add(name)
    }
  }

  for (const statement of program.body) {
    if (statement.type === 'ExpressionStatement') {
      inspect(statement.expression)
    } else if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations) {
        if (declaration.init) {
          inspect(declaration.init)
        }
      }
    }
  }
  return names
}
