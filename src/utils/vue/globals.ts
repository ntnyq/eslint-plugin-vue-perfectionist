import { isArray, isBoolean } from '@ntnyq/utils'

/**
 * Rule-level globals override the shared opt-in, including an empty list. Each
 * rule supplies only the Vue APIs it already understands.
 *
 * @param settings - The shared ESLint settings.
 * @param supportedApis - The APIs supported by the calling rule.
 * @param explicitGlobals - The explicit rule-level globals; an empty list
 * disables shared auto-import recognition.
 * @returns The explicit globals, all supported APIs when shared auto-import is
 * enabled, or an empty list.
 * @throws {Error} If shared autoImport is present but is not a boolean.
 */
export function resolveVueGlobals(
  settings: Record<string, unknown>,
  supportedApis: Iterable<string>,
  explicitGlobals?: string[],
): string[] {
  const shared = settings['vue-perfectionist']
  if (shared === null || typeof shared !== 'object' || isArray(shared)) {
    return explicitGlobals ?? []
  }
  const autoImport = 'autoImport' in shared ? shared.autoImport : undefined
  if (autoImport !== undefined && !isBoolean(autoImport)) {
    throw new Error('vue-perfectionist: autoImport must be a boolean.')
  }
  return explicitGlobals ?? (autoImport ? [...supportedApis] : [])
}
