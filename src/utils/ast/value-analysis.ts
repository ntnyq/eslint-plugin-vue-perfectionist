import { unwrapExpression } from './expressions.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'

export type ExpressionValueNode = AST.Node | TSESTree.Node

/**
 * Concrete scalars must match their runtime category. Other categories retain
 * shape evidence only; no object coercion or binding evaluation is performed.
 */
export type ExpressionValueVariant =
  | { type: 'string'; value?: string }
  | { type: 'number'; value?: number }
  | { type: 'boolean'; value?: boolean }
  | { type: 'null'; value?: null }
  | {
      type: 'array' | 'bigint' | 'function' | 'object' | 'symbol' | 'undefined'
      value?: never
    }

export interface ExpressionValueAnalysis {
  variants: ExpressionValueVariant[]
  /**
   * Some possible values remain unresolved, even when known variants exist.
   */
  hasUnknownVariants: boolean
  node: ExpressionValueNode
}

/**
 * Represent an expression whose value cannot be inferred.
 *
 * @param node - The node responsible for the unknown value.
 * @returns An unknown value with no known variants and the original diagnostic
 * node.
 */
export function createUnknownValueAnalysis(
  node: ExpressionValueNode,
): ExpressionValueAnalysis {
  return {
    variants: [],
    hasUnknownVariants: true,
    node,
  }
}

/**
 * Represent a statically known string value.
 *
 * @param value - The decoded string value.
 * @param node - The node supplying the string.
 * @returns A certain string variant retaining its concrete text.
 */
export function createStringValueAnalysis(
  value: string,
  node: ExpressionValueNode,
): ExpressionValueAnalysis {
  return {
    variants: [{ type: 'string', value }],
    hasUnknownVariants: false,
    node,
  }
}

/**
 * Infer only expression structure, never execute code or trust type assertions.
 *
 * @param input - The expression to inspect, including TypeScript wrappers.
 * @param isGlobalUndefined - A predicate confirming that an undefined
 * identifier is the unshadowed global.
 * @returns Known structural variants, their remaining uncertainty, and the
 * unwrapped expression node.
 */
export function inferExpressionValueShape(
  input: ExpressionValueNode,
  isGlobalUndefined: (node: ExpressionValueNode) => boolean,
): ExpressionValueAnalysis {
  const node = unwrapExpression(input)
  /**
   * Create a certain structural value for the current expression.
   *
   * @param type - The runtime type established by the expression shape.
   * @returns A single known type variant associated with the current node.
   */
  const known = (
    type: ExpressionValueVariant['type'],
  ): ExpressionValueAnalysis => ({
    variants: [{ type }],
    hasUnknownVariants: false,
    node,
  })
  switch (node.type) {
    case 'Literal':
      if ('regex' in node) {
        return known('object')
      }
      if (node.value === null) {
        return known('null')
      }
      if (typeof node.value === 'string') {
        return createStringValueAnalysis(node.value, node)
      }
      if (typeof node.value === 'number') {
        return known('number')
      }
      if (typeof node.value === 'boolean') {
        return known('boolean')
      }
      if (typeof node.value === 'bigint') {
        return known('bigint')
      }
      break
    case 'TemplateLiteral':
      return node.expressions.length
        ? known('string')
        : createStringValueAnalysis(node.quasis[0]?.value.cooked ?? '', node)
    case 'ArrayExpression':
      return known('array')
    case 'ObjectExpression':
      return known('object')
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return known('function')
    case 'Identifier':
      if (node.name === 'undefined' && isGlobalUndefined(node)) {
        return known('undefined')
      }
      break
    case 'UnaryExpression':
      if (node.operator === 'void') {
        return known('undefined')
      }
      if (node.operator === '!') {
        return known('boolean')
      }
      if (node.operator === 'typeof') {
        return known('string')
      }
      if (['-', '+', '~'].includes(node.operator)) {
        const argument = inferExpressionValueShape(
          node.argument,
          isGlobalUndefined,
        )
        if (
          !argument.hasUnknownVariants &&
          argument.variants.every(
            /**
             * Recognize numeric types supported by the current unary operator.
             *
             * @param variant - The inferred operand variant.
             * @returns Whether the operand is numeric or a bigint supported by
             * the operator.
             */
            variant =>
              variant.type === 'number' ||
              (node.operator !== '+' && variant.type === 'bigint'),
          )
        ) {
          return {
            ...argument,
            node,
          }
        }
      }
      break
    case 'ConditionalExpression': {
      const consequent = inferExpressionValueShape(
        node.consequent,
        isGlobalUndefined,
      )
      const alternate = inferExpressionValueShape(
        node.alternate,
        isGlobalUndefined,
      )
      return {
        variants: [...consequent.variants, ...alternate.variants],
        hasUnknownVariants:
          consequent.hasUnknownVariants || alternate.hasUnknownVariants,
        node,
      }
    }
  }
  return createUnknownValueAnalysis(node)
}
