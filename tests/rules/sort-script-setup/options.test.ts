import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { sortScriptSetup } from '../../../src/rules/sort-script-setup.ts'
import { createVueSFC } from '../../helpers/create-vue-sfc.ts'
import { vueLanguageOptions } from '../../helpers/rule-tester.ts'

// Invalid options deliberately cross the public type boundary to exercise validation.
const tester = createRuleTester<unknown>({
  name: 'sort-script-setup',
  rule: sortScriptSetup,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

describe('option validation', () => {
  it('resolves undefined Vue globals through shared auto-import settings', async () => {
    await expect(
      tester.valid({
        code: '<script setup>const z = ref(0)</script>',
        options: { vueGlobals: undefined },
        settings: { 'vue-perfectionist': { autoImport: true } },
      }),
    ).resolves.toMatchObject({ result: { fixed: false, messages: [] } })
  })

  it.each([
    { type: 'usage' },
    { newlinesBetween: 'always' },
    { newlinesBetween: -1 },
    { type: undefined },
    { fix: undefined },
    { fallbackSort: { type: 'natural', order: undefined } },
    { groups: [{ group: 'constant', newlinesInside: undefined }] },
    {
      groups: ['custom'],
      customGroups: [
        {
          groupName: 'custom',
          selector: undefined,
          elementNamePattern: '.*',
        },
      ],
    },
    { partitionByComment: { pattern: 'region', flags: undefined } },
    { newlinesBetween: Number.MAX_SAFE_INTEGER + 1 },
    { newlinesInside: Number.MAX_SAFE_INTEGER + 1 },
    {
      groups: [
        'constant',
        { newlinesBetween: Number.MAX_SAFE_INTEGER + 1 },
        'function',
      ],
    },
    {
      groups: [
        { group: 'constant', newlinesInside: Number.MAX_SAFE_INTEGER + 1 },
      ],
    },
    {
      groups: ['custom'],
      customGroups: [
        {
          groupName: 'custom',
          selector: 'constant',
          newlinesInside: Number.MAX_SAFE_INTEGER + 1,
        },
      ],
    },
    { newlinesInside: 1, partitionByNewLine: true },
    { groups: ['constant', 'constant'] },
    { groups: ['oops'] },
    { groups: [[]] },
    { groups: [{ newlinesBetween: 1 }, 'constant'] },
    { groups: ['constant', { newlinesBetween: 1 }] },
    { groups: ['const-ref', 'ref-const'] },
    { groups: ['let-constant'] },
    {
      groups: ['constant'],
      customGroups: [{ groupName: 'unused', selector: 'function' }],
    },
    { groups: ['custom'], customGroups: [{ groupName: 'custom' }] },
    {
      groups: ['custom'],
      customGroups: [{ groupName: 'custom', anyOf: [{}] }],
    },
    {
      groups: ['custom'],
      customGroups: [{ groupName: 'custom', elementNamePattern: '[' }],
    },
    { type: 'custom' },
    { type: 'custom', alphabet: 'aa' },
    { groups: [{ group: 'constant', type: 'custom' }] },
    { vueGlobals: ['madeUpApi'] },
    { locales: 'not_a_locale' },
    { sortImports: true },
  ])('rejects invalid configuration: %j', async options => {
    await expect(
      tester.valid({
        code: createVueSFC({
          script: `
          <script setup lang="ts">
          const a = 1
          </script>
        `,
        }),
        options,
      }),
    ).rejects.toThrow()
  })

  it.each([
    { perfectionist: { type: 'natural' } },
    { 'vue-perfectionist': { type: 'natural' } },
    { perfectionist: { type: 'usage' } },
    { 'vue-perfectionist': { type: 'usage' } },
    { 'vue-perfectionist': null },
    { 'vue-perfectionist': [] },
    { 'vue-perfectionist': 'natural' },
    {
      perfectionist: { newlinesBetween: 1, partitionByNewLine: true },
      'vue-perfectionist': { partitionByComment: '[' },
    },
    {
      'vue-perfectionist': {
        // cSpell: disable-next-line
        tyep: 'natural',
      },
    },
  ])('ignores ESLint settings: %j', async settings => {
    await expect(
      tester.valid({
        code: createVueSFC({
          script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
        }),
        settings,
      }),
    ).resolves.toMatchObject({ result: { fixed: false, messages: [] } })
  })

  it('rejects numeric newline overrides in partitioned custom groups', async () => {
    await expect(
      tester.valid({
        code: createVueSFC({
          script: `
            <script setup lang="ts">
            function a() {}
            </script>
          `,
        }),
        options: {
          partitionByNewLine: true,
          groups: ['f'],
          customGroups: [
            { groupName: 'f', selector: 'function', newlinesInside: 0 },
          ],
        },
      }),
    ).rejects.toThrow()
  })
})
