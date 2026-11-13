import type { TSESTree } from '@typescript-eslint/utils'
import type {
  CommonSortOptions,
  CustomGroup,
  GroupEntry,
  Modifier,
  Newlines,
  Selector,
} from '../../types/rules/sort-script-setup.ts'
import type { CallIdentity } from '../vue/call-identity.ts'

export interface ResolvedOptions extends Required<CommonSortOptions> {
  customGroups: CustomGroup[]
  fix: 'none' | 'safe'
  groups: GroupEntry[]
  vueGlobals: string[]
  vueImportSources: string[]
}

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
  node: TSESTree.Statement
  selector: Selector
  size: number
  start: number
  subgroup: number
  callName?: string
  importSource?: string | undefined
  safeKind?: 'constant' | 'function' | 'type' | undefined
}

export type StatementMessageId =
  | 'unexpectedGroupOrder'
  | 'unexpectedNewlinesBetween'
  | 'unexpectedNewlinesInside'
  | 'unexpectedOrder'
  | 'unsafeReorder'

/**
 * Optional container-specific call classification, before runtime API matching.
 */
export type SpecialCallClassifier = (
  call: TSESTree.CallExpression,
  identity: CallIdentity,
) => { selector: Selector; callName?: string } | undefined
