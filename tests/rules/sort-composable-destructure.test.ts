import { expect } from 'vitest'
import { sortComposableDestructure } from '../../src/rules/sort-composable-destructure.ts'
import { run } from '../helpers/rule-tester.ts'
import { runComposablePolicyTests } from '../helpers/sort-composable.ts'
import type {
  SortComposableDestructureMessageId,
  SortComposableDestructureOptions,
} from '../../src/types/index.ts'

const declaration =
  'function usePage() { return { z: 1, a: [], submit() {}, reset: () => {} } }\n'
await runComposablePolicyTests(
  sortComposableDestructure,
  'sort-composable-destructure',
  members => `${declaration}const { ${members} } = usePage()`,
)

const memberKinds: SortComposableDestructureOptions['memberKinds'] = [
  { functionPattern: '^use', elementNamePattern: '^submit$', kind: 'method' },
  { functionPattern: '^use', elementNamePattern: '^state$', kind: 'state' },
]

await run<SortComposableDestructureOptions, SortComposableDestructureMessageId>(
  {
    name: 'sort-composable-destructure',
    rule: sortComposableDestructure,
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
      {
        description: 'does not infer own properties from a prototype setter',
        code: 'function usePage() { return { __proto__: { ["__proto__"]() {} }, state: 1 } }; const { __proto__, state } = usePage()',
      },
      {
        description:
          'writes to a shared module function from setup still invalidate inference',
        filename: 'Test.vue',
        code: '<script>function usePage() { return { submit() {}, state: 1 } }</script><script setup>usePage = () => ({}); const { submit, state } = usePage()</script>',
      },
      {
        description:
          'resolves same-name functions independently in dual SFC scripts',
        filename: 'Test.vue',
        code: `<script lang="ts">
function usePage() { return { state: 1, submit() {} } }
const { state: outerState,

submit: outerSubmit } = usePage()
</script>
<script setup lang="ts">
function usePage() { return { state() {}, submit: 1 } }
const { submit,

state } = usePage()
</script>`,
      },
      {
        description:
          'ignoreNames matches the exported name of an aliased import',
        code: 'import { usePage as create } from "./page"; const { submit, state } = create()',
        options: { ignoreNames: ['usePage'], memberKinds },
      },
      ...[
        'const { submit, state } = ordinary()',
        'const { submit, state } = obj.usePage()',
        'const { submit, state } = usePage?.()',
        'const { submit, state } = toRefs(usePage())',
        'const result = usePage(); const { submit, state } = result',
        'const [submit, state] = usePage()',
        'let submit, state; ({ submit, state } = usePage())',
        'import type { usePage } from "./page"; const { submit, state } = usePage()',
        'import { type usePage } from "./page"; const { submit, state } = usePage()',
        'import * as composables from "./page"; const { submit, state } = composables["usePage"]()',
      ].map(code => ({
        code,
        options: { memberKinds },
      })),
      {
        code: 'import { usePage } from "./page"; const { submit, state } = usePage()',
      },
      {
        code: 'const { submit, state } = usePage()',
        options: { importSourcePattern: '^./', memberKinds },
      },
      {
        code: 'import { usePage } from "other"; const { submit, state } = usePage()',
        options: { importSourcePattern: '^./', memberKinds },
      },
      { code: `${declaration}const { submit, ...rest } = usePage()` },
      { code: `${declaration}const { submit, a: { nested }, z } = usePage()` },
      { code: `${declaration}const { submit, [dynamic]: x, z } = usePage()` },
      {
        code: `${declaration}function outer(usePage) { const { submit, z } = usePage() }`,
      },
      {
        code: 'function usePage(ok) { if (ok) return { a() {} }; return { a: 1 } }; const { a, z } = usePage()',
      },
      {
        code: 'function usePage(ok) { if (ok) return { a() {}, z: 1 }; return unknownValue }; const { a, z } = usePage()',
      },
      {
        code: 'function usePage() { return { a() {}, z: 1, ...unknownValue } }; const { a, z } = usePage()',
      },
      {
        code: 'function usePage() { return { a() {}, z: 1, a: 2 } }; const { a, z } = usePage()',
      },
      {
        code: 'async function usePage() { return { a() {}, z: 1 } }; const { a, z } = usePage()',
      },
      {
        code: 'function* usePage() { return { a() {}, z: 1 } }; const { a, z } = usePage()',
      },
      {
        code: 'function usePage() { return { a() {}, z: 1 } }; usePage = () => ({}); const { a, z } = usePage()',
      },
    ],
    invalid: [
      {
        description:
          'known non-callable then properties do not block local await inference',
        code: 'function usePage() { return { then: 1, state: 1, submit() {} } }; const { submit, state } = await usePage()',
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        description: 'getter-based thenables remain unknown in syntax mode',
        code: 'function usePage() { return { get then() { return resolve => resolve({ state() {}, submit: 1 }) }, state: 1, submit() {} } }; const { state, submit } = await usePage()',
        options: { unknownMembers: 'report' },
        errors: ['unknownMember', 'unknownMember'],
        output: null,
      },
      {
        description:
          'named default-import syntax uses the local composable name',
        code: 'import { default as usePage } from "./page"; const { submit, state } = usePage()',
        options: { memberKinds },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        description:
          'unrelated setup writes do not invalidate module composable bindings',
        filename: 'Test.vue',
        code: '<script>function usePage() { return { submit() {}, state: 1 } }; const { submit, state } = usePage()</script><script setup>let usePage = 0; usePage = 1</script>',
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      ...['', 'async '].map(prefix => ({
        description:
          'awaited thenables cannot use the outer return object for classification',
        code: `${prefix}function usePage() { return { then(resolve) { resolve({ state() {}, submit: 1 }) }, state: 1, submit() {} } }; const { state, submit } = await usePage()`,
        options: { unknownMembers: 'report' as const },
        errors: ['unknownMember' as const, 'unknownMember' as const],
        output: null,
      })),
      ...[
        'const { submit, z } = usePage()',
        'const { submit: save, z: state } = usePage()',
        'const { submit = 1, z = () => {} } = usePage()',
        'const { "submit": save, ["z"]: state } = (usePage() as Result)',
        'function useOther() { const { submit, z } = usePage() }',
        'function ordinary() { const { submit, z } = usePage() }',
      ].map(code => ({
        code: declaration + code,
        errors: ['unexpectedGroupOrder' as const],
        output: null,
      })),
      ...[
        'function usePage() { return { submit() {}, state: 1 } }',
        'const usePage = () => ({ submit() {}, state: 1 })',
        'const usePage = function internal() { return { submit() {}, state: 1 } }',
        'function usePage(ok) { if (ok) return { submit() {}, state: 1 }; return { submit: () => {}, state: [] } }',
      ].map(code => ({
        code: `${code}; const { submit, state } = usePage()`,
        errors: ['unexpectedGroupOrder' as const],
        output: null,
      })),
      {
        code: 'async function usePage() { return { submit() {}, state: 1 } }; const { submit, state } = await (usePage() as Promise<Result>)',
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      ...[
        'import { usePage as create } from "./page"; const { submit, state } = create()',
        'import * as composables from "./page"; const { submit, state } = composables.usePage()',
        'import usePage from "./page"; const { submit, state } = usePage()',
        'const { submit, state } = usePage()',
      ].map(code => ({
        code,
        options: { memberKinds },
        errors: ['unexpectedGroupOrder' as const],
        output: null,
      })),
      {
        code: 'import { usePage as create } from "./page"; const { submit, state } = create()',
        options: { memberKinds, importSourcePattern: '^./' },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        description:
          'default expressions do not establish the source property kind',
        code: 'const { state = () => {}, submit = () => {} } = usePage()',
        options: { unknownMembers: 'report' },
        errors: ['unknownMember', 'unknownMember'],
        output: null,
      },
      ...[
        {
          filename: 'test.js',
          code: `${declaration}const { submit, z } = usePage()`,
        },
        {
          filename: 'Test.vue',
          code: `<script setup>${declaration}const { submit, z } = usePage()</script>`,
          languageOptions: { parserOptions: { parser: null } },
        },
        {
          filename: 'Test.vue',
          code: `<script lang="ts">${declaration}</script><script setup lang="ts">const { submit, z } = usePage()</script>`,
        },
      ].map(testcase => ({
        ...testcase,
        errors: ['unexpectedGroupOrder' as const],
        output: null,
      })),
      {
        description:
          'public keys control subgroups even when local aliases differ',
        code: `${declaration}const { z: first, a: z } = usePage()`,
        options: {
          groups: ['priority', 'state', 'method'],
          customGroups: [
            {
              groupName: 'priority',
              selector: 'state',
              elementNamePattern: '^a$',
            },
          ],
        },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
    ],
  },
)
