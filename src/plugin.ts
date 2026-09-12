import { meta } from './meta.ts'
import { sortScriptSetup } from './rules/sort-script-setup.ts'
import type { ESLint, Linter } from 'eslint'

const pluginConfigs: Record<string, Linter.Config> = {}

export const plugin: ESLint.Plugin & {
  meta: typeof meta
  configs: Record<string, Linter.Config>
} = {
  meta,
  // typescript-eslint still exposes deprecated context methods in its types.
  // Our rules use only the shared sourceCode/report API, exercised with ESLint 10.
  rules: {
    'sort-script-setup': sortScriptSetup,
  } as unknown as NonNullable<ESLint.Plugin['rules']>,
  configs: pluginConfigs,
}
