import { isFunction } from '@ntnyq/utils'
import { createRule } from '../utils/create-rule.ts'
import { unwrapRefExpression } from '../utils/ref-pattern.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type {
  NoComplexVForSourceMessageId,
  NoComplexVForSourceOptions,
} from '../types/index.ts'

/**
 * Narrow the Vue parser service without requiring it for standalone scripts.
 */
function hasTemplateVisitor(services: unknown): services is {
  defineTemplateBodyVisitor: (templateVisitor: {
    VForExpression: (node: AST.VForExpression) => void
  }) => TSESLint.RuleListener
} {
  return (
    services !== null &&
    typeof services === 'object' &&
    'defineTemplateBodyVisitor' in services &&
    isFunction(services.defineTemplateBodyVisitor)
  )
}

export const noComplexVForSource = createRule<
  [NoComplexVForSourceOptions],
  NoComplexVForSourceMessageId
>({
  name: 'no-complex-v-for-source',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'disallow complex expressions in Vue v-for sources.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowCallExpression: {
            type: 'boolean',
            description:
              'Allow calls, including in member access and computed keys.',
          },
          allowLiteral: {
            type: 'boolean',
            description:
              'Allow primitive literals directly as the iteration source.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedComplexSource:
        'Unexpected complex v-for source. Move the expression into a script variable or computed property.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = context.sourceCode.parserServices
    if (!hasTemplateVisitor(services)) {
      return {}
    }

    function isSimpleExpression(
      node: AST.Node | TSESTree.Node,
      isSource = false,
    ): boolean {
      const expression = unwrapRefExpression(node)
      const canUseLiteral = !isSource || options.allowLiteral !== false
      switch (expression.type) {
        case 'Identifier':
        case 'ThisExpression':
          return true
        case 'ChainExpression':
          return isSimpleExpression(expression.expression, isSource)
        case 'MemberExpression':
          return (
            isSimpleExpression(expression.object) &&
            (!expression.computed || isSimpleExpression(expression.property))
          )
        case 'CallExpression':
          // Arguments and callback bodies are outside the source-shape check.
          return (
            options.allowCallExpression !== false &&
            isSimpleExpression(expression.callee)
          )
        case 'Literal':
          return canUseLiteral && !('regex' in expression)
        case 'TemplateLiteral':
          return canUseLiteral && expression.expressions.length === 0
        case 'UnaryExpression': {
          const argument = unwrapRefExpression(expression.argument)
          return (
            canUseLiteral &&
            ['+', '-'].includes(expression.operator) &&
            argument.type === 'Literal' &&
            (typeof argument.value === 'number' ||
              typeof argument.value === 'bigint')
          )
        }
        default:
          return false
      }
    }

    return services.defineTemplateBodyVisitor({
      VForExpression(node) {
        if (!isSimpleExpression(node.right, true)) {
          context.report({
            loc: node.right.loc,
            messageId: 'unexpectedComplexSource',
          })
        }
      },
    })
  },
})
