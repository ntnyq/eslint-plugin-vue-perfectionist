import { unwrapExpression } from '../utils/ast.ts'
import { createRule } from '../utils/create-rule.ts'
import { getRefString, getVueRefApi } from '../utils/ref-pattern.ts'
import type { ConsistentTemplateRefNameMessageId } from '../types/index.ts'

export const consistentTemplateRefName = createRule<
  [],
  ConsistentTemplateRefNameMessageId
>({
  name: 'consistent-template-ref-name',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'require template ref variable names to match their keys.',
    },
    schema: [],
    messages: {
      inconsistentTemplateRefName:
        'Expected template ref variable "{{name}}" to match key "{{key}}".',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier' || !node.init) {
          return
        }
        const initializer = unwrapExpression(node.init)
        if (
          initializer.type !== 'CallExpression' ||
          getVueRefApi(initializer, context.sourceCode) !== 'useTemplateRef'
        ) {
          return
        }
        const argument = initializer.arguments[0]
        const key = argument && getRefString(argument)
        if (key !== undefined && key !== node.id.name) {
          context.report({
            node: node.id,
            messageId: 'inconsistentTemplateRefName',
            data: { name: node.id.name, key },
          })
        }
      },
    }
  },
})
