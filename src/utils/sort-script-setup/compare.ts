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
    [...options.alphabet].map(
      /**
       * Associate an alphabet character with its configured priority.
       *
       * @param character - The alphabet character.
       * @param index - Its zero-based position in the alphabet.
       * @returns The character and priority pair.
       */
      (character, index) => [character, index],
    ),
  )
  return (
    /**
     * Compare two statements using the selected strategy and direction.
     *
     * @param left - The first statement.
     * @param right - The second statement.
     * @returns A negative result when left precedes right, zero for a tie, or a
     * positive result otherwise.
     * @throws {RangeError} If locale-based comparison receives an invalid locale
     * identifier.
     */
    (left, right) => {
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
  )
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
  const comparators = groups.map(
    /**
     * Create the primary and fallback comparator for a resolved group.
     *
     * @param group - The group containing its effective sorting options.
     * @param group.options - The effective sorting options for the group.
     * @returns The group comparator, or a comparator that always ties for an
     * unsorted group.
     * @throws {RangeError} If natural sorting receives an invalid locale
     * identifier.
     */
    ({ options }) => {
      if (options.type === 'unsorted') {
        return (
          /**
           * Preserve the relative order of statements in an unsorted group.
           *
           * @returns Zero, so the surrounding comparator retains original order.
           */
          () => 0
        )
      }
      const primary = createComparator(options.type, options.order, options)
      const fallback = createComparator(
        options.fallbackSort.type,
        options.fallbackSort.order ?? options.order,
        options,
      )
      return (
        /**
         * Apply the group fallback only when the primary comparison ties.
         *
         * @param left - The first statement.
         * @param right - The second statement.
         * @returns The primary ordering result, or the fallback result for a tie.
         * @throws {RangeError} If locale-based comparison receives an invalid
         * locale identifier.
         */
        (left: Statement, right: Statement) =>
          primary(left, right) || fallback(left, right)
      )
    },
  )
  return (
    /**
     * Compare group precedence, then group ordering, then original position.
     *
     * @param left - The first statement.
     * @param right - The second statement.
     * @returns A stable negative, zero, or positive ordering result.
     * @throws {RangeError} If locale-based comparison receives an invalid locale
     * identifier.
     */
    (left, right) =>
      left.group - right.group ||
      comparators[left.group]?.(left, right) ||
      left.index - right.index
  )
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
  const values = groups.slice(left.group + 1, right.group + 1).map(
    /**
     * Read the newline requirement preceding a crossed group boundary.
     *
     * @param group - The resolved group.
     * @returns The blank-line count or ignore policy before that group.
     */
    group => group.before,
  )
  const positive = values.filter(
    /**
     * Select explicit positive blank-line requirements.
     *
     * @param value - The newline policy to inspect.
     * @returns Whether the policy is a positive numeric count.
     */
    (value): value is number => isNumber(value) && value > 0,
  )
  if (positive.length) {
    return Math.max(...positive)
  }
  return values.includes('ignore') ? 'ignore' : 0
}
