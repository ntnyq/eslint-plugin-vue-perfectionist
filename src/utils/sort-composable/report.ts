import { compare } from 'natural-orderby'
import { getMemberName, hasDuplicateMembers, isPrototypeSetter } from './ast.ts'
import { resolveComposableOptions } from './options.ts'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type {
  ComposableMemberKind,
  ComposableNewlines,
  SortComposableMessageId,
  SortComposableOptions,
} from '../../types/rules/sort-composable.ts'
import type { MemberKind } from './classify.ts'

const MAX_WHITESPACE_LENGTH = 65_536

interface Member {
  node: TSESTree.Property
  name: string
  group: number
}

export const SORT_COMPOSABLE_MESSAGES = {
  unexpectedGroupOrder:
    'Expected "{{right}}" to appear before "{{left}}" according to the composable groups.',
  unexpectedOrder:
    'Expected "{{right}}" to appear before "{{left}}" within its composable group.',
  unexpectedNewlinesBetween:
    'Expected {{count}} blank line(s) between composable groups before "{{name}}".',
  unexpectedNewlinesInside:
    'Expected {{count}} blank line(s) inside the composable group before "{{name}}".',
  unknownMember:
    'Cannot classify "{{name}}" in {{functionName}} as state or method. Provide type information or memberKinds.',
} satisfies Record<SortComposableMessageId, string>

/**
 * Partition at unsupported members, report ordering, then fix only whitespace
 * within correctly ordered partitions. No member tokens are ever moved.
 */
