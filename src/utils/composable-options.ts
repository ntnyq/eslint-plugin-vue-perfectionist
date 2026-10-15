import { getSetupRange } from './ast.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../types/index.ts'

type ParameterKind = 'options' | 'positional' | 'undefined' | 'unknown'

/**
 * Vue's parser can merge top-level bindings from both scripts. Setup bindings
 * shadow ordinary-script bindings only for references inside script setup.
 */
export function filterScriptDefinitions<
  Definition extends { node: TSESTree.Node },
>(
  definitions: Definition[],
  reference: TSESTree.Node,
  sourceCode: SourceCode,
): Definition[] {
  const setupRange = getSetupRange(sourceCode)
  if (!setupRange) {
    return definitions
  }
  const isSetup = (node: TSESTree.Node) =>
    node.range[0] >= setupRange[0] && node.range[1] <= setupRange[1]
  const setupDefinitions = definitions.filter(definition =>
    isSetup(definition.node),
  )
  if (isSetup(reference) && setupDefinitions.length) {
    return setupDefinitions
  }
  return definitions.filter(definition => !isSetup(definition.node))
}

/**
 * Resolve only the type namespace, preserving lexical shadowing and SFC scopes.
 */
function getTypeDefinitions(
  identifier: TSESTree.Identifier,
  sourceCode: SourceCode,
) {
  let scope = sourceCode.getScope(identifier)
  let reference = scope.references.find(item => item.identifier === identifier)
  while (!reference && scope.upper) {
    scope = scope.upper
    reference = scope.references.find(item => item.identifier === identifier)
  }
  return filterScriptDefinitions(
    reference?.resolved?.defs.filter(
      definition => definition.isTypeDefinition,
    ) ?? [],
    identifier,
    sourceCode,
  )
}

function classifyMembers(members: TSESTree.TypeElement[]): ParameterKind {
  if (
    members.some(
      member =>
        member.type === 'TSCallSignatureDeclaration' ||
        member.type === 'TSConstructSignatureDeclaration',
    )
  ) {
    return 'positional'
  }
  return members.some(
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
        node.types.map(type => classifyType(type, sourceCode, path)),
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
      const kinds = node.types.map(type => classifyType(type, sourceCode, path))
      if (kinds.every(kind => kind === 'options')) {
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
