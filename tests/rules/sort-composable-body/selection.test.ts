import { expect } from 'vitest'
import { sortComposableBody } from '../../../src/rules/sort-composable-body.ts'
import { run } from '../../helpers/rule-tester.ts'
import type {
  SortComposableBodyMessageId,
  SortComposableBodyOptions,
} from '../../../src/types/index.ts'

const unsorted = 'function reset() {}\n  const step = 1'
const sorted = 'const step = 1\n  function reset() {}'
const declarations = [
  ['function useCounter() {', '}'],
  ['export function useCounter() {', '}'],
  ['export default function useCounter() {', '}'],
  ['async function useCounter() {', '}'],
  ['const useCounter = () => {', '}'],
  ['export const useCounter = async () => {', '}'],
  ['const useCounter = function internal() {', '}'],
  ['const useCounter = (() => {', '}) satisfies Function'],
  ['const useCounter = (function internal() {', '}) as Function'],
]
await run<SortComposableBodyOptions, SortComposableBodyMessageId>({
  name: 'sort-composable-body selection',
  rule: sortComposableBody,
  defaultFilenames: { js: 'test.ts' },
  valid: [
    ...[
      `function ordinary() { ${unsorted} }`,
      `function* useCounter() { ${unsorted} }`,
      `async function* useCounter() { ${unsorted} }`,
      `export default function() { ${unsorted} }`,
      `export default () => { ${unsorted} }`,
      `const useCounter = () => ({ reset() {}, step: 1 })`,
      `const value = function useCounter() { ${unsorted} }`,
      `const object = { useCounter() { ${unsorted} } }`,
      `class Counter { useCounter() { ${unsorted} } }`,
      `const useCounter = factory(() => { ${unsorted} })`,
      `useCounter = () => { ${unsorted} }`,
      `factory(function useCounter() { ${unsorted} })`,
      `function usecounter() { ${unsorted} }`,
      `function use1() { ${unsorted} }`,
      `function useCounter() { function helper() { ${unsorted} } }`,
      `function useCounter() { invoke(() => { ${unsorted} }) }`,
      `function useCounter() { if (enabled) { ${unsorted} } }`,
      `function useCounter() { return { reset() {}, step: 1 } }`,
      `const { reset, step } = useCounter()`,
      'const z = 1\nconst a = 2',
    ].map(code => ({
      code,
    })),
    {
      code: `function useCounter() { ${unsorted} }`,
      options: { ignoreNames: ['useCounter'] },
    },
    {
      code: `function useCounter() { ${unsorted} }`,
      options: { functionPattern: '^create' },
    },
    { code: `function useCounter() { ${unsorted} }`, options: { groups: [] } },
  ],
  invalid: [
    ...declarations.map(([start, end]) => ({
      description: `selects the binding in ${start}`,
      code: `${start}\n  ${unsorted}\n${end}`,
      errors: [
        {
          messageId: 'unexpectedGroupOrder' as const,
          data: { name: 'step', before: 'reset', group: 'constant' },
        },
      ],
      output: `${start}\n  ${sorted}\n${end}`,
    })),
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: `function useCounter() {\n  ${unsorted}\n}`,
      errors: ['unexpectedGroupOrder' as const],
      output: `function useCounter() {\n  ${sorted}\n}`,
    })),
    ...['', ' setup'].flatMap(attribute =>
      [false, true].map(typescript => ({
        description: `checks ${attribute || 'ordinary'} script with ${typescript ? 'TS' : 'JS'} parser`,
        filename: 'Test.vue',
        ...(typescript
          ? {}
          : { languageOptions: { parserOptions: { parser: null } } }),
        code: `<script${attribute}${typescript ? ' lang="ts"' : ''}>\nfunction useCounter() {\n  ${unsorted}\n}\n</script>`,
        errors: ['unexpectedGroupOrder' as const],
        output: `<script${attribute}${typescript ? ' lang="ts"' : ''}>\nfunction useCounter() {\n  ${sorted}\n}\n</script>`,
      })),
    ),
    {
      description: 'checks each script body without crossing blocks',
      filename: 'Test.vue',
      code: `<script>function useFirst() {\n  ${unsorted}\n}</script>\n<script setup>function useSecond() {\n  ${unsorted}\n}</script>`,
      errors: ['unexpectedGroupOrder', 'unexpectedGroupOrder'],
      output: `<script>function useFirst() {\n  ${sorted}\n}</script>\n<script setup>function useSecond() {\n  ${sorted}\n}</script>`,
    },
    {
      description: 'uses binding names and exact ignore exclusions',
      code: `const createCounter = function useIgnored() {\n  ${unsorted}\n}`,
      options: {
        functionPattern: '^create',
        ignoreNames: ['create', 'useIgnored'],
      },
      errors: ['unexpectedGroupOrder'],
      output: `const createCounter = function useIgnored() {\n  ${sorted}\n}`,
    },
    {
      description: 'checks eligible nested composables in an ordinary function',
      code: `function ordinary() { function useCounter() {\n  ${unsorted}\n} }`,
      errors: ['unexpectedGroupOrder'],
      output: `function ordinary() { function useCounter() {\n  ${sorted}\n} }`,
    },
    {
      description: 'converges when parent movement overlaps a nested body fix',
      code: 'function useOuter() {\n  function useInner() {\n    function reset() {}\n    const step = 1\n  }\n  const outer = 1\n}',
      errors: ['unexpectedGroupOrder', 'unexpectedGroupOrder'],
      output:
        'function useOuter() {\n  const outer = 1\n  function useInner() {\n    const step = 1\n    function reset() {}\n  }\n}',
    },
    {
      description:
        'reports the selected statement location even with fixes disabled',
      code: `function useCounter() {\n  ${unsorted}\n}`,
      options: { fix: 'none' },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          line: 3,
          column: 3,
          endLine: 3,
          endColumn: 17,
        },
      ],
      output: null,
    },
  ],
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
      expect(result.fixed).toBe(false)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
})
