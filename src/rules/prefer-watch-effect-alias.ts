import {
  getStaticStringValue,
  unwrapExpression,
} from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { resolveVueGlobals } from '../utils/vue/globals.ts'
import { hasVueServices } from '../utils/vue/parser-services.ts'
import { getScriptVariableDefinitions } from '../utils/vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type {
  PreferWatchEffectAliasMessageId,
  PreferWatchEffectAliasOptions,
} from '../types/index.ts'

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
 * Read the final flush property without evaluating options or unknown keys.
 *
 * @param node - The inline options object.
 * @returns The static flush value, or undefined when it cannot be established.
 */
function getFlush(node: TSESTree.ObjectExpression): string | undefined {
  let flush: string | undefined
  for (const property of node.properties) {
    if (property.type === 'SpreadElement') {
      return undefined
    }
    const key =
      !property.computed && property.key.type === 'Identifier'
        ? property.key.name
        : getStaticStringValue(property.key)
    if (key === undefined) {
      return undefined
    }
    if (key === 'flush') {
      flush =
        property.kind === 'init' && !property.method
          ? getStaticStringValue(property.value)
          : undefined
    }
  }
  return flush
}

export const preferWatchEffectAlias = createRule<
  [PreferWatchEffectAliasOptions],
  PreferWatchEffectAliasMessageId
