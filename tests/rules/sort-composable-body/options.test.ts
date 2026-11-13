import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { sortComposableBody } from '../../../src/rules/sort-composable-body.ts'
import { run } from '../../helpers/rule-tester.ts'
import type {
  SortComposableBodyMessageId,
  SortComposableBodyOptions,
} from '../../../src/types/index.ts'

const body = (source: string) =>
  `function useCounter() {\n  ${source.replaceAll('\n', '\n  ')}\n}`
await run<SortComposableBodyOptions, SortComposableBodyMessageId>({
  name: 'sort-composable-body options',
  rule: sortComposableBody,
  defaultFilenames: { js: 'test.ts' },
  valid: [
    { code: body('const z = 1\nconst a = 2') },
    {
      code: body('const z = 1\nconst a = 2'),
      options: { type: 'natural', groups: ['unknown'] },
    },
    {
      code: body('const z = 1\nfunction boundary() {}\nconst a = 2'),
      options: { type: 'natural', groups: ['constant'] },
    },
    {
      code: body('const $a = 1\nconst a = 2'),
      options: { type: 'natural', specialCharacters: 'remove' },
    },
    {
      code: body('const z = 1\nconst a = 2'),
      options: { type: 'unsorted', fallbackSort: { type: 'alphabetical' } },
    },
    {
      code: body('const z = 1\nconst a = 2'),
      options: { groups: [['constant', 'function']], customGroups: [] },
    },
  ],
  invalid: [
    ...[
      { type: 'alphabetical' as const },
      { type: 'natural' as const },
      { type: 'custom' as const, alphabet: 'abcdefghijklmnopqrstuvwxyz' },
      { groups: [{ group: 'constant', type: 'natural' as const }] },
      { groups: [{ group: 'unknown', type: 'natural' as const }] },
    ].map(options => ({
      code: body('const z = 1\nconst a = 2'),
      options,
      errors: ['unexpectedOrder' as const],
      output: body('const a = 2\nconst z = 1'),
    })),
    {
      description: 'line-length compares whole statements excluding semicolons',
      code: body('const a = 100000\nconst zebra = 1;'),
      options: { type: 'line-length' },
      errors: ['unexpectedOrder'],
      output: body('const zebra = 1;\nconst a = 100000'),
    },
    {
      description: 'fallback comparator breaks primary size ties',
      code: body('const z = 1\nconst a = 2'),
      options: { type: 'line-length', fallbackSort: { type: 'natural' } },
      errors: ['unexpectedOrder'],
      output: body('const a = 2\nconst z = 1'),
    },
    {
      description: 'descending order affects within-group sorting only',
      code: body('function reset() {}\nconst a = 1\nconst z = 2'),
      options: { type: 'natural', order: 'desc' },
      errors: ['unexpectedGroupOrder'],
      output: body('const z = 2\nconst a = 1\nfunction reset() {}'),
    },
    ...['g', 'y', 'gi'].map(flags => ({
      description: `matches custom regex arrays independently with ${flags}`,
      code: body('const z = 1\nconst a = 2'),
      options: {
        groups: ['chosen', 'constant'],
        customGroups: [
          {
            groupName: 'chosen',
            anyOf: [
              { elementNamePattern: ['^missing$', { pattern: '^a$', flags }] },
              { selector: 'interface' as const },
            ],
          },
        ],
      },
      errors: ['unexpectedGroupOrder' as const],
      output: body('const a = 2\nconst z = 1'),
    })),
    {
      description:
        'first matching custom group and its comparator override win',
      code: body('const z = 1\nconst a = 2'),
      options: {
        groups: [{ group: 'chosen', type: 'unsorted' }, 'other'],
        customGroups: [
          { groupName: 'chosen', elementNamePattern: '.*', type: 'natural' },
          { groupName: 'other', selector: 'constant' },
        ],
      },
      errors: ['unexpectedOrder'],
      output: body('const a = 2\nconst z = 1'),
    },
    {
      description: 'merged custom groups use the group comparator',
      code: body('const z = 1\nconst a = 2'),
      options: {
        groups: [{ group: ['chosen', 'constant'], type: 'natural' }],
        customGroups: [
          { groupName: 'chosen', elementNamePattern: '^z$', type: 'unsorted' },
        ],
      },
      errors: ['unexpectedOrder'],
      output: body('const a = 2\nconst z = 1'),
    },
    {
      description: 'fallback subgroup order resolves equal-size declarations',
      code: body('interface A {}\ntype B = number'),
      options: {
        groups: [['type', 'interface']],
        type: 'custom',
        alphabet: 'ab',
        fallbackSort: { type: 'subgroup-order' },
        ignoreCase: false,
      },
      errors: ['unexpectedOrder'],
      output: body('type B = number\ninterface A {}'),
    },
    {
      description:
        'custom call identity uses export names and exact runtime import sources',
      code: `import { useRouter as router } from 'vue-router'\n${body(
        'function reset() {}\nconst target = router()',
      )}`,
      options: {
        groups: ['router', 'function'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
            importSourcePattern: '^vue-router$',
          },
        ],
      },
      errors: ['unsafeReorder'],
      output: null,
    },
    {
      description: 'default imports keep their local classification names',
      code: `import useStore from './store'\n${body(
        'function reset() {}\nconst target = useStore()',
      )}`,
      options: {
        groups: ['store', 'function'],
        customGroups: [
          {
            groupName: 'store',
            callNamePattern: '^useStore$',
            importSourcePattern: '^./store$',
          },
        ],
      },
      errors: ['unsafeReorder'],
      output: null,
    },
    {
      description: 'group separators and internal spacing preserve indentation',
      code: body('const a = 1\nfunction reset() {}'),
      options: { groups: ['constant', { newlinesBetween: 1 }, 'function'] },
      errors: ['unexpectedNewlinesBetween'],
      output: body('const a = 1\nfunction reset() {}').replace(
        '\n  function',
        '\n\n  function',
      ),
    },
    {
      description: 'removes extra lines with the shared sentinel policy',
      code: body('const a = 1\n\nconst b = 2'),
      options: { newlinesBetween: 1, newlinesInside: 'newlinesBetween' },
      errors: ['unexpectedNewlinesInside'],
      output: body('const a = 1\nconst b = 2'),
    },
    {
      description: 'does not emit spacing reports for reordered pairs',
      code: body('function reset() {}\nconst step = 1'),
      options: { newlinesBetween: 1 },
      errors: ['unexpectedGroupOrder'],
      output: body('const step = 1\nfunction reset() {}').replace(
        '\n  function',
        '\n\n  function',
      ),
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

const tester = createRuleTester<unknown>({
  name: 'sort-composable-body',
  rule: sortComposableBody,
  languageOptions: { parser: tsParser },
  defaultFilenames: { js: 'test.ts' },
})
it.each([
  { functionPattern: '[' },
  { functionPattern: 0 },
  { functionPattern: undefined },
  { ignoreNames: 'useCounter' },
  { ignoreNames: ['same', 'same'] },
  { groups: ['define-props'] },
  { groups: ['const-define-props'] },
  {
    customGroups: [{ groupName: 'custom', selector: 'define-model' }],
    groups: ['custom'],
  },
  {
    customGroups: [
      { groupName: 'custom', anyOf: [{ selector: 'define-props' }] },
    ],
    groups: ['custom'],
  },
  { typeInformation: 'required' },
  { memberKinds: [] },
  { unknownMembers: 'ignore' },
  { usage: true },
  { tsconfig: 'tsconfig.json' },
  { useConfigurationIf: {} },
  { ignoreCallbackDependencies: true },
  { fix: 'unsafe' },
  { return: true },
  { type: 'name-length' },
  { type: undefined },
  { groups: ['constant', 'constant'] },
  { groups: ['const-async-function', 'async-const-function'] },
  { groups: ['let-constant'] },
  { groups: [{ newlinesBetween: 1 }, 'constant'] },
  { groups: ['constant', { newlinesBetween: 1 }] },
  { groups: [[]] },
  { groups: ['unrecognized'] },
  { vueGlobals: ['onUnknown'] },
  { locales: 'not_a_locale' },
  { alphabet: 'aa' },
  { type: 'custom' },
  { newlinesBetween: Number.MAX_SAFE_INTEGER + 1 },
  { newlinesInside: -1 },
  { newlinesBetween: 1, partitionByNewLine: true },
  {
    groups: [{ group: 'constant', newlinesInside: 1 }],
    partitionByNewLine: true,
  },
  {
    groups: ['unused'],
    customGroups: [{ groupName: 'other', selector: 'constant' }],
  },
  { groups: ['custom'], customGroups: [{ groupName: 'custom' }] },
  { groups: ['custom'], customGroups: [{ groupName: 'custom', anyOf: [{}] }] },
  {
    groups: ['custom'],
    customGroups: [
      { groupName: 'custom', selector: 'ref', modifiers: ['async'] },
    ],
  },
  {
    groups: ['custom'],
    customGroups: [
      { groupName: 'custom', callNamePattern: { pattern: '.', flags: 'bad' } },
    ],
  },
  { partitionByComment: { line: '[' } },
])('rejects invalid body options: %j', async options => {
  await expect(
    tester.valid({ code: body('const a = 1'), options }),
  ).rejects.toThrow()
})
