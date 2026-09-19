import * as tsParser from '@typescript-eslint/parser'
import { run as runRuleTests } from 'eslint-vitest-rule-tester'
import * as vueParser from 'vue-eslint-parser'
import type { Linter } from 'eslint'
import type {
  RuleTesterInitOptions,
  TestCasesOptions,
} from 'eslint-vitest-rule-tester'

export { unindent as $ } from 'eslint-vitest-rule-tester'

export const vueLanguageOptions: Linter.LanguageOptions = {
  parser: vueParser,
  parserOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
}

export async function run<TOptions, TMessageId extends string = string>(
  options: RuleTesterInitOptions & TestCasesOptions<TOptions, TMessageId>,
) {
  return runRuleTests<TOptions, TMessageId>({
    configs: [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { parser: tsParser },
      },
      {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
      },
    ],
    defaultFilenames: {
      js: 'Test.vue',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    ...options,
  })
}
