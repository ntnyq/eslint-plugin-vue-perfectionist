// @ts-check

import { defineESLintConfig } from '@ntnyq/eslint-config'

export default defineESLintConfig(
  {
    ignores: ['tests/fixtures/**'],
    oxfmt: true,
    prettier: false,
    svgo: true,
    eslintPlugin: {
      overrides: {
        // https://github.com/typescript-eslint/typescript-eslint/pull/12663
        'eslint-plugin/require-meta-languages': 'off',
      },
    },
    test: {
      vitest: {
        overrides: {
          // in favor of eslint-vitest-rule-tester
          'vitest/no-standalone-expect': 'off',
        },
      },
    },
  },
  {
    files: ['tests/package/**/*.test.mjs'],
    name: 'project/package-tests',
    rules: {
      // Built-package checks use Node's loader rather than Vitest's source resolver.
      'vitest/no-import-node-test': 'off',
    },
  },
)
