import { unwrapExpression } from './expressions.ts'
import type { TSESTree } from '@typescript-eslint/utils'

/**
 * Apply property-key coercion to supported static primitives, never aliases.
 */
export function getMemberName(node: TSESTree.Property): string | undefined {
  if (!node.computed && node.key.type === 'Identifier') {
    return node.key.name
  }
  const key = unwrapExpression(node.key)
  if (
    key.type === 'Literal' &&
    (key.value === null ||
      ['string', 'number', 'bigint', 'boolean'].includes(typeof key.value))
  ) {
    return String(key.value)
  }
  if (key.type === 'UnaryExpression' && ['+', '-'].includes(key.operator)) {
    const argument = unwrapExpression(key.argument)
    if (argument.type === 'Literal') {
      if (typeof argument.value === 'number') {
        return String(key.operator === '-' ? -argument.value : argument.value)
      }
      if (typeof argument.value === 'bigint' && key.operator === '-') {
        return String(-argument.value)
      }
    }
  }
  if (key.type === 'TemplateLiteral' && !key.expressions.length) {
    return key.quasis[0]?.value.cooked ?? undefined
  }
  return undefined
}

/**
 * A non-computed colon-form __proto__ changes the object's prototype; it does
 * not create the public property represented by ordinary keys or destructuring.
 */
export function isPrototypeSetter(node: TSESTree.Property): boolean {
  return (
    node.parent.type === 'ObjectExpression' &&
    node.kind === 'init' &&
    !node.computed &&
    !node.method &&
    !node.shorthand &&
    getMemberName(node) === '__proto__'
  )
}
