import { isArray, isString } from '@ntnyq/utils'
import { MODIFIERS, SELECTORS } from '../../constants/sort-script-setup.ts'
import { invalid, matchesPattern } from './validation.ts'
import type {
  GroupEntry,
  GroupOverrides,
  MatchCondition,
  Modifier,
  Selector,
} from '../../types/rules/sort-script-setup.ts'
import type { Group, ResolvedOptions, Statement } from './types.ts'

/**
 * Parse a predefined group selector and its distinct valid modifiers.
 *
 * @param name - The configured group name.
 * @returns The selector and modifiers, or undefined for unknown names or
 * invalid combinations.
 */
export function parsePredefinedGroup(
  name: string,
): { selector: Selector; modifiers: Modifier[] } | undefined {
  const selector = SELECTORS.find(
    /**
     * Match the selector at the end of a predefined group name.
     *
     * @param candidate - The supported selector candidate.
     * @returns Whether the group is the selector itself or ends with its
     * hyphenated name.
     */
    candidate => name === candidate || name.endsWith(`-${candidate}`),
  )
  if (!selector) {
    return undefined
  }
  const prefix = name.slice(0, -(selector.length + 1))
  const modifiers: Modifier[] = []
  if (name !== selector) {
    for (const part of prefix.split('-')) {
      const modifier = MODIFIERS.find(
        /**
         * Match one modifier segment against the supported modifiers.
         *
         * @param candidate - The supported modifier candidate.
         * @returns Whether the candidate equals the current name segment.
         */
        candidate => candidate === part,
      )
      if (!modifier || modifiers.includes(modifier)) {
        return undefined
      }
      modifiers.push(modifier)
    }
  }
  if (!areModifiersValid(selector, modifiers)) {
    return undefined
  }
  return {
    selector,
    modifiers,
  }
}

/**
 * Check whether modifiers can coexist with the selected statement category.
 *
 * @param selector - The statement selector.
 * @param modifiers - The modifiers requested for the selector.
 * @returns Whether declaration, async, declare, and destructuring restrictions
 * are satisfied.
 */
function areModifiersValid(selector: Selector, modifiers: Modifier[]): boolean {
  const declarationKinds = modifiers.filter(
    /**
     * Select variable declaration kind modifiers.
     *
     * @param modifier - The configured modifier.
     * @returns Whether the modifier is const, let, or var.
     */
    modifier => ['const', 'let', 'var'].includes(modifier),
  )
  if (declarationKinds.length > 1) {
    return false
  }
  if (modifiers.includes('async') && selector !== 'function') {
    return false
  }
  if (
    modifiers.includes('declare') &&
    ![
      'interface',
      'type',
      'enum',
      'class',
      'function',
      'variable',
      'constant',
    ].includes(selector)
  ) {
    return false
  }
  if (
    modifiers.some(
      /**
       * Detect modifiers that require a variable declaration.
       *
       * @param modifier - The configured modifier.
       * @returns Whether it specifies a declaration kind or destructuring.
       */
      modifier => ['const', 'let', 'var', 'destructured'].includes(modifier),
    ) &&
    [
      'interface',
      'type',
      'enum',
      'class',
      'call',
      'define-options',
      'define-expose',
    ].includes(selector)
  ) {
    return false
  }
  if (
    modifiers.includes('destructured') &&
    ['constant', 'function'].includes(selector)
  ) {
    return false
  }
  if (
    selector === 'constant' &&
    declarationKinds.some(
      /**
       * Reject mutable declaration kinds for constant groups.
       *
       * @param kind - The declaration kind modifier.
       * @returns Whether the declaration kind differs from const.
       */
      kind => kind !== 'const',
    )
  ) {
    return false
  }
  return true
}

/**
 * Canonicalize predefined group modifier order for duplicate detection.
 *
 * @param name - The configured group name.
 * @returns The canonical predefined name, or the original custom name.
 */
function normalizeGroupName(name: string): string {
  const parsed = parsePredefinedGroup(name)
  return parsed
    ? [
        ...MODIFIERS.filter(
          /**
           * Keep the group modifiers in the shared canonical precedence order.
           *
           * @param modifier - The modifier in canonical order.
           * @returns Whether the parsed group includes the modifier.
           */
          modifier => parsed.modifiers.includes(modifier),
        ),
        parsed.selector,
      ].join('-')
    : name
}

/**
 * Extract group names from a string, list, or group override entry.
 *
 * @param entry - The configured group or newline separator.
 * @returns The group names, or an empty array for a separator.
 */
