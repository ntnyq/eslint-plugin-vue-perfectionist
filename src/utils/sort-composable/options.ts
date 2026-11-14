import type {
  ComposableCustomGroup,
  ComposableGroupOverrides,
  ComposableMemberKindOverride,
  ComposableNewlines,
  SortComposableOptions,
} from '../../types/rules/sort-composable.ts'

interface ResolvedComposableGroup extends Required<ComposableGroupOverrides> {
  names: string[]
  before: ComposableNewlines
}

interface ResolvedComposableOptions {
  groups: ResolvedComposableGroup[]
  customGroups: (ComposableCustomGroup & { pattern: RegExp })[]
  memberKinds: (ComposableMemberKindOverride & {
    functionRegex: RegExp
    nameRegex: RegExp
  })[]
}

/**
 * Validate group references and resolve overrides once per file.
 */
function resolveGroups(
  options: SortComposableOptions,
): ResolvedComposableGroup[] {
  const available = new Set(['state', 'method'])

  for (const custom of options.customGroups ?? []) {
    if (available.has(custom.groupName)) {
      throw new Error(`Duplicate composable group: ${custom.groupName}`)
    }

    available.add(custom.groupName)
  }

  const groups: ResolvedComposableGroup[] = []
  const used = new Set<string>()
  let separator: ComposableNewlines | undefined

  for (const entry of options.groups ?? ['state', 'method']) {
    if (typeof entry === 'object' && 'newlinesBetween' in entry) {
      if (!groups.length || separator !== undefined) {
        throw new Error(
          'Composable newline separators must occur between groups.',
        )
      }

      separator = entry.newlinesBetween
      continue
    }

    const override =
      typeof entry === 'object' && 'group' in entry ? entry : undefined
    const names = override?.group ?? entry
    const groupNames = typeof names === 'string' ? [names] : names

    // Non-separator entries are strings, arrays, or group override objects.
    if (!Array.isArray(groupNames)) {
      throw new TypeError('Invalid composable group.')
    }

    for (const name of groupNames) {
      if (!available.has(name) || used.has(name)) {
        throw new Error(`Unknown or repeated composable group: ${name}`)
      }

      used.add(name)
    }

    groups.push({
      names: groupNames,
      type: override?.type ?? options.type ?? 'unsorted',
      order: override?.order ?? options.order ?? 'asc',
      newlinesInside: override?.newlinesInside ?? options.newlinesInside ?? 0,
      before: separator ?? options.newlinesBetween ?? 1,
    })
    separator = undefined
  }

  if (separator !== undefined) {
    throw new Error('Composable newline separators must occur between groups.')
  }

  return groups
}

/**
 * Validate groups and compile member patterns once per rule instance.
 */
export function resolveComposableOptions(
  options: SortComposableOptions,
): ResolvedComposableOptions {
  const groups = resolveGroups(options)
  const customGroups = (options.customGroups ?? []).map(group => ({
    ...group,
    pattern: new RegExp(group.elementNamePattern ?? ''),
  }))
  const memberKinds = (options.memberKinds ?? []).map(member => ({
    ...member,
    functionRegex: new RegExp(member.functionPattern),
    nameRegex: new RegExp(member.elementNamePattern),
  }))

  return {
    groups,
    customGroups,
    memberKinds,
  }
}
