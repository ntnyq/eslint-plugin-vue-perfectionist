import { inferPropValue, unknownPropValue } from './component-prop-value.ts'
import { unwrapRefExpression } from './ref-pattern.ts'
import type {
  ComponentPropNode,
  PropValue,
  PropValueVariant,
} from './component-prop-value.ts'

/**
 * Resolve scalar literals and numeric constant operations without executing
 * user code, following bindings, coercing objects, or trusting TS assertions.
 */
export function inferStaticPropValue(
  input: ComponentPropNode,
  isGlobalUndefined: (node: ComponentPropNode) => boolean,
  depth = 0,
): PropValue {
  const node = unwrapRefExpression(input)
  if (depth > 32) {
    return unknownPropValue(node)
  }
  const infer = (child: ComponentPropNode) =>
    inferStaticPropValue(child, isGlobalUndefined, depth + 1)
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
      variants: argument.variants.flatMap(variant => {
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
      }),
      unknown:
        argument.unknown ||
        argument.variants.some(
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
    return { variants, unknown, node }
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
        variants: result.variants.map(variant => ({ ...variant, value })),
      }
    }
  }
  return result
}
