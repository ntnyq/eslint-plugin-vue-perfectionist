import { RESTRICTABLE_HTML_ELEMENTS } from '../constants/no-restricted-html-elements.ts'
import { createRule } from '../utils/create-rule.ts'
import { hasTemplateVisitor } from '../utils/vue/parser-services.ts'
import type {
  NoRestrictedHtmlElementsMessageId,
  NoRestrictedHtmlElementsOptions,
} from '../types/index.ts'

export const noRestrictedHtmlElements = createRule<
  [NoRestrictedHtmlElementsOptions],
  NoRestrictedHtmlElementsMessageId
>({
  name: 'no-restricted-html-elements',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'disallow specified native HTML elements in Vue templates.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          elements: {
            type: 'array',
            description:
              'Exact lowercase native HTML names to disallow, with optional hints. Defaults to an empty list; the last entry for a name wins.',
            items: {
              anyOf: [
                { type: 'string', enum: RESTRICTABLE_HTML_ELEMENTS },
                {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      enum: RESTRICTABLE_HTML_ELEMENTS,
                      description: 'Exact lowercase native HTML element name.',
                    },
                    message: {
                      type: 'string',
                      description: 'Hint appended to the default diagnostic.',
                    },
                  },
                  required: ['name'],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      restrictedHtmlElement:
        'Native HTML element <{{name}}> is not allowed.{{message}}',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const services = sourceCode.parserServices
    if (!hasTemplateVisitor(services) || !options.elements?.length) {
      return {}
    }
    const elements = new Map(
      options.elements.map(element =>
        typeof element === 'string'
          ? [element, '']
          : [element.name, element.message ?? ''],
      ),
    )

    return services.defineTemplateBodyVisitor({
      VElement(node) {
        if (node.namespace !== 'http://www.w3.org/1999/xhtml') {
          return
        }
        // rawName retains component casing; node.name normalizes HTML names.
        const message = elements.get(node.rawName)
        if (message === undefined) {
          return
        }
        const start = node.startTag.range[0] + 1
        context.report({
          loc: {
            start: sourceCode.getLocFromIndex(start),
            end: sourceCode.getLocFromIndex(start + node.rawName.length),
          },
          messageId: 'restrictedHtmlElement',
          data: {
            name: node.rawName,
            message: message ? ` ${message}` : '',
          },
        })
      },
    })
  },
})
