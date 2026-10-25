import { isNumber } from '@ntnyq/utils'
import { compare as createNaturalCompare } from 'natural-orderby'
import type { Newlines, SortOrder, SortType } from '../../types/index.ts'
import type { Group, ResolvedOptions, Statement } from './types.ts'

/**
 * Normalize a statement name for the configured text comparison.
 *
 * @param name - The raw statement name.
 * @param options - The case and special-character handling options.
 * @returns The normalized name with whitespace removed.
 */
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

/**
 * Create a comparator for one sorting strategy and direction.
 *
 * @param type - The text, size, subgroup, or unsorted strategy.
 * @param order - The ascending or descending direction.
 * @param options - The locale, alphabet, and name normalization options.
 * @returns A comparator returning a negative, zero, or positive ordering
 * result.
 * @throws {RangeError} If natural sorting receives an invalid locale
 * identifier.
 */
function createComparator(
  type: SortType | 'subgroup-order',
  order: SortOrder,
  options: ResolvedOptions,
): (left: Statement, right: Statement) => number {
  const direction = order === 'asc' ? 1 : -1
  const natural =
    type === 'natural'
      ? createNaturalCompare({
          locale: new Intl.Collator(options.locales).resolvedOptions().locale,
        })
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
      // natural-orderby folds case internally. Resolve case-only ties after
      // its numeric comparison, before applying the configured fallback.
      const result = natural(a, b)
      const caseOrder =
        !result && !options.ignoreCase && a.toLowerCase() === b.toLowerCase()
          ? a.localeCompare(b, options.locales)
          : 0
      return (result || caseOrder) * direction
    }
    const leftCharacters = [...a]
    const rightCharacters = [...b]
    for (const [index, character] of leftCharacters.entries()) {
      const other = rightCharacters[index]
      if (other === undefined) {
        break
      }
      const first = alphabet.get(character) ?? Infinity
      const second = alphabet.get(other) ?? Infinity
      if (first !== second) {
        return (first > second ? 1 : -1) * direction
      }
    }
    return (leftCharacters.length - rightCharacters.length) * direction
  }
}

/**
 * Create a stable comparator combining groups, primary sorting, and fallbacks.
 *
 * @param groups - The resolved groups in precedence order.
 * @returns A statement comparator that breaks remaining ties by original index.
 * @throws {RangeError} If natural sorting receives an invalid locale
 * identifier.
 */
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

/**
 * Resolve the blank-line requirement between two adjacent statements.
 *
 * @param left - The preceding statement.
 * @param right - The following statement.
 * @param groups - The resolved groups and their newline overrides.
 * @param options - The rule-wide newline policy.
 * @returns The required blank-line count, or ignore when spacing is
 * unconstrained.
 */
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
    (value): value is number => isNumber(value) && value > 0,
  )
  if (positive.length) {
    return Math.max(...positive)
  }
  return values.includes('ignore') ? 'ignore' : 0
}
