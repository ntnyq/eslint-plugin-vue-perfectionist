import { findScopeReference } from './ast/scope.ts'
import { filterScriptDefinitions } from './vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../types/eslint.ts'

type ParameterKind = 'options' | 'positional' | 'undefined' | 'unknown'

/**
 * Resolve only the type namespace, preserving lexical shadowing and SFC scopes.
 *
 * @param identifier - The type identifier to resolve.
 * @param sourceCode - The source code supplying scope and script-block
 * information.
 * @returns The visible type definitions, or an empty array when none resolve.
 */
function getTypeDefinitions(
  identifier: TSESTree.Identifier,
  sourceCode: SourceCode,
) {
  const reference = findScopeReference(identifier, sourceCode)
  return filterScriptDefinitions(
    reference?.resolved?.defs.filter(
      /**
       * Keep definitions that belong to the type namespace.
       *
       * @param definition - The resolved scope definition.
       * @returns Whether the definition introduces a type.
       */
      definition => definition.isTypeDefinition,
    ) ?? [],
    identifier,
    sourceCode,
  )
}

/**
 * Classify an object type by its call signatures and named members.
 *
 * @param members - The type members to inspect.
 * @returns Positional for callable types, options for named fields, or unknown.
 */
function classifyMembers(members: TSESTree.TypeElement[]): ParameterKind {
  if (
    members.some(
      /**
       * Recognize callable or constructable type members.
       *
       * @param member - The type member to inspect.
       * @returns Whether the member is a call or construct signature.
       */
      member =>
        member.type === 'TSCallSignatureDeclaration' ||
        member.type === 'TSConstructSignatureDeclaration',
    )
  ) {
    return 'positional'
  }
  return members.some(
    /**
     * Recognize a property or method with a statically named key.
     *
     * @param member - The type member to inspect.
     * @returns Whether the member provides a named options field.
     */
    member =>
      (member.type === 'TSPropertySignature' ||
        member.type === 'TSMethodSignature') &&
      (!member.computed || member.key.type === 'Literal'),
  )
    ? 'options'
    : 'unknown'
}

/**
 * Classify outer shapes only; field types do not change the options container.
 * A recursion path prevents cyclic aliases from being mistaken for evidence.
 *
 * @param node - The type annotation to classify.
 * @param sourceCode - The source code used to resolve local type declarations.
 * @param seen - The declarations already visited on this recursion path;
 * defaults to an empty set.
 * @returns The parameter shape, with unknown for unsupported or cyclic
 * declarations.
 */
function classifyType(
  node: TSESTree.TypeNode,
  sourceCode: SourceCode,
  seen = new Set<TSESTree.Node>(),
): ParameterKind {
  if (seen.has(node)) {
    return 'unknown'
  }
  const path = new Set(seen).add(node)
  switch (node.type) {
    case 'TSUndefinedKeyword':
      return 'undefined'
    case 'TSTypeLiteral':
      return classifyMembers(node.members)
    case 'TSUnionType': {
      const kinds = new Set(
        node.types.map(
          /**
           * Classify a constituent type using the current recursion path.
           *
           * @param type - The union or intersection constituent.
           * @returns The parameter shape of the constituent.
           */
          type => classifyType(type, sourceCode, path),
        ),
      )
      if (kinds.has('positional')) {
        return 'positional'
      }
      if (kinds.has('unknown')) {
        return 'unknown'
      }
      return kinds.has('options') ? 'options' : 'undefined'
    }
    case 'TSIntersectionType': {
      const kinds = node.types.map(
        /**
         * Classify a constituent type using the current recursion path.
         *
         * @param type - The union or intersection constituent.
         * @returns The parameter shape of the constituent.
         */
        type => classifyType(type, sourceCode, path),
      )
      if (
        kinds.every(
          /**
           * Check whether a constituent is an options container.
           *
           * @param kind - The inferred parameter shape.
           * @returns Whether the shape is options.
           */
          kind => kind === 'options',
        )
      ) {
        return 'options'
      }
      return kinds.includes('positional') ? 'positional' : 'unknown'
    }
    case 'TSTypeReference': {
      if (node.typeName.type !== 'Identifier' || node.typeArguments) {
        return 'unknown'
      }
      const definitions = getTypeDefinitions(node.typeName, sourceCode)
      if (!definitions?.length) {
        return 'unknown'
      }
      const declaration = definitions[0]?.node
      if (
        definitions.length === 1 &&
        declaration?.type === 'TSTypeAliasDeclaration' &&
        !declaration.typeParameters
      ) {
        return classifyType(declaration.typeAnnotation, sourceCode, path)
      }
      const members: TSESTree.TypeElement[] = []
      for (const definition of definitions) {
        const node = definition.node
        if (
          node.type !== 'TSInterfaceDeclaration' ||
          node.typeParameters ||
          node.extends.length > 0
        ) {
          return 'unknown'
        }
        members.push(...node.body.body)
      }
      return classifyMembers(members)
    }
    case 'TSArrayType':
    case 'TSTupleType':
    case 'TSFunctionType':
    case 'TSConstructorType':
    case 'TSStringKeyword':
    case 'TSNumberKeyword':
    case 'TSBooleanKeyword':
    case 'TSBigIntKeyword':
    case 'TSSymbolKeyword':
    case 'TSNullKeyword':
    case 'TSVoidKeyword':
    case 'TSNeverKeyword':
    case 'TSLiteralType':
      return 'positional'
    default:
      return 'unknown'
  }
}

/**
 * Destructuring establishes named fields. Otherwise prefer an explicit type
 * over a default value, which cannot narrow the declared API by itself.
 *
 * @param node - The function parameter to classify.
 * @param sourceCode - The source code used to resolve referenced types.
 * @returns The options, positional, undefined, or unknown parameter
 * classification.
 */
export function classifyComposableParameter(
  node: TSESTree.Parameter,
  sourceCode: SourceCode,
): ParameterKind {
  const binding = node.type === 'AssignmentPattern' ? node.left : node
  if (binding.type === 'ObjectPattern') {
    return 'options'
  }
  if (binding.type !== 'Identifier') {
    return 'positional'
  }
  if (binding.typeAnnotation) {
    return classifyType(binding.typeAnnotation.typeAnnotation, sourceCode)
  }
  if (node.type === 'AssignmentPattern') {
    switch (node.right.type) {
      case 'ObjectExpression':
        return 'options'
      case 'Literal':
      case 'TemplateLiteral':
      case 'ArrayExpression':
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return 'positional'
    }
  }
  return 'unknown'
}
