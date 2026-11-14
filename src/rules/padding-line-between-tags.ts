import { createRule } from '../utils/create-rule.ts'
import {
  hasTemplateVisitor,
  hasVueServices,
} from '../utils/vue/parser-services.ts'
import type { TSESLint } from '@typescript-eslint/utils'
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
          ignoreComments: {
            type: 'boolean',
            description:
              'Check tag pairs across HTML comments; defaults to false.',
          },
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

    const comments =
      options.ignoreComments && hasVueServices(services)
        ? (services
            .getDocumentFragment()
            ?.comments.filter(comment => comment.type === 'HTMLComment') ?? [])
        : []

    function checkPair(previous: AST.VElement, next: AST.VElement) {
      const entry = targets.findLast(option =>
        option.tag === undefined
          ? (option.prev === '*' || option.prev === previous.rawName) &&
            (option.next === '*' || option.next === next.rawName)
          : option.tag === previous.rawName && option.tag === next.rawName,
      )

      if (!entry || entry.blankLine === 'ignore') {
        return
      }

      // Comments are absent from children. Split around parsed comments so
      // their contents and internal line breaks never become padding.
      const ranges: AST.VElement['range'][] = []
      let start = previous.range[1]
      // Parser comments are ordered by source position. Locate this gap without
      // rescanning the document; nested sibling pairs are not visited in order.
      let lower = 0
      let upper = comments.length

      while (lower < upper) {
        const middle = Math.floor((lower + upper) / 2)
        const comment = comments[middle]

        if (comment && comment.range[0] < start) {
          lower = middle + 1
        } else {
          upper = middle
        }
      }

      for (let index = lower; index < comments.length; index++) {
        const comment = comments[index]

        if (!comment || comment.range[1] > next.range[0]) {
          break
        }

        ranges.push([start, comment.range[0]])
        start = comment.range[1]
      }

      ranges.push([start, next.range[0]])

      const gaps = ranges.map(range => {
        const text = sourceCode.text.slice(...range)
        const lineBreaks = text.match(/\r\n|\r|\n/gu) ?? []

        return {
          range,
          text,
          lineBreaks,
          count: Math.max(0, lineBreaks.length - 1),
        }
      })

      // Inspect raw text to avoid treating decoded whitespace entities as
      // formatting, even when comments are ignored.
      if (gaps.some(gap => !/^[\t \r\n]*$/u.test(gap.text))) {
        return
      }

      const policy = entry.blankLine ?? 1
      const count = gaps.reduce((total, gap) => total + gap.count, 0)
      const expected = policy === 'never' ? 0 : policy

      if (expected === 'always' ? count >= 1 : count === expected) {
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
          let remaining = (expected === 'always' ? 1 : expected) - count
          const fixes: TSESLint.RuleFix[] = []

          for (const gap of gaps) {
            if (!remaining || !gap.lineBreaks.length) {
              continue
            }

            const firstBreak = /\r\n|\r|\n/u.exec(gap.text)

            if (!firstBreak) {
              continue
            }

            const blankLines = Math.max(0, gap.count + remaining)
            remaining -= blankLines - gap.count

            if (blankLines === gap.count) {
              continue
            }

            const lastBreak = Math.max(
              gap.text.lastIndexOf('\n'),
              gap.text.lastIndexOf('\r'),
            )
            const requiredBreaks = blankLines + 1
            const replacementLength =
              firstBreak.index +
              firstBreak[0].length * requiredBreaks +
              gap.text.length -
              lastBreak -
              1

            if (replacementLength > MAX_PADDING_LENGTH) {
              return null
            }

            // Prefer the first existing line break, keeping leading comments
            // such as @vue-generic attached to the following tag.
            const replacement =
              gap.text.slice(0, firstBreak.index) +
              firstBreak[0].repeat(requiredBreaks) +
              gap.text.slice(lastBreak + 1)
            fixes.push(fixer.replaceTextRange(gap.range, replacement))
          }

          return remaining ? null : fixes
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
