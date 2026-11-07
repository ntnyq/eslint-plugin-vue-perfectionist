import type { ESLint } from 'eslint'

/**
 * Shared configuration under settings['vue-perfectionist'].
 */
export interface VuePerfectionistSettings {
  /**
   * Recognize supported unbound API names supplied by auto-import tooling.
   * Defaults to false; rule-level vueGlobals and target autoImport take precedence.
   */
  autoImport?: boolean

  /**
   * Enable VueUse integration in rules that support it. Defaults to false;
   * rule-level vueuse takes precedence. Unbound APIs follow each rule's
   * auto-import options.
   */
  vueuse?: boolean
}

/**
 * Public plugin contract keeps ESLint's host types portable in declarations.
 */
export interface VuePerfectionistPlugin extends Omit<ESLint.Plugin, 'configs'> {
  meta: {
    name: string
    version: string
  }
}
