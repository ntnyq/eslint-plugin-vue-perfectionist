import { isArray, isBoolean } from '@ntnyq/utils'
import { classifyStatement } from './classify.ts'
import { assignGroup } from './groups.ts'
import { matchesPattern } from './validation.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type { SourceCode } from '../../types/eslint.ts'
import type { CommentPartition } from '../../types/index.ts'
import type { Group, ResolvedOptions, Statement } from './types.ts'

/**
 * Check whether a comment starts a new sorting partition.
 *
 * @param comment - The line or block comment to inspect.
 * @param option - The Boolean, pattern, or comment-kind partition policy.
 * @returns Whether the comment matches the applicable partition policy.
 * @throws {Error} If a configured comment regular expression is invalid.
 */
function isPartitionComment(
  comment: TSESTree.Comment,
  option: CommentPartition,
): boolean {
  if (isBoolean(option)) {
    return option
  }
  if (
    typeof option === 'object' &&
    !isArray(option) &&
    !('pattern' in option)
  ) {
    const selected = comment.type === 'Line' ? option.line : option.block
    return selected === undefined
      ? false
      : isPartitionComment(comment, selected)
  }
  return matchesPattern(comment.value, option)
}

/**
 * Collect lines protected by ESLint and TypeScript directives.
 *
 * @param comments - The source comments in document order.
 * @returns Protected line numbers, with a negative start line marking an
 * unterminated disable range.
 */
function protectedLines(comments: TSESTree.Comment[]): Set<number> {
  const lines = new Set<number>()
  const disabled = new Set<string>()
  let start: number | undefined
  for (const comment of comments) {
    const directive =
      /^\s*eslint-(disable-next-line|disable-line|disable|enable)\b(.*)/su.exec(
        comment.value,
      )
    if (directive) {
      const operation = directive[1]
      const rules =
        (directive[2] ?? '')
          .split('--')[0]
          ?.trim()
          .split(/[\s,]+/u)
          .filter(Boolean) ?? []
      if (operation === 'disable-next-line') {
        lines.add(comment.loc.end.line + 1)
      } else if (operation === 'disable-line') {
        lines.add(comment.loc.start.line)
      } else if (operation === 'disable') {
        if (disabled.size === 0) {
          start = comment.loc.start.line
        }
        for (const rule of rules.length ? rules : ['*']) {
          disabled.add(rule)
        }
      } else {
        if (rules.length) {
          for (const rule of rules) {
            disabled.delete(rule)
          }
        } else {
          disabled.clear()
        }
        if (!disabled.size && start !== undefined) {
          for (let line = start; line <= comment.loc.end.line; line++) {
            lines.add(line)
          }
          start = undefined
        }
      }
    }
    if (/@ts-(?:expect-error|ignore|nocheck|check)\b/u.test(comment.value)) {
      lines.add(comment.loc.end.line + 1)
    }
  }
  if (start !== undefined) {
    lines.add(-start)
  }
  return lines
}

/**
 * Collect sortable statement runs without crossing protected boundaries.
 *
 * @param nodes - The script statements in source order.
 * @param sourceCode - The source code supplying comments, text, and scopes.
 * @param options - The resolved classification and partitioning options.
 * @param groups - The resolved groups used to assign statement precedence.
 * @returns Partitions with attached comment ranges, excluding unsupported or
 * protected statements.
 * @throws {Error} If a custom group or partition comment regular expression is
 * invalid.
 */
