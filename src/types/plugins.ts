import type { ESLint } from 'eslint'

/**
 * Public plugin contract keeps ESLint's host types portable in declarations.
 */
export interface VuePerfectionistPlugin extends Omit<ESLint.Plugin, 'configs'> {
  meta: {
    name: string
    version: string
  }
}
