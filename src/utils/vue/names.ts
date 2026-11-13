/**
 * Normalize component or prop names to lowercase hyphenated spelling.
 *
 * @param name - The name to normalize.
 * @returns The name with noninitial uppercase letters prefixed by hyphens and
 * all letters lowercased.
 */
export function hyphenateName(name: string): string {
  return name.replace(/\B([A-Z])/gu, '-$1').toLowerCase()
}

/**
 * Normalize hyphenated prop aliases to camel-case names.
 *
 * @param name - The raw prop name.
 * @returns The name with each hyphen-word-character pair replaced by its
 * uppercase character.
 */
export function normalizePropName(name: string): string {
  return name.replace(
    /-(\w)/gu,
    /**
     * Convert a hyphenated character match to camel case.
     *
     * @param _ - The full hyphen-character match, which is unused.
     * @param character - The captured character following the hyphen.
     * @returns The uppercase character.
     */
    (_, character: string) => character.toUpperCase(),
  )
}
