import { getStaticStringValue, unwrapExpression } from '../ast/expressions.ts'
import { findScopeReference } from '../ast/scope.ts'
import { filterScriptDefinitions } from './script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'

interface ContractMember {
  name: string
  node: TSESTree.Node
}

/**
 * Read a static declaration key without evaluating computed expressions.
 *
 * @param member - The runtime or type member containing a key.
 * @returns Its explicit string name and diagnostic node, when known.
 */
function getMember(
  member: TSESTree.Property | TSESTree.TSPropertySignature,
): ContractMember | undefined {
  const key = member.key
  const name =
    !member.computed && key.type === 'Identifier'
      ? key.name
      : getStaticStringValue(key)
  return name === undefined ? undefined : { name, node: key }
}

/**
 * Extract literal event names from an emits signature's first parameter.
 *
 * @param type - The parameter type, including unions of literal events.
 * @returns Explicit event names; broad and computed types are skipped.
 */
function getEventNames(type: TSESTree.TypeNode): ContractMember[] {
  if (type.type === 'TSUnionType') {
    return type.types.flatMap(getEventNames)
  }
  if (type.type === 'TSLiteralType') {
    const name = getStaticStringValue(type.literal)
    return name === undefined ? [] : [{ name, node: type.literal }]
  }
  return []
}

/**
 * Read explicit prop and event declarations without a TypeScript type checker.
 *
 * @param call - A recognized defineProps or defineEmits call.
 * @param sourceCode - The source used to resolve local type references.
 * @param kind - Whether properties or events are being collected.
 * @returns Known members; unsupported or external declarations are skipped.
 */
export function getModelContractMembers(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
  kind: 'props' | 'emits',
): ContractMember[] {
  const seen = new Set<TSESTree.Node>()

  /**
   * Resolve local aliases and interfaces while preventing recursive traversal.
   *
   * @param type - A type expression or interface parent identifier.
   * @returns Explicitly declared members reachable through supported syntax.
   */
  function readType(type: TSESTree.Node): ContractMember[] {
    if (seen.has(type)) {
      return []
    }
    seen.add(type)
    if (type.type === 'TSIntersectionType') {
      return type.types.flatMap(readType)
    }
    if (
      type.type === 'TSTypeReference' &&
      type.typeName.type === 'Identifier' &&
      !type.typeArguments?.params.length
    ) {
      return readType(type.typeName)
    }
    if (type.type === 'Identifier') {
      const definitions = filterScriptDefinitions(
        findScopeReference(type, sourceCode)?.resolved?.defs.filter(
          definition => definition.isTypeDefinition,
        ) ?? [],
        type,
        sourceCode,
      )
      return definitions.flatMap(definition => {
        const declaration = definition.node
        if (
          (declaration.type !== 'TSTypeAliasDeclaration' &&
            declaration.type !== 'TSInterfaceDeclaration') ||
          declaration.declare ||
          declaration.typeParameters?.params.length
        ) {
          return []
        }
        return readType(declaration)
      })
    }
    if (type.type === 'TSTypeAliasDeclaration') {
      return readType(type.typeAnnotation)
    }
    if (type.type === 'TSInterfaceDeclaration') {
      return [
        ...readType(type.body),
        ...type.extends.flatMap(parent =>
          parent.typeArguments?.params.length
            ? []
            : readType(parent.expression),
        ),
      ]
    }
    if (type.type === 'TSTypeLiteral' || type.type === 'TSInterfaceBody') {
      const members = type.type === 'TSTypeLiteral' ? type.members : type.body
      return members.flatMap(member => {
        if (member.type === 'TSPropertySignature') {
          const property = getMember(member)
          return property ? [property] : []
        }
        return kind === 'emits' ? readType(member) : []
      })
    }
    if (
      kind === 'emits' &&
      (type.type === 'TSCallSignatureDeclaration' ||
        type.type === 'TSFunctionType')
    ) {
      const parameter = type.params[0]
      return parameter?.type === 'Identifier' && parameter.typeAnnotation
        ? getEventNames(parameter.typeAnnotation.typeAnnotation)
        : []
    }
    return []
  }

  const types = call.typeArguments?.params ?? []
  if (types.length === 1 && types[0] && call.arguments.length === 0) {
    return readType(types[0])
  }
  const argument = call.arguments[0]
  if (types.length || call.arguments.length !== 1 || !argument) {
    return []
  }
  const value = unwrapExpression(argument)
  if (value.type === 'ArrayExpression') {
    return value.elements.flatMap(element => {
      const name = element && getStaticStringValue(element)
      return typeof name === 'string' && element
        ? [{ name, node: element }]
        : []
    })
  }
  if (value.type === 'ObjectExpression') {
    return value.properties.flatMap(property => {
      const member = property.type === 'Property' && getMember(property)
      return member ? [member] : []
    })
  }
  return []
}
