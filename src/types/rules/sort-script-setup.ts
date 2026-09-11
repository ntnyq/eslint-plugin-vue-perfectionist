import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

export type SortType =
  | 'alphabetical'
  | 'custom'
  | 'line-length'
  | 'natural'
  | 'unsorted'

export type SortOrder = 'asc' | 'desc'
export type Newlines = 'ignore' | number
export type RegexPattern = string | { pattern: string; flags?: string }
export type RegexOption = RegexPattern | RegexPattern[]
export type CommentPartition =
  | boolean
  | RegexOption
  | {
      block?: boolean | RegexOption
      line?: boolean | RegexOption
    }

export interface FallbackSort {
  type: 'subgroup-order' | SortType
  order?: SortOrder
}

export interface GroupOverrides {
  fallbackSort?: FallbackSort
  newlinesInside?: Newlines
  order?: SortOrder
  type?: SortType
}

export type GroupEntry =
  | string
  | string[]
  | (GroupOverrides & { group: string | string[] })
  | { newlinesBetween: Newlines }

export type Selector =
  | 'call'
  | 'class'
  | 'composable'
  | 'computed'
  | 'constant'
  | 'define-emits'
  | 'define-expose'
  | 'define-model'
  | 'define-options'
  | 'define-props'
  | 'define-slots'
  | 'enum'
  | 'function'
  | 'inject'
  | 'interface'
  | 'lifecycle-hook'
  | 'provide'
  | 'reactive'
  | 'ref'
  | 'template-ref'
  | 'type'
  | 'variable'
  | 'watch'
export type Modifier =
  | 'async'
  | 'const'
  | 'declare'
  | 'destructured'
  | 'let'
  | 'var'

export interface MatchCondition {
  callNamePattern?: RegexOption
  elementNamePattern?: RegexOption
  importSourcePattern?: RegexOption
  modifiers?: Modifier[]
  selector?: Selector
}

export type CustomGroup = GroupOverrides & { groupName: string } & (
    | (MatchCondition & { anyOf?: never })
    | { anyOf: MatchCondition[] }
  )

/**
 * Sorting preferences shared by the rule and plugin settings.
 */
export interface CommonSortOptions {
  alphabet?: string
  fallbackSort?: FallbackSort
  ignoreCase?: boolean
  locales?: string | string[]
  newlinesBetween?: Newlines
  newlinesInside?: 'newlinesBetween' | Newlines
  order?: SortOrder
  partitionByComment?: CommentPartition
  partitionByNewLine?: boolean
  specialCharacters?: 'keep' | 'remove' | 'trim'
  type?: SortType
}

/**
 * Options for ordering top-level Vue 3 script setup statements.
 */
export interface SortScriptSetupOptions extends CommonSortOptions {
  customGroups?: CustomGroup[]
  fix?: 'none' | 'safe'
  groups?: GroupEntry[]
  vueGlobals?: string[]
  vueImportSources?: string[]
}

export type RuleOptions = [SortScriptSetupOptions]
export type MessageId =
  | 'unexpectedGroupOrder'
  | 'unexpectedNewlinesBetween'
  | 'unexpectedNewlinesInside'
  | 'unexpectedOrder'
  | 'unsafeReorder'
export type RuleContext = TSESLint.RuleContext<MessageId, RuleOptions>
export type SourceCode = RuleContext['sourceCode']
export type ResolvedOptions = Required<SortScriptSetupOptions>

export interface Group {
  before: Newlines
  names: string[]
  options: ResolvedOptions
}

export interface Statement {
  end: number
  group: number
  index: number
  modifiers: Modifier[]
  name: string
  names: string[]
  node: TSESTree.ProgramStatement
  selector: Selector
  size: number
  start: number
  subgroup: number
  callName?: string
  importSource?: string | undefined
  safeKind?: 'constant' | 'function' | 'type' | undefined
}
