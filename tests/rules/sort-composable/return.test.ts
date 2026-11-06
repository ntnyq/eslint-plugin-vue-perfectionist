import { expect } from 'vitest'
import { sortComposableReturn } from '../../../src/rules/sort-composable-return.ts'
import { run } from '../../helpers/rule-tester.ts'
import { runComposablePolicyTests } from './policy-cases.ts'
import type {
  SortComposableReturnMessageId,
  SortComposableReturnOptions,
} from '../../../src/types/index.ts'

await runComposablePolicyTests(
  sortComposableReturn,
  'sort-composable-return',
  members =>
    `function usePage() { const z = 1, a = []; function submit() {} const reset = () => {}; return { ${members} } }`,
)

await run<SortComposableReturnOptions, SortComposableReturnMessageId>({
  name: 'sort-composable-return',
  rule: sortComposableReturn,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
      expect(result.fixed).toBe(false)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
  valid: [
    ...[
      '1n, "1"',
      '[true], "true"',
      '[null], "null"',
      '[-1], "-1"',
      '[-1n], "-1"',
    ].map(keys => {
      const [first, second] = keys.split(', ')
      return {
        description:
          'skips repeated keys after primitive property-key coercion',
        code: `function usePage() { return { submit() {}, state: 1, ${first}: 1, ${second}: 2 } }`,
      }
    }),
    {
      description:
        'prototype setters are partition boundaries, not public methods',
      code: 'function usePage() { return { __proto__: () => {}, state: 1 } }',
    },
    {
      description: 'does not treat a default Vue import as a named ref API',
      code: 'import ref from "vue"; function usePage() { return { submit() {}, state: ref(1) } }',
    },
    ...[
      'function ordinary() { return { submit() {}, state: 1 } }',
      'function usePage() { return reactive({ submit() {}, state: 1 }) }',
      'function usePage() { const result = { submit() {}, state: 1 }; return result }',
      'function usePage() { return ok ? { submit() {}, state: 1 } : {} }',
      'export default () => ({ submit() {}, state: 1 })',
      'export default function () { return { submit() {}, state: 1 } }',
      'const obj = { usePage() { return { submit() {}, state: 1 } } }',
      'class Page { usePage() { return { submit() {}, state: 1 } } }',
      'const usePage = wrapper(() => ({ submit() {}, state: 1 }))',
      'function usePage() { nested(() => { return { submit() {}, state: 1 } }); return {} }',
      'function usePage() { return { submit() {}, ...other, state: 1 } }',
      'function usePage() { return { submit() {}, [dynamic]: 1, state: 1 } }',
      'function usePage() { return { submit() {}, state: 1, submit() {} } }',
      'function usePage() { return { 1: () => {}, state: 1, "1": 2 } }',
      'function usePage() { let value = () => {}; value = 1; return { value, state: 1 } }',
      'function usePage() { const value = () => {}; value = 1; return { value, state: 1 } }',
      'function usePage() { return { get submit() { return () => {} }, state: 1 } }',
      'function* usePage() { return { submit() {}, state: 1 } }',
      'import { ref } from "other"; function usePage() { return { submit() {}, value: ref(1) } }',
      'import type { ref } from "vue"; function usePage() { return { submit() {}, value: ref(1) } }',
      'import { ref } from "vue"; function usePage(ref) { return { submit() {}, value: ref(1) } }',
      'function usePage() { const a = b, b = a; return { submit() {}, a, state: 1 } }',
      'function usePage() { return { z: 1, a: 2 } }',
    ].map(code => ({
      code,
    })),
    {
      code: 'function usePage() { return { a: () => {}, b: ref(1) } }',
      description: 'unbound Vue APIs require the shared autoImport opt-in',
    },
    {
      code: '<template>{{ (() => { return { submit() {}, state: 1 } })() }}</template>',
      filename: 'Test.vue',
    },
    {
      code: '<script>import { ref } from "vue"; function usePage() { return { a: () => {}, b: unknownValue } }</script><script setup>const ref = () => 1; function useOther() { return { a: () => {}, b: ref() } }</script>',
      filename: 'Test.vue',
    },
  ],
  invalid: [
    ...[
      'function usePage() { return { __proto__: null, ["__proto__"]: 1, submit() {}, state: 1 } }',
      'const __proto__ = () => {}; function usePage() { return { __proto__: null, __proto__, state: 1 } }',
      'function usePage() { return { __proto__: null, __proto__() {}, state: 1 } }',
    ].map(code => ({
      description:
        'a prototype setter does not duplicate an own __proto__ property',
      code,
      errors: ['unexpectedGroupOrder' as const],
      output: null,
    })),
    {
      description:
        'unrelated setup writes do not invalidate module function bindings',
      filename: 'Test.vue',
      code: '<script>const submit = () => {}; function usePage() { return { submit, state: 1 } }</script><script setup>let submit = 0; submit = 1</script>',
      errors: ['unexpectedGroupOrder'],
      output: null,
    },
    {
      description:
        'known overloaded function bindings are methods without type services',
      code: 'function submit(value: string): void; function submit(value: number): void; function submit(value: unknown) {}; function usePage() { return { submit, state: 1 } }',
      errors: ['unexpectedGroupOrder'],
      output: null,
    },
    ...['reactive', 'shallowReactive', 'readonly', 'shallowReadonly'].map(
      api => ({
        description: 'recognizes confirmed Vue proxy data',
        code: `import { ${api} as create } from 'vue'; function usePage() { return { submit() {}, state: create({}) } }`,
        errors: ['unexpectedGroupOrder' as const],
        output: null,
      }),
    ),
    {
      description: 'proxy wrappers do not make callable values into state',
      code: 'import { readonly } from "vue"; function usePage() { return { submit: readonly(() => {}), state: -1 } }',
      errors: ['unexpectedGroupOrder'],
      output: null,
    },
    ...[
      'function usePage() { return { submit() {}, state: 1 } }',
      'export default function usePage() { return { submit() {}, state: 1 } }',
      'const usePage = () => ({ submit() {}, state: 1 })',
      'const usePage = function internal() { return { submit() {}, state: 1 } }',
      'const usePage = (() => ({ submit() {}, state: 1 })) satisfies Function',
      'function usePage() { return ({ submit() {}, state: 1 } as const) }',
      'async function usePage() { return { submit() {}, state: 1 } }',
      'function outer() { function usePage() { return { submit() {}, state: 1 } } }',
      'function usePage() { function action() {}; const alias = action; return { submit: alias, state: {} } }',
      'function usePage() { return { "submit": () => {}, ["state"]: [] } }',
    ].map(code => ({
      code,
      errors: ['unexpectedGroupOrder' as const],
      output: null,
    })),
    {
      code: 'function usePage(ok) { if (ok) return { submit() {}, state: 1 }; return { reset() {}, items: [] } }',
      errors: ['unexpectedGroupOrder', 'unexpectedGroupOrder'],
      output: null,
    },
    ...[
      'ref',
      'shallowRef',
      'computed',
      'customRef',
      'toRef',
      'useTemplateRef',
    ].map(api => ({
      code: `import { ${api} as create } from 'vue'; function usePage() { return { submit() {}, state: create(() => {}) } }`,
      errors: ['unexpectedGroupOrder' as const],
      output: null,
    })),
    {
      code: 'import * as Vue from "vue"; function usePage() { return { submit() {}, state: Vue.ref(1) } }',
      errors: ['unexpectedGroupOrder'],
      output: null,
    },
    {
      code: 'function usePage() { return { submit() {}, state: ref(1) } }',
      settings: { 'vue-perfectionist': { autoImport: true } },
      errors: ['unexpectedGroupOrder'],
      output: null,
    },
    ...[
      {
        filename: 'test.js',
        code: 'function usePage() { return { submit() {}, state: 1 } }',
      },
      {
        filename: 'Test.vue',
        code: '<script>function usePage() { return { submit() {}, state: 1 } }</script>',
        languageOptions: { parserOptions: { parser: null } },
      },
      {
        filename: 'Test.vue',
        code: '<script setup lang="ts">function usePage() { return { submit() {}, state: 1 } }</script>',
      },
      {
        filename: 'Test.vue',
        code: '<script lang="ts">const value = () => {}; function usePage() { return { value, state: 1 } }</script><script setup lang="ts">const value = 1</script>',
      },
    ].map(testcase => ({
      ...testcase,
      errors: ['unexpectedGroupOrder' as const],
      output: null,
    })),
    {
      code: 'function usePage() { return { z10: 1, z2: 2 } }',
      options: { type: 'natural' },
      errors: ['unexpectedOrder'],
      output: null,
    },
    {
      description: 'name length counts Unicode code points and public names',
      code: 'function usePage() { return { ab: 1, "😀": 2 } }',
      options: { type: 'name-length' },
      errors: ['unexpectedOrder'],
      output: null,
    },
    {
      description: 'reports at the later member',
      code: 'function usePage() {\n  return {\n    submit() {},\n    state: 1,\n  }\n}',
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          line: 4,
          column: 5,
          endLine: 4,
          endColumn: 13,
        },
      ],
      output: null,
    },
  ],
})
