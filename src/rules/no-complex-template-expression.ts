import { createRule } from '../utils/create-rule.ts'
import { hasTemplateVisitor } from '../utils/vue/parser-services.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type {
  NoComplexTemplateExpressionMessageId,
  NoComplexTemplateExpressionOptions,
} from '../types/index.ts'

/**
 * Exclude erased TypeScript branches, including value-shaped nodes in types.
 *
 * @param node - A counted expression or template reference.
 * @returns Whether the node participates in runtime evaluation.
 */
function isRuntimeNode(node: AST.Node | TSESTree.Node): boolean {
  let child = node
  let parent = child.parent
  while (parent && parent.type !== 'VExpressionContainer') {
    switch (parent.type) {
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSTypeAssertion':
        if (parent.expression !== child) {
          return false
        }
        break
      case 'TSTypeAnnotation':
      case 'TSTypeParameterDeclaration':
      case 'TSTypeParameterInstantiation':
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration':
        return false
    }
    child = parent
    parent = child.parent
  }
  return true
}

/**
 * Resolve template locals using Vue's runtime visibility at this expression.
 * The parser also binds own-element slot props and v-for aliases in v-if.
 *
 * @param node - The checked directive value or interpolation.
 * @returns Whether a runtime reference depends on a visible loop or slot local.
 */
function hasScopeReference(node: AST.VExpressionContainer): boolean {
  const attribute = node.parent.type === 'VAttribute' ? node.parent : undefined
  const owner = attribute ? attribute.parent.parent : node.parent
  if (owner.type !== 'VElement') {
    return false
  }
  const beforeLoop =
    attribute?.directive && ['if', 'else-if'].includes(attribute.key.name.name)
  return node.references.some(reference => {
    if (reference.isValueReference === false || !isRuntimeNode(reference.id)) {
      return false
    }
    let element: AST.VElement | AST.VDocumentFragment = owner
    while (element.type === 'VElement') {
      const variable = element.variables.find(candidate => {
        if (candidate.id.name !== reference.id.name) {
          return false
        }
        if (element !== owner || !attribute) {
          return true
        }
        return (
          candidate.kind !== 'scope' &&
          (!beforeLoop || candidate.kind !== 'v-for')
        )
      })
      if (variable) {
        return variable.kind === 'v-for' || variable.kind === 'scope'
      }
      element = element.parent
    }
    return false
  })
}

export const noComplexTemplateExpression = createRule<
  [NoComplexTemplateExpressionOptions],
  NoComplexTemplateExpressionMessageId
>({
  name: 'no-complex-template-expression',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce limits on logical operators and conditional nesting in Vue templates.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxLogicalExpressions: {
            description:
              'Maximum number of logical operators in one expression.',
            type: 'integer',
            minimum: 0,
          },
          maxConditionalDepth: {
            description: 'Maximum nesting depth of conditional expressions.',
            type: 'integer',
            minimum: 0,
          },
          directives: {
            description:
              'Directive values to check, replacing the default list.',
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
              enum: [
                'if',
                'else-if',
                'show',
                'bind',
                'text',
                'html',
                'model',
                'memo',
              ],
            },
          },
          checkInterpolations: {
            description: 'Check mustache interpolation expressions.',
            type: 'boolean',
          },
          ignoreScopeReferences: {
            description:
              'Skip expressions referencing v-for or slot variables.',
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      tooManyLogicalExpressions:
        'This template expression has {{count}} logical operators (maximum {{max}}). Extract it into a computed property or a function accepting template locals.',
      tooDeepConditional:
        'This template expression has conditional nesting depth {{depth}} (maximum {{max}}). Extract it into a computed property or a function accepting template locals.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = context.sourceCode.parserServices
    if (!hasTemplateVisitor(services)) {
      return {}
    }
    const directives = new Set<string>(
      options.directives ?? ['if', 'else-if', 'show', 'bind'],
    )
    const maxLogical = options.maxLogicalExpressions ?? 2
    const maxDepth = options.maxConditionalDepth ?? 1

    let active:
      | {
          logicalCount: number
          conditionalDepth: number
          deepestConditional: number
        }
      | undefined
    return services.defineTemplateBodyVisitor({
      VExpressionContainer(node) {
        const expression = node.expression
        if (!expression) {
          return
        }
        if (node.parent.type === 'VAttribute') {
          if (
            !node.parent.directive ||
            !directives.has(node.parent.key.name.name)
          ) {
            return
          }
        } else if (
          node.parent.type !== 'VElement' ||
          options.checkInterpolations === false
        ) {
          // Dynamic directive arguments and binding patterns are not values.
          return
        }
        if (options.ignoreScopeReferences && hasScopeReference(node)) {
          return
        }
        active = { logicalCount: 0, conditionalDepth: 0, deepestConditional: 0 }
      },
      LogicalExpression(node) {
        if (active && isRuntimeNode(node)) {
          active.logicalCount++
        }
      },
      ConditionalExpression(node) {
        if (active && isRuntimeNode(node)) {
          active.conditionalDepth++
          active.deepestConditional = Math.max(
            active.deepestConditional,
            active.conditionalDepth,
          )
        }
      },
      'ConditionalExpression:exit': function (node) {
        if (active && isRuntimeNode(node)) {
          active.conditionalDepth--
        }
      },
      'VExpressionContainer:exit': function (node) {
        if (!active || !node.expression) {
          return
        }
        const expression = node.expression
        const { logicalCount, deepestConditional } = active
        active = undefined
        if (logicalCount > maxLogical) {
          context.report({
            loc: expression.loc,
            messageId: 'tooManyLogicalExpressions',
            data: { count: logicalCount, max: maxLogical },
          })
        }
        if (deepestConditional > maxDepth) {
          context.report({
            loc: expression.loc,
            messageId: 'tooDeepConditional',
            data: { depth: deepestConditional, max: maxDepth },
          })
        }
      },
    })
  },
})
