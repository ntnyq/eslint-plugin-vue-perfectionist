import { unwrapExpression } from '../ast/expressions.ts'
import { inferPropValue, unknownPropValue } from './value.ts'
import type { ComponentPropNode, PropValue, PropValueVariant } from './value.ts'

/**
 * Resolve scalar literals and numeric constant operations without executing
 * user code, following bindings, coercing objects, or trusting TS assertions.
 *
 * @param input - The script or template expression to inspect.
 * @param isGlobalUndefined - A predicate confirming that an undefined
 * identifier is the unshadowed global.
 * @param depth - The current recursion depth; defaults to zero and becomes
 * unknown above 32.
 * @returns Known variants and residual uncertainty, capped at 64 combined
 * variants per operation.
 */
export function inferStaticPropValue(
  input: ComponentPropNode,
  isGlobalUndefined: (node: ComponentPropNode) => boolean,
  depth = 0,
): PropValue {
  const node = unwrapExpression(input)
  if (depth > 32) {
    return unknownPropValue(node)
  }
  /**
   * Infer a child expression at the next recursion depth.
   *
   * @param child - The child expression to inspect.
   * @returns The child value with the same global undefined resolver.
   */
  const infer = (child: ComponentPropNode) =>
    inferStaticPropValue(child, isGlobalUndefined, depth + 1)
  /**
   * Wrap a computed number as a concrete prop value variant.
   *
   * @param value - The computed numeric value.
   * @returns A numeric variant retaining the concrete value.
   */
  const numeric = (value: number): PropValueVariant => ({
    type: 'number',
    value,
  })
  if (node.type === 'ConditionalExpression') {
    const consequent = infer(node.consequent)
    const alternate = infer(node.alternate)
    const variants = [...consequent.variants, ...alternate.variants]
    return variants.length > 64
      ? unknownPropValue(node)
      : {
          variants,
          unknown: consequent.unknown || alternate.unknown,
          node,
        }
  }
  if (
    node.type === 'UnaryExpression' &&
    ['+', '-', '~'].includes(node.operator)
  ) {
    const argument = infer(node.argument)
    return {
      variants: argument.variants.flatMap(
        /**
         * Apply a supported unary numeric operation to one inferred variant.
         *
         * @param variant - The operand variant.
         * @returns The resulting numeric variant, a preserved bigint type, or no
         * variants for an unsupported operand.
         */
        variant => {
          if (variant.type === 'bigint' && node.operator !== '+') {
            return [variant]
          }
          if (typeof variant.value !== 'number') {
            return []
          }
          return [
            numeric(
              node.operator === '-'
                ? -variant.value
                : node.operator === '~'
                  ? ~variant.value
                  : variant.value,
            ),
          ]
        },
      ),
      unknown:
        argument.unknown ||
        argument.variants.some(
          /**
           * Detect unary operands whose result cannot be inferred safely.
           *
           * @param variant - The operand variant.
           * @returns Whether the variant lacks a concrete number or a supported
           * bigint operation.
           */
          variant =>
            typeof variant.value !== 'number' &&
            (variant.type !== 'bigint' || node.operator === '+'),
        ),
      node,
    }
  }
  if (
    node.type === 'BinaryExpression' &&
    ['+', '-', '*', '/', '%', '**'].includes(node.operator)
  ) {
    const left = infer(node.left)
    const right = infer(node.right)
    if (left.variants.length * right.variants.length > 64) {
      return unknownPropValue(node)
    }
    const variants: PropValueVariant[] = []
    let unknown = left.unknown || right.unknown
    for (const first of left.variants) {
      for (const second of right.variants) {
        if (
          typeof first.value !== 'number' ||
          typeof second.value !== 'number'
        ) {
          unknown = true
          continue
        }
        let value: number
        switch (node.operator) {
          case '+':
            value = first.value + second.value
            break
          case '-':
            value = first.value - second.value
            break
          case '*':
            value = first.value * second.value
            break
          case '/':
            value = first.value / second.value
            break
          case '%':
            value = first.value % second.value
            break
          default:
            value = first.value ** second.value
        }
        variants.push(numeric(value))
      }
    }
    return {
      variants,
      unknown,
      node,
    }
  }
  const result = inferPropValue(node, isGlobalUndefined)
  if (node.type === 'Literal' && !('regex' in node)) {
    const value = node.value
    if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'string'
    ) {
      return {
        ...result,
        variants: result.variants.map(
          /**
           * Attach a concrete scalar literal to an inferred variant.
           *
           * @param variant - The structural value variant.
           * @returns The variant with the literal value retained for constraint
           * checks.
           */
          variant => ({
            ...variant,
            value,
          }),
        ),
      }
    }
  }
  return result
}
