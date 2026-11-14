import { getStaticStringValue, unwrapExpression } from './ast/expressions.ts'
import { hasGlobalWrite } from './vue/global-writes.ts'
import { hasVueServices } from './vue/parser-services.ts'
import { getScriptVariableDefinitions } from './vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type { SourceCode } from '../types/eslint.ts'
import type { CallIdentity } from './vue/call-identity.ts'

interface TextEdit {
  range: TSESTree.Range
  text: string
}

type WatchEffectAliasFixPlan =
  | { safe: true; edits: TextEdit[] }
  | {
      safe: false
      reason:
        | 'options-contract'
        | 'options-properties'
        | 'callee-contract'
        | 'global-identity'
        | 'alias-export'
        | 'alias-binding'
    }

interface FixEnvironment {
  sourceCode: SourceCode
  sources: ReadonlySet<string>
  explicitGlobals: string[] | undefined
  hasUnboundEval: boolean
}

/**
 * Represent a source replacement without coupling analysis to an ESLint fixer.
 */
function replace(node: TSESTree.Node | TSESTree.Token, text: string): TextEdit {
  return {
    range: node.range,
    text,
  }
}

// These entry points are known to export both effect aliases. Custom sources
// may re-export only watchEffect; their target exports need import evidence.
const VUE_RUNTIME_SOURCES = new Set([
  'vue',
  '@vue/runtime-core',
  '@vue/runtime-dom',
])

/**
 * Unwrap non-null assertions without discarding explicit type contracts.
 *
 * @param node - The callee or namespace receiver.
 * @returns The expression inside non-null assertions only.
 */
function unwrapNonNullExpression(node: TSESTree.Node): TSESTree.Node {
  return node.type === 'TSNonNullExpression'
    ? unwrapNonNullExpression(node.expression)
    : node
}

/**
 * Detect template references omitted from the script scope manager.
 *
 * @param node - The template node to inspect.
 * @param name - The proposed import binding.
 * @returns Whether introducing the binding could capture a template reference.
 */
function hasTemplateReference(node: AST.Node, name: string): boolean {
  if (node.type === 'VExpressionContainer') {
    return node.references.some(reference => reference.id.name === name)
  }

  if (node.type === 'VElement') {
    return (
      node.startTag.attributes.some(
        attribute =>
          attribute.directive &&
          ((attribute.value && hasTemplateReference(attribute.value, name)) ||
            (attribute.key.argument?.type === 'VExpressionContainer' &&
              hasTemplateReference(attribute.key.argument, name))),
      ) || node.children.some(child => hasTemplateReference(child, name))
    )
  }

  return false
}

/**
 * Only a unique, comment-free flush property and ordinary debug options may
 * be removed without discarding evaluations or changing alias semantics.
 */
function getSafeFlushProperty(
  object: TSESTree.ObjectExpression,
  sourceCode: SourceCode,
): TSESTree.Property | undefined {
  const properties = object.properties
  const flushProperties = properties.filter(
    property =>
      property.type === 'Property' &&
      (!property.computed && property.key.type === 'Identifier'
        ? property.key.name
        : getStaticStringValue(property.key)) === 'flush',
  )
  const property = flushProperties[0]

  if (
    flushProperties.length !== 1 ||
    property?.type !== 'Property' ||
    sourceCode.getCommentsInside(property).length ||
    properties.some(item => {
      if (item.type !== 'Property' || item.kind !== 'init' || item.method) {
        return true
      }

      const key =
        !item.computed && item.key.type === 'Identifier'
          ? item.key.name
          : getStaticStringValue(item.key)

      return !['flush', 'onTrack', 'onTrigger'].includes(key ?? '')
    })
  ) {
    return undefined
  }

  return property
}

/**
 * Plan the callee replacement and any import insertion, preserving existing
 * bindings, custom export evidence, and script/template capture checks.
 */
