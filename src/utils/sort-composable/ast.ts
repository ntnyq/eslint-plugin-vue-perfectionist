import { isFunctionNode, unwrapExpression } from '../ast/expressions.ts'
import { getMemberName, isPrototypeSetter } from '../ast/object-members.ts'
import { getChildren } from '../ast/traversal.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'
import type { FunctionNode } from '../ast/expressions.ts'

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
  fn: FunctionNode,
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
    if (isFunctionNode(node) || node.type === 'ClassDeclaration') {
      return
    }
    if (node.type === 'ReturnStatement') {
      add(node.argument)
      return
    }
    for (const child of getChildren(node, sourceCode)) {
      visit(child)
    }
  }
  if (fn.body.type === 'BlockStatement') {
    visit(fn.body)
  } else {
    add(fn.body)
  }
  return returns
}
