import { isArray } from '@ntnyq/utils'
import { DEFAULT_OPTIONS, VUE_APIS } from '../../constants/sort-script-setup.ts'
import { resolveVueGlobals } from '../vue/globals.ts'
import { validateGroups } from './groups.ts'
import { invalid, isRecord, validateDefinedOptions } from './validation.ts'
import type { SortScriptSetupRuleContext } from '../../types/rules/sort-script-setup.ts'
import type { ResolvedOptions } from './types.ts'

/**
 * Merge defaults and validate the effective script sorting configuration.
 *
 * @param context - The ESLint context containing rule options and shared
 * settings.
 * @returns The validated options with effective Vue globals and normalized
 * newline settings.
 * @throws {Error} If shared auto-import settings, locales,
 * groups, or option combinations are invalid.
 */
export function resolveOptions(
  context: SortScriptSetupRuleContext,
): ResolvedOptions {
  const options = { ...DEFAULT_OPTIONS, ...context.options[0] }
  options.vueGlobals = resolveVueGlobals(
    context.settings,
    VUE_APIS.keys(),
    context.options[0]?.vueGlobals,
  )
  validateDefinedOptions(options)
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
  validateGroups(options)
  if (options.newlinesInside === 'newlinesBetween') {
    options.newlinesInside = options.newlinesBetween === 'ignore' ? 'ignore' : 0
  }
  for (const candidate of [
    options,
    ...options.groups.filter(
      /**
       * Select object group entries that can contain newline overrides.
       *
       * @param entry - The configured group entry.
       * @returns Whether the entry is an object rather than a string or group
       * array.
       */
      entry => typeof entry === 'object' && !isArray(entry),
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
