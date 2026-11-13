import {
  DEFAULT_SORT_OPTIONS,
  SELECTORS,
} from '../sort-statements/constants.ts'
import type {
  SortComposableBodyOptions,
  SortComposableBodySelector,
} from '../../types/index.ts'

/**
 * Body selectors exclude compiler macros even in script setup functions.
 */
export const BODY_SELECTORS = SELECTORS.filter(
  (selector): selector is SortComposableBodySelector =>
    !selector.startsWith('define-'),
)

/**
 * Body defaults preserve source order within each group and all existing gaps.
 */
export const DEFAULT_OPTIONS: Required<SortComposableBodyOptions> = {
  ...DEFAULT_SORT_OPTIONS,
  customGroups: [],
  functionPattern: '^use[A-Z]',
  ignoreNames: [],
  groups: [
    ['interface', 'type'],
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
  ],
}
