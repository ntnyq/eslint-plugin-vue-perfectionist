import { isArray, isBoolean, isString } from '@ntnyq/utils'
import type { RegexOption } from '../../types/rules/sort-script-setup.ts'

/**
 * Throw a configuration error prefixed with the sorting rule name.
 *
 * @param message - The configuration failure to describe.
 * @throws {Error} Always, with the rule-prefixed message.
 */
export function invalid(message: string): never {
  throw new Error(`sort-script-setup: ${message}`)
}

/**
 * Check whether an unknown value is a non-null, non-array object.
 *
 * @param value - The candidate option object.
 * @returns Whether the value can be inspected as a string-keyed record.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !isArray(value)
}

/**
 * Preserve rejection of explicit undefined properties, which ESLint's schema
 * treats as absent even though option spreading retains them.
 *
 * @param value - The effective option tree after Vue globals are resolved.
 * @throws {Error} If a configured property explicitly contains undefined.
 */
export function validateDefinedOptions(value: unknown) {
  if (isArray(value)) {
    value.forEach(validateDefinedOptions)
    return
  }
  if (!isRecord(value)) {
    return
  }
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      invalid(`Invalid option: ${key}`)
    }
    validateDefinedOptions(entry)
  }
}

/**
 * Compile a pattern or pattern list into regular expressions.
 *
 * @param pattern - The configured string, pattern descriptor, or list.
 * @returns The compiled regular expressions in configuration order.
 * @throws {Error} If a pattern or its flags cannot form a valid regular
 * expression.
 */
function compilePatterns(pattern: RegexOption): RegExp[] {
  return (isArray(pattern) ? pattern : [pattern]).map(
    /**
     * Compile one configured expression and normalize compilation failures.
     *
     * @param entry - The pattern string or descriptor.
     * @returns The compiled regular expression.
     * @throws {Error} If the pattern or flags are invalid.
     */
    entry => {
      try {
        return isString(entry)
          ? new RegExp(entry)
          : new RegExp(entry.pattern, entry.flags)
      } catch {
        return invalid(`Invalid regular expression: ${JSON.stringify(entry)}`)
      }
    },
  )
}

export type PatternMatcher = (value: string, pattern: RegexOption) => boolean

/**
 * Compile configured expressions once per rule instance and keep stateful flags
 * independent of earlier names and comments.
 *
 * @param options - The resolved option tree containing match and comment patterns.
 * @returns A matcher sharing the validated expressions for this configuration.
 * @throws {Error} If any configured expression or flags are invalid.
 */
export function createPatternMatcher(options: unknown): PatternMatcher {
  const cache = new Map<RegexOption, RegExp[]>()
  function getPatterns(pattern: RegexOption): RegExp[] {
    let expressions = cache.get(pattern)
    if (!expressions) {
      expressions = compilePatterns(pattern)
      cache.set(pattern, expressions)
    }
    return expressions
  }
  function visitComments(value: unknown) {
    if (isBoolean(value)) {
      return
    }
    if (isRecord(value) && !('pattern' in value)) {
      Object.values(value).forEach(visitComments)
      return
    }
    getPatterns(value as RegexOption)
  }
  function visit(value: unknown) {
    if (isArray(value)) {
      value.forEach(visit)
    } else if (isRecord(value)) {
      for (const [key, entry] of Object.entries(value)) {
        if (key.endsWith('Pattern')) {
          getPatterns(entry as RegexOption)
        } else if (key === 'partitionByComment') {
          visitComments(entry)
        } else {
          visit(entry)
        }
      }
    }
  }
  visit(options)
  return (value, pattern) =>
    getPatterns(pattern).some(regex => {
      // Both g and y mutate lastIndex, including after successful matches.
      regex.lastIndex = 0
      return regex.test(value)
    })
}
