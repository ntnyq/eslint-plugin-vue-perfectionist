import type { ESLint, Linter } from 'eslint'

export type PresetName =
  | 'recommended-alphabetical'
  | 'recommended-natural'
  | 'recommended'

export type PluginConfigs = Record<PresetName, Linter.Config>

/**
 * Public plugin contract keeps ESLint's host types portable in declarations.
 */
export interface VuePerfectionistPlugin extends ESLint.Plugin {
  configs: PluginConfigs
  meta: {
    name: string
    version: string
  }
}
