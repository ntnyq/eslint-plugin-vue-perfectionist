import * as tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import * as vueParser from 'vue-eslint-parser'
import plugin from '../../src/index.ts'
import { preferRefPattern } from '../../src/rules/prefer-ref-pattern.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  PreferRefPatternMessageId,
  PreferRefPatternOptions,
} from '../../src/types/index.ts'

function sfc(script: string, template = ''): string {
  return `<script setup lang="ts">\n${script}\n</script>\n<template>${template}</template>`
}

await run<PreferRefPatternOptions, PreferRefPatternMessageId>({
  name: 'prefer-ref-pattern',
  rule: preferRefPattern,
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
      description:
        'ignores ref bindings forced to ordinary DOM properties or attributes',
      code: '<template><div :ref.prop="\'bad\'" /><Widget :ref.attr="\'bad\'" /></template>',
    },
    {
      description:
        'ignores unrelated attributes and missing or non-string arguments',
      code: sfc(
        'import { h, useTemplateRef } from "vue"; useTemplateRef(); useTemplateRef(42); h("div"); h("div", props); h("div", { ref: null })',
        '<div ref :ref="null" @ref="capture" :id="\'bad\'" />',
      ),
    },
    {
      code: '<template><div ref="tableRef" /><div :ref="\'tableRef\'" /><div :ref="`tableRef`" /></template>',
    },
    {
      description: 'does not require the variable name to match the key',
      code: sfc(
        'import { useTemplateRef } from "vue"; const element = useTemplateRef("tableRef")',
        '<div ref="tableRef" />',
      ),
    },
    {
      description: 'ignores reactive state that is not used as a template ref',
      code: sfc(
        'import { ref, shallowRef } from "vue"; const count = ref(0); const visible = shallowRef(false)',
      ),
    },
    {
      description: 'accepts confirmed ref variables with matching names',
      code: sfc(
        'import { ref, h } from "vue"; const tableRef = ref(null); h("div", { ref: tableRef })',
        '<div :ref="tableRef" />',
      ),
    },
    {
      description: 'skips function refs and dynamic expressions',
      code: sfc(
        'import { h, useTemplateRef } from "vue"; const capture = el => {}; useTemplateRef(key); h("div", { ref: capture }); h("div", { ref: el => {} })',
        // This interpolation belongs to the Vue fixture, not the test itself.
        // eslint-disable-next-line no-template-curly-in-string
        '<div :ref="capture" /><div :ref="el => {}" /><div :ref="condition ? a : b" /><div :ref="`item${index}`" /><div :[key]="\'bad\'" />',
      ),
    },
    {
      description: 'skips globals, other modules, and default imports',
      code: sfc(
        'import h from "vue"; import { useTemplateRef, ref } from "other"; const panel = ref(null); useTemplateRef("bad"); h("div", { ref: "bad" })',
        '<div :ref="panel" />',
      ),
    },
    { code: sfc('useTemplateRef("bad"); h("div", { ref: "bad" })') },
    {
      description: 'skips type-only Vue imports',
      code: sfc(
        'import type { h, useTemplateRef, ref } from "vue"; const panel = ref(null); h("div", { ref: "bad" }); useTemplateRef("bad")',
        '<div :ref="panel" />',
      ),
    },
    {
      description: 'respects shadowed API and ref bindings',
      code: sfc(
        'import { h, ref, useTemplateRef } from "vue"; const panel = ref(null); function render(h, useTemplateRef) { h("div", { ref: "bad" }); useTemplateRef("bad") }; function another(panel) { return h("div", { ref: panel }) }; function local(ref) { const element = ref(null); return h("div", { ref: element }) }',
      ),
    },
    {
      description: 'respects shadowed namespace bindings',
      code: sfc(
        'import * as Vue from "vue"; function render(Vue) { Vue.h("div", { ref: "bad" }); Vue.useTemplateRef("bad") }',
      ),
    },
    {
      description:
        'respects v-for and slot scope, including same-element bindings',
      code: sfc(
        'import { ref } from "vue"; const panel = ref(null)',
        '<div v-for="panel in panels" :ref="panel" /><Widget v-slot="{ panel }"><div :ref="panel" /></Widget>',
      ),
    },
    {
      description: 'does not infer Options API exposure from a module variable',
      code: '<script>import { ref } from "vue"; const panel = ref(null); export default {}</script><template><div :ref="panel" /></template>',
    },
    {
      description:
        'skips reassigned variables and destructured ref initializers',
      code: sfc(
        'import { ref, h } from "vue"; let panel = ref(null); panel = el => {}; const { value: element } = ref(null); h("div", { ref: panel }); h("div", { ref: element })',
        '<div :ref="panel" /><div :ref="element" />',
      ),
    },
    {
      description: 'checks only the effective known render ref property',
      code: sfc(
        'import { h } from "vue"; h("div", { ref: "bad", ref: "goodRef" }); h("div", { ref: "bad", ...props }); h("div", { ref: "bad", [key]: value }); h("div", { ref() {} }); h("div", { get ref() { return "bad" } }); h(...args, { ref: "bad" })',
      ),
    },
    {
      description: 'an empty target list disables all checks',
      code: sfc(
        'import { useTemplateRef, h } from "vue"; useTemplateRef("bad"); h("div", { ref: "bad" })',
        '<div ref="bad" />',
      ),
      options: { targets: [] },
    },
    {
      code: '<template><div ref="search-input-ref" /></template>',
      options: { pattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-ref$' },
    },
    {
      code: '<template><div ref="prefixRefTrailing" /></template>',
      options: { pattern: 'Ref' },
    },
    {
      code: '<template><div ref="anything" /></template>',
      options: { pattern: '' },
    },
  ],
  invalid: [
    {
      description:
        'resolves setup refs after the template and outside a shadowing loop',
      code: '<template><div v-for="panel in panels" :ref="panel" /><div :ref="panel" /></template><script setup>import { shallowRef } from "vue"; const panel = shallowRef(null)</script>',
      errors: ['unexpectedRefPattern'],
      output: null,
    },
    {
      description: 'supports the same-name v-bind shorthand',
      code: sfc(
        'import { ref as makeRef } from "vue"; const ref = makeRef(null)',
        '<div :ref />',
      ),
      errors: ['unexpectedRefPattern'],
      output: null,
    },
    ...[
      '<div ref="panel" />',
      '<Widget ref="panel" />',
      '<div :ref="\'panel\'" />',
      '<div :ref="`panel`" />',
    ].map(template => ({
      code: `<template>${template}</template>`,
      errors: [
        {
          messageId: 'unexpectedRefPattern' as const,
          data: { name: 'panel', pattern: '.+Ref$' },
        },
      ],
      output: null,
    })),
    {
      code: '<template><div ref="" /><div ref="Ref" /></template>',
      errors: ['unexpectedRefPattern', 'unexpectedRefPattern'],
      output: null,
    },
    {
      description: 'reports the exact attribute value location',
      code: '<template><div ref="panel" /></template>',
      errors: [
        {
          messageId: 'unexpectedRefPattern',
          line: 1,
          column: 20,
          endLine: 1,
          endColumn: 27,
        },
      ],
      output: null,
    },
    ...['ref', 'shallowRef', 'useTemplateRef'].map(api => ({
      description: `checks a template variable initialized with ${api}`,
      code: sfc(
        `import { ${api} } from "vue"; const panel = ${api}("panelRef")`,
        '<div :ref="panel" />',
      ),
      errors: ['unexpectedRefPattern' as const],
      output: null,
    })),
    {
      description: 'handles Vue import aliases and TypeScript wrappers',
      code: sfc(
        'import { ref as makeRef, h as createElement, useTemplateRef as templateRef } from "vue"; const panel = (makeRef<HTMLElement | null>(null) as unknown); templateRef("bad" as string); createElement("div", { ref: panel! } satisfies object)',
        '<div :ref="panel as unknown" />',
      ),
      errors: [
        'unexpectedRefPattern',
        'unexpectedRefPattern',
        'unexpectedRefPattern',
      ],
      output: null,
    },
    {
      description: 'handles namespace imports and static computed API names',
      code: sfc(
        'import * as Vue from "vue"; const panel = Vue.shallowRef(null); Vue.useTemplateRef(`bad`); Vue["h"]("div", { ["ref"]: panel }); Vue.h("div", { "ref": "bad" })',
        '<div :ref="panel" />',
      ),
      errors: [
        'unexpectedRefPattern',
        'unexpectedRefPattern',
        'unexpectedRefPattern',
        'unexpectedRefPattern',
      ],
      output: null,
    },
    {
      description: 'checks refs inside ordinary setup functions',
      code: '<script lang="ts">import { h, ref } from "vue"; export default { setup() { const panel = ref<HTMLElement>(); return () => h("div", { ref: panel }) } }</script>',
      errors: ['unexpectedRefPattern'],
      output: null,
    },
    {
      description: 'checks shorthand render props and properties after spreads',
      code: sfc(
        'import { h, ref as makeRef } from "vue"; const ref = makeRef(null); h("div", { ref }); h("div", { ...props, ref: "bad" }); h("div", { ref: `bad` }, "text")',
      ),
      errors: [
        'unexpectedRefPattern',
        'unexpectedRefPattern',
        'unexpectedRefPattern',
      ],
      output: null,
    },
    ...(['template', 'useTemplateRef', 'render'] as const).map(target => ({
      description: `enables only the ${target} target`,
      code: sfc(
        'import { useTemplateRef, h } from "vue"; useTemplateRef("bad"); h("div", { ref: "bad" })',
        '<div ref="bad" />',
      ),
      options: { targets: [target] },
      errors: ['unexpectedRefPattern' as const],
      output: null,
    })),
    {
      code: '<template><div ref="tableRef" /></template>',
      options: { pattern: '^ref[A-Z]' },
      errors: ['unexpectedRefPattern'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-ref-pattern',
  rule: preferRefPattern,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

describe('prefer-ref-pattern configuration', () => {
  it.each([
    { pattern: '[' },
    { pattern: '(' },
    { pattern: 42 },
    { targets: ['unknown'] },
    { targets: ['template', 'template'] },
    { targets: 'render' },
    { suffix: 'Ref' },
  ])('rejects invalid options: %j', async options => {
    await expect(
      tester.valid({ code: '<template />', options }),
    ).rejects.toThrow()
  })

  it.each([
    {
      filename: 'Test.vue',
      code: '<template><div ref="bad" /></template>',
      languageOptions: { parser: vueParser },
    },
    {
      filename: 'render.js',
      code: 'import { h } from "vue"; h("div", { ref: "bad" })',
      languageOptions: {},
    },
    {
      filename: 'render.ts',
      code: 'import { useTemplateRef } from "vue"; useTemplateRef<HTMLElement>("bad")',
      languageOptions: { parser: tsParser },
    },
  ])(
    'works through the public plugin in $filename without changing source',
    ({ filename, code, languageOptions }) => {
      const linter = new Linter()
      const config: Linter.Config = {
        files: ['**/*.{vue,js,ts}'],
        languageOptions,
        plugins: { 'vue-perfectionist': plugin },
        rules: { 'vue-perfectionist/prefer-ref-pattern': 'error' },
      }
      const result = linter.verifyAndFix(code, config, filename)
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0]?.messageId).toBe('unexpectedRefPattern')
      expect(result.output).toBe(code)
      expect(result.fixed).toBe(false)
      expect(linter.verifyAndFix(result.output, config, filename)).toEqual(
        result,
      )
    },
  )
})