export function getGroupNames(entry: GroupEntry): string[] {
  if (isString(entry)) {
    return [entry]
  }
  if (isArray(entry)) {
    return entry
  }
  if ('group' in entry) {
    return isString(entry.group) ? [entry.group] : entry.group
  }
  return []
}

/**
 * Validate a custom group condition and its modifier combination.
 *
 * @param condition - The custom match condition.
 * @throws {Error} If the condition is empty or its selector and modifiers
 * cannot coexist.
 */
function validateCondition(condition: MatchCondition) {
  if (Object.keys(condition).length === 0) {
    invalid('Custom group conditions must not be empty.')
  }
  if (
    condition.selector &&
    !areModifiersValid(condition.selector, condition.modifiers ?? [])
  ) {
    invalid('Invalid selector/modifier combination.')
  }
  const kinds =
    condition.modifiers?.filter(
      /**
       * Select variable declaration kind modifiers.
       *
       * @param modifier - The configured modifier.
       * @returns Whether the modifier is const, let, or var.
       */
      modifier => ['const', 'let', 'var'].includes(modifier),
    ) ?? []
  if (kinds.length > 1) {
    invalid('Declaration modifiers are mutually exclusive.')
  }
}

/**
 * Resolve group-level sorting overrides and preceding newline policies.
 *
 * @param options - The resolved rule options containing group definitions.
 * @returns The groups in configured order with effective sorting and spacing
 * options.
 * @throws {Error} If effective custom sorting lacks a nonempty alphabet.
 */
export function resolveGroups(options: ResolvedOptions): Group[] {
  const groups: Group[] = []
  let before = options.newlinesBetween
  for (const entry of options.groups) {
    const names = getGroupNames(entry)
    if (!names.length) {
      if (
        typeof entry === 'object' &&
        !isArray(entry) &&
        'newlinesBetween' in entry
      ) {
        before = entry.newlinesBetween
      }
      continue
    }
    const overrides: GroupOverrides =
      typeof entry === 'object' && !isArray(entry) && 'group' in entry
        ? entry
        : {}
    const custom =
      names.length === 1
        ? options.customGroups.find(
            /**
             * Find a custom group matching the sole name in an entry.
             *
             * @param group - The custom group definition.
             * @returns Whether its name matches the configured group entry.
             */
            group => group.groupName === names[0],
          )
        : undefined
    const resolved = {
      ...options,
      ...(names.includes('unknown') ? { type: 'unsorted' as const } : {}),
      ...overrides,
      ...custom,
      fallbackSort: {
        ...options.fallbackSort,
        ...overrides.fallbackSort,
        ...custom?.fallbackSort,
      },
    }
    if (
      (resolved.type === 'custom' ||
        (resolved.type !== 'unsorted' &&
          resolved.fallbackSort.type === 'custom')) &&
      !resolved.alphabet
    ) {
      invalid('custom sorting requires a non-empty alphabet.')
    }
    groups.push({ names, options: resolved, before })
    before = options.newlinesBetween
  }
  return groups
}

/**
 * Check every configured selector, modifier, and pattern condition.
 *
 * @param statement - The classified statement to match.
 * @param condition - The custom group match condition.
 * @returns Whether the statement satisfies all specified conditions.
 * @throws {Error} If a configured regular expression is invalid.
 */
function matchesCondition(
  statement: Statement,
  condition: MatchCondition,
): boolean {
  const namePattern = condition.elementNamePattern
  return (
    (!condition.selector || condition.selector === statement.selector) &&
    (!condition.modifiers ||
      condition.modifiers.every(
        /**
         * Check whether the statement includes a required modifier.
         *
         * @param modifier - The required modifier.
         * @returns Whether the statement has the modifier.
         */
        modifier => statement.modifiers.includes(modifier),
      )) &&
    (!namePattern ||
      (statement.names.length ? statement.names : [statement.name]).some(
        /**
         * Match a declared or fallback statement name against the configured
         * pattern.
         *
         * @param name - The statement name to test.
         * @returns Whether any configured name pattern matches.
         * @throws {Error} If a configured regular expression is invalid.
         */
        name => matchesPattern(name, namePattern),
      )) &&
    (!condition.callNamePattern ||
      (statement.callName !== undefined &&
        matchesPattern(statement.callName, condition.callNamePattern))) &&
    (!condition.importSourcePattern ||
      (statement.importSource !== undefined &&
        matchesPattern(statement.importSource, condition.importSourcePattern)))
  )
}

/**
 * Assign the highest-priority matching group and subgroup to a statement.
 *
 * @param statement - The statement whose group and subgroup fields are updated.
 * @param groups - The resolved groups in precedence order.
 * @param options - The rule options containing custom group conditions.
 * @returns Whether a matching group was found and assigned.
 * @throws {Error} If a custom group regular expression is invalid.
 */
