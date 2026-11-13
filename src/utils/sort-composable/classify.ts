import { ESLintUtils } from '@typescript-eslint/utils'
import { isFunctionNode, unwrapExpression } from '../ast/expressions.ts'
import { getMemberName, isPrototypeSetter } from '../ast/object-members.ts'
import { findScopeReference } from '../ast/scope.ts'
import { getCallIdentity } from '../vue/call-identity.ts'
import { resolveVueGlobals } from '../vue/globals.ts'
import { getScriptVariableDefinitions } from '../vue/script-scope.ts'
import { getReturnedObjects } from './ast.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type ts from 'typescript'
import type {
  ComposableMemberKind,
  SortComposableMessageId,
  SortComposableOptions,
} from '../../types/rules/sort-composable.ts'
import type { FunctionNode } from '../ast/expressions.ts'

export type MemberKind = ComposableMemberKind | 'unknown'

type ReturnedMembers = ReadonlyMap<string, TSESTree.Property> | undefined

const REF_APIS = new Set([
  'ref',
  'shallowRef',
  'computed',
  'customRef',
  'toRef',
  'useTemplateRef',
])

const PROXY_APIS = new Set([
  'reactive',
  'shallowReactive',
  'readonly',
  'shallowReadonly',
])

/**
 * These unresolved type shapes do not establish a runtime member category.
 */
function isDeferredType(type: ts.Type): boolean {
  return (
    'checkType' in type ||
    'indexType' in type ||
    type.isIndexType() ||
    type.isTypeParameter()
  )
}

/**
 * Classify the value itself, not a ref's value or a method's return type.
 */
function classifyType(
  type: ts.Type,
  checker: ts.TypeChecker,
  functionType?: ts.Type,
): MemberKind {
  if (
    type.flags === checker.getAnyType().flags ||
    type.flags === checker.getUnknownType().flags ||
    type.flags === checker.getNeverType().flags ||
    isDeferredType(type)
  ) {
    return 'unknown'
  }
  if (type.isUnion()) {
    const parts = type.types.filter(
      part =>
        ![
          checker.getNullType().flags,
          checker.getUndefinedType().flags,
        ].includes(part.flags),
    )
    const kinds = new Set(
      (parts.length ? parts : type.types).map(part =>
        classifyType(part, checker, functionType),
      ),
    )
    return kinds.size === 1
      ? (kinds.values().next().value ?? 'unknown')
      : 'unknown'
  }
  if (
    [
      checker.getNullType().flags,
      checker.getUndefinedType().flags,
      checker.getVoidType().flags,
    ].includes(type.flags)
  ) {
    return 'state'
  }
  if (type.getCallSignatures().length) {
    return 'method'
  }
  // TypeScript permits untyped calls through Function even though it has no
  // call signatures. Construct-only types must not enter that fallback.
  if (
    functionType &&
    !type.getConstructSignatures().length &&
    checker.isTypeAssignableTo(type, functionType)
  ) {
    return 'method'
  }
  // The primitive object type and an empty structural object can contain functions.
  if (
    type.isIntersection() &&
    type.types.some(
      part => classifyType(part, checker, functionType) === 'unknown',
    )
  ) {
    return 'unknown'
  }
  if (
    checker.typeToString(type) === 'object' ||
    ('objectFlags' in type &&
      !type.getProperties().length &&
      !type.getConstructSignatures().length &&
      !type.getStringIndexType() &&
      !type.getNumberIndexType())
  ) {
    return 'unknown'
  }
  return 'state'
}

/**
 * Share syntax, scope, and optional type analysis between both rule ends.
 */
