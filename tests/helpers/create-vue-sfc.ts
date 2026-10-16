import { joinNonEmptyValues, toArray, unindent } from '@ntnyq/utils'

/**
 * Complete Vue SFC blocks to normalize and combine into test source code.
 */
export interface CreateVueSFCOptions {
  /**
   * A complete script block or an ordered array of complete script blocks,
   * including opening and closing tags and any attributes such as setup or lang.
   * Each block is unindented independently, preserving relative indentation.
   * Omitted, empty, and whitespace-only blocks are ignored.
   */
  script?: string | readonly string[]

  /**
   * A complete template block, including its opening and closing tags.
   * The block is unindented independently and placed after all script blocks.
   * Omitted, empty, and whitespace-only content is ignored.
   */
  template?: string
}

/**
 * Creates Vue SFC test source from complete script and template blocks.
 * Removes outer blank lines and common indentation from each block while
 * preserving its relative indentation and internal blank lines. Non-empty
 * script blocks retain their input order and precede the template block,
 * with one blank line between blocks. Tags are neither added nor validated,
 * and block contents are not otherwise formatted.
 *
 * @param options - Optional complete script and template blocks.
 *
 * @returns The combined source, or an empty string when no non-empty blocks
 * are provided.
 *
 * @example
 * ```ts
 * createVueSFC({
 *   script: [
 *     '<script lang="ts">export interface Props { title: string }</script>',
 *     '<script setup lang="ts">defineProps<Props>()</script>',
 *   ],
 *   template: '<template><div>{{ title }}</div></template>',
 * })
 * ```
 */
export function createVueSFC(options: CreateVueSFCOptions = {}): string {
  return joinNonEmptyValues(
    [...toArray(options.script), options.template].map(block =>
      unindent(block ?? ''),
    ),
    { separator: '\n\n' },
  )
}
