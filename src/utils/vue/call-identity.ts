import { unwrapExpression } from '../ast/expressions.ts'
import { getScriptVariableDefinitions } from './script-scope.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { CallIdentity } from '../../types/ast.ts'
import type { SourceCode } from '../../types/eslint.ts'

type RuntimeImportBinding =
  | { kind: 'default' | 'named'; source: string; exportedName: string }
  | { kind: 'namespace'; source: string }

/**
 * Read a runtime import without deciding which call syntaxes a rule accepts.
 *
 * @param definition - The scope definition to inspect, or undefined when
 * unresolved.
 * @returns The import kind, source, and exported name when applicable, or
 * undefined for non-runtime imports.
 */
export function getRuntimeImportBinding(
  definition: TSESLint.Scope.Definition | undefined,
): RuntimeImportBinding | undefined {
  if (
    definition?.type !== 'ImportBinding' ||
    definition.parent.type !== 'ImportDeclaration' ||
    definition.parent.importKind === 'type'
  ) {
    return undefined
  }
  const source = definition.parent.source.value
  const specifier = definition.node
  switch (specifier.type) {
    case 'ImportDefaultSpecifier':
      return {
        kind: 'default',
        source,
        exportedName: 'default',
      }
    case 'ImportNamespaceSpecifier':
      return {
        kind: 'namespace',
        source,
      }
    case 'ImportSpecifier':
      return specifier.importKind === 'type'
        ? undefined
        : {
            kind: 'named',
            source,
            exportedName:
              specifier.imported.type === 'Identifier'
                ? specifier.imported.name
                : String(specifier.imported.value),
          }
  }
  return undefined
}

/**
 * Resolve direct and non-computed namespace calls through TypeScript wrappers
 * around the callee or namespace receiver. Optional calls remain outside this
 * contract; ref recognition has its own broader syntax policy.
 *
 * @param call - The call expression to resolve.
 * @param sourceCode - The source code used to resolve visible runtime bindings.
 * @returns The call identity and binding status, or undefined for unsupported
 * call syntax.
 */
export function getCallIdentity(
  call: TSESTree.CallExpression,
  sourceCode: SourceCode,
): CallIdentity | undefined {
  if (call.optional) {
    return undefined
  }
  const callee = unwrapExpression(call.callee)
  if (callee.type === 'Identifier') {
    const definitions = getScriptVariableDefinitions(callee, sourceCode)
    const binding = getRuntimeImportBinding(definitions[0])
    if (binding && binding.kind !== 'namespace') {
      return {
        name: binding.kind === 'default' ? callee.name : binding.exportedName,
        localName: callee.name,
        exportedName: binding.exportedName,
        source: binding.source,
        isUnbound: false,
      }
    }
    return {
      name: callee.name,
      localName: callee.name,
      isUnbound: definitions.length === 0,
    }
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    !callee.optional &&
    callee.property.type === 'Identifier'
  ) {
    const object = unwrapExpression(callee.object)
    if (object.type !== 'Identifier') {
      return undefined
    }
    const binding = getRuntimeImportBinding(
      getScriptVariableDefinitions(object, sourceCode)[0],
    )
    const localName = `${object.name}.${callee.property.name}`
    if (binding?.kind === 'namespace') {
      return {
        name: callee.property.name,
        localName,
        exportedName: callee.property.name,
        source: binding.source,
        isUnbound: false,
      }
    }
    return {
      name: localName,
      localName,
      isUnbound: false,
    }
  }
  return undefined
}
