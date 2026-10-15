import { isNumber, isString } from '@ntnyq/utils'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'

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
 * Check whether a node declares or represents a JavaScript function.
 *
 * @param node - The AST node to inspect.
 * @returns Whether the node is a function declaration, function expression, or
 * arrow function.
 */
export function isFunction(node: TSESTree.Node): boolean {
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
