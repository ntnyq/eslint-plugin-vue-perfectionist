import { isNumber, isString } from '@ntnyq/utils'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'

export type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression

/**
 * Unwrap TypeScript expressions in scripts and templates. The template parser
 * accepts these wrappers at runtime without declaring them in its AST types.
 *
 * @param node - The expression or other AST node to unwrap.
 * @returns The innermost expression, or the original node when no wrapper
 * applies.
 */
export function unwrapExpression(node: TSESTree.Node): TSESTree.Node
/**
 * Recursively remove TypeScript expression wrappers from a script or template
 * node.
 *
 * @param node - The expression or other AST node to unwrap.
 * @returns The innermost expression, or the original node when no wrapper
 * applies.
 */
export function unwrapExpression(
  node: AST.Node | TSESTree.Node,
): AST.Node | TSESTree.Node
/**
 * Recursively remove TypeScript expression wrappers from a script or template
 * node.
 *
 * @param node - The expression or other AST node to unwrap.
 * @returns The innermost expression, or the original node when no wrapper
 * applies.
 */
export function unwrapExpression(
  node: AST.Node | TSESTree.Node,
): AST.Node | TSESTree.Node {
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

/**
 * Locate an expression's outer transparent TypeScript wrapper.
 *
 * @param node - The expression or assignment target to inspect.
 * @returns The outer node used by its enclosing syntax.
 */
export function getOuterExpression(node: TSESTree.Node): TSESTree.Node {
  let current = node
  while (
    current.parent &&
    unwrapExpression(current.parent) === unwrapExpression(current)
  ) {
    current = current.parent
  }
  return current
}

/**
 * Exclude erased TypeScript branches, including value-shaped nodes in types.
 *
 * @param node - A script or template node being checked for runtime behavior.
 * @returns Whether the node participates in runtime evaluation.
 */
export function isRuntimeNode(node: AST.Node | TSESTree.Node): boolean {
  let child = node
  let parent = child.parent
  while (parent && parent.type !== 'VExpressionContainer') {
    switch (parent.type) {
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSTypeAssertion':
        if (parent.expression !== child) {
          return false
        }
        break
      case 'TSTypeAnnotation':
      case 'TSTypeParameterDeclaration':
      case 'TSTypeParameterInstantiation':
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration':
        return false
    }
    child = parent
    parent = child.parent
  }
  return true
}

/**
 * Check whether a node declares or represents a JavaScript function.
 *
 * @param node - The AST node to inspect.
 * @returns Whether the node is a function declaration, function expression, or
 * arrow function.
 */
export function isFunctionNode(node: TSESTree.Node): node is FunctionNode {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
  ].includes(node.type)
}

/**
 * Recognize literal constants that can be reordered without evaluating user
 * code.
 *
 * @param node - The expression to inspect, including TypeScript wrappers.
 * @returns Whether the expression is a non-regex literal, static template, or
 * signed numeric literal.
 */
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
    isNumber(expression.argument.value)
  )
}

/**
 * Read a string literal or substitution-free template without evaluating code.
 *
 * @param node - The script or template expression to inspect.
 * @returns The static string, or undefined when the expression or cooked text
 * is unavailable.
 */
export function getStaticStringValue(
  node: AST.Node | TSESTree.Node,
): string | undefined {
  const expression = unwrapExpression(node)
  if (expression.type === 'Literal' && isString(expression.value)) {
    return expression.value
  }
  if (expression.type === 'TemplateLiteral' && !expression.expressions.length) {
    return expression.quasis[0]?.value.cooked ?? undefined
  }
  return undefined
}

/**
 * Read the declaration binding name, including wrapped variable initializers.
 */
export function getFunctionBindingName(node: FunctionNode): string | undefined {
  if (node.type === 'FunctionDeclaration') {
    return node.id?.name
  }
  let parent: TSESTree.Node | undefined = node.parent
  while (parent && unwrapExpression(parent) === node) {
    parent = parent.parent
  }
  return parent?.type === 'VariableDeclarator' &&
    parent.id.type === 'Identifier'
    ? parent.id.name
    : undefined
}

/**
 * Find the owning function, stopping before callbacks can leak into an API.
 */
export function getReturnOwner(
  node: TSESTree.ReturnStatement,
): FunctionNode | undefined {
  let parent: TSESTree.Node | undefined = node.parent
  while (parent) {
    if (isFunctionNode(parent)) {
      return parent
    }
    parent = parent.parent
  }
  return undefined
}
