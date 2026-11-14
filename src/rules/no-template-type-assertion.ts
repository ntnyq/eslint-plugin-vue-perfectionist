import { createRule } from '../utils/create-rule.ts'
import { hasTemplateVisitor } from '../utils/vue/parser-services.ts'
import type { NoTemplateTypeAssertionMessageId } from '../types/index.ts'

export const noTemplateTypeAssertion = createRule<
  [],
  NoTemplateTypeAssertionMessageId
>({
  name: 'no-template-type-assertion',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'disallow as type assertions in Vue templates.',
    },
    schema: [],
    messages: {
      unexpectedTypeAssertion:
        'Move this type assertion into <script> instead of using "as" in the template.',
    },
  },
  defaultOptions: [],
  create(context) {
    const services = context.sourceCode.parserServices

    if (!hasTemplateVisitor(services)) {
      return {}
    }

    return services.defineTemplateBodyVisitor({
      TSAsExpression(node) {
        context.report({
          loc: node.loc,
          messageId: 'unexpectedTypeAssertion',
        })
      },
    })
  },
})
