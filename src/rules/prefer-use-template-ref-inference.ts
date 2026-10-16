import { getStaticStringValue } from '../utils/ast/expressions.ts'
import { createRule } from '../utils/create-rule.ts'
import { getCallIdentity } from '../utils/vue/call-identity.ts'
import { resolveVueGlobals } from '../utils/vue/globals.ts'
import {
  hasTemplateVisitor,
  hasVueServices,
} from '../utils/vue/parser-services.ts'
import { getSetupRange, isInScriptRange } from '../utils/vue/script-scope.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type {
  PreferUseTemplateRefInferenceMessageId,
  PreferUseTemplateRefInferenceOptions,
} from '../types/index.ts'

/**
 * Limit inference checks to direct top-level initializers and expression calls.
 *
 * @param node - The call whose enclosing statement is inspected.
 * @returns Whether the call is directly evaluated at script top level.
 */
function isTopLevelCall(node: TSESTree.CallExpression): boolean {
  let expression: TSESTree.Node = node
  let parent: TSESTree.Node | undefined = expression.parent
  while (
    parent &&
    ['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(
      parent.type,
    )
  ) {
    expression = parent
    parent = parent.parent
  }
  return (
    (parent?.type === 'ExpressionStatement' &&
      parent.parent?.type === 'Program') ||
    (parent?.type === 'VariableDeclarator' &&
      parent.init === expression &&
      parent.parent?.type === 'VariableDeclaration' &&
      parent.parent.parent?.type === 'Program')
  )
}

/**
 * Find the initial v-if element sharing a language-tooling conditional node.
 *
 * @param node - The conditional branch to inspect.
 * @returns The initial v-if element, or the original non-branch element.
 */
function getConditionalRoot(node: AST.VElement): AST.VElement {
  let current = node
  while (
    current.startTag.attributes.some(
      attribute =>
        attribute.directive &&
        ['else', 'else-if'].includes(attribute.key.name.name),
    )
  ) {
    const previous = current.parent.children.findLast(
      sibling =>
        sibling.range[1] <= current.range[0] &&
        (sibling.type !== 'VText' || /[^\t\r\n\f ]/u.test(sibling.value)),
    )
    if (
      previous?.type !== 'VElement' ||
      !previous.startTag.attributes.some(
        attribute =>
          attribute.directive &&
          ['if', 'else-if'].includes(attribute.key.name.name),
      )
    ) {
      return node
    }
    current = previous
  }
  return current
}

/**
 * Match Vue language tooling's skip comment to the next sibling node.
 *
 * @param node - The element whose preceding siblings are inspected.
 * @param comments - Template comments containing a Vue skip directive.
 * @returns Whether the element is the target of a skip directive.
 */
function hasVueSkipComment(node: AST.VElement, comments: AST.Token[]): boolean {
  if (node.parent.type !== 'VElement' || !comments.length) {
    return false
  }
  let ancestor: AST.VElement | AST.VDocumentFragment = node.parent
  let preservesWhitespace = false
  while (ancestor.type === 'VElement') {
    if (ancestor.rawName === 'pre') {
      preservesWhitespace = true
      break
    }
    ancestor = ancestor.parent
  }
  const previous = node.parent.children.findLast(
    sibling =>
      sibling.range[1] <= node.range[0] &&
      (sibling.type !== 'VText' ||
        preservesWhitespace ||
        /[^\t\r\n\f ]/u.test(sibling.value)),
  )
  const start = previous?.range[1] ?? node.parent.startTag.range[1]
  if (
    comments.some(
      comment => comment.range[0] >= start && comment.range[1] <= node.range[0],
    )
  ) {
    return true
  }
  // A directive before v-if skips the whole compiler-generated branch chain.
  const conditionalRoot = getConditionalRoot(node)
  return (
    conditionalRoot !== node && hasVueSkipComment(conditionalRoot, comments)
  )
}

export const preferUseTemplateRefInference = createRule<
  [PreferUseTemplateRefInferenceOptions],
  PreferUseTemplateRefInferenceMessageId