>({
  name: 'prefer-watch-effect-alias',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require dedicated aliases for post and sync watch effects.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          vueGlobals: {
            description:
              'Unbound API names, overriding shared auto-import recognition.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          vueImportSources: {
            description:
              'Exact module specifiers replacing the default vue source.',
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      preferredAlias:
        'Prefer "{{alias}}" over "watchEffect" with flush: "{{flush}}".',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const sources = new Set(options.vueImportSources ?? ['vue'])
    const globals = new Set(
      resolveVueGlobals(context.settings, ['watchEffect'], options.vueGlobals),
    )
    // Evaluated code can read or write names without any static references.
    const hasUnboundEval =
      sourceCode.scopeManager?.scopes.some(scope =>
        scope.references.some(
          reference =>
            reference.identifier.name === 'eval' &&
            !reference.resolved?.defs.length,
        ),
      ) ?? true

    /**
     * Detect writes that contradict the configured identity of a global API.
     *
     * @param name - The global API name.
     * @returns Whether any unresolved or configured-global reference writes it.
     */
    function hasGlobalWrite(name: string): boolean {
      return (
        sourceCode.scopeManager?.scopes.some(scope =>
          scope.references.some(
            reference =>
              reference.identifier.name === name &&
              reference.isWrite() &&
              !reference.resolved?.defs.length,
          ),
        ) ?? true
      )
    }

    return {
      CallExpression(node) {
        if (
          node.arguments.length !== 2 ||
          node.arguments[0]?.type === 'SpreadElement'
        ) {
          return
        }
        const identity = getCallIdentity(node, sourceCode)
        if (
          !identity ||
          (identity.exportedName ?? identity.name) !== 'watchEffect'
        ) {
          return
        }
        const isVueApi =
          (identity.source !== undefined && sources.has(identity.source)) ||
          (identity.isUnbound && globals.has('watchEffect'))
        if (!isVueApi) {
          return
        }
        const argument = node.arguments[1]
        const object = argument && unwrapExpression(argument)
        if (object?.type !== 'ObjectExpression') {
          return
        }
        const flush = getFlush(object)
        if (flush !== 'post' && flush !== 'sync') {
          return
        }
        const alias = flush === 'post' ? 'watchPostEffect' : 'watchSyncEffect'
        context.report({
          node: node.callee,
          messageId: 'preferredAlias',
          data: {
            alias,
            flush,
          },
          fix(fixer) {
            // Type wrappers can encode constraints that removing flush breaks.
            if (argument !== object) {
              return null
            }
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
              !property ||
              sourceCode.getCommentsInside(property).length ||
              properties.some(item => {
                if (
                  item.type !== 'Property' ||
                  item.kind !== 'init' ||
                  item.method
                ) {
                  return true
                }
                const key =
                  !item.computed && item.key.type === 'Identifier'
                    ? item.key.name
                    : getStaticStringValue(item.key)
                return !['flush', 'onTrack', 'onTrigger'].includes(key ?? '')
              })
            ) {
              return null
            }

            const callee = unwrapExpression(node.callee)
            if (
              callee !== unwrapNonNullExpression(node.callee) ||
              node.typeArguments ||
              (callee.type === 'MemberExpression' &&
                unwrapExpression(callee.object) !==
                  unwrapNonNullExpression(callee.object)) ||
              (identity.isUnbound &&
                (hasUnboundEval || hasGlobalWrite('watchEffect')))
            ) {
              return null
            }
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
              VUE_RUNTIME_SOURCES.has(identity.source ?? '') ||
              aliasImports.length > 0
            const fixes = []
            if (callee.type === 'MemberExpression') {
              if (!hasAliasExport) {
                return null
              }
              fixes.push(fixer.replaceText(callee.property, alias))
            } else if (callee.type === 'Identifier') {
              const imported = aliasImports.find(specifier =>
                getScriptVariableDefinitions(
                  callee,
                  sourceCode,
                  specifier.local.name,
                ).some(definition => definition.node === specifier),
              )
              if (imported) {
                fixes.push(fixer.replaceText(callee, imported.local.name))
              } else if (
                identity.isUnbound &&
                options.vueGlobals?.includes(alias) &&
                !hasGlobalWrite(alias) &&
                !getScriptVariableDefinitions(callee, sourceCode, alias).length
              ) {
                fixes.push(fixer.replaceText(callee, alias))
              } else {
                const definition = getScriptVariableDefinitions(
                  callee,
                  sourceCode,
                )[0]
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
                    .filter(
                      child =>
                        child.type === 'VElement' && child.name !== 'script',
                    )
                    .map(child => sourceCode.text.slice(...child.range))
                    .join('') ?? ''
                const hasCollision =
                  templateCollision ||
                  componentText.includes(alias) ||
                  componentText.includes(`W${alias.slice(1)}`) ||
                  componentText.includes(
                    alias.replaceAll(
                      /[A-Z]/gu,
                      letter => `-${letter.toLowerCase()}`,
                    ),
                  ) ||
                  hasUnboundEval ||
                  !sourceCode.scopeManager ||
                  sourceCode.scopeManager.scopes.some(
                    scope =>
                      scope.variables.some(
                        variable => variable.name === alias,
                      ) ||
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
                  return null
                }
                const last = declaration.specifiers.at(-1)
                if (!last) {
                  return null
                }
                // Keep the original import: other calls and template uses may
                // still need it. Import cleanup belongs to dedicated rules.
                fixes.push(
                  fixer.insertTextAfter(last, `, ${alias}`),
                  fixer.replaceText(callee, alias),
                )
              }
            } else {
              return null
            }

            const before = sourceCode.getTokenBefore(object)
            if (
              before?.value === ',' &&
              properties.length === 1 &&
              !sourceCode.getCommentsInside(object).length &&
              !sourceCode
                .getCommentsBefore(object)
                .some(comment => comment.range[0] >= before.range[0])
            ) {
              fixes.push(fixer.removeRange([before.range[0], object.range[1]]))
            } else {
              fixes.push(fixer.remove(property))
              const afterProperty = sourceCode.getTokenAfter(property)
              const beforeProperty = sourceCode.getTokenBefore(property)
              const comma =
                afterProperty?.value === ','
                  ? afterProperty
                  : beforeProperty?.value === ','
                    ? beforeProperty
                    : undefined
              if (comma) {
                fixes.push(fixer.remove(comma))
              }
            }
            return fixes
          },
        })
      },
    }
  },
})
