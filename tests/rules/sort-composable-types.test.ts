import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'
import { sortComposableReturn } from '../../src/rules/sort-composable-return.ts'
import { run } from '../helpers/rule-tester.ts'
import type {
  SortComposableMessageId,
  SortComposableOptions,
} from '../../src/types/index.ts'

const root = fileURLToPath(
  new URL('../fixtures/sort-composable/', import.meta.url),
)
const parserOptions = {
  project: './tsconfig.json',
  tsconfigRootDir: root,
  extraFileExtensions: ['.vue'],
}

for (const [name, rule, consume] of [
  ['sort-composable-return', sortComposableReturn, false],
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
