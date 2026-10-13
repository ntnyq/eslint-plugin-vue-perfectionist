import { CALLBACK_TARGET_SCHEMA } from '../constants/callback.ts'
import { unwrapExpression } from '../utils/ast.ts'
import { createCallbackVisitor } from '../utils/callback.ts'
import { createRule } from '../utils/create-rule.ts'
import type {
  MaxLinesPerCallbackMessageId,
  MaxLinesPerCallbackOptions,
} from '../types/index.ts'

export const maxLinesPerCallback = createRule<
  [MaxLinesPerCallbackOptions],
  MaxLinesPerCallbackMessageId
>({
  name: 'max-lines-per-callback',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description:
        'enforce a maximum number of lines in inline callbacks for Vue APIs.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...CALLBACK_TARGET_SCHEMA,
          max: {
            description:
              'Maximum lines per inline callback, including its signature and braces.',
            type: 'integer',
            minimum: 1,
          },
          skipBlankLines: {
            description: 'Exclude whitespace-only lines from the count.',
            type: 'boolean',
          },
          skipComments: {
            description:
              'Exclude lines containing only comments and whitespace.',
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      exceededMaxLines:
        'The inline callback for "{{name}}" has {{lines}} lines (maximum {{max}}). Extract its logic into a separate function and call it from the inline callback.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const max = options.max ?? 20
    const commentLines = new Set<number>()
    if (options.skipComments) {
      for (const comment of sourceCode.getAllComments()) {
        for (
          let line = comment.loc.start.line;
          line <= comment.loc.end.line;
          line++
        ) {
          commentLines.add(line)
        }
      }
    }

    return createCallbackVisitor(
      sourceCode,
      context.settings,
      options,
      (argument, name) => {
        const callback = unwrapExpression(argument)
        if (
          callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression'
        ) {
          return
        }
        const codeLines = new Set<number>()
        if (options.skipComments) {
          // Token spans retain mixed code/comment lines and multiline strings.
          for (const token of sourceCode.getTokens(callback)) {
            for (
              let line = token.loc.start.line;
              line <= token.loc.end.line;
              line++
            ) {
              codeLines.add(line)
            }
          }
        }
        let lines = 0
        for (
          let line = callback.loc.start.line;
          line <= callback.loc.end.line;
          line++
        ) {
          if (
            options.skipBlankLines &&
            sourceCode.lines[line - 1]?.trim() === ''
          ) {
            continue
          }
          if (
            options.skipComments &&
            commentLines.has(line) &&
            !codeLines.has(line)
          ) {
            continue
          }
          lines++
        }
        if (lines > max) {
          context.report({
            node: callback,
            messageId: 'exceededMaxLines',
            data: { name, lines, max },
          })
        }
      },
    )
  },
})
