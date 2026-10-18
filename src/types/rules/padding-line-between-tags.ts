/**
 * Required blank lines: an exact nonnegative safe integer, at least one, none, or
 * unchecked. Omitted policies default to exactly one blank line.
 */
export type PaddingLineBetweenTagsBlankLine =
  | 'always'
  | 'ignore'
  | 'never'
  | number

/**
 * Match one concrete tag on both sides, or an ordered pair of source tag names.
 * The full form accepts '*' on either side. The two forms are mutually exclusive.
 */
export type PaddingLineBetweenTagsEntry = {
  /**
   * Blank-line policy for this pair. Defaults to 1.
   */
  blankLine?: PaddingLineBetweenTagsBlankLine
} & (
  | {
      /**
       * Concrete source tag name to match on both sides; '*' is not accepted.
       */
      tag: string
      next?: never
      prev?: never
    }
  | {
      /**
       * Next source tag name, or '*' to match any tag.
       */
      next: string
      /**
       * Previous source tag name, or '*' to match any tag.
       */
      prev: string
      tag?: never
    }
)

/**
 * Ordered matching entries; the last match wins. Replaces the default wildcard
 * entry requiring exactly one blank line. An empty array disables checks.
 */
export type PaddingLineBetweenTagsOptions = PaddingLineBetweenTagsEntry[]

export type PaddingLineBetweenTagsMessageId =
  | 'expectedAtLeastOneBlankLine'
  | 'expectedBlankLines'
