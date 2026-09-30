import type { TSESTree } from '@typescript-eslint/utils'
import type { DefineMacrosTypeStyle, SourceCode } from '../types/index.ts'

/**
 * Classifies the directly referenced declaration without following aliases.
 */
export function getMacroTypeStyle(
  node: TSESTree.TypeNode,
  sourceCode: SourceCode,
): DefineMacrosTypeStyle | 'unknown' | 'unsupported' {
  if (node.type === 'TSTypeLiteral' || node.type === 'TSFunctionType') {
    return 'inline'
  }
  if (node.type === 'TSImportType') {
    return node.qualifier ? 'imported' : 'unsupported'
  }
  if (node.type !== 'TSTypeReference') {
    return 'unsupported'
  }
  let identifier = node.typeName
  const isQualified = identifier.type === 'TSQualifiedName'
  while (identifier.type === 'TSQualifiedName') {
    identifier = identifier.left
  }
  // Scope references resolve the type namespace, including separate value
  // bindings and vue-eslint-parser's reconstructed dual-script scopes.
  let scope = sourceCode.getScope(identifier)
  let reference = scope.references.find(item => item.identifier === identifier)
  while (!reference && scope.upper) {
    scope = scope.upper
    reference = scope.references.find(item => item.identifier === identifier)
  }
  const definitions = reference?.resolved?.defs.filter(
    definition => definition.isTypeDefinition,
  )
  if (!definitions?.length) {
    return 'unknown'
  }
  const definition = definitions[0]
  if (!definition) {
    return 'unknown'
  }
  if (isQualified) {
    return definitions.length === 1 &&
      definition.type === 'ImportBinding' &&
      definition.node.type === 'ImportNamespaceSpecifier'
      ? 'imported'
      : 'unsupported'
  }
  if (definitions.length === 1 && definition.type === 'ImportBinding') {
    return definition.node.type === 'ImportNamespaceSpecifier'
      ? 'unknown'
      : 'imported'
  }
  if (
    definitions.every(definition => {
      const declaration = definition.node
      if (
        declaration.type !== 'TSInterfaceDeclaration' &&
        declaration.type !== 'TSTypeAliasDeclaration'
      ) {
        return false
      }
      const parent = declaration.parent
      const isTopLevel =
        parent.type === 'Program' ||
        (parent.type === 'ExportNamedDeclaration' &&
          parent.parent.type === 'Program')
      return isTopLevel && !declaration.declare
    }) &&
    (definitions.length === 1 ||
      definitions.every(
        definition => definition.node.type === 'TSInterfaceDeclaration',
      ))
  ) {
    return 'local'
  }
  return 'unknown'
}
