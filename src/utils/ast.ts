import { ASTUtils } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type { CallIdentity, SourceCode } from '../types/index.ts'

/**
 * This boundary checks the documented vue-eslint-parser service, whose return
 * type is not part of typescript-eslint's parser service declaration.
 */
function hasVueServices(
  services: unknown,
): services is { getDocumentFragment: () => AST.VDocumentFragment | null } {
  return (
    services !== null &&
    typeof services === 'object' &&
    'getDocumentFragment' in services &&
    typeof services.getDocumentFragment === 'function'
  )
}

export function getSetupRange(
  sourceCode: SourceCode,
): TSESTree.Range | undefined {
  if (!hasVueServices(sourceCode.parserServices)) {
    return undefined
  }
  const fragment = sourceCode.parserServices.getDocumentFragment()
  const setup = fragment?.children.find(
    node =>
      node.type === 'VElement' &&
      node.name === 'script' &&
      node.startTag.attributes.some(
        attribute => !attribute.directive && attribute.key.name === 'setup',
      ),
  )
  if (setup?.type !== 'VElement' || !setup.endTag) {
    return undefined
  }
  return [setup.startTag.range[1], setup.endTag.range[0]]
}

export function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  switch (node.type) {
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
    case 'TSInstantiationExpression':
      return unwrapExpression(node.expression)
    default:
      return node
  }
}

export function isFunction(node: TSESTree.Node): boolean {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
  ].includes(node.type)
}

function isNode(value: unknown): value is TSESTree.Node {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'range' in value &&
    Array.isArray(value.range)
  )
}

export function getChildren(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): TSESTree.Node[] {
  const children: TSESTree.Node[] = []
  for (const key of sourceCode.visitorKeys[node.type] ?? []) {
    const value: unknown = Reflect.get(node, key)
    if (Array.isArray(value)) {
      children.push(...value.filter(isNode))
    } else if (isNode(value)) {
      children.push(value)
    }
  }
  return children
}

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
  return getChildren(node, sourceCode).some(child =>
    containsTopLevelAwait(child, sourceCode),
  )
}

export function getBindingNames(node: TSESTree.Node): string[] {
  switch (node.type) {
    case 'Identifier':
      return [node.name]
    case 'ArrayPattern':
      return node.elements.flatMap(element =>
        element ? getBindingNames(element) : [],
      )
    case 'ObjectPattern':
      return node.properties.flatMap(property =>
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

export function isPrimitiveConstant(node: TSESTree.Node): boolean {
  const expression = unwrapExpression(node)
  if (expression.type === 'Literal') {
    return !('regex' in expression)
  }
  if (expression.type === 'TemplateLiteral') {
    return expression.expressions.length === 0
  }
  return (
    expression.type === 'UnaryExpression' &&
    ['+', '-'].includes(expression.operator) &&
    expression.argument.type === 'Literal' &&
    typeof expression.argument.value === 'number'
  )
}

export function getCallIdentity(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
): CallIdentity | undefined {
  if (call.optional) {
    return undefined
  }
  const callee = unwrapExpression(call.callee)
  if (callee.type === 'Identifier') {
    const variable = ASTUtils.findVariable(sourceCode.getScope(callee), callee)
    const definition = variable?.defs[0]
    if (
      definition?.type === 'ImportBinding' &&
      definition.parent.type === 'ImportDeclaration' &&
      definition.parent.importKind !== 'type' &&
      definition.node.type === 'ImportDefaultSpecifier'
    ) {
      return {
        name: callee.name,
        source: definition.parent.source.value,
        isUnbound: false,
      }
    }
    if (
      definition?.type === 'ImportBinding' &&
      definition.parent.type === 'ImportDeclaration' &&
      definition.parent.importKind !== 'type' &&
      definition.node.type === 'ImportSpecifier' &&
      definition.node.importKind !== 'type'
    ) {
      return {
        name:
          definition.node.imported.type === 'Identifier'
            ? definition.node.imported.name
            : String(definition.node.imported.value),
        source: definition.parent.source.value,
        isUnbound: false,
      }
    }
    return {
      name: callee.name,
      isUnbound: !variable || variable.defs.length === 0,
    }
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    !callee.optional &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  ) {
    const variable = ASTUtils.findVariable(
      sourceCode.getScope(callee.object),
      callee.object,
    )
    const definition = variable?.defs[0]
    if (
      definition?.type === 'ImportBinding' &&
      definition.parent.type === 'ImportDeclaration' &&
      definition.parent.importKind !== 'type' &&
      definition.node.type === 'ImportNamespaceSpecifier'
    ) {
      return {
        name: callee.property.name,
        source: definition.parent.source.value,
        isUnbound: false,
      }
    }
    return {
      name: `${callee.object.name}.${callee.property.name}`,
      isUnbound: false,
    }
  }
  return undefined
}
