import { compare as createNaturalCompare } from 'natural-orderby'
import type {
  Group,
  Newlines,
  ResolvedOptions,
  SortOrder,
  SortType,
  Statement,
} from '../types'

function formatName(name: string, options: ResolvedOptions): string {
  let formatted = options.ignoreCase ? name.toLowerCase() : name
  if (options.specialCharacters === 'trim') {
    formatted = formatted.replace(
      /^[^a-z\u{C0}-\u{24F}\u{1E00}-\u{1EFF}]+/giu,
      '',
    )
  } else if (options.specialCharacters === 'remove') {
    formatted = formatted.replace(
      /[^a-z\u{C0}-\u{24F}\u{1E00}-\u{1EFF}]+/giu,
      '',
    )
  }
  return formatted.replace(/\s/gu, '')
}

function createComparator(
  type: SortType | 'subgroup-order',
  order: SortOrder,
  options: ResolvedOptions,
): (left: Statement, right: Statement) => number {
  const direction = order === 'asc' ? 1 : -1
  const natural =
    type === 'natural'
      ? createNaturalCompare({ locale: options.locales.toString() })
      : undefined
  const alphabet = new Map(
    [...options.alphabet].map((character, index) => [character, index]),
  )
  return (left, right) => {
    if (type === 'unsorted') {
      return 0
    }
    if (type === 'subgroup-order') {
      return (left.subgroup - right.subgroup) * direction
    }
    if (type === 'line-length') {
      return (left.size - right.size) * direction
    }
    const a = formatName(left.name, options)
    const b = formatName(right.name, options)
    if (type === 'alphabetical') {
      return a.localeCompare(b, options.locales) * direction
    }
    if (natural) {
      return natural(a, b) * direction
    }
    for (let index = 0; index < Math.min(a.length, b.length); index++) {
      const first = alphabet.get(a.charAt(index)) ?? Infinity
      const second = alphabet.get(b.charAt(index)) ?? Infinity
      if (first !== second) {
        return (first > second ? 1 : -1) * direction
      }
    }
    return (a.length - b.length) * direction
  }
}

export function createStatementComparator(
  groups: Group[],
): (left: Statement, right: Statement) => number {
  const comparators = groups.map(({ options }) => {
    if (options.type === 'unsorted') {
      return () => 0
    }
    const primary = createComparator(options.type, options.order, options)
    const fallback = createComparator(
      options.fallbackSort.type,
      options.fallbackSort.order ?? options.order,
      options,
    )
    return (left: Statement, right: Statement) =>
      primary(left, right) || fallback(left, right)
  })
  return (left, right) =>
    left.group - right.group ||
    comparators[left.group]?.(left, right) ||
    left.index - right.index
}

export function getNewlines(
  left: Statement,
  right: Statement,
  groups: Group[],
  options: ResolvedOptions,
): Newlines {
  if (left.group === right.group) {
    const inside = groups[left.group]?.options.newlinesInside ?? 'ignore'
    return inside === 'newlinesBetween'
      ? options.newlinesBetween === 'ignore'
        ? 'ignore'
        : 0
      : inside
  }
  if (left.group > right.group) {
    return options.newlinesBetween
  }
  const values = groups
    .slice(left.group + 1, right.group + 1)
    .map(group => group.before)
  const positive = values.filter(
    (value): value is number => typeof value === 'number' && value > 0,
  )
  if (positive.length) {
    return Math.max(...positive)
  }
  return values.includes('ignore') ? 'ignore' : 0
}