export function createComposableReporter(
  context: TSESLint.RuleContext<
    SortComposableMessageId,
    [SortComposableOptions]
  >,
  options: SortComposableOptions,
) {
  const sourceCode = context.sourceCode
  const { groups, customGroups, memberKinds } =
    resolveComposableOptions(options)
  const natural = compare({ locale: 'en' })
  const eol = sourceCode.text.match(/\r\n|[\n\r\u{2028}\u{2029}]/u)?.[0] ?? '\n'

  function groupOf(name: string, kind: ComposableMemberKind) {
    const custom = customGroups.find(
      group => group.selector === kind && group.pattern.test(name),
    )
    const groupName = custom?.groupName ?? kind
    return groups.findIndex(group => group.names.includes(groupName))
  }

  function compareMembers(left: Member, right: Member): number {
    if (left.group !== right.group) {
      return left.group - right.group
    }
    const group = groups[left.group]
    if (!group || group.type === 'unsorted') {
      return 0
    }
    const result =
      group.type === 'name-length'
        ? [...left.name].length - [...right.name].length
        : group.type === 'natural'
          ? natural(left.name, right.name)
          : left.name.localeCompare(right.name, 'en')
    return result * (group.order === 'desc' ? -1 : 1)
  }

  function newlines(left: Member, right: Member): ComposableNewlines {
    if (left.group === right.group) {
      return groups[left.group]?.newlinesInside ?? 'ignore'
    }
    const values = groups
      .slice(left.group + 1, right.group + 1)
      .map(group => group.before)
    const positive = values.filter(
      (value): value is number => typeof value === 'number' && value > 0,
    )
    return positive.length
      ? Math.max(...positive)
      : values.includes('ignore')
        ? 'ignore'
        : 0
  }

  function checkSpacing(left: Member, right: Member) {
    const count = newlines(left, right)
    if (count === 'ignore') {
      return
    }
    const comma = sourceCode.getTokenAfter(left.node)
    if (comma?.value !== ',') {
      return
    }
    const range: TSESTree.Range = [comma.range[1], right.node.range[0]]
    const beforeRange: TSESTree.Range = [left.node.range[1], comma.range[0]]
    const before = sourceCode.text.slice(...beforeRange)
    const gap = sourceCode.text.slice(...range)
    // Comments make ownership ambiguous. Leave the entire gap untouched.
    if (!/^\s*$/u.test(before) || !/^\s*$/u.test(gap)) {
      return
    }
    const breaks = gap.match(/\r\n|[\n\r\u{2028}\u{2029}]/gu)?.length ?? 0
    const beforeBreaks = before.match(/\r\n|[\n\r\u{2028}\u{2029}]/gu) ?? []
    if (beforeBreaks.length <= 1 && Math.max(0, breaks - 1) === count) {
      return
    }
    const indent = breaks
      ? (gap.match(/[^\S\r\n\u{2028}\u{2029}]*$/u)?.[0] ?? '')
      : (sourceCode.lines[right.node.loc.start.line - 1]?.match(
          /^[^\S\r\n\u{2028}\u{2029}]*/u,
        )?.[0] ?? '')
    const newline = gap.match(/\r\n|[\n\r\u{2028}\u{2029}]/u)?.[0] ?? eol
    const replacementLength =
      !breaks && count === 0
        ? gap.length
        : newline.length * (count + 1) + indent.length
    context.report({
      node: right.node,
      messageId:
        left.group === right.group
          ? 'unexpectedNewlinesInside'
          : 'unexpectedNewlinesBetween',
      data: { name: right.name, count },
      fix:
        options.fix === 'none' || replacementLength > MAX_WHITESPACE_LENGTH
          ? null
          : fixer => {
              const replacement =
                !breaks && count === 0
                  ? gap
                  : newline.repeat(count + 1) + indent
              const fixes: TSESLint.RuleFix[] = []
              if (beforeBreaks.length > 1) {
                fixes.push(
                  fixer.replaceTextRange(
                    beforeRange,
                    (beforeBreaks[0] ?? eol) +
                      (before.match(/[^\S\r\n\u{2028}\u{2029}]*$/u)?.[0] ?? ''),
                  ),
                )
              }
              if (replacement !== gap) {
                fixes.push(fixer.replaceTextRange(range, replacement))
              }
              return fixes
            },
    })
  }

  function checkPartition(members: Member[]) {
    let ordered = true
    for (let index = 1; index < members.length; index++) {
      const left = members[index - 1]
      const right = members[index]
      if (left && right && compareMembers(left, right) > 0) {
        ordered = false
        context.report({
          node: right.node,
          messageId:
            left.group === right.group
              ? 'unexpectedOrder'
              : 'unexpectedGroupOrder',
          data: { left: left.name, right: right.name },
        })
      }
    }
    if (ordered) {
      for (let index = 1; index < members.length; index++) {
        const left = members[index - 1]
        const right = members[index]
        if (left && right) {
          checkSpacing(left, right)
        }
      }
    }
  }

  return function check(
    object: TSESTree.ObjectExpression | TSESTree.ObjectPattern,
    functionName: string,
    classify: (property: TSESTree.Property, name: string) => MemberKind,
  ) {
    if (object.type === 'ObjectExpression' && hasDuplicateMembers(object)) {
      return
    }
    let members: Member[] = []
    for (const property of object.properties) {
      const name =
        property.type === 'Property' ? getMemberName(property) : undefined
      if (
        property.type !== 'Property' ||
        name === undefined ||
        isPrototypeSetter(property) ||
        (object.type === 'ObjectPattern' &&
          property.value.type !== 'Identifier' &&
          (property.value.type !== 'AssignmentPattern' ||
            property.value.left.type !== 'Identifier'))
      ) {
        checkPartition(members)
        members = []
        continue
      }
      let kind = classify(property, name)
      if (kind === 'unknown') {
        kind =
          memberKinds.find(
            member =>
              member.functionRegex.test(functionName) &&
              member.nameRegex.test(name),
          )?.kind ?? 'unknown'
      }
      if (kind === 'unknown' && options.unknownMembers === 'report') {
        context.report({
          node: property,
          messageId: 'unknownMember',
          data: { name, functionName },
        })
      }
      const group = kind === 'unknown' ? -1 : groupOf(name, kind)
      if (group < 0) {
        checkPartition(members)
        members = []
      } else {
        members.push({ node: property, name, group })
      }
    }
    checkPartition(members)
  }
}
