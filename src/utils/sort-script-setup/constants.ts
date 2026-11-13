import { DEFAULT_SORT_OPTIONS } from '../sort-statements/constants.ts'
import type { Selector } from '../../types/index.ts'
import type { ResolvedOptions } from '../sort-statements/types.ts'

/**
 * Compiler macro names and their statement categories.
 */
export const MACROS = new Map<string, Selector>([
  ['defineEmits', 'define-emits'],
  ['defineExpose', 'define-expose'],
  ['defineModel', 'define-model'],
  ['defineOptions', 'define-options'],
  ['defineProps', 'define-props'],
  ['defineSlots', 'define-slots'],
])

/**
 * Defaults preserve intra-group order and whitespace until explicitly configured.
 */
export const DEFAULT_OPTIONS: ResolvedOptions = {
  ...DEFAULT_SORT_OPTIONS,
  groups: [
    ['interface', 'type'],
    'define-options',
    'define-props',
    'define-emits',
    'define-slots',
    'define-model',
    'constant',
    'inject',
    'composable',
    'template-ref',
    ['ref', 'reactive'],
    'computed',
    'variable',
    ['enum', 'class'],
    'function',
    'watch',
    'lifecycle-hook',
    'provide',
    'define-expose',
  ],
}
