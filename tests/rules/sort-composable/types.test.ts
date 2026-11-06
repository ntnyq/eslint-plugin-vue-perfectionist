import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'
import { sortComposableDestructure } from '../../../src/rules/sort-composable-destructure.ts'
import { sortComposableReturn } from '../../../src/rules/sort-composable-return.ts'
import { run } from '../../helpers/rule-tester.ts'
import type {
  SortComposableMessageId,
  SortComposableOptions,
} from '../../../src/types/index.ts'

const root = fileURLToPath(
  new URL('../../fixtures/sort-composable/', import.meta.url),
)
const parserOptions = {
  project: './tsconfig.json',
  tsconfigRootDir: root,
  extraFileExtensions: ['.vue'],
}

for (const [name, rule, consume] of [
  ['sort-composable-return', sortComposableReturn, false],
  ['sort-composable-destructure', sortComposableDestructure, true],
] as const) {
  await run<SortComposableOptions, SortComposableMessageId>({
    name,
    rule,
    defaultFilenames: { js: `${root}case.ts` },
    languageOptions: { parserOptions },
    valid: [
      {
        description:
          'does not mistake a shadowing interface named Function for a callable type',
        code: consume
          ? 'export {}; interface Function { value: number }; declare function usePage(): { action: Function; state: number }; const { action, state } = usePage()'
          : 'export {}; interface Function { value: number }; declare const action: Function; function usePage() { return { action, state: 1 } }',
        options: { typeInformation: true },
      },
    ],
    invalid: [
      ...['Function', 'Function | undefined', 'CallableFunction'].map(type => ({
        description:
          'recognizes callable Function types without explicit signatures',
        code: consume
          ? `declare function usePage(): { action: ${type}; state: number }; const { action, state } = usePage()`
          : `declare const action: ${type}; function usePage() { return { action, state: 1 } }`,
        options: { typeInformation: true },
        errors: ['unexpectedGroupOrder' as const],
        output: null,
      })),
      ...['null | undefined', 'null', 'undefined', 'void'].map(type => ({
        description: 'nullish and void types are non-callable state',
        code: consume
          ? `declare function usePage(): { action(): void; state: ${type} }; const { action, state } = usePage()`
          : `declare const state: ${type}; function usePage() { return { action() {}, state } }`,
        options: { typeInformation: true },
        errors: ['unexpectedGroupOrder' as const],
        output: null,
      })),
    ],
  })
}

for (const [name, rule, wrap] of [
  [
    'sort-composable-return',
    sortComposableReturn,
    (members: string) => `function useLocal() { return { ${members} } }`,
  ],
  [
    'sort-composable-destructure',
    sortComposableDestructure,
    (members: string) => `const { ${members} } = usePage()`,
  ],
] as const) {
  const imports = "import { usePage, state, submit } from './composables';\n"
  await run<SortComposableOptions, SortComposableMessageId>({
    name,
    rule,
    defaultFilenames: { js: `${root}case.ts` },
    languageOptions: { parserOptions },
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
        code: imports + wrap('state,\n\nsubmit'),
        options: { typeInformation: true },
      },
      {
        description: 'disabled type analysis ignores available parser services',
        code: imports + wrap('submit, state'),
      },
    ],
    invalid: [
      {
        code: imports + wrap('submit, state'),
        options: { typeInformation: true },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
      {
        code: imports + wrap('state, submit'),
        options: { typeInformation: true },
        errors: ['unexpectedNewlinesBetween'],
        output: imports + wrap('state,\n\nsubmit'),
      },
      {
        code: `<script setup lang="ts">${imports}${wrap('submit, state')}</script>`,
        filename: `${root}case.vue`,
        languageOptions: {
          parserOptions: { project: false, projectService: true },
        },
        options: { typeInformation: true },
        errors: ['unexpectedGroupOrder'],
        output: null,
      },
    ],
  })
}

await run<SortComposableOptions, SortComposableMessageId>({
  name: 'sort-composable-return',
  rule: sortComposableReturn,
  defaultFilenames: { js: `${root}case.ts` },
  languageOptions: { parserOptions },
  invalid: [
    {
      code: 'type Empty = {}; declare const value: Empty; function usePage() { return { value } }',
      options: { typeInformation: true, unknownMembers: 'report' },
      errors: ['unknownMember'],
      output: null,
    },
    {
      code: "import { debounce, callable } from './composables'; function usePage() { return { action: debounce(() => {}), state: 1, callable } }",
      options: { typeInformation: true },
      errors: ['unexpectedGroupOrder'],
      output: null,
    },
    ...['any', 'unknown', 'never', 'string | (() => void)', 'object', '{}'].map(
      type => ({
        code: `declare const value: ${type}; function usePage() { return { value } }`,
        options: { typeInformation: true, unknownMembers: 'report' as const },
        errors: ['unknownMember' as const],
        output: null,
      }),
    ),
    {
      code: 'function usePage<T>(value: T) { return { value } }',
      options: { typeInformation: true, unknownMembers: 'report' },
      errors: ['unknownMember'],
      output: null,
    },
    {
      code: 'function usePage<T>(value: T extends true ? string : (() => void)) { return { value } }',
      options: { typeInformation: true, unknownMembers: 'report' },
      errors: ['unknownMember'],
      output: null,
    },
  ],
})

await run<SortComposableOptions, SortComposableMessageId>({
  name: 'sort-composable-destructure',
  rule: sortComposableDestructure,
  defaultFilenames: { js: `${root}case.ts` },
  languageOptions: { parserOptions },
  invalid: [
    {
      description:
        'unresolved awaited types never fall back to outer thenable properties',
      code: 'function usePage() { return { then() {}, state: 1, submit() {} } }; const { state, submit } = await usePage()',
      options: { typeInformation: true, unknownMembers: 'report' },
      errors: ['unknownMember', 'unknownMember'],
      output: null,
    },
    ...['', 'async '].map(prefix => ({
      description:
        'uses the awaited type of thenables instead of their outer property types',
      code: `${prefix}function usePage() { return { then(resolve: (value: { state(): void; submit: number }) => void) { resolve({ state() {}, submit: 1 }) }, state: 1, submit() {} } }; const { state, submit } = await usePage()`,
      options: { typeInformation: true },
      errors: ['unexpectedGroupOrder' as const],
      output: null,
    })),
    ...[
      "import { usePage as create } from './composables'; const { submit, state } = create()",
      "import * as api from './composables'; const { submit, state } = api.usePage()",
      "import usePage from './composables'; const { submit, state } = usePage()",
      "import { useAsyncPage } from './composables'; const { submit, state } = await useAsyncPage()",
      "import { useGenericPage } from './composables'; const { submit, value } = useGenericPage(1)",
      "import { usePage } from './composables'; const { submit: save = 1, state: local = () => {} } = usePage()",
    ].map(code => ({
      code,
      options: { typeInformation: true },
      errors: ['unexpectedGroupOrder' as const],
      output: null,
    })),
    {
      code: "import { usePage } from './composables'; const { mixed, uncertain, untyped } = usePage()",
      options: { typeInformation: true, unknownMembers: 'report' },
      errors: ['unknownMember', 'unknownMember', 'unknownMember'],
      output: null,
    },
    {
      code: "import { usePage } from './composables'; const { mixed = () => {} } = usePage()",
      options: { typeInformation: true, unknownMembers: 'report' },
      errors: ['unknownMember'],
      output: null,
    },
  ],
})
