import { hasComponentTemplateVisitor } from '../utils/component-bindings.ts'
import { createRule } from '../utils/create-rule.ts'
import {
  createInterpolationReplacement,
  getTextFragments,
  isInterpolationContext,
} from '../utils/template-interpolation.ts'
import type {
  PreferTemplateLiteralInInterpolationMessageId,
  PreferTemplateLiteralInInterpolationOptions,
} from '../types/index.ts'

export const preferTemplateLiteralInInterpolation = createRule<
  [PreferTemplateLiteralInInterpolationOptions],
  PreferTemplateLiteralInInterpolationMessageId
>({
  name: 'prefer-template-literal-in-interpolation',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'require a single template literal for mixed text and interpolation.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          reportUnfixable: {
            type: 'boolean',
            description: 'Also report fragments that cannot be safely fixed.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedTemplateLiteral:
        'Use a single template literal interpolation for this mixed text fragment.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const services = sourceCode.parserServices

    if (!hasComponentTemplateVisitor(services)) {
      return {}
    }

    return services.defineTemplateBodyVisitor({
      VElement(node) {
        if (!isInterpolationContext(node)) {
          return
        }
        for (const fragment of getTextFragments(node)) {
          const first = fragment[0]
          const last = fragment.at(-1)
          if (!first || !last) {
            continue
          }
          const replacement = createInterpolationReplacement(
            fragment,
            sourceCode,
          )
          if (replacement === undefined && !options.reportUnfixable) {
            continue
          }
          context.report({
            loc: {
              start: first.loc.start,
              end: last.loc.end,
            },
            messageId: 'expectedTemplateLiteral',
            fix(fixer) {
              return replacement === undefined
                ? null
                : fixer.replaceTextRange(
                    [first.range[0], last.range[1]],
                    replacement,
                  )
            },
          })
        }
      },
    })
  },
})
