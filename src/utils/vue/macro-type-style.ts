import { findScopeReference } from '../ast/scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'
import type { DefineMacrosTypeStyle } from '../../types/index.ts'

/**
 * Classifies the directly referenced declaration without following aliases.
 *
 * @param node - The macro type argument to classify.
 * @param sourceCode - The source code used to resolve type-namespace
 * references.
 * @returns Inline, imported, or local style; unknown for unresolved
 * declarations; unsupported for excluded syntax.
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
  const reference = findScopeReference(identifier, sourceCode)
  const definitions = reference?.resolved?.defs.filter(
    /**
     * Keep definitions in the type namespace.
     *
     * @param definition - The resolved scope definition.
     * @returns Whether the definition introduces a type.
     */
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
    definitions.every(
      /**
       * Recognize non-ambient type aliases and interfaces declared at program
       * level.
       *
       * @param definition - The resolved type definition.
       * @returns Whether the declaration is a supported local top-level type.
       */
      definition => {
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
      },
    ) &&
    (definitions.length === 1 ||
      definitions.every(
        /**
         * Allow multiple definitions only for merged interfaces.
         *
         * @param definition - The resolved type definition.
         * @returns Whether its declaration is an interface.
         */
        definition => definition.node.type === 'TSInterfaceDeclaration',
      ))
  ) {
    return 'local'
  }
  return 'unknown'
}
