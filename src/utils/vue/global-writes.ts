import { ASTUtils } from '@typescript-eslint/utils'
import { getOuterExpression } from '../ast/expressions.ts'
import { getScriptVariableDefinitions } from './script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

/**
 * Recognize writes and deletions, including targets inside assignment patterns.
 *
 * @param node - The global object member being inspected.
 * @returns Whether the member is modified by its enclosing syntax.
 */
function isWriteTarget(node: TSESTree.Node): boolean {
  let current = getOuterExpression(node)

  while (current.parent) {
    const parent = current.parent

    switch (parent.type) {
      case 'AssignmentExpression':
      case 'ForInStatement':
      case 'ForOfStatement':
        return parent.left === current
      case 'UpdateExpression':
        return parent.argument === current
      case 'UnaryExpression':
        return parent.operator === 'delete' && parent.argument === current
      case 'AssignmentPattern':
        if (parent.left !== current) {
          return false
        }

        break
      case 'Property':
        if (
          parent.value !== current ||
          parent.parent.type !== 'ObjectPattern'
        ) {
          return false
        }

        break
      case 'ArrayPattern':
      case 'ObjectPattern':
      case 'RestElement':
        break
      default:
        return false
    }

    current = getOuterExpression(parent)
  }

  return false
}

/**
 * Detect direct global writes and writes through unshadowed global objects.
 * Unknown computed property names may target any global API.
 *
 * @param sourceCode - The source providing references and merged script scopes.
 * @param name - The global API name whose runtime identity must stay stable.
 * @returns Whether a write may change the API, or scopes are unavailable.
 */
export function hasGlobalWrite(sourceCode: SourceCode, name: string): boolean {
  return (
    sourceCode.scopeManager?.scopes.some(scope =>
      scope.references.some(reference => {
        const identifier = reference.identifier

        if (
          identifier.type !== 'Identifier' ||
          ![name, 'globalThis', 'window', 'self', 'global'].includes(
            identifier.name,
          ) ||
          getScriptVariableDefinitions(identifier, sourceCode).some(
            definition => definition.isVariableDefinition !== false,
          )
        ) {
          return false
        }

        if (identifier.name === name && reference.isWrite()) {
          return true
        }

        if (
          !['globalThis', 'window', 'self', 'global'].includes(identifier.name)
        ) {
          return false
        }

        const expression = getOuterExpression(identifier)
        const parent = expression.parent

        if (
          parent?.type !== 'MemberExpression' ||
          parent.object !== expression ||
          !isWriteTarget(parent)
        ) {
          return false
        }

        const key = ASTUtils.getPropertyName(parent)

        return key === null || key === name
      }),
    ) ?? true
  )
}
