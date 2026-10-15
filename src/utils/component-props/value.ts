import { unwrapExpression } from '../ast/expressions.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type { ComponentPropType } from '../../types/index.ts'

export type ComponentPropNode = AST.Node | TSESTree.Node

export interface PropValueVariant {
  type: ComponentPropType
  /**
   * Concrete scalar retained by the value-constraint analyzer when available.
   */
  value?: string | number | boolean | null
  /**
   * Retained for Boolean casting and statically known dynamic names.
   */
  stringValue?: string
}

export interface PropValue {
  variants: PropValueVariant[]
  unknown: boolean
  node: ComponentPropNode
}

/**
 * Represent a prop expression whose value cannot be inferred.
 *
 * @param node - The node responsible for the unknown value.
 * @returns An unknown value with no known variants and the original diagnostic
 * node.
 */
export function unknownPropValue(node: ComponentPropNode): PropValue {
  return {
    variants: [],
    unknown: true,
    node,
  }
}

/**
 * Represent a statically known string prop value.
 *
 * @param value - The decoded string value.
 * @param node - The node supplying the string.
 * @returns A certain string variant retaining its concrete text.
 */
export function stringPropValue(
  value: string,
  node: ComponentPropNode,
): PropValue {
  return {
    variants: [{ type: 'string', stringValue: value }],
    unknown: false,
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
export function inferPropValue(
  input: ComponentPropNode,
  isGlobalUndefined: (node: ComponentPropNode) => boolean,
): PropValue {
  const node = unwrapExpression(input)
  /**
   * Create a certain structural value for the current expression.
   *
   * @param type - The runtime type established by the expression shape.
   * @returns A single known type variant associated with the current node.
   */
  const known = (type: ComponentPropType): PropValue => ({
    variants: [{ type }],
    unknown: false,
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
        return stringPropValue(node.value, node)
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
        : stringPropValue(node.quasis[0]?.value.cooked ?? '', node)
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
        const argument = inferPropValue(node.argument, isGlobalUndefined)
        if (
          !argument.unknown &&
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
      const consequent = inferPropValue(node.consequent, isGlobalUndefined)
      const alternate = inferPropValue(node.alternate, isGlobalUndefined)
      return {
        variants: [...consequent.variants, ...alternate.variants],
        unknown: consequent.unknown || alternate.unknown,
        node,
      }
    }
  }
  return unknownPropValue(node)
}
