import { isArray, isBoolean } from '@ntnyq/utils'

/**
 * Rule-level globals override the shared opt-in, including an empty list.
 * Each rule supplies only the Vue APIs it already understands.
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
