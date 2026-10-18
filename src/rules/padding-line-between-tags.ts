import { createRule } from '../utils/create-rule.ts'
import { hasTemplateVisitor } from '../utils/vue/parser-services.ts'
import type { AST } from 'vue-eslint-parser'
import type {
  PaddingLineBetweenTagsMessageId,
  PaddingLineBetweenTagsOptions,
} from '../types/index.ts'

/**
 * Bound each replacement gap to avoid allocating excessive padding during lint.
 */
const MAX_PADDING_LENGTH = 65_536

export const paddingLineBetweenTags = createRule<
  [PaddingLineBetweenTagsOptions],
  PaddingLineBetweenTagsMessageId
>({
  name: 'padding-line-between-tags',
  meta: {
    type: 'layout',
    docs: {
      recommended: false,
      description: 'enforce blank lines between consecutive Vue template tags.',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          targets: {
            type: 'array',
            description:
              'Ordered tag-pair policies; the last matching entry wins.',
            items: {
              type: 'object',
              properties: {
                tag: {
                  type: 'string',
                  minLength: 1,
                  not: { type: 'string', enum: ['*'] },
                  description:
                    'Concrete source tag name to match on both sides.',
                },
                prev: {
                  type: 'string',
                  minLength: 1,
                  description: 'Previous source tag name, or * for any tag.',
                },
                next: {
                  type: 'string',
                  minLength: 1,
                  description: 'Next source tag name, or * for any tag.',
                },
                blankLine: {
                  description:
                    'Exact blank-line count or policy; defaults to 1.',
                  anyOf: [
                    {
                      type: 'integer',
                      minimum: 0,
                      maximum: Number.MAX_SAFE_INTEGER,
                    },
                    { type: 'string', enum: ['always', 'never', 'ignore'] },
                  ],
                },
              },
              oneOf: [
                {
                  type: 'object',
                  additionalProperties: true,
                  required: ['tag'],
                  not: {
                    anyOf: [
                      { type: 'object', required: ['prev'] },
                      { type: 'object', required: ['next'] },
                    ],
                  },
                },
                {
                  type: 'object',
                  additionalProperties: true,
                  required: ['prev', 'next'],
                  not: { type: 'object', required: ['tag'] },
                },
              ],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedBlankLines:
        'Expected {{count}} blank line(s) between <{{prev}}> and <{{next}}> tags.',
      expectedAtLeastOneBlankLine:
        'Expected at least one blank line between <{{prev}}> and <{{next}}> tags.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const targets = options.targets ?? [{ prev: '*', next: '*', blankLine: 1 }]
    const sourceCode = context.sourceCode
    const services = sourceCode.parserServices
    if (!hasTemplateVisitor(services) || !targets.length) {
      return {}
    }

    function checkPair(previous: AST.VElement, next: AST.VElement) {
      const gap = sourceCode.text.slice(previous.range[1], next.range[0])
      // Comments are absent from children. Inspect raw text to retain them and
      // to avoid treating decoded whitespace entities as formatting.
      if (!/^[\t \r\n]*$/u.test(gap)) {
        return
      }
      const entry = targets.findLast(option =>
        option.tag === undefined
          ? (option.prev === '*' || option.prev === previous.rawName) &&
            (option.next === '*' || option.next === next.rawName)
          : option.tag === previous.rawName && option.tag === next.rawName,
      )
      if (!entry) {
        return
      }
      const policy = entry.blankLine ?? 1
      const lineBreaks = gap.match(/\r\n|\r|\n/gu) ?? []
      const count = Math.max(0, lineBreaks.length - 1)
      const expected = policy === 'never' ? 0 : policy
      if (
        expected === 'ignore' ||
        (expected === 'always' ? count >= 1 : count === expected)
      ) {
        return
      }
      context.report({
        loc: next.startTag.loc,
        messageId:
          expected === 'always'
            ? 'expectedAtLeastOneBlankLine'
            : 'expectedBlankLines',
        data: {
          prev: previous.rawName,
          next: next.rawName,
          count: expected,
        },
        // Adding a newline to inline siblings can change rendered whitespace.
        // Existing newlines remain newlines even when removing all blank lines.
        fix(fixer) {
          if (!lineBreaks.length) {
            return null
          }
          const firstBreak = /\r\n|\r|\n/u.exec(gap)
          if (!firstBreak) {
            return null
          }
          const lastBreak = Math.max(
            gap.lastIndexOf('\n'),
            gap.lastIndexOf('\r'),
          )
          const requiredBreaks = (expected === 'always' ? 1 : expected) + 1
          const replacementLength =
            firstBreak.index +
            firstBreak[0].length * requiredBreaks +
            gap.length -
            lastBreak -
            1
          if (replacementLength > MAX_PADDING_LENGTH) {
            return null
          }
          const replacement =
            gap.slice(0, firstBreak.index) +
            firstBreak[0].repeat(requiredBreaks) +
            gap.slice(lastBreak + 1)
          return fixer.replaceTextRange(
            [previous.range[1], next.range[0]],
            replacement,
          )
        },
      })
    }

    return services.defineTemplateBodyVisitor({
      VElement(node) {
        // Do not inspect descendants of whitespace-sensitive or non-HTML
        // contexts, including v-pre inherited from an ancestor.
        let ancestor: AST.VElement | AST.VDocumentFragment = node
        while (ancestor.type === 'VElement') {
          if (
            ancestor.namespace !== 'http://www.w3.org/1999/xhtml' ||
            [
              'pre',
              'textarea',
              'script',
              'style',
              'xmp',
              'listing',
              'plaintext',
            ].includes(ancestor.rawName) ||
            ancestor.startTag.attributes.some(attribute =>
              attribute.directive
                ? attribute.key.name.name === 'pre'
                : attribute.key.name === 'v-pre',
            )
          ) {
            return
          }
          ancestor = ancestor.parent
        }
        let previous: AST.VElement | undefined
        for (const child of node.children) {
          if (child.type === 'VElement') {
            if (previous) {
              checkPair(previous, child)
            }
            previous = child
          } else if (child.type !== 'VText' || child.value.trim()) {
            previous = undefined
          }
        }
      },
    })
  },
})