export function collectPartitions(
  nodes: TSESTree.ProgramStatement[],
  sourceCode: SourceCode,
  options: ResolvedOptions,
  groups: Group[],
): Statement[][] {
  const comments = sourceCode.getAllComments()
  const protectedSet = protectedLines(comments)
  const openStart = [...protectedSet].find(
    /**
     * Locate the sentinel for an unterminated ESLint disable range.
     *
     * @param line - The protected line entry.
     * @returns Whether the entry is a negative start-line sentinel.
     */
    line => line < 0,
  )
  const all = nodes.map(
    /**
     * Classify a statement while preserving its original position.
     *
     * @param node - The program statement.
     * @param index - The original index in the script body.
     * @returns The sortable statement metadata, or undefined for an unsupported
     * statement.
     */
    (node, index) => classifyStatement(node, sourceCode, options, index),
  )
  const nameCounts = new Map<string, number>()
  for (const statement of all) {
    for (const name of statement?.names ?? []) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
    }
  }
  const partitions: Statement[][] = []
  let partition: Statement[] = []
  /**
   * Append a nonempty partition and reset the current statement accumulator.
   */
  const flush = () => {
    if (partition.length) {
      partitions.push(partition)
    }
    partition = []
  }
  for (const [index, node] of nodes.entries()) {
    const statement = all[index]
    const before = sourceCode.getCommentsBefore(node).filter(
      /**
       * Exclude comments that trail the preceding statement.
       *
       * @param comment - The comment before the current statement.
       * @returns Whether its starting line differs from the previous
       * statement end line.
       */
      comment => comment.loc.start.line !== nodes[index - 1]?.loc.end.line,
    )
    const trailing = sourceCode.getCommentsAfter(node).filter(
      /**
       * Keep comments that trail the current statement on its final line.
       *
       * @param comment - The comment after the current statement.
       * @returns Whether it begins on the statement end line.
       */
      comment => comment.loc.start.line === node.loc.end.line,
    )
    const ownComments = comments.filter(
      /**
       * Select comments wholly contained in the current statement.
       *
       * @param comment - The source comment.
       * @returns Whether its range lies within the statement range.
       */
      comment =>
        comment.range[0] >= node.range[0] && comment.range[1] <= node.range[1],
    )
    const adjacent = [...before, ...ownComments, ...trailing]
    const hasDirective = adjacent.some(
      /**
       * Recognize directives and annotations that must not move with sorting.
       *
       * @param comment - The adjacent or contained comment.
       * @returns Whether the comment contains an ESLint, TypeScript, or purity
       * annotation marker.
       */
      comment =>
        /eslint-|@ts-(?:expect-error|ignore|nocheck|check)|[#@]__(?:PURE|NO_SIDE_EFFECTS)__/u.test(
          comment.value,
        ),
    )
    const isProtected =
      (openStart !== undefined && node.loc.end.line >= -openStart) ||
      [...protectedSet].some(
        /**
         * Check whether a protected line intersects the current statement.
         *
         * @param line - The protected line number.
         * @returns Whether the line lies within the statement line span.
         */
        line => line >= node.loc.start.line && line <= node.loc.end.line,
      )
    if (
      !statement ||
      hasDirective ||
      isProtected ||
      statement.modifiers.includes('declare') ||
      statement.names.some(
        /**
         * Detect names declared by multiple classified statements.
         *
         * @param name - The declared binding name.
         * @returns Whether more than one statement introduces the name.
         */
        name => (nameCounts.get(name) ?? 0) > 1,
      ) ||
      !assignGroup(statement, groups, options)
    ) {
      flush()
      continue
    }
    const marker = before.findLast(
      /**
       * Identify a leading comment that starts a new partition.
       *
       * @param comment - The leading comment.
       * @returns Whether the configured comment partition policy matches.
       * @throws {Error} If a configured comment regular expression is invalid.
       */
      comment => isPartitionComment(comment, options.partitionByComment),
    )
    const leading = marker
      ? before.filter(
          /**
           * Keep leading comments after the selected partition marker.
           *
           * @param comment - The leading comment.
           * @returns Whether it starts after the marker ends.
           */
          comment => comment.range[0] > marker.range[1],
        )
      : before
    if (
      leading.some(
        /**
         * Detect detached leading comments that prevent safe movement.
         *
         * @param comment - The leading comment.
         * @returns Whether at least one blank line separates it from the
         * statement.
         */
        comment => comment.loc.end.line + 1 < node.loc.start.line,
      )
    ) {
      statement.safeKind = undefined
    }
    if (marker) {
      flush()
    }
    statement.start = leading[0]?.range[0] ?? node.range[0]
    statement.end = trailing.at(-1)?.range[1] ?? node.range[1]
    const previous = partition.at(-1)
    if (previous) {
      const gap = sourceCode.text.slice(previous.end, statement.start)
      if (options.partitionByNewLine && /\r?\n[^\S\r\n]*\r?\n/u.test(gap)) {
        flush()
      }
    }
    partition.push(statement)
  }
  flush()
  return partitions
}
