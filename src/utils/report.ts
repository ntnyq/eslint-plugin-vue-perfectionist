import { getNewlines } from './compare.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  Group,
  ResolvedOptions,
  RuleContext,
  Statement,
} from '../types/index.ts'

function createReplacement(
  original: Statement[],
  ordered: Statement[],
  context: RuleContext,
): { range: TSESTree.Range; text: string } | undefined {
  const first = original[0]
  const last = original.at(-1)
  if (!first || !last || original.some(statement => !statement.safeKind)) {
    return undefined
  }
  const sourceCode = context.sourceCode
  const gaps = original
    .slice(0, -1)
    .map((statement, index) =>
      sourceCode.text.slice(statement.end, original[index + 1]?.start),
    )
  if (
    gaps.some(
      gap =>
        !/^[\t\v\f\r \u{A0}\u{1680}\u{2000}-\u{200A}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}]*\n\s*$/u.test(
          gap,
        ),
    )
  ) {
    return undefined
  }
  const next = sourceCode.getTokenAfter(last.node)
  if (next && /^[([/`+\-]/u.test(next.value)) {
    return undefined
  }
  const text = ordered
    .map(
      (statement, index) =>
        sourceCode.text.slice(statement.start, statement.end) +
        (gaps[index] ?? ''),
    )
    .join('')
  return { range: [first.start, last.end], text }
}

export function reportPartition(
  original: Statement[],
  ordered: Statement[],
  context: RuleContext,
  options: ResolvedOptions,
  groups: Group[],
) {
  const positions = new Map(
    original.map((statement, index) => [statement, index]),
  )
  const moved = new Set<Statement>()
  for (let start = 0; start < original.length; start++) {
    if (original[start] === ordered[start]) {
      continue
    }
    let end = start
    for (let cursor = start; cursor <= end; cursor++) {
      const desired = ordered[cursor]
      if (desired) {
        end = Math.max(end, positions.get(desired) ?? cursor)
      }
    }
    const current = original.slice(start, end + 1)
    const target = ordered.slice(start, end + 1)
    const first = current[0]
    const expected = target[0]
    if (!first || !expected) {
      continue
    }
    current.forEach(statement => moved.add(statement))
    const replacement = createReplacement(current, target, context)
    context.report({
      node: expected.node,
      messageId: replacement
        ? first.group === expected.group
          ? 'unexpectedOrder'
          : 'unexpectedGroupOrder'
        : 'unsafeReorder',
      data: {
        name: expected.name,
        before: first.name,
        group: groups[expected.group]?.names.join(' / ') ?? 'unknown',
      },
      fix:
        replacement && options.fix === 'safe'
          ? fixer => fixer.replaceTextRange(replacement.range, replacement.text)
          : null,
    })
    start = end
  }
  if (options.partitionByNewLine) {
    return
  }
  for (let index = 1; index < original.length; index++) {
    const left = original[index - 1]
    const right = original[index]
    if (!left || !right || moved.has(left) || moved.has(right)) {
      continue
    }
    const expected = getNewlines(left, right, groups, options)
    if (expected === 'ignore') {
      continue
    }
    const gap = context.sourceCode.text.slice(left.end, right.start)
    if (!/^\s*$/u.test(gap)) {
      continue
    }
    const count = Math.max(0, (gap.match(/\n/gu)?.length ?? 0) - 1)
    if (count === expected) {
      continue
    }
    const eol = context.sourceCode.text.includes('\r\n') ? '\r\n' : '\n'
    const indent = /[^\S\r\n]*$/u.exec(gap)?.[0] ?? ''
    context.report({
      node: right.node,
      messageId:
        left.group === right.group
          ? 'unexpectedNewlinesInside'
          : 'unexpectedNewlinesBetween',
      data: { count: expected },
      fix:
        options.fix === 'safe'
          ? fixer =>
              fixer.replaceTextRange(
                [left.end, right.start],
                eol.repeat(expected + 1) + indent,
              )
          : null,
    })
  }
}