export function createMemberClassifier(
  context: TSESLint.RuleContext<
    SortComposableMessageId,
    [SortComposableOptions]
  >,
  options: SortComposableOptions,
) {
  const sourceCode = context.sourceCode
  const services = options.typeInformation
    ? ESLintUtils.getParserServices(context)
    : undefined
  const checker = services?.program.getTypeChecker()
  const library = services?.program
    .getSourceFiles()
    .find(source => services.program.isSourceFileDefaultLibrary(source))
  // Resolve in a default library's global scope, so a local interface named
  // Function cannot change the meaning of the callable fallback.
  const functionSymbol =
    library &&
    checker
      ?.getSymbolsInScope(library, ~0)
      .find(symbol => symbol.name === 'Function')
  const functionType =
    functionSymbol && checker?.getDeclaredTypeOfSymbol(functionSymbol)
  const globals = resolveVueGlobals(context.settings, [
    ...REF_APIS,
    ...PROXY_APIS,
  ])
  // AST and scope information are stable for this rule instance. Keep caches
  // local to the file; awaited-call safety is still checked for each consumer.
  const localFunctions = new WeakMap<
    TSESTree.CallExpression,
    FunctionNode | null
  >()
  const returnedMembers = new WeakMap<FunctionNode, ReturnedMembers[]>()
  const propertyKinds = new WeakMap<TSESTree.Property, MemberKind>()

  function typeOf(node: TSESTree.Node): MemberKind {
    return services && checker
      ? classifyType(services.getTypeAtLocation(node), checker, functionType)
      : 'unknown'
  }

  function resolveDefinitions(node: TSESTree.Identifier) {
    const definitions = getScriptVariableDefinitions(node, sourceCode)
    const variable = findScopeReference(node, sourceCode)?.resolved
    if (
      variable?.references.some(
        reference =>
          reference.isWrite() &&
          !reference.init &&
          reference.identifier.type === 'Identifier' &&
          getScriptVariableDefinitions(reference.identifier, sourceCode).some(
            definition => definitions.includes(definition),
          ),
      )
    ) {
      return []
    }
    return definitions
  }

  function expressionKind(
    input: TSESTree.Node,
    visiting = new Set<TSESTree.Node>(),
  ): MemberKind {
    const node = unwrapExpression(input)
    if (visiting.has(node)) {
      return 'unknown'
    }
    visiting.add(node)
    let kind: MemberKind = 'unknown'
    if (isFunctionNode(node)) {
      kind = 'method'
    } else if (
      [
        'Literal',
        'ObjectExpression',
        'ArrayExpression',
        'TemplateLiteral',
        'UnaryExpression',
        'BinaryExpression',
      ].includes(node.type)
    ) {
      kind = 'state'
    } else if (node.type === 'Identifier') {
      const definitions = resolveDefinitions(node)
      const definition = definitions.length === 1 ? definitions[0] : undefined
      if (
        definitions.length &&
        definitions.every(definition => definition.type === 'FunctionName')
      ) {
        kind = 'method'
      } else if (
        definition?.type === 'Variable' &&
        definition.parent.kind === 'const' &&
        definition.node.id.type === 'Identifier' &&
        definition.node.init
      ) {
        kind = expressionKind(definition.node.init, visiting)
      }
    } else if (node.type === 'CallExpression' && !node.optional) {
      const identity = getCallIdentity(node, sourceCode)
      if (
        identity &&
        (identity.source === 'vue' ||
          (identity.isUnbound && globals.includes(identity.classificationName)))
      ) {
        const api = identity.exportedName ?? identity.classificationName
        if (REF_APIS.has(api)) {
          kind = 'state'
        } else if (
          PROXY_APIS.has(api) &&
          node.arguments[0]?.type !== 'SpreadElement' &&
          node.arguments[0]
        ) {
          kind = expressionKind(node.arguments[0], visiting)
        }
      }
    } else if (node.type === 'ConditionalExpression') {
      const left = expressionKind(node.consequent, visiting)
      const right = expressionKind(node.alternate, visiting)
      kind = left === right ? left : 'unknown'
    }
    visiting.delete(node)
    return kind === 'unknown' ? typeOf(input) : kind
  }

  function propertyKind(node: TSESTree.Property): MemberKind {
    // Accessors expose their result, not the getter/setter function itself.
    let kind = propertyKinds.get(node)
    if (kind === undefined) {
      kind = node.kind === 'init' ? expressionKind(node.value) : 'unknown'
      propertyKinds.set(node, kind)
    }
    return kind
  }

  /**
   * Resolve each call's stable local function binding once, preserving writes
   * and scope ambiguity as unknown.
   */
  function resolveLocalFunction(
    call: TSESTree.CallExpression,
  ): FunctionNode | null {
    const cached = localFunctions.get(call)
    if (cached !== undefined) {
      return cached
    }
    const callee = unwrapExpression(call.callee)
    if (callee.type !== 'Identifier') {
      localFunctions.set(call, null)
      return null
    }
    const definitions = resolveDefinitions(callee)
    const definition = definitions.length === 1 ? definitions[0] : undefined
    let fn: TSESTree.Node | undefined
    if (definition?.type === 'FunctionName') {
      fn = definition.node
    } else if (
      definition?.type === 'Variable' &&
      definition.parent.kind === 'const' &&
      definition.node.id.type === 'Identifier' &&
      definition.node.init
    ) {
      fn = unwrapExpression(definition.node.init)
    }
    const resolved = fn && isFunctionNode(fn) && !fn.generator ? fn : null
    localFunctions.set(call, resolved)
    return resolved
  }

  /**
   * Index every direct return once per function. Unsupported branches remain
   * in the result so one known branch cannot hide another unknown branch.
   */
  function getReturnedMembers(fn: FunctionNode): ReturnedMembers[] {
    let cached = returnedMembers.get(fn)
    if (cached) {
      return cached
    }
    cached = getReturnedObjects(fn, sourceCode).map(object => {
      if (!object) {
        return undefined
      }
      const properties = new Map<string, TSESTree.Property>()
      for (const property of object.properties) {
        if (property.type !== 'Property' || isPrototypeSetter(property)) {
          return undefined
        }
        const name = getMemberName(property)
        if (name === undefined || properties.has(name)) {
          return undefined
        }
        properties.set(name, property)
      }
      return properties
    })
    returnedMembers.set(fn, cached)
    return cached
  }

  function localPropertyKind(
    call: TSESTree.CallExpression,
    name: string,
    awaited: boolean,
  ): MemberKind {
    const fn = resolveLocalFunction(call)
    if (!fn || (fn.async && !awaited)) {
      return 'unknown'
    }
    const kinds = getReturnedMembers(fn).map(properties => {
      if (!properties) {
        return 'unknown'
      }
      const then = properties.get('then')
      if (awaited && then && propertyKind(then) !== 'state') {
        return 'unknown'
      }
      const property = properties.get(name)
      return property ? propertyKind(property) : 'unknown'
    })
    return kinds.length && kinds.every(kind => kind === kinds[0])
      ? (kinds[0] ?? 'unknown')
      : 'unknown'
  }

  function consumedPropertyKind(
    call: TSESTree.CallExpression,
    name: string,
    awaited: boolean,
  ): MemberKind {
    const local = localPropertyKind(call, name, awaited)
    if (local !== 'unknown' || !services || !checker) {
      return local
    }
    let type = services.getTypeAtLocation(call)
    if (awaited) {
      const awaitedType = checker.getAwaitedType(type)
      if (!awaitedType) {
        return 'unknown'
      }
      type = awaitedType
    }
    const property = checker.getPropertyOfType(type, name)
    return property
      ? classifyType(
          checker.getTypeOfSymbolAtLocation(
            property,
            services.esTreeNodeToTSNodeMap.get(call),
          ),
          checker,
          functionType,
        )
      : 'unknown'
  }

  return {
    propertyKind,
    consumedPropertyKind,
  }
}