function planAliasBinding(
  node: TSESTree.CallExpression,
  identity: CallIdentity,
  alias: string,
  environment: FixEnvironment,
): WatchEffectAliasFixPlan {
  const { sourceCode, sources, explicitGlobals, hasUnboundEval } = environment
  const callee = unwrapExpression(node.callee)
  const aliasImports = sourceCode.ast.body
    .flatMap(statement =>
      statement.type === 'ImportDeclaration' &&
      statement.importKind !== 'type' &&
      (identity.source === undefined
        ? sources.has(statement.source.value)
        : statement.source.value === identity.source)
        ? statement.specifiers
        : [],
    )
    .filter(
      specifier =>
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind !== 'type' &&
        (specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : specifier.imported.value) === alias,
    )
  const hasAliasExport =
    VUE_RUNTIME_SOURCES.has(identity.source ?? '') || aliasImports.length > 0
  const edits: TextEdit[] = []

  if (callee.type === 'MemberExpression') {
    if (!hasAliasExport) {
      return {
        safe: false,
        reason: 'alias-export',
      }
    }

    edits.push(replace(callee.property, alias))
  } else if (callee.type === 'Identifier') {
    const imported = aliasImports.find(specifier =>
      getScriptVariableDefinitions(
        callee,
        sourceCode,
        specifier.local.name,
      ).some(definition => definition.node === specifier),
    )

    if (imported) {
      edits.push(replace(callee, imported.local.name))
    } else if (
      identity.isUnbound &&
      explicitGlobals?.includes(alias) &&
      !hasGlobalWrite(sourceCode, alias) &&
      !getScriptVariableDefinitions(callee, sourceCode, alias).length
    ) {
      edits.push(replace(callee, alias))
    } else {
      const definition = getScriptVariableDefinitions(callee, sourceCode)[0]
      const declaration = definition?.parent
      const services = sourceCode.parserServices
      const fragment = hasVueServices(services)
        ? services.getDocumentFragment()
        : undefined
      const templateCollision = fragment?.children.some(child =>
        hasTemplateReference(child, alias),
      )
      const componentText =
        fragment?.children
          .filter(child => child.type === 'VElement' && child.name !== 'script')
          .map(child => sourceCode.text.slice(...child.range))
          .join('') ?? ''
      const hasCollision =
        templateCollision ||
        componentText.includes(alias) ||
        componentText.includes(`W${alias.slice(1)}`) ||
        componentText.includes(
          alias.replaceAll(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`),
        ) ||
        hasUnboundEval ||
        !sourceCode.scopeManager ||
        sourceCode.scopeManager.scopes.some(
          scope =>
            scope.variables.some(variable => variable.name === alias) ||
            scope.through.some(
              reference => reference.identifier.name === alias,
            ),
        )

      if (
        hasCollision ||
        !hasAliasExport ||
        definition?.node.type !== 'ImportSpecifier' ||
        declaration?.type !== 'ImportDeclaration'
      ) {
        return {
          safe: false,
          reason: 'alias-binding',
        }
      }

      const last = declaration.specifiers.at(-1)

      if (!last) {
        return {
          safe: false,
          reason: 'alias-binding',
        }
      }

      // Keep the original import: other calls and template uses may
      // still need it. Import cleanup belongs to dedicated rules.
      edits.push(
        { range: [last.range[1], last.range[1]], text: `, ${alias}` },
        replace(callee, alias),
      )
    }
  } else {
    return {
      safe: false,
      reason: 'alias-binding',
    }
  }

  return {
    safe: true,
    edits,
  }
}

/**
 * Remove the options argument when unadorned, otherwise preserve its wrappers,
 * comments, remaining properties, and comma ownership.
 */
function planFlushRemoval(
  object: TSESTree.ObjectExpression,
  property: TSESTree.Property,
  sourceCode: SourceCode,
): TextEdit[] {
  const edits: TextEdit[] = []
  const properties = object.properties

  const before = sourceCode.getTokenBefore(object)

  if (
    before?.value === ',' &&
    properties.length === 1 &&
    !sourceCode.getCommentsInside(object).length &&
    !sourceCode
      .getCommentsBefore(object)
      .some(comment => comment.range[0] >= before.range[0])
  ) {
    edits.push({ range: [before.range[0], object.range[1]], text: '' })
  } else {
    edits.push(replace(property, ''))

    const afterProperty = sourceCode.getTokenAfter(property)
    const beforeProperty = sourceCode.getTokenBefore(property)
    const comma =
      afterProperty?.value === ','
        ? afterProperty
        : beforeProperty?.value === ','
          ? beforeProperty
          : undefined

    if (comma) {
      edits.push(replace(comma, ''))
    }
  }

  return edits
}

/**
 * Keep fix eligibility and text planning separate from diagnostics and mutation.
 * All environment checks are scoped to this immutable source-code instance.
 */
export function createWatchEffectAliasFixPlanner(
  sourceCode: SourceCode,
  sources: ReadonlySet<string>,
  explicitGlobals: string[] | undefined,
) {
  // Evaluated code can read or write names without any static references.
  const hasUnboundEval =
    sourceCode.scopeManager?.scopes.some(scope =>
      scope.references.some(
        reference =>
          reference.identifier.name === 'eval' &&
          !reference.resolved?.defs.length,
      ),
    ) ?? true
  const environment: FixEnvironment = {
    sourceCode,
    sources,
    explicitGlobals,
    hasUnboundEval,
  }

  return function createWatchEffectAliasFixPlan(
    node: TSESTree.CallExpression,
    object: TSESTree.ObjectExpression,
    identity: CallIdentity,
    alias: string,
  ): WatchEffectAliasFixPlan {
    if (node.arguments[1] !== object) {
      return {
        safe: false,
        reason: 'options-contract',
      }
    }

    const property = getSafeFlushProperty(object, sourceCode)

    if (!property) {
      return {
        safe: false,
        reason: 'options-properties',
      }
    }

    const callee = unwrapExpression(node.callee)

    if (
      callee !== unwrapNonNullExpression(node.callee) ||
      node.typeArguments ||
      (callee.type === 'MemberExpression' &&
        unwrapExpression(callee.object) !==
          unwrapNonNullExpression(callee.object))
    ) {
      return {
        safe: false,
        reason: 'callee-contract',
      }
    }

    if (
      identity.isUnbound &&
      (hasUnboundEval || hasGlobalWrite(sourceCode, 'watchEffect'))
    ) {
      return {
        safe: false,
        reason: 'global-identity',
      }
    }

    const binding = planAliasBinding(node, identity, alias, environment)

    return binding.safe
      ? {
          safe: true,
          edits: [
            ...binding.edits,
            ...planFlushRemoval(object, property, sourceCode),
          ],
        }
      : binding
  }
}
