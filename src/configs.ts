import { plugin } from './plugin'
import type { Linter } from 'eslint'
import type { PluginConfigs, SortType } from './types'

function createConfig(name: string, type?: SortType): Linter.Config {
  return {
    name: `vue-perfectionist/${name}`,
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': plugin },
    rules: {
      'vue-perfectionist/sort-script-setup': type
        ? ['error', { type }]
        : 'error',
    },
  }
}

export const configs: PluginConfigs = {
  recommended: createConfig('recommended'),
  'recommended-natural': createConfig('recommended-natural', 'natural'),
  'recommended-alphabetical': createConfig(
    'recommended-alphabetical',
    'alphabetical',
  ),
}
