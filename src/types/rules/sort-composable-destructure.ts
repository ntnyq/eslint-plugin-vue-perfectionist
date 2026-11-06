import type {
  SortComposableMessageId,
  SortComposableOptions,
} from './sort-composable.ts'

export interface SortComposableDestructureOptions extends SortComposableOptions {
  /**
   * Regular expression source for resolved import sources. Omitted by default;
   * when present, local and unresolved calls do not match.
   */
  importSourcePattern?: string
}

export type SortComposableDestructureMessageId = SortComposableMessageId
