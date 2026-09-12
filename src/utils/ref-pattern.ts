import { ASTUtils } from '@typescript-eslint/utils'
import { unwrapExpression } from './ast.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type { SourceCode } from '../types/index.ts'

/**
 * Vue template expressions share ESTree nodes with the script parser, including
 * TypeScript wrappers that vue-eslint-parser does not declare in its AST types.
 */
export function unwrapRefExpression(
  node: AST.Node | TSESTree.Node,
): AST.Node | TSESTree.Node {
  switch (node.type) {
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
    case 'TSInstantiationExpression':
      return unwrapRefExpression(node.expression)
    default:
      return node
  }
}

export function getRefString(
  node: AST.Node | TSESTree.Node,
): string | undefined {
  const expression = unwrapRefExpression(node)
  if (expression.type === 'Literal' && typeof expression.value === 'string') {
    return expression.value
  }
  if (expression.type === 'TemplateLiteral' && !expression.expressions.length) {
    return expression.quasis[0]?.value.cooked ?? undefined
  }
  return undefined
}

/**
 * Only explicit Vue runtime imports establish an API's identity.
 */
export function getVueRefApi(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
): string | undefined {
  const callee = unwrapExpression(call.callee)
  if (callee.type === 'Identifier') {
    const definition = ASTUtils.findVariable(
      sourceCode.getScope(call),
      callee.name,
    )?.defs[0]
    if (
      definition?.type === 'ImportBinding' &&
      definition.parent.type === 'ImportDeclaration' &&
      definition.parent.source.value === 'vue' &&
      definition.parent.importKind !== 'type' &&
      definition.node.type === 'ImportSpecifier' &&
      definition.node.importKind !== 'type'
    ) {
      return definition.node.imported.type === 'Identifier'
        ? definition.node.imported.name
        : definition.node.imported.value
    }
  }
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier'
  ) {
    const definition = ASTUtils.findVariable(
      sourceCode.getScope(call),
      callee.object.name,
    )?.defs[0]
    if (
      definition?.type === 'ImportBinding' &&
      definition.parent.type === 'ImportDeclaration' &&
      definition.parent.source.value === 'vue' &&
      definition.parent.importKind !== 'type' &&
      definition.node.type === 'ImportNamespaceSpecifier'
    ) {
      return !callee.computed && callee.property.type === 'Identifier'
        ? callee.property.name
        : getRefString(callee.property)
    }
  }
  return undefined
}

export function isVueRefVariable(
  variable: TSESLint.Scope.Variable | null | undefined,
  sourceCode: SourceCode,
): boolean {
  if (
    !variable ||
    variable.defs.length !== 1 ||
    variable.references.some(
      reference => reference.isWrite() && !reference.init,
    )
  ) {
    return false
  }
  const definition = variable.defs[0]
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
  const api = getVueRefApi(initializer, sourceCode)
  return (
    api !== undefined && ['ref', 'shallowRef', 'useTemplateRef'].includes(api)
  )
}
