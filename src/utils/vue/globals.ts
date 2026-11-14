import { isArray, isBoolean } from '@ntnyq/utils'

/**
 * Rule-level globals override the shared opt-in, including an empty list. Each
 * rule supplies only the API names it already understands.
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
  const autoImport = getSharedBooleanSetting(settings, 'autoImport')

  return explicitGlobals ?? (autoImport ? [...supportedApis] : [])
}

/**
 * Resolve the VueUse integration opt-in, preserving an explicit rule override.
 *
 * @param settings - The shared ESLint settings.
 * @param explicitVueUse - The rule-level override.
 * @returns Whether the calling rule should recognize supported VueUse APIs.
 * @throws {Error} If shared vueuse is present but is not a boolean.
 */
export function resolveVueUse(
  settings: Record<string, unknown>,
  explicitVueUse?: boolean,
): boolean {
  const vueuse = getSharedBooleanSetting(settings, 'vueuse')

  return explicitVueUse ?? vueuse ?? false
}

/**
 * Read and validate one supported shared boolean setting.
 *
 * @param settings - The shared ESLint settings.
 * @param name - The supported setting to read.
 * @returns The configured boolean, or undefined when absent.
 * @throws {Error} If the configured value is not a boolean.
 */
function getSharedBooleanSetting(
  settings: Record<string, unknown>,
  name: 'autoImport' | 'vueuse',
): boolean | undefined {
  const shared = settings['vue-perfectionist']

  if (shared === null || typeof shared !== 'object' || isArray(shared)) {
    return undefined
  }

  const value: unknown = Reflect.get(shared, name)

  if (value !== undefined && !isBoolean(value)) {
    throw new Error(`vue-perfectionist: ${name} must be a boolean.`)
  }

  return value
}
