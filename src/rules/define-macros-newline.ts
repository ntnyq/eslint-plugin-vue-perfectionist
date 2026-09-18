import { getCallIdentity, getSetupRange } from '../utils/ast.ts'
import { createRule } from '../utils/create-rule.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  DefineMacrosNewlineMessageId,
  DefineMacrosNewlineOptions,
} from '../types/index.ts'

export const defineMacrosNewline = createRule<
  [DefineMacrosNewlineOptions],
  DefineMacrosNewlineMessageId
>({
  name: 'define-macros-newline',
  meta: {
    type: 'layout',
    docs: {
      recommended: false,
      description:
        'require multiline inline declarations in Vue compiler macros.',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          macros: {
            description:
              'Vue compiler macros to check. Replaces the default list.',
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'defineProps',
                'defineEmits',
                'defineSlots',
                'defineExpose',
                'defineOptions',
              ],
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      expectedNewlines:
        'Expected line breaks inside braces and between members of "{{name}}".',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode
    const setupRange = getSetupRange(sourceCode)
    const macros = new Set<string>(
      options.macros ?? [
        'defineProps',
        'defineEmits',
        'defineSlots',
        'defineExpose',
      ],
    )
    if (!context.filename.endsWith('.vue') || !setupRange || !macros.size) {
      return {}
    }
    const newline = sourceCode.text.includes('\r\n') ? '\r\n' : '\n'

    function checkDeclaration(
      node: TSESTree.ObjectExpression | TSESTree.TSTypeLiteral,
      name: string,
    ) {
      const members =
        node.type === 'ObjectExpression' ? node.properties : node.members
      if (!members.length) {
        return
      }
      const open = sourceCode.getFirstToken(node)
      const close = sourceCode.getLastToken(node)
      if (!open || !close) {
        return
      }
      const ranges: TSESTree.Range[] = []

      function breakBefore(target: TSESTree.Node | TSESTree.Token) {
        // Only replace whitespace. Commas, semicolons, and comments stay intact.
        const previous = sourceCode.getTokenBefore(target, {
          includeComments: true,
        })
        if (previous && previous.loc.end.line === target.loc.start.line) {
          ranges.push([previous.range[1], target.range[0]])
        }
      }

      const first = sourceCode.getTokenAfter(open, { includeComments: true })
      if (first) {
        breakBefore(first)
      }
      for (const [index, member] of members.entries()) {
        const previous = members[index - 1]
        if (previous?.loc.end.line === member.loc.start.line) {
          breakBefore(member)
        }
      }
      breakBefore(close)
      if (!ranges.length) {
        return
      }
      context.report({
        node,
        messageId: 'expectedNewlines',
        data: { name },
        fix(fixer) {
          return ranges.map(range => fixer.replaceTextRange(range, newline))
        },
      })
    }

    return {
      CallExpression(node) {
        if (
          node.range[0] < setupRange[0] ||
          node.range[1] > setupRange[1] ||
          node.callee.type !== 'Identifier' ||
          !macros.has(node.callee.name) ||
          !getCallIdentity(node, sourceCode)?.isUnbound
        ) {
          return
        }
        const name = node.callee.name
        const type = node.typeArguments?.params[0]
        if (
          ['defineProps', 'defineEmits', 'defineSlots'].includes(name) &&
          type?.type === 'TSTypeLiteral'
        ) {
          checkDeclaration(type, name)
        }
        const argument = node.arguments[0]
        if (
          [
            'defineProps',
            'defineEmits',
            'defineExpose',
            'defineOptions',
          ].includes(name) &&
          argument?.type === 'ObjectExpression'
        ) {
          checkDeclaration(argument, name)
        }
      },
    }
  },
})
