import { ESLintUtils } from '@typescript-eslint/utils'
import { unwrapExpression } from '../ast/expressions.ts'
import { findScopeReference } from '../ast/scope.ts'
import { getCallIdentity } from '../vue/call-identity.ts'
import { resolveVueGlobals } from '../vue/globals.ts'
import { getScriptVariableDefinitions } from '../vue/script-scope.ts'
import {
  getMemberName,
  getReturnedObjects,
  hasDuplicateMembers,
  isComposableFunction,
  isPrototypeSetter,
} from './ast.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type ts from 'typescript'
import type {
  ComposableMemberKind,
  SortComposableMessageId,
  SortComposableOptions,
} from '../../types/rules/sort-composable.ts'

export type MemberKind = ComposableMemberKind | 'unknown'

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
    if (isComposableFunction(node)) {
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
          (identity.isUnbound && globals.includes(identity.name)))
      ) {
        const api = identity.exportedName ?? identity.name
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
    return node.kind === 'init' ? expressionKind(node.value) : 'unknown'
  }

  function localPropertyKind(
    call: TSESTree.CallExpression,
    name: string,
    awaited: boolean,
  ): MemberKind {
    const callee = unwrapExpression(call.callee)
    if (callee.type !== 'Identifier') {
      return 'unknown'
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
    if (
      !fn ||
      !isComposableFunction(fn) ||
      fn.generator ||
      (fn.async && !awaited)
    ) {
      return 'unknown'
    }
    const objects = getReturnedObjects(fn, sourceCode)
    const kinds = objects.map(object => {
      if (
        !object ||
        hasDuplicateMembers(object) ||
        object.properties.some(
          property =>
            property.type !== 'Property' ||
            getMemberName(property) === undefined ||
            isPrototypeSetter(property) ||
            (awaited &&
              getMemberName(property) === 'then' &&
              propertyKind(property) !== 'state'),
        )
      ) {
        return 'unknown'
      }
      const property = object.properties.find(
        property =>
          property.type === 'Property' && getMemberName(property) === name,
      )
      return property?.type === 'Property' ? propertyKind(property) : 'unknown'
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