>({
  name: 'prefer-use-template-ref-inference',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'enforce inferred types for static Vue template refs.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreRefs: {
            type: 'array',
            description: 'Exact template ref keys allowed explicit types.',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedTypeArguments:
        'Prefer template ref type inference over explicit type arguments.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const services = sourceCode.parserServices
    const vueGlobals = resolveVueGlobals(context.settings, ['useTemplateRef'])
    const setupRange = getSetupRange(sourceCode)
    if (
      !setupRange ||
      !hasVueServices(services) ||
      !hasTemplateVisitor(services)
    ) {
      return {}
    }
    const fragment = services.getDocumentFragment()
    const setup = fragment?.children.find(
      node =>
        node.type === 'VElement' && node.startTag.range[1] === setupRange[0],
    )
    if (
      setup?.type !== 'VElement' ||
      !setup.startTag.attributes.some(
        attribute =>
          !attribute.directive &&
          attribute.key.name === 'lang' &&
          attribute.value?.value === 'ts',
      )
    ) {
      return {}
    }
    const skipComments =
      fragment?.comments.filter(
        comment =>
          comment.type === 'HTMLComment' &&
          /^\s*@vue-skip(?:$|[^\w-])/u.test(comment.value),
      ) ?? []
    const ignored = new Set(options.ignoreRefs)
    const refs = new Map<string, boolean>()
    const calls: {
      key: string
      node: TSESTree.TSTypeParameterInstantiation
    }[] = []

    return services.defineTemplateBodyVisitor(
      {
        VElement(node) {
          // v-pre content is literal markup, including ref attributes.
          let ancestor: AST.VElement | AST.VDocumentFragment = node
          let isSkipped = false
          while (ancestor.type === 'VElement') {
            if (
              ancestor.startTag.attributes.some(
                attribute =>
                  attribute.directive && attribute.key.name.name === 'pre',
              )
            ) {
              return
            }
            isSkipped ||= hasVueSkipComment(ancestor, skipComments)
            ancestor = ancestor.parent
          }
          const attributes = node.startTag.attributes
          const isStaticElement =
            !isSkipped &&
            !['component', 'template', 'slot'].includes(node.name) &&
            !attributes.some(attribute =>
              attribute.directive
                ? attribute.key.name.name === 'bind' &&
                  (attribute.key.argument?.type !== 'VIdentifier' ||
                    ['ref', 'is'].includes(attribute.key.argument.name))
                : attribute.key.name === 'is',
            )
          for (const attribute of attributes) {
            // Bound literal refs cannot establish a match, but can make an
            // otherwise static key ambiguous elsewhere in the template.
            const key = attribute.directive
              ? attribute.key.name.name === 'bind' &&
                attribute.key.argument?.type === 'VIdentifier' &&
                attribute.key.argument.name === 'ref' &&
                attribute.value?.expression
                ? getStaticStringValue(attribute.value.expression)
                : undefined
              : attribute.key.name === 'ref'
                ? attribute.value?.value
                : undefined
            if (key !== undefined) {
              // Language tooling retains raw attribute text in inferred keys.
              // Keep decoded keys in the map to detect runtime duplicates.
              const hasMatchingRawKey =
                !attribute.directive &&
                attribute.value !== null &&
                sourceCode.text
                  .slice(attribute.value.range[0], attribute.value.range[1])
                  .replace(/^(['"])([\s\S]*)\1$/u, '$2') === key
              refs.set(
                key,
                !refs.has(key) && hasMatchingRawKey && isStaticElement,
              )
            }
          }
        },
        'VElement:exit': function (node) {
          if (node.parent.type !== 'VDocumentFragment') {
            return
          }
          for (const { key, node: typeArguments } of calls) {
            if (refs.get(key)) {
              context.report({
                node: typeArguments,
                messageId: 'unexpectedTypeArguments',
              })
            }
          }
        },
      },
      {
        CallExpression(node) {
          if (
            !isInScriptRange(node, setupRange) ||
            !isTopLevelCall(node) ||
            node.callee.type !== 'Identifier' ||
            node.callee.name !== 'useTemplateRef' ||
            node.typeArguments?.params.length !== 1 ||
            node.arguments.length !== 1 ||
            sourceCode.getTokenBefore(node.typeArguments)?.range[0] !==
              node.callee.range[0]
          ) {
            return
          }
          const identity = getCallIdentity(node, sourceCode)
          const isSupportedApi =
            (identity?.source === 'vue' &&
              identity.exportedName === 'useTemplateRef') ||
            (identity?.isUnbound && vueGlobals.includes('useTemplateRef'))
          if (!isSupportedApi) {
            return
          }
          const argument = node.arguments[0]
          const key =
            argument &&
            (argument.type === 'Literal' || argument.type === 'TemplateLiteral')
              ? getStaticStringValue(argument)
              : undefined
          if (key !== undefined && !ignored.has(key)) {
            calls.push({ key, node: node.typeArguments })
          }
        },
      },
    )
  },
})
