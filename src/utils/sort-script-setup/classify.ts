import { MACROS, VUE_APIS } from '../../constants/sort-script-setup.ts'
import { isPrimitiveConstant, unwrapExpression } from '../ast/expressions.ts'
import { containsTopLevelAwait, getBindingNames } from '../ast/traversal.ts'
import { getCallIdentity } from '../vue/call-identity.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'
import type { Selector } from '../../types/index.ts'
import type { ResolvedOptions, Statement } from './types.ts'

/**
 * Classify a call and record its resolved call name and import source.
 *
 * @param call - The call expression to classify.
 * @param statement - The statement metadata to update with the resolved
 * identity.
 * @param sourceCode - The source code providing lexical and import information.
 * @param options - The resolved Vue import and global recognition options.
 * @returns The recognized macro, Vue API, or composable selector, or undefined.
 */
function classifyCall(
  call: TSESTree.CallExpression,
  statement: Statement,
  sourceCode: SourceCode,
  options: ResolvedOptions,
): Selector | undefined {
  const identity = getCallIdentity(call, sourceCode)
  if (!identity) {
    return undefined
  }
  statement.callName = identity.name
  statement.importSource = identity.source
  if (identity.isUnbound && identity.name === 'withDefaults') {
    const first = call.arguments[0]
    if (first?.type === 'CallExpression') {
      const inner = getCallIdentity(first, sourceCode)
      if (inner?.isUnbound && inner.name === 'defineProps') {
        statement.callName = 'defineProps'
        return 'define-props'
      }
    }
  }
  if (identity.isUnbound && MACROS.has(identity.name)) {
    return MACROS.get(identity.name)
  }
  if (
    (identity.source && options.vueImportSources.includes(identity.source)) ||
    (identity.isUnbound && options.vueGlobals.includes(identity.name))
  ) {
    const selector = VUE_APIS.get(identity.name)
    if (selector) {
      return selector
    }
  }
  if (identity.source && /^use[A-Z0-9]/u.test(identity.name)) {
    return 'composable'
  }
  return undefined
}

/**
 * Classify a top-level statement and establish its sorting metadata.
 *
 * @param node - The program statement to inspect.
 * @param sourceCode - The source code providing text, visitor keys, and scopes.
 * @param options - The resolved rule options.
 * @param index - The original statement index used for stable ordering.
 * @returns The statement metadata, or undefined for unsupported statements or
 * top-level await.
 */
export function classifyStatement(
  node: TSESTree.ProgramStatement,
  sourceCode: SourceCode,
  options: ResolvedOptions,
  index: number,
): Statement | undefined {
  if (containsTopLevelAwait(node, sourceCode)) {
    return undefined
  }
  const statement: Statement = {
    node,
    selector: 'variable',
    modifiers: [],
    names: [],
    name: '',
    start: node.range[0],
    end: node.range[1],
    size:
      node.range[1] -
      node.range[0] -
      (sourceCode.getText(node).endsWith(';') ? 1 : 0),
    group: -1,
    subgroup: -1,
    index,
  }
  switch (node.type) {
    case 'TSInterfaceDeclaration':
      statement.selector = 'interface'
      statement.names = [node.id.name]
      statement.safeKind = 'type'
      break
    case 'TSTypeAliasDeclaration':
      statement.selector = 'type'
      statement.names = [node.id.name]
      statement.safeKind = 'type'
      break
    case 'TSEnumDeclaration':
      statement.selector = 'enum'
      statement.names = [node.id.name]
      break
    case 'ClassDeclaration':
      statement.selector = 'class'
      statement.names = node.id ? [node.id.name] : []
      break
    case 'TSDeclareFunction':
    case 'FunctionDeclaration':
      statement.selector = 'function'
      statement.names = node.id ? [node.id.name] : []
      if (node.async) {
        statement.modifiers.push('async')
      }
      if (node.type === 'FunctionDeclaration' && node.body) {
        statement.safeKind = 'function'
      }
      break
    case 'VariableDeclaration': {
      if (
        node.declarations.length !== 1 ||
        !['const', 'let', 'var'].includes(node.kind)
      ) {
        return undefined
      }
      const declaration = node.declarations[0]
      if (!declaration) {
        return undefined
      }
      if (node.kind !== 'using' && node.kind !== 'await using') {
        statement.modifiers.push(node.kind)
      }
      statement.names = getBindingNames(declaration.id)
      if (declaration.id.type !== 'Identifier') {
        statement.modifiers.push('destructured')
      }
      const init = declaration.init
        ? unwrapExpression(declaration.init)
        : undefined
      if (init?.type === 'CallExpression') {
        statement.selector =
          classifyCall(init, statement, sourceCode, options) ?? 'variable'
      } else if (
        init?.type === 'ArrowFunctionExpression' ||
        init?.type === 'FunctionExpression'
      ) {
        statement.selector = 'function'
        if (init.async) {
          statement.modifiers.push('async')
        }
      } else if (
        node.kind === 'const' &&
        init &&
        declaration.id.type === 'Identifier' &&
        isPrimitiveConstant(init)
      ) {
        statement.selector = 'constant'
        statement.safeKind = 'constant'
      }
      break
    }
    case 'ExpressionStatement': {
      const expression = unwrapExpression(node.expression)
      if (expression.type !== 'CallExpression' || expression.optional) {
        return undefined
      }
      statement.selector =
        classifyCall(expression, statement, sourceCode, options) ?? 'call'
      break
    }
    default:
      return undefined
  }
  if ('declare' in node && node.declare) {
    statement.modifiers.push('declare')
    statement.safeKind = undefined
  }
  statement.name =
    statement.names[0] ?? statement.callName ?? sourceCode.getText(node)
  return statement
}
