import { createRule } from '../utils/create-rule.ts'
import {
  getNativeElementLayout,
  isPreservedElement,
} from '../utils/template-element-layout.ts'
import { hasTemplateVisitor } from '../utils/vue/parser-services.ts'
import type { AST } from 'vue-eslint-parser'
import type {
  ConsistentTemplateElementLayoutMessageId,
  ConsistentTemplateElementLayoutOptions,
} from '../types/index.ts'

function isLayoutWhitespace(character: string): boolean {
  return character.length === 1 && '\t \r\n'.includes(character)
}

export const consistentTemplateElementLayout = createRule<
  [ConsistentTemplateElementLayoutOptions],
  ConsistentTemplateElementLayoutMessageId
>({
  name: 'consistent-template-element-layout',
  meta: {
    type: 'layout',
    docs: {
      recommended: false,
      description: 'enforce consistent Vue template element layouts.',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['compatible', 'strict'],
            description:
              'Formatter-compatible by default; strict checks all closing tags.',
          },
          fix: {
            type: 'string',
            enum: ['never', 'safe'],
            description:
              'Report only by default; safe fixes closing-tag whitespace.',
          },
          groups: {
            type: 'array',
            description:
              'Exact source tag layout overrides; last matching group wins.',
            items: {
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: { type: 'string', minLength: 1 },
                  uniqueItems: true,
                  minItems: 1,
                  description: 'Case-sensitive raw tag names.',
                },
                layout: {
                  type: 'string',
                  enum: ['block', 'inline', 'preserve'],
                  description: 'Layout intent; preserve skips descendants too.',
                },
              },
              required: ['tags', 'layout'],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedContentLayout:
        'Expected <{{name}}> content to be fully inline or on separate lines from both tags.',
      expectedSiblingNewline:
        'Expected a line break between block siblings <{{prev}}> and <{{next}}>.',
      expectedSingleLineEndTag:
        'Expected the closing tag </{{name}}> to stay on one line.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const services = sourceCode.parserServices

    if (!hasTemplateVisitor(services)) {
      return {}
    }

    const strict = options.mode === 'strict'
    const skipped = new WeakSet<AST.VElement>()
    const roles = new Map(
      options.groups?.flatMap(group =>
        group.tags.map(tag => [tag, group.layout] as const),
      ),
    )
    const getRole = (node: AST.VElement) =>
      roles.get(node.rawName) ?? getNativeElementLayout(node.rawName)

    function checkContent(node: AST.VElement) {
      const endTag = node.endTag

      if (!endTag || getRole(node) !== 'block') {
        return
      }

      const content = sourceCode.text.slice(
        node.startTag.range[1],
        endTag.range[0],
      )
      // Scan only the boundary whitespace. An unanchored trailing-whitespace
      // regex backtracks quadratically over long whitespace inside the content.
      let contentStart = 0
      let contentEnd = content.length

      while (
        contentStart < contentEnd &&
        isLayoutWhitespace(content.charAt(contentStart))
      ) {
        contentStart++
      }

      if (contentStart === contentEnd) {
        return
      }

      while (
        contentEnd > contentStart &&
        isLayoutWhitespace(content.charAt(contentEnd - 1))
      ) {
        contentEnd--
      }

      const leading = content.slice(0, contentStart)
      const trailing = content.slice(contentEnd)
      const hasLeadingNewline = /[\r\n]/u.test(leading)
      const hasTrailingNewline = /[\r\n]/u.test(trailing)

      if (
        (hasLeadingNewline && hasTrailingNewline) ||
        !/[\r\n]/u.test(content)
      ) {
        return
      }

      // Formatters borrow a tag's internal whitespace at sensitive boundaries.
      // Explicit component grouping does not make a formatter know its display.
      if (
        !strict &&
        getNativeElementLayout(node.rawName) !== 'block' &&
        (/[\r\n]/u.test(sourceCode.text.slice(...endTag.range)) ||
          (/[\r\n]/u.test(sourceCode.text.slice(...node.startTag.range)) &&
            !hasLeadingNewline))
      ) {
        return
      }

      context.report({
        loc: endTag.loc,
        messageId: 'expectedContentLayout',
        data: { name: node.rawName },
      })
    }

    function checkSiblings(node: AST.VElement) {
      let previous: AST.VElement | undefined

      for (const child of node.children) {
        if (child.type !== 'VElement') {
          if (child.type !== 'VText' || child.value.trim()) {
            previous = undefined
          }

          continue
        }

        if (
          previous &&
          getRole(previous) === 'block' &&
          getRole(child) === 'block' &&
          !isPreservedElement(previous) &&
          !isPreservedElement(child)
        ) {
          const gap = sourceCode.text.slice(previous.range[1], child.range[0])
          // Raw matching excludes comments and decoded whitespace entities.
          const previousTag = previous.endTag ?? previous.startTag
          const hasFormatterEscape =
            !strict &&
            getNativeElementLayout(previous.rawName) !== 'block' &&
            /[\r\n]/u.test(sourceCode.text.slice(...previousTag.range))

          if (/^[\t ]*$/u.test(gap) && !hasFormatterEscape) {
            context.report({
              loc: child.startTag.loc,
              messageId: 'expectedSiblingNewline',
              data: { prev: previous.rawName, next: child.rawName },
            })
          }
        }

        previous = child
      }
    }

    return services.defineTemplateBodyVisitor({
      VElement(node) {
        if (
          isPreservedElement(node) ||
          getRole(node) === 'preserve' ||
          (node.parent.type === 'VElement' && skipped.has(node.parent))
        ) {
          skipped.add(node)
          return
        }

        // The SFC root and structural templates are traversal containers only.
        const isStructural = ['template', 'slot', 'component'].includes(
          node.rawName,
        )

        if (!isStructural) {
          checkContent(node)

          const endTag = node.endTag

          if (
            endTag &&
            /[\r\n]/u.test(sourceCode.text.slice(...endTag.range)) &&
            (strict ||
              (getRole(node) === 'block' &&
                getNativeElementLayout(node.rawName) === 'block'))
          ) {
            const text = sourceCode.text.slice(...endTag.range)

            context.report({
              loc: endTag.loc,
              messageId: 'expectedSingleLineEndTag',
              data: { name: node.rawName },
              // Only internal closing-tag whitespace changes. Content and slots
              // remain byte-for-byte intact under either Vue whitespace mode.
              fix(fixer) {
                if (
                  options.fix !== 'safe' ||
                  !/^<\/[^\t \r\n>]+[\t \r\n]+>$/u.test(text)
                ) {
                  return null
                }

                return fixer.replaceTextRange(
                  endTag.range,
                  text.replace(/[\t \r\n]+(?=>$)/u, ''),
                )
              },
            })
          }
        }

        checkSiblings(node)
      },
    })
  },
})
