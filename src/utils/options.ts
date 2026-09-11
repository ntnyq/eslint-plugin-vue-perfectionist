import {
  COMMON_PROPERTIES,
  DEFAULT_OPTIONS,
  MODIFIERS,
  OPTIONS_SCHEMA,
  SELECTORS,
  VUE_APIS,
} from '../constants'
import type { JSONSchema } from '@typescript-eslint/utils'
import type {
  Group,
  GroupEntry,
  GroupOverrides,
  MatchCondition,
  Modifier,
  RegexOption,
  ResolvedOptions,
  RuleContext,
  Selector,
  Statement,
} from '../types'

function invalid(message: string): never {
  throw new Error(`sort-script-setup: ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Validate the subset of JSON Schema used by our own options, including settings
 * which ESLint does not pass through meta.schema.
 */
function matchesSchema(
  value: unknown,
  schema: JSONSchema.JSONSchema4,
): boolean {
  if (schema.anyOf) {
    return schema.anyOf.some(branch => matchesSchema(value, branch))
  }
  if ('enum' in schema && schema.enum) {
    const allowed: readonly unknown[] = schema.enum
    if (!allowed.includes(value)) {
      return false
    }
  }
  switch (schema.type) {
    case 'string':
      return (
        typeof value === 'string' && value.length >= (schema.minLength ?? 0)
      )
    case 'boolean':
      return typeof value === 'boolean'
    case 'integer':
      return (
        typeof value === 'number' &&
        Number.isSafeInteger(value) &&
        value >= (schema.minimum ?? 0)
      )
    case 'array': {
      if (!Array.isArray(value) || value.length < (schema.minItems ?? 0)) {
        return false
      }
      if (schema.uniqueItems && new Set(value).size !== value.length) {
        return false
      }
      const items = schema.items
      return (
        !items ||
        Array.isArray(items) ||
        value.every(entry => matchesSchema(entry, items))
      )
    }
    case 'object':
      if (!isRecord(value)) {
        return false
      }
      if (
        Array.isArray(schema.required) &&
        schema.required.some(key => !(key in value))
      ) {
        return false
      }
      return Object.entries(value).every(([key, entry]) => {
        const property = schema.properties?.[key]
        return property
          ? matchesSchema(entry, property)
          : schema.additionalProperties !== false
      })
    default:
      return true
  }
}

function validatePatterns(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(validatePatterns)
    return
  }
  if (!isRecord(value)) {
    return
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key.endsWith('Pattern')) {
      compilePatterns(entry as RegexOption)
    } else if (key === 'partitionByComment') {
      validateCommentPatterns(entry)
    } else {
      validatePatterns(entry)
    }
  }
}

function validateCommentPatterns(value: unknown): void {
  if (typeof value === 'boolean') {
    return
  }
  if (isRecord(value) && !('pattern' in value)) {
    Object.values(value).forEach(validateCommentPatterns)
    return
  }
  compilePatterns(value as RegexOption)
}

export function compilePatterns(pattern: RegexOption): RegExp[] {
  return (Array.isArray(pattern) ? pattern : [pattern]).map(entry => {
    try {
      return typeof entry === 'string'
        ? new RegExp(entry)
        : new RegExp(entry.pattern, entry.flags)
    } catch {
      return invalid(`Invalid regular expression: ${JSON.stringify(entry)}`)
    }
  })
}

export function matchesPattern(value: string, pattern: RegexOption): boolean {
  return compilePatterns(pattern).some(regex => regex.test(value))
}

export function parsePredefinedGroup(
  name: string,
): { selector: Selector; modifiers: Modifier[] } | undefined {
  const selector = SELECTORS.find(
    candidate => name === candidate || name.endsWith(`-${candidate}`),
  )
  if (!selector) {
    return undefined
  }
  const prefix = name.slice(0, -(selector.length + 1))
  const modifiers: Modifier[] = []
  if (name !== selector) {
    for (const part of prefix.split('-')) {
      const modifier = MODIFIERS.find(candidate => candidate === part)
      if (!modifier || modifiers.includes(modifier)) {
        return undefined
      }
      modifiers.push(modifier)
    }
  }
  if (!areModifiersValid(selector, modifiers)) {
    return undefined
  }
  return { selector, modifiers }
}

function areModifiersValid(selector: Selector, modifiers: Modifier[]): boolean {
  const declarationKinds = modifiers.filter(modifier =>
    ['const', 'let', 'var'].includes(modifier),
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
    modifiers.some(modifier =>
      ['const', 'let', 'var', 'destructured'].includes(modifier),
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
    declarationKinds.some(kind => kind !== 'const')
  ) {
    return false
  }
  return true
}

function normalizeGroupName(name: string): string {
  const parsed = parsePredefinedGroup(name)
  return parsed
    ? [
        ...MODIFIERS.filter(modifier => parsed.modifiers.includes(modifier)),
        parsed.selector,
      ].join('-')
    : name
}

export function getGroupNames(entry: GroupEntry): string[] {
  if (typeof entry === 'string') {
    return [entry]
  }
  if (Array.isArray(entry)) {
    return entry
  }
  if ('group' in entry) {
    return typeof entry.group === 'string' ? [entry.group] : entry.group
  }
  return []
}

function validateCondition(condition: MatchCondition): void {
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
    condition.modifiers?.filter(modifier =>
      ['const', 'let', 'var'].includes(modifier),
    ) ?? []
  if (kinds.length > 1) {
    invalid('Declaration modifiers are mutually exclusive.')
  }
}

export function resolveOptions(context: RuleContext): ResolvedOptions {
  const { perfectionist: upstream } = context.settings
  const own = context.settings['vue-perfectionist']
  if (own !== undefined && !isRecord(own)) {
    invalid('settings["vue-perfectionist"] must be an object.')
  }
  const shared: Record<string, unknown> = {}
  if (isRecord(upstream)) {
    for (const key of Object.keys(COMMON_PROPERTIES)) {
      if (key in upstream) {
        shared[key] = upstream[key]
      }
    }
  }
  if (isRecord(own)) {
    for (const [key, value] of Object.entries(own)) {
      if (!(key in COMMON_PROPERTIES)) {
        invalid(`Unknown shared option: ${key}`)
      }
      shared[key] = value
    }
  }
  const options = { ...DEFAULT_OPTIONS, ...shared, ...context.options[0] }
  for (const [key, value] of Object.entries(options)) {
    const properties: Record<string, JSONSchema.JSONSchema4> =
      OPTIONS_SCHEMA.properties
    const schema = properties[key]
    if (!schema || !matchesSchema(value, schema)) {
      invalid(`Invalid option: ${key}`)
    }
  }
  validatePatterns(options)
  try {
    Intl.Collator.supportedLocalesOf(options.locales)
  } catch {
    invalid('Invalid locales.')
  }
  if (new Set([...options.alphabet]).size !== [...options.alphabet].length) {
    invalid('alphabet must not contain duplicate characters.')
  }
  for (const name of options.vueGlobals) {
    if (!VUE_APIS.has(name)) {
      invalid(`Unknown Vue global: ${name}`)
    }
  }
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
  if (options.newlinesInside === 'newlinesBetween') {
    options.newlinesInside = options.newlinesBetween === 'ignore' ? 'ignore' : 0
  }
  for (const candidate of [
    options,
    ...options.groups.filter(
      entry => typeof entry === 'object' && !Array.isArray(entry),
    ),
    ...options.customGroups,
  ]) {
    if (options.partitionByNewLine) {
      for (const key of ['newlinesBetween', 'newlinesInside'] as const) {
        if (
          isRecord(candidate) &&
          Reflect.get(candidate, key) !== undefined &&
          Reflect.get(candidate, key) !== 'ignore'
        ) {
          invalid('partitionByNewLine cannot be combined with newline counts.')
        }
      }
    }
  }
  if (
    (options.type === 'custom' ||
      (options.type !== 'unsorted' &&
        options.fallbackSort.type === 'custom')) &&
    !options.alphabet
  ) {
    invalid('custom sorting requires a non-empty alphabet.')
  }
  return options
}

export function resolveGroups(options: ResolvedOptions): Group[] {
  const groups: Group[] = []
  let before = options.newlinesBetween
  for (const entry of options.groups) {
    const names = getGroupNames(entry)
    if (!names.length) {
      if (
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        'newlinesBetween' in entry
      ) {
        before = entry.newlinesBetween
      }
      continue
    }
    const overrides: GroupOverrides =
      typeof entry === 'object' && !Array.isArray(entry) && 'group' in entry
        ? entry
        : {}
    const custom =
      names.length === 1
        ? options.customGroups.find(group => group.groupName === names[0])
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

function matchesCondition(
  statement: Statement,
  condition: MatchCondition,
): boolean {
  const namePattern = condition.elementNamePattern
  return (
    (!condition.selector || condition.selector === statement.selector) &&
    (!condition.modifiers ||
      condition.modifiers.every(modifier =>
        statement.modifiers.includes(modifier),
      )) &&
    (!namePattern ||
      (statement.names.length ? statement.names : [statement.name]).some(name =>
        matchesPattern(name, namePattern),
      )) &&
    (!condition.callNamePattern ||
      (statement.callName !== undefined &&
        matchesPattern(statement.callName, condition.callNamePattern))) &&
    (!condition.importSourcePattern ||
      (statement.importSource !== undefined &&
        matchesPattern(statement.importSource, condition.importSourcePattern)))
  )
}

export function assignGroup(
  statement: Statement,
  groups: Group[],
  options: ResolvedOptions,
): boolean {
  const custom = options.customGroups.find(group =>
    'anyOf' in group && group.anyOf
      ? group.anyOf.some(condition => matchesCondition(statement, condition))
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
          parsed.modifiers.every(modifier =>
            statement.modifiers.includes(modifier),
          )
        ) {
          const score =
            parsed.modifiers.length * 100 +
            MODIFIERS.reduce(
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
  const best = candidates.sort((a, b) => b.score - a.score)[0]
  if (!best) {
    return false
  }
  statement.group = best.group
  statement.subgroup = best.subgroup
  return true
}
