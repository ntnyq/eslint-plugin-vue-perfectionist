import type { TSESTree } from '@typescript-eslint/utils'
import type {
  Modifier,
  Newlines,
  Selector,
  SortScriptSetupOptions,
} from '../../types/rules/sort-script-setup.ts'

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
