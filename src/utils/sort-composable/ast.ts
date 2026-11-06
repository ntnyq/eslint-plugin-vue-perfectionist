import { unwrapExpression } from '../ast/expressions.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

export type ComposableFunction =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression

/**
 * Narrow function nodes without including signatures or class methods.
 */
export function isComposableFunction(
  node: TSESTree.Node,
): node is ComposableFunction {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
  ].includes(node.type)
}

/**
 * Read the declaration binding name, including wrapped variable initializers.
 */
export function getComposableFunctionName(
  node: ComposableFunction,
): string | undefined {
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
): ComposableFunction | undefined {
  let parent: TSESTree.Node | undefined = node.parent
  while (parent) {
    if (isComposableFunction(parent)) {
      return parent
    }
    parent = parent.parent
  }
  return undefined
}

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

/**
 * Duplicate public keys invalidate the whole object, including spacing checks.
 */
export function hasDuplicateMembers(node: TSESTree.ObjectExpression): boolean {
  const names = new Set<string>()
  for (const property of node.properties) {
    if (property.type !== 'Property' || isPrototypeSetter(property)) {
      continue
    }
    const name = getMemberName(property)
    if (name === undefined) {
      continue
    }
    if (names.has(name)) {
      return true
    }
    names.add(name)
  }
  return false
}

/**
 * Collect only this function's direct returns. Unsupported return expressions
 * are retained so a consumer cannot infer a kind from only one branch.
 */
export function getReturnedObjects(
  fn: ComposableFunction,
  sourceCode: SourceCode,
): (TSESTree.ObjectExpression | undefined)[] {
  if (!fn.body) {
    return []
  }
  const returns: (TSESTree.ObjectExpression | undefined)[] = []
  function add(node: TSESTree.Node | null) {
    const expression = node && unwrapExpression(node)
    returns.push(
      expression?.type === 'ObjectExpression' ? expression : undefined,
    )
  }
  function visit(node: TSESTree.Node) {
    if (isComposableFunction(node) || node.type === 'ClassDeclaration') {
      return
    }
    if (node.type === 'ReturnStatement') {
      add(node.argument)
      return
    }
    for (const key of sourceCode.visitorKeys[node.type] ?? []) {
      // Visitor keys describe the parser's child nodes, excluding parent links.
      const child: unknown = Reflect.get(node, key)
      const children = Array.isArray(child) ? child : [child]
      for (const value of children) {
        if (value && typeof value === 'object' && 'type' in value) {
          visit(value as TSESTree.Node)
        }
      }
    }
  }
  if (fn.body.type === 'BlockStatement') {
    visit(fn.body)
  } else {
    add(fn.body)
  }
  return returns
}
