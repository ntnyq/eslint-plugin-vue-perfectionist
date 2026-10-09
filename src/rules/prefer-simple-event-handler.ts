import { isFunction } from '@ntnyq/utils'
import { createRule } from '../utils/create-rule.ts'
import type { TSESLint } from '@typescript-eslint/utils'
import type { AST } from 'vue-eslint-parser'
import type {
  PreferSimpleEventHandlerMessageId,
  PreferSimpleEventHandlerOptions,
} from '../types/index.ts'

/**
 * Narrow the Vue parser service without requiring it for standalone scripts.
 */
function hasTemplateVisitor(services: unknown): services is {
  defineTemplateBodyVisitor: (templateVisitor: {
    VAttribute: (node: AST.VAttribute | AST.VDirective) => void
    'VAttribute:exit': () => void
    '*': (node: AST.Node) => void
  }) => TSESLint.RuleListener
} {
  return (
    services !== null &&
    typeof services === 'object' &&
    'defineTemplateBodyVisitor' in services &&
    isFunction(services.defineTemplateBodyVisitor)
  )
}

export const preferSimpleEventHandler = createRule<
  [PreferSimpleEventHandlerOptions],
  PreferSimpleEventHandlerMessageId
>({
  name: 'prefer-simple-event-handler',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require simple expressions in Vue template event handlers.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInlineFunctions: {
            type: 'boolean',
            description: 'Allow inline functions with simple bodies.',
          },
          allowConditional: {
            type: 'boolean',
            description: 'Allow ternary expressions throughout the handler.',
          },
          allowLogical: {
            type: 'boolean',
            description: 'Allow logical expressions and logical assignments.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedSingleOperation:
        'Expected exactly one simple operation in this event handler. Extract the logic into a script function.',
      unexpectedConditional:
        'Unexpected ternary expression in this event handler. Extract the logic into a script function.',
      unexpectedInlineFunction:
        'Unexpected inline function in this event handler. Use a script function instead.',
      unexpectedLogical:
        'Unexpected logical expression or assignment in this event handler. Extract the logic into a script function.',
      unexpectedSequence:
        'Unexpected comma expression in this event handler. Extract the logic into a script function.',
      unexpectedStatement:
        'Unexpected {{type}} in this event handler. Keep only a simple expression or a function returning one.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = context.sourceCode.parserServices
    if (!hasTemplateVisitor(services)) {
      return {}
    }

    function getMessageId(
      node: AST.Node,
      parent: AST.Node | null | undefined,
    ): PreferSimpleEventHandlerMessageId | undefined {
      // The Vue AST types omit TS nodes, but the template visitor includes them.
      const nodeType: string = node.type
      switch (node.type) {
        case 'VOnExpression':
          return node.body.length === 1 ? undefined : 'expectedSingleOperation'
        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
          return options.allowInlineFunctions === false
            ? 'unexpectedInlineFunction'
            : undefined
        case 'BlockStatement':
          if (
            parent?.type !== 'ArrowFunctionExpression' &&
            parent?.type !== 'FunctionExpression'
          ) {
            return 'unexpectedStatement'
          }
          return node.body.length === 1 ? undefined : 'expectedSingleOperation'
        case 'ExpressionStatement':
          return undefined
        case 'ReturnStatement':
          if (parent?.type !== 'BlockStatement') {
            return 'unexpectedStatement'
          }
          return node.argument ? undefined : 'expectedSingleOperation'
        case 'SequenceExpression':
          return 'unexpectedSequence'
        case 'ConditionalExpression':
          return options.allowConditional ? undefined : 'unexpectedConditional'
        case 'LogicalExpression':
          return options.allowLogical ? undefined : 'unexpectedLogical'
        case 'AssignmentExpression':
          return !options.allowLogical &&
            ['&&=', '||=', '??='].includes(node.operator)
            ? 'unexpectedLogical'
            : undefined
        case 'ClassExpression':
        case 'YieldExpression':
          return 'unexpectedStatement'
        default:
          return node.type.endsWith('Statement') ||
            (node.type.endsWith('Declaration') &&
              nodeType !== 'TSTypeParameterDeclaration')
            ? 'unexpectedStatement'
            : undefined
      }
    }

    let handlerExpression: AST.Node | undefined
    let hasReported = false

    return services.defineTemplateBodyVisitor({
      VAttribute(node) {
        if (
          !node.directive ||
          node.key.name.name !== 'on' ||
          !node.key.argument ||
          !node.value?.expression
        ) {
          return
        }

        handlerExpression = node.value.expression
        hasReported = false
      },
      'VAttribute:exit': function () {
        handlerExpression = undefined
      },
      '*': function (node) {
        if (
          !handlerExpression ||
          hasReported ||
          node.range[0] < handlerExpression.range[0] ||
          node.range[1] > handlerExpression.range[1]
        ) {
          return
        }
        const messageId = getMessageId(node, node.parent)
        if (messageId) {
          context.report({
            loc: node.loc,
            messageId,
            data: { type: node.type },
          })
          hasReported = true
        }
      },
    })
  },
})