export function assignGroup(
  statement: Statement,
  groups: Group[],
  options: ResolvedOptions,
): boolean {
  const custom = options.customGroups.find(
    /**
     * Check a custom group using its direct condition or anyOf alternatives.
     *
     * @param group - The custom group definition.
     * @returns Whether any applicable condition matches the statement.
     * @throws {Error} If a configured regular expression is invalid.
     */
    group =>
      'anyOf' in group && group.anyOf
        ? group.anyOf.some(
            /**
             * Match one alternative custom group condition.
             *
             * @param condition - The alternative match condition.
             * @returns Whether the statement satisfies the condition.
             * @throws {Error} If a configured regular expression is invalid.
             */
            condition => matchesCondition(statement, condition),
          )
        : matchesCondition(statement, group),
  )
  const candidates: { group: number; subgroup: number; score: number }[] = []
  for (const [groupIndex, group] of groups.entries()) {
    for (const [subgroup, name] of group.names.entries()) {
      if (custom?.groupName === name) {
        candidates.push({ group: groupIndex, subgroup, score: 10000 })
      } else if (name === 'unknown') {
        candidates.push({ group: groupIndex, subgroup, score: -1 })
      } else {
        const parsed = parsePredefinedGroup(name)
        if (
          parsed?.selector === statement.selector &&
          parsed.modifiers.every(
            /**
             * Check whether the statement includes a required modifier.
             *
             * @param modifier - The required modifier.
             * @returns Whether the statement has the modifier.
             */
            modifier => statement.modifiers.includes(modifier),
          )
        ) {
          const score =
            parsed.modifiers.length * 100 +
            MODIFIERS.reduce(
              /**
               * Accumulate modifier precedence to break specificity ties.
               *
               * @param total - The precedence score accumulated so far.
               * @param modifier - The modifier at this precedence position.
               * @param index - The modifier index in the shared precedence
               * list.
               * @returns The accumulated score including this modifier when
               * present.
               */
              (total, modifier, index) =>
                total +
                (parsed.modifiers.includes(modifier)
                  ? 2 ** (MODIFIERS.length - index)
                  : 0),
              0,
            )
          candidates.push({ group: groupIndex, subgroup, score })
        }
      }
    }
  }
  const best = candidates.sort(
    /**
     * Order matching groups by descending specificity score.
     *
     * @param a - The first group candidate.
     * @param b - The second group candidate.
     * @returns A negative result when the first candidate has higher priority.
     */
    (a, b) => b.score - a.score,
  )[0]
  if (!best) {
    return false
  }
  statement.group = best.group
  statement.subgroup = best.subgroup
  return true
}

/**
 * Validate group names, custom conditions, references, and separators.
 *
 * @param options - The resolved options containing predefined and custom
 * groups.
 * @throws {Error} If groups are unknown, duplicated, unreferenced, invalid, or
 * separated incorrectly.
 */
export function validateGroups(options: ResolvedOptions) {
  const customNames = new Set<string>()
  for (const custom of options.customGroups) {
    if (
      customNames.has(custom.groupName) ||
      custom.groupName === 'unknown' ||
      parsePredefinedGroup(custom.groupName)
    ) {
      invalid(`Invalid or duplicate custom group: ${custom.groupName}`)
    }
    customNames.add(custom.groupName)
    if ('anyOf' in custom && custom.anyOf) {
      custom.anyOf.forEach(validateCondition)
    } else {
      const {
        groupName,
        type,
        order,
        fallbackSort,
        newlinesInside,
        ...condition
      } = custom
      validateCondition(condition)
    }
  }
  const seen = new Set<string>()
  let previousWasSeparator = true
  for (const entry of options.groups) {
    const names = getGroupNames(entry)
    if (!names.length) {
      if (previousWasSeparator) {
        invalid('Newline separators must be between groups.')
      }
      previousWasSeparator = true
      continue
    }
    previousWasSeparator = false
    for (const name of names) {
      if (
        name !== 'unknown' &&
        !customNames.has(name) &&
        !parsePredefinedGroup(name)
      ) {
        invalid(`Unknown group: ${name}`)
      }
      const normalized = normalizeGroupName(name)
      if (seen.has(normalized)) {
        invalid(`Duplicate group: ${name}`)
      }
      seen.add(normalized)
    }
  }
  if (previousWasSeparator && options.groups.length) {
    invalid('Newline separators must be between groups.')
  }
  for (const name of customNames) {
    if (!seen.has(name)) {
      invalid(`Custom group is not referenced in groups: ${name}`)
    }
  }
}
