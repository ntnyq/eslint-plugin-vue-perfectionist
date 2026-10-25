import { expect } from 'vitest'
import { sortScriptSetup } from '../../src/rules/sort-script-setup.ts'
import { run } from './rule-tester.ts'
import type { TestCasesOptions } from 'eslint-vitest-rule-tester'
import type {
  SortScriptSetupMessageId,
  SortScriptSetupOptions,
} from '../../src/types/index.ts'

/**
 * Run sorting cases with a shared assertion for report-only safety boundaries.
 */
export async function runSortScriptSetup(
  cases: TestCasesOptions<SortScriptSetupOptions, SortScriptSetupMessageId>,
) {
  return run<SortScriptSetupOptions, SortScriptSetupMessageId>({
    name: 'sort-script-setup',
    rule: sortScriptSetup,
    onResult(testcase, result) {
      if (testcase.type === 'invalid' && testcase.output === null) {
        expect(result.fixed).toBe(false)
        for (const message of result.messages) {
          expect(message.fix).toBeUndefined()
          expect(message.suggestions).toBeUndefined()
        }
      }
    },
    ...cases,
  })
}
