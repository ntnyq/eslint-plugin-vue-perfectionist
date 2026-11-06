/**
 * Confirmed public member categories; state includes all non-callable data.
 */
export type ComposableMemberKind = 'method' | 'state'

/**
 * Optional comparison within a group. Unsorted preserves source order.
 */
export type ComposableSortType =
  | 'alphabetical'
  | 'name-length'
  | 'natural'
  | 'unsorted'

/**
 * Blank lines between members, or no spacing check.
 */
export type ComposableNewlines = 'ignore' | number

export interface ComposableGroupOverrides {
  /**
   * Override the rule-wide blank-line count inside this group.
   */
  newlinesInside?: ComposableNewlines
  /**
   * Override the rule-wide comparison direction for this group.
   */
  order?: 'asc' | 'desc'
  /**
   * Override the rule-wide comparison strategy for this group.
   */
  type?: ComposableSortType
}

/**
 * An ordered group, merged equal-priority groups, or a spacing separator.
 */
export type ComposableGroupEntry =
  | string
  | string[]
  | (ComposableGroupOverrides & { group: string | string[] })
  | { newlinesBetween: ComposableNewlines }

export interface ComposableCustomGroup {
  /**
   * Unique group name referenced by groups.
   */
  groupName: string
  /**
   * Confirmed category to subdivide; never infers an unknown member's kind.
   */
  selector: ComposableMemberKind
  /**
   * Case-sensitive regular expression source matching the public property name.
   */
  elementNamePattern?: string
}

export interface ComposableMemberKindOverride {
  /**
   * Regular expression source matching the public property name.
   */
  elementNamePattern: string
  /**
   * Regular expression source matching the normalized composable name.
   */
  functionPattern: string
  /**
   * Classification to use only when syntax and enabled types are inconclusive.
   */
  kind: ComposableMemberKind
}

/**
 * Shared policy for composable return objects and consumers' destructuring.
 * The inherited comparison defaults to unsorted, order to asc, and
 * newlinesInside to zero.
 */
export interface SortComposableOptions extends ComposableGroupOverrides {
  /**
   * First matching entry subdivides a known category. Defaults to an empty list.
   */
  customGroups?: ComposableCustomGroup[]
  /**
   * Safe whitespace fixes or diagnostics only. Defaults to 'safe'.
   */
  fix?: 'none' | 'safe'
  /**
   * Function-name regular expression source. Defaults to '^use[A-Z]'.
   */
  functionPattern?: string
  /**
   * Replace ['state', 'method']; an empty list disables ordering and spacing.
   * Known categories omitted from this list become partition boundaries.
   */
  groups?: ComposableGroupEntry[]
  /**
   * Exact normalized names to exclude. Defaults to an empty list.
   */
  ignoreNames?: string[]
  /**
   * First matching entry supplements unknown kinds. Defaults to an empty list.
   */
  memberKinds?: ComposableMemberKindOverride[]
  /**
   * Nonnegative blank-line count between groups. Defaults to 1.
   */
  newlinesBetween?: ComposableNewlines
  /**
   * Require and use complete TypeScript parser services. Defaults to false.
   */
  typeInformation?: boolean
  /**
   * Whether to report unclassified members. Defaults to 'ignore'.
   */
  unknownMembers?: 'ignore' | 'report'
}

export type SortComposableMessageId =
  | 'unexpectedGroupOrder'
  | 'unexpectedNewlinesBetween'
  | 'unexpectedNewlinesInside'
  | 'unexpectedOrder'
  | 'unknownMember'
