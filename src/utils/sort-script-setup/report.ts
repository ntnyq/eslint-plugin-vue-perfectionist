import { getNewlines } from './compare.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SortScriptSetupRuleContext } from '../../types/index.ts'
import type { Group, ResolvedOptions, Statement } from './types.ts'

/** Bound generated whitespace before allocating a replacement string. */
const MAX_WHITESPACE_LENGTH = 65_536

/**
 * Build a reorder replacement only when statement and separator safety checks
 * pass.
 *
 * @param original - The contiguous statements in source order.
 * @param ordered - The same statements in the desired order.
 * @param context - The ESLint context supplying original source text and
 * tokens.
 * @returns The source range and replacement text, or undefined when reordering
 * cannot be proven safe.
 */
function createReplacement(
  original: Statement[],
  ordered: Statement[],
  context: SortScriptSetupRuleContext,
): { range: TSESTree.Range; text: string } | undefined {
  const first = original[0]
  const last = original.at(-1)
  if (
    !first ||
    !last ||
    original.some(
      /**
       * Detect statements without a safe reorder classification.
       *
       * @param statement - The original statement.
       * @returns Whether the statement lacks a safe kind.
       */
      statement => !statement.safeKind,
    )
  ) {
    return undefined
  }
  const sourceCode = context.sourceCode
  const gaps = original.slice(0, -1).map(
    /**
     * Read the separator following an original statement.
     *
     * @param statement - The statement preceding the separator.
     * @param index - Its position in the original slice.
     * @returns The source text between this statement and the next.
     */
    (statement, index) =>
      sourceCode.text.slice(statement.end, original[index + 1]?.start),
  )
  if (
    gaps.some(
      /**
       * Reject separators that do not contain exactly one safe line break.
       *
       * @param gap - The source text between adjacent statements.
       * @returns Whether the separator is unsuitable for safe reordering.
       */
      gap =>
        // cSpell: disable-next-line
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
      /**
       * Pair a reordered statement with the separator at its destination.
       *
       * @param statement - The statement in target order.
       * @param index - Its position in the target slice.
       * @returns The statement source text followed by the destination
       * separator.
       */
      (statement, index) =>
        sourceCode.text.slice(statement.start, statement.end) +
        (gaps[index] ?? ''),
    )
    .join('')
  return {
    range: [first.start, last.end],
    text,
  }
}

/**
 * Report ordering and newline violations with fixes limited to safe
 * replacements.
 *
 * @param original - The statements in original order.
 * @param ordered - The desired dependency-respecting statement order.
 * @param context - The ESLint context used to report diagnostics and read
 * source text.
 * @param options - The resolved fix and newline policy.
 * @param groups - The resolved groups used for diagnostic names and spacing.
 */
export function reportPartition(
  original: Statement[],
  ordered: Statement[],
  context: SortScriptSetupRuleContext,
  options: ResolvedOptions,
  groups: Group[],
) {
  const positions = new Map(
    original.map(
      /**
       * Index each original statement for movement range detection.
       *
       * @param statement - The statement in original order.
       * @param index - Its original zero-based index.
       * @returns The statement and original position pair.
       */
      (statement, index) => [statement, index],
    ),
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
    current.forEach(
      /**
       * Record a statement covered by an ordering diagnostic.
       *
       * @param statement - The statement being moved.
       * @returns The updated set of moved statements.
       */
      statement => moved.add(statement),
    )
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
          ? /**
             * Replace a verified-safe statement range with its reordered text.
             *
             * @param fixer - The ESLint fixer supplied for this diagnostic.
             * @returns The text replacement fix.
             */
            fixer => fixer.replaceTextRange(replacement.range, replacement.text)
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
    const replacementLength = eol.length * (expected + 1) + indent.length
    context.report({
      node: right.node,
      messageId:
        left.group === right.group
          ? 'unexpectedNewlinesInside'
          : 'unexpectedNewlinesBetween',
      data: { count: expected },
      fix:
        options.fix === 'safe' && replacementLength <= MAX_WHITESPACE_LENGTH
          ? /**
             * Replace inter-statement whitespace with the required blank-line
             * count.
             *
             * @param fixer - The ESLint fixer supplied for this diagnostic.
             * @returns A whitespace fix preserving the source line ending and
             * following indentation.
             */
            fixer =>
              fixer.replaceTextRange(
                [left.end, right.start],
                eol.repeat(expected + 1) + indent,
              )
          : null,
    })
  }
}
