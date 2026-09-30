import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { consistentTemplateRefName } from '../../src/rules/consistent-template-ref-name.ts'
import { run } from '../internal.ts'
import type { ConsistentTemplateRefNameMessageId } from '../../src/types/index.ts'

const vueImport = 'import { useTemplateRef } from "vue";'
const mismatch = `${vueImport} const inputRef = useTemplateRef("fieldRef")`

await run<never, ConsistentTemplateRefNameMessageId>({
  name: 'consistent-template-ref-name',
  rule: consistentTemplateRefName,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    if (testcase.type === 'invalid') {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
  valid: [
    {
      description: 'keeps auto-import recognition opt-in',
      code: 'const panelRef = useTemplateRef("fieldRef")',
      settings: { 'vue-perfectionist': { autoImport: false } },
      languageOptions: { globals: { useTemplateRef: 'readonly' } },
    },
    ...[
      'function useTemplateRef() {}; const panelRef = useTemplateRef("fieldRef")',
      'function read(useTemplateRef) { const panelRef = useTemplateRef("fieldRef") }',
      'import { useTemplateRef } from "other"; const panelRef = useTemplateRef("fieldRef")',
      'import type { useTemplateRef } from "vue"; const panelRef = useTemplateRef("fieldRef")',
      'const panelRef = templateRef("fieldRef")',
      'const panelRef = useTemplateRef?.("fieldRef")',
    ].map(code => ({
      description: `preserves API identity with auto-imports: ${code}`,
      code,
      settings: { 'vue-perfectionist': { autoImport: true } },
    })),
    ...[
      'const inputRef = useTemplateRef("inputRef")',
      'const input = useTemplateRef(`input`)',
      'const inputRef = useTemplateRef("input\\u0052ef")',
      'const inputRef = useTemplateRef()',
      'const inputRef = useTemplateRef(42)',
      'const inputRef = useTemplateRef(null)',
      'const key = "fieldRef"; const inputRef = useTemplateRef(key)',
      // eslint-disable-next-line no-template-curly-in-string
      'const inputRef = useTemplateRef(`field${index}`)',
      'const inputRef = useTemplateRef("field" + "Ref")',
      'const inputRef = useTemplateRef(...["fieldRef"])',
      'const { value: inputRef } = useTemplateRef("fieldRef")',
      'const [inputRef] = useTemplateRef("fieldRef")',
      'let inputRef; inputRef = useTemplateRef("fieldRef")',
      'const inputRef = wrap(useTemplateRef("fieldRef"))',
      'const inputRef = condition ? useTemplateRef("fieldRef") : null',
      'const inputRef = { value: useTemplateRef("fieldRef") }',
      'const inputRef = useTemplateRef?.("fieldRef")',
      'const alias = useTemplateRef; const inputRef = alias("fieldRef")',
      'function read(useTemplateRef) { const inputRef = useTemplateRef("fieldRef") }',
    ].map(code => ({ code: `${vueImport} ${code}` })),
    ...[
      'const inputRef = useTemplateRef("fieldRef")',
      'function useTemplateRef(key) { return key }; const inputRef = useTemplateRef("fieldRef")',
      'import { useTemplateRef } from "other"; const inputRef = useTemplateRef("fieldRef")',
      'import useTemplateRef from "vue"; const inputRef = useTemplateRef("fieldRef")',
      'import Vue from "vue"; const inputRef = Vue.useTemplateRef("fieldRef")',
      'import type { useTemplateRef } from "vue"; const inputRef = useTemplateRef("fieldRef")',
      'import { type useTemplateRef } from "vue"; const inputRef = useTemplateRef("fieldRef")',
      'import type * as Vue from "vue"; const inputRef = Vue.useTemplateRef("fieldRef")',
      'import * as Vue from "other"; const inputRef = Vue.useTemplateRef("fieldRef")',
      'import * as Vue from "vue"; const key = "useTemplateRef"; const inputRef = Vue[key]("fieldRef")',
      'import * as Vue from "vue"; const inputRef = Vue?.useTemplateRef("fieldRef")',
      'import * as Vue from "vue"; function read(Vue) { const inputRef = Vue.useTemplateRef("fieldRef") }',
      'import { ref, shallowRef } from "vue"; const inputRef = ref("fieldRef"); const panelRef = shallowRef("fieldRef")',
    ].map(code => ({ code })),
    {
      filename: 'Test.vue',
      code: '<template><input ref="fieldRef" /></template>',
    },
    {
      description: 'accepts matching names in a JavaScript SFC',
      filename: 'Test.vue',
      languageOptions: { parserOptions: { parser: null } },
      code: `<script setup>${vueImport} const inputRef = useTemplateRef('inputRef')</script><template><input ref="inputRef" /></template>`,
    },
  ],
  invalid: [
    ...['test.js', 'test.ts', 'Test.vue'].flatMap(filename =>
      [false, true].map(withGlobals => ({
        description: `recognizes auto-imports in ${filename}, globals: ${withGlobals}`,
        filename,
        code: filename.endsWith('.vue')
          ? '<script setup>const panelRef = useTemplateRef("fieldRef")</script>'
          : 'const panelRef = useTemplateRef("fieldRef")',
        settings: { 'vue-perfectionist': { autoImport: true } },
        languageOptions: withGlobals
          ? { globals: { useTemplateRef: 'readonly' as const } }
          : {},
        errors: ['inconsistentTemplateRefName' as const],
        output: null,
      })),
    ),
    {
      description: 'reports the receiving identifier and both names',
      filename: 'test.js',
      code: `${vueImport}\nconst inputRef = useTemplateRef('fieldRef')`,
      errors: [
        {
          messageId: 'inconsistentTemplateRefName',
          data: { name: 'inputRef', key: 'fieldRef' },
          line: 2,
          column: 7,
          endLine: 2,
          endColumn: 15,
        },
      ],
      output: null,
    },
    ...[
      'const inputRef = useTemplateRef(`fieldRef`)',
      'const inputRef = useTemplateRef("")',
      'const inputRef = useTemplateRef("InputRef")',
      'const inputRef = useTemplateRef("input-ref")',
      'const inputRef = (useTemplateRef("fieldRef"))',
      'const inputRef = useTemplateRef<HTMLInputElement>("fieldRef")',
      'const inputRef = (useTemplateRef("fieldRef" as const) as unknown)',
      'const inputRef = (useTemplateRef(`fieldRef` satisfies string) satisfies unknown)!',
      'const inputRef = <unknown>useTemplateRef(<string>"fieldRef")',
      'const inputRef = (useTemplateRef!)("fieldRef"!)',
      'const inputRef = (useTemplateRef<HTMLElement>)("fieldRef")',
      'let inputRef = useTemplateRef("fieldRef"); inputRef = other',
      'var inputRef = useTemplateRef("fieldRef")',
      'export const inputRef = useTemplateRef("fieldRef")',
      'function setup() { const inputRef = useTemplateRef("fieldRef"); return inputRef }',
      'const inputRef = useTemplateRef("fieldRef"), panelRef = useTemplateRef("panelRef")',
    ].map(code => ({
      description: `checks direct declarations: ${code}`,
      code: `${vueImport} ${code}`,
      errors: ['inconsistentTemplateRefName' as const],
      output: null,
    })),
    ...[
      'import { useTemplateRef as templateRef } from "vue"; const inputRef = templateRef("fieldRef")',
      'import * as Vue from "vue"; const inputRef = Vue.useTemplateRef("fieldRef")',
      'import * as Vue from "vue"; const inputRef = Vue["useTemplateRef"]("fieldRef")',
      'import * as Vue from "vue"; const inputRef = Vue[`useTemplateRef`]("fieldRef")',
    ].map(code => ({
      code,
      errors: ['inconsistentTemplateRefName' as const],
      output: null,
    })),
    ...['', ' lang="ts"'].flatMap(language =>
      ['', ' setup'].map(setup => ({
        description: `checks ${setup || 'ordinary'} scripts with ${language || 'JavaScript'}`,
        filename: 'Test.vue',
        languageOptions: language ? {} : { parserOptions: { parser: null } },
        code: `<script${setup}${language}>${mismatch}</script><template><input ref="fieldRef" /></template>`,
        errors: ['inconsistentTemplateRefName' as const],
        output: null,
      })),
    ),
    {
      description: 'checks both script blocks independently',
      filename: 'Test.vue',
      code: `<script lang="ts">${mismatch}</script><script setup lang="ts">const panelRef = useTemplateRef('otherRef')</script>`,
      errors: ['inconsistentTemplateRefName', 'inconsistentTemplateRefName'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'consistent-template-ref-name',
  rule: consistentTemplateRefName,
})

it.each([{}, { pattern: '.+Ref$' }, 'always', true])(
  'rejects options because the rule has no configuration: %j',
  async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  },
)

it.each(['true', 1, null, [], {}])(
  'rejects invalid autoImport settings: %j',
  async autoImport => {
    await expect(
      tester.valid({
        code: '',
        settings: { 'vue-perfectionist': { autoImport } },
      }),
    ).rejects.toThrow('autoImport must be a boolean')
  },
)
