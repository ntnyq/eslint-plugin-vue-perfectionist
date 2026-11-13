import { getStaticStringValue } from '../ast/expressions.ts'
import type { AST } from 'vue-eslint-parser'

/**
 * Resolve a directive argument with a statically known name.
 *
 * @param argument - The static or dynamic directive argument.
 * @returns The raw static name or constant string, or undefined for unresolved
 * arguments.
 */
export function getStaticDirectiveArgument(
  argument: AST.VIdentifier | AST.VExpressionContainer,
): string | undefined {
  return argument.type === 'VIdentifier'
    ? argument.rawName
    : argument.expression
      ? getStaticStringValue(argument.expression)
      : undefined
}
