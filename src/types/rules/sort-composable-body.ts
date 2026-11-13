import type {
  CommonSortOptions,
  GroupEntry,
  GroupOverrides,
  MatchCondition,
  Selector,
  SortScriptSetupMessageId,
} from './sort-script-setup.ts'

/**
 * Runtime and declaration selectors available inside composable bodies.
 */
export type SortComposableBodySelector = Exclude<Selector, `define-${string}`>

/**
 * ANDed filters for one custom statement group.
 */
export interface SortComposableBodyMatchCondition extends Omit<
  MatchCondition,
  'selector'
> {
  /**
   * Statement category; compiler macros are unavailable in function bodies.
   */
  selector?: SortComposableBodySelector
}

/**
 * A named statement group with ANDed filters or ORed conditions.
 */
export type SortComposableBodyCustomGroup = GroupOverrides & {
  groupName: string
} & (
    | (SortComposableBodyMatchCondition & { anyOf?: never })
    | { anyOf: SortComposableBodyMatchCondition[] }
  )

/**
 * Sort direct statements in conventionally named composable functions.
 */
export interface SortComposableBodyOptions extends CommonSortOptions {
  /**
   * Custom group definitions, replacing the empty default list.
   */
  customGroups?: SortComposableBodyCustomGroup[]
  /**
   * Enable conservative movement and whitespace fixes; defaults to 'safe'.
   */
  fix?: 'none' | 'safe'
  /**
   * Case-sensitive regular expression source for binding names; defaults to '^use[A-Z]'.
   */
  functionPattern?: string
  /**
   * Statement priorities, replacing the default groups; [] disables reports.
   */
  groups?: GroupEntry[]
  /**
   * Exact function binding names to skip; defaults to [].
   */
  ignoreNames?: string[]
  /**
   * Vue auto-import names, overriding shared settings; [] disables globals.
   */
  vueGlobals?: string[]
  /**
   * Exact runtime import sources; defaults to ['vue'].
   */
  vueImportSources?: string[]
}

export type SortComposableBodyRuleOptions = [SortComposableBodyOptions]
export type SortComposableBodyMessageId = SortScriptSetupMessageId
