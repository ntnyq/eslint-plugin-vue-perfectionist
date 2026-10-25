import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import { defineModelNameCasing } from '../../src/rules/define-model-name-casing.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  DefineModelNameCasing,
  DefineModelNameCasingMessageId,
  DefineModelNameCasingOptions,
} from '../../src/types/index.ts'

const sfc = (script: string) => `<script setup lang="ts">${script}</script>`
const names: Record<DefineModelNameCasing, string> = {
  camelCase: 'fileList',
  PascalCase: 'FileList',
  'kebab-case': 'file-list',
  snake_case: 'file_list',
}
const casings: DefineModelNameCasing[] = [
  'camelCase',
  'PascalCase',
  'kebab-case',
  'snake_case',
]
const mismatch = "const model = defineModel('file-list')"

await run<DefineModelNameCasingOptions, DefineModelNameCasingMessageId>({
  name: 'define-model-name-casing',
  rule: defineModelNameCasing,
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
      }
    }
    for (const message of result.messages) {
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      'defineModel()',
      'defineModel({ required: true })',
      "defineModel('fileList')",
      'defineModel(name)',
      `function defineModel() {}; ${mismatch}`,
      `import { defineModel } from 'vue'; ${mismatch}`,
    ].map(script => ({
      code: sfc(script),
      options: { fix: true },
    })),
    ...[
      'defineModel()',
      'defineModel<string>()',
      'defineModel({ type: String, required: true })',
      "defineModel('fileList')",
      'const [model, modifiers] = defineModel<string, "trim">("fileList")',
      'defineModel(`fileList`)',
      "defineModel('file\\u004cist')",
      "defineModel('élèveNom')",
      "defineModel('文件列表')",
      "defineModel('file2D')",
      "defineModel('')",
      "defineModel('123')",
      'defineModel(name)',
      "const name = 'file-list'; defineModel(name)",
      // eslint-disable-next-line no-template-curly-in-string
      'defineModel(`file-${suffix}`)',
      "defineModel('file' + '-list')",
      "defineModel(...['file-list'])",
      'defineModel(null)',
      'defineModel(42)',
      `function defineModel() {}; ${mismatch}`,
      `const defineModel = fn; ${mismatch}`,
      `import { defineModel } from 'vue'; ${mismatch}`,
      `import { defineModel } from 'other'; ${mismatch}`,
      `import type { defineModel } from 'vue'; ${mismatch}`,
      `import { type defineModel } from 'vue'; ${mismatch}`,
      "import { defineModel as model } from 'vue'; model('file-list')",
      "import * as Vue from 'vue'; Vue.defineModel('file-list')",
      "obj.defineModel('file-list')",
      "defineModel?.('file-list')",
      "const model = wrap(defineModel('file-list'))",
      "const model = condition ? defineModel('file-list') : null",
      "const model = () => defineModel('file-list')",
      `function nested() { ${mismatch} }`,
      `{ ${mismatch} }`,
      "withDefaults(defineModel('file-list'), {})",
      "defineModel('file-list', {}, extra)",
    ].map(script => ({
      code: sfc(script),
    })),
    ...casings.flatMap(casing => [
      { code: sfc(`defineModel('${names[casing]}')`), options: { casing } },
      { code: sfc('defineModel()'), options: { casing } },
    ]),
    { code: mismatch, filename: 'test.ts' },
    { code: mismatch, filename: 'test.js' },
    { code: mismatch, languageOptions: { parser: tsParser } },
    { code: `<script>${mismatch}</script>` },
    { code: `<script>${mismatch}</script><script setup>const x = 1</script>` },
    { code: '<template>{{ defineModel("file-list") }}</template>' },
    {
      description: 'keeps template model arguments independent',
      code: `${sfc("const fileList = defineModel('fileList')")}<template><Child v-model:file-list="fileList" /></template>`,
    },
  ],
  invalid: [
    ...casings.flatMap(casing =>
      casings
        .filter(other => other !== casing)
        .map(other => ({
          description: `renames ${other} to ${casing} only when opted in`,
          code: sfc(`defineModel('${names[other]}')`),
          options: { casing, fix: true },
          errors: [
            {
              messageId: 'unexpectedNameCasing' as const,
              data: { name: names[other], casing },
            },
          ],
          output: sfc(`defineModel('${names[casing]}')`),
        })),
    ),
    ...(
      [
        [
          "const model = defineModel('file-list')",
          "const model = defineModel('fileList')",
        ],
        [
          'const model = defineModel("file-list")',
          'const model = defineModel("fileList")',
        ],
        [
          'const model = defineModel(`file-list`)',
          'const model = defineModel(`fileList`)',
        ],
        [
          "const model = defineModel('file\\u002dlist')",
          "const model = defineModel('fileList')",
        ],
        [
          "const model = defineModel((/* name */ 'file-list' as const), { required: true })",
          "const model = defineModel((/* name */ 'fileList' as const), { required: true })",
        ],
        [
          "const [files, modifiers] = defineModel<string[], 'trim'>('file-list')",
          "const [files, modifiers] = defineModel<string[], 'trim'>('fileList')",
        ],
        [
          "const files = (defineModel('file-list') satisfies unknown)!",
          "const files = (defineModel('fileList') satisfies unknown)!",
        ],
        [
          "const files = defineModel('élève-nom')",
          "const files = defineModel('élèveNom')",
        ],
      ] satisfies [string, string][]
    ).map(([before, after]) => ({
      description: `preserves surrounding syntax when fixing: ${before}`,
      code: sfc(before),
      options: { fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: sfc(after),
    })),
    {
      description:
        'preserves JavaScript comments, CRLF, and parent template bindings',
      code: `<script setup>\r\nconst files = defineModel(/* key */ 'file-list')\r\n</script><template><Child v-model:file-list="files" /></template>`,
      languageOptions: { parserOptions: { parser: null } },
      options: { fix: true },
      errors: ['unexpectedNameCasing'],
      output: `<script setup>\r\nconst files = defineModel(/* key */ 'fileList')\r\n</script><template><Child v-model:file-list="files" /></template>`,
    },
    {
      description: 'fixes every independent model in one pass',
      code: sfc("defineModel('file-list'); defineModel('user-name')"),
      options: { fix: true },
      errors: ['unexpectedNameCasing', 'unexpectedNameCasing'],
      output: sfc("defineModel('fileList'); defineModel('userName')"),
    },
    ...[
      { script: "defineModel('file-list'); defineModel('fileList')", count: 1 },
      { script: "defineModel('file-list'); defineModel('FileList')", count: 2 },
      { script: "defineModel('model-value'); defineModel()", count: 1 },
      {
        script: "defineModel('model-value'); defineModel({ required: true })",
        count: 1,
      },
      { script: "defineModel('!!!')", count: 1 },
      {
        script: "defineModel('file-list'); defineModel('fileListModifiers')",
        count: 1,
      },
      {
        script: "defineModel('model-value'); defineModel('modelModifiers')",
        count: 1,
      },
      {
        script: "defineModel('file-list'); defineModel('file-list-modifiers')",
        count: 2,
      },
    ].map(({ script, count }) => ({
      description: `keeps empty or conflicting names report-only even with fixes enabled: ${script}`,
      code: sfc(script),
      options: { fix: true },
      errors: Array.from(
        { length: count },
        () => 'unexpectedNameCasing' as const,
      ),
      output: null,
    })),
    {
      description: 'preserves potential name collisions and CRLF comments',
      code: `<script setup>\r\nconst files = defineModel(/* key */ 'file-list')\r\nconst other = defineModel('fileList')\r\n</script>`,
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    {
      description:
        'checks an explicit default model name under non-default casing',
      code: sfc("defineModel('modelValue')"),
      options: { casing: 'snake_case' },
      errors: [
        {
          messageId: 'unexpectedNameCasing',
          data: { name: 'modelValue', casing: 'snake_case' },
        },
      ],
      output: null,
    },
    ...[undefined, {}, { casing: 'camelCase' as const }, { fix: false }].map(
      options => ({
        description: 'uses camelCase by default',
        code: sfc(mismatch),
        options,
        errors: [
          {
            messageId: 'unexpectedNameCasing' as const,
            data: { name: 'file-list', casing: 'camelCase' },
          },
        ],
        output: null,
      }),
    ),
    ...casings.flatMap(casing =>
      casings
        .filter(other => other !== casing)
        .map(other => ({
          description: `reports ${other} when ${casing} is required`,
          code: sfc(`defineModel('${names[other]}')`),
          options: { casing },
          errors: [
            {
              messageId: 'unexpectedNameCasing' as const,
              data: { name: names[other], casing },
            },
          ],
          output: null,
        })),
    ),
    ...[
      "defineModel<string>('file-list', { required: true })",
      "const [files, modifiers] = defineModel<string, 'trim'>('file-list')",
      "const files = (defineModel('file-list'))",
      "const files = defineModel('file-list') as unknown",
      "const files = defineModel('file-list') satisfies unknown",
      "const files = <unknown>defineModel('file-list')",
      "const files = defineModel('file-list')!",
      "const files = defineModel(('file-list' as const))",
      "const files = defineModel('file-list' satisfies string)",
      "const files = defineModel(('file-list')!)",
      'const files = defineModel(`file-list`)',
      "const files = defineModel('file\\u002dlist')",
      "const files = defineModel(/* name */ 'file-list' /* options */, { default: () => [] })",
      "const files = defineModel('file-list'), count = defineModel('count')",
    ].map(script => ({
      code: sfc(script),
      errors: [
        {
          messageId: 'unexpectedNameCasing' as const,
          data: { name: 'file-list', casing: 'camelCase' },
        },
      ],
      output: null,
    })),
    {
      description:
        'reports only the name literal, without its TypeScript wrapper',
      code: `<script setup lang="ts">\ndefineModel('file-list' as const)\n</script>`,
      errors: [
        {
          messageId: 'unexpectedNameCasing',
          data: { name: 'file-list', casing: 'camelCase' },
          line: 2,
          column: 13,
          endLine: 2,
          endColumn: 24,
        },
      ],
      output: null,
    },
    ...[
      'FileList',
      'file_list',
      'URLValue',
      'file list',
      '!!!',
      'file.list',
      '_fileList',
    ].map(name => ({
      description: `uses uncase normalization for ${name}`,
      code: sfc(`defineModel('${name}')`),
      errors: [
        {
          messageId: 'unexpectedNameCasing' as const,
          data: { name, casing: 'camelCase' },
        },
      ],
      output: null,
    })),
    {
      description: 'reports every explicit mismatching name',
      code: sfc("defineModel('file-list'); defineModel('user-name')"),
      errors: ['unexpectedNameCasing', 'unexpectedNameCasing'],
      output: null,
    },
    {
      description:
        'accepts ESLint globals without treating them as local bindings',
      code: sfc(mismatch),
      languageOptions: { globals: { defineModel: 'readonly' } },
      settings: { 'vue-perfectionist': { autoImport: false } },
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    {
      description: 'checks JavaScript SFCs with the default script parser',
      code: `<script setup>${mismatch}</script>`,
      languageOptions: { parserOptions: { parser: null } },
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    ...[false, true].map(reverse => ({
      description: `checks setup names in dual scripts, reverse: ${reverse}`,
      code: reverse
        ? `${sfc(mismatch)}<script lang="ts">${mismatch}</script>`
        : `<script lang="ts">${mismatch}</script>${sfc(mismatch)}`,
      errors: ['unexpectedNameCasing' as const],
      output: null,
    })),
  ],
})

const tester = createRuleTester<unknown>({
  name: 'define-model-name-casing',
  rule: defineModelNameCasing,
  languageOptions: vueLanguageOptions,
})
it.each([
  { casing: 'invalid' },
  { casing: 'pascalCase' },
  { casing: '' },
  { casing: null },
  { casing: true },
  { casing: ['camelCase'] },
  { unknown: true },
  { fix: 'true' },
  { fix: null },
  { fix: 1 },
  { fix: [] },
  'camelCase',
])('rejects invalid options: %j', async options => {
  await expect(
    tester.valid({ code: sfc(''), filename: 'Test.vue', options }),
  ).rejects.toThrow()
})

it('documents how opted-in renames change public prop, event, and modifier contracts', () => {
  const compile = (name: string) => {
    const { descriptor } = parse(sfc(`const files = defineModel('${name}')`))
    return compileScript(descriptor, { id: 'model-casing' }).content
  }
  const original = compile('file-list')
  const renamed = compile('fileList')
  expect(original).toContain('"file-list":')
  expect(original).toContain('"file-listModifiers":')
  expect(original).toContain('"update:file-list"')
  expect(renamed).toContain('"fileList":')
  expect(renamed).toContain('"fileListModifiers":')
  expect(renamed).toContain('"update:fileList"')
})
