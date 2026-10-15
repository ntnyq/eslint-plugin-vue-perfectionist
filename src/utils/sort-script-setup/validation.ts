import { isArray, isBoolean, isNumber, isString } from '@ntnyq/utils'
import type { JSONSchema } from '@typescript-eslint/utils'
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
 * Validate the subset of JSON Schema used by the resolved rule options.
 *
 * @param value - The option value to validate.
 * @param schema - The schema describing the supported constraints.
 * @returns Whether the value satisfies the implemented schema constraints.
 */
export function matchesSchema(
  value: unknown,
  schema: JSONSchema.JSONSchema4,
): boolean {
  if (schema.anyOf) {
    return schema.anyOf.some(
      /**
       * Check one anyOf schema alternative.
       *
       * @param branch - The candidate schema branch.
       * @returns Whether the value matches that branch.
       */
      branch => matchesSchema(value, branch),
    )
  }
  if ('enum' in schema && schema.enum) {
    const allowed: readonly unknown[] = schema.enum
    if (!allowed.includes(value)) {
      return false
    }
  }
  switch (schema.type) {
    case 'string':
      return isString(value) && value.length >= (schema.minLength ?? 0)
    case 'boolean':
      return isBoolean(value)
    case 'integer':
      return (
        isNumber(value) &&
        Number.isSafeInteger(value) &&
        value >= (schema.minimum ?? 0)
      )
    case 'array': {
      if (!isArray(value) || value.length < (schema.minItems ?? 0)) {
        return false
      }
      if (schema.uniqueItems && new Set(value).size !== value.length) {
        return false
      }
      const items = schema.items
      return (
        !items ||
        isArray(items) ||
        value.every(
          /**
           * Check an array element against the shared item schema.
           *
           * @param entry - The array element.
           * @returns Whether the element matches the item schema.
           */
          entry => matchesSchema(entry, items),
        )
      )
    }
    case 'object':
      if (!isRecord(value)) {
        return false
      }
      if (
        isArray(schema.required) &&
        schema.required.some(
          /**
           * Detect a missing required object key.
           *
           * @param key - The required property name.
           * @returns Whether the property is absent from the option object.
           */
          key => !(key in value),
        )
      ) {
        return false
      }
      return Object.entries(value).every(
        /**
         * Validate a declared object property or apply the additional-property
         * policy.
         *
         * @param entry - The property name and its option value.
         * @param entry."0" - The option property name.
         * @param entry."1" - The property value to validate.
         * @returns Whether the property value matches its schema or is permitted
         * as an additional property.
         */
        ([key, entry]) => {
          const property = schema.properties?.[key]
          return property
            ? matchesSchema(entry, property)
            : schema.additionalProperties !== false
        },
      )
    default:
      return true
  }
}

/**
 * Recursively validate regular expressions embedded in resolved options.
 *
 * @param value - The option tree to inspect.
 * @throws {Error} If a configured pattern or comment partition expression is
 * invalid.
 */
export function validatePatterns(value: unknown) {
  if (isArray(value)) {
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

/**
 * Validate Boolean, patterned, or per-comment-kind partition settings.
 *
 * @param value - The comment partition configuration.
 * @throws {Error} If any comment partition regular expression is invalid.
 */
function validateCommentPatterns(value: unknown) {
  if (isBoolean(value)) {
    return
  }
  if (isRecord(value) && !('pattern' in value)) {
    Object.values(value).forEach(validateCommentPatterns)
    return
  }
  compilePatterns(value as RegexOption)
}

/**
 * Compile a pattern or pattern list into regular expressions.
 *
 * @param pattern - The configured string, pattern descriptor, or list.
 * @returns The compiled regular expressions in configuration order.
 * @throws {Error} If a pattern or its flags cannot form a valid regular
 * expression.
 */
export function compilePatterns(pattern: RegexOption): RegExp[] {
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

/**
 * Check whether any configured regular expression matches a string.
 *
 * @param value - The string to test.
 * @param pattern - The pattern or pattern list to compile.
 * @returns Whether at least one expression matches the string.
 * @throws {Error} If a pattern or its flags are invalid.
 */
export function matchesPattern(value: string, pattern: RegexOption): boolean {
  return compilePatterns(pattern).some(
    /**
     * Test one compiled pattern against the candidate value.
     *
     * @param regex - The newly compiled regular expression.
     * @returns Whether the expression matches the value.
     */
    regex => regex.test(value),
  )
}
