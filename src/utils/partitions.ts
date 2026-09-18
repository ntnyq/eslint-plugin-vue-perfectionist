import { isArray, isBoolean } from '@ntnyq/utils'
import { classifyStatement } from './classify.ts'
import { assignGroup, matchesPattern } from './options.ts'
import type { TSESTree } from '@typescript-eslint/utils'
import type {
  CommentPartition,
  Group,
  ResolvedOptions,
  SourceCode,
  Statement,
} from '../types/index.ts'

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

export function collectPartitions(
  nodes: TSESTree.ProgramStatement[],
  sourceCode: SourceCode,
  options: ResolvedOptions,
  groups: Group[],
): Statement[][] {
  const comments = sourceCode.getAllComments()
  const protectedSet = protectedLines(comments)
  const openStart = [...protectedSet].find(line => line < 0)
  const all = nodes.map((node, index) =>
    classifyStatement(node, sourceCode, options, index),
  )
  const nameCounts = new Map<string, number>()
  for (const statement of all) {
    for (const name of statement?.names ?? []) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
    }
  }
  const partitions: Statement[][] = []
  let partition: Statement[] = []
  const flush = () => {
    if (partition.length) {
      partitions.push(partition)
    }
    partition = []
  }
  for (const [index, node] of nodes.entries()) {
    const statement = all[index]
    const before = sourceCode
      .getCommentsBefore(node)
      .filter(
        comment => comment.loc.start.line !== nodes[index - 1]?.loc.end.line,
      )
    const trailing = sourceCode
      .getCommentsAfter(node)
      .filter(comment => comment.loc.start.line === node.loc.end.line)
    const ownComments = comments.filter(
      comment =>
        comment.range[0] >= node.range[0] && comment.range[1] <= node.range[1],
    )
    const adjacent = [...before, ...ownComments, ...trailing]
    const hasDirective = adjacent.some(comment =>
      /eslint-|@ts-(?:expect-error|ignore|nocheck|check)|[#@]__(?:PURE|NO_SIDE_EFFECTS)__/u.test(
        comment.value,
      ),
    )
    const isProtected =
      (openStart !== undefined && node.loc.end.line >= -openStart) ||
      [...protectedSet].some(
        line => line >= node.loc.start.line && line <= node.loc.end.line,
      )
    if (
      !statement ||
      hasDirective ||
      isProtected ||
      statement.modifiers.includes('declare') ||
      statement.names.some(name => (nameCounts.get(name) ?? 0) > 1) ||
      !assignGroup(statement, groups, options)
    ) {
      flush()
      continue
    }
    const marker = before.findLast(comment =>
      isPartitionComment(comment, options.partitionByComment),
    )
    const leading = marker
      ? before.filter(comment => comment.range[0] > marker.range[1])
      : before
    if (
      leading.some(comment => comment.loc.end.line + 1 < node.loc.start.line)
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
