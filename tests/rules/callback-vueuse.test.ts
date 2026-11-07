import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { callbackStyle } from '../../src/rules/callback-style.ts'
import { maxLinesPerCallback } from '../../src/rules/max-lines-per-callback.ts'
import { run } from '../helpers/rule-tester.ts'
import type {
  CallbackGroup,
  CallbackStyleMessageId,
  CallbackStyleOptions,
  MaxLinesPerCallbackMessageId,
  MaxLinesPerCallbackOptions,
} from '../../src/types/index.ts'

const targets: [CallbackGroup, string, number][] = [
  ['lifecycle', 'tryOnBeforeMount', 0],
  ['lifecycle', 'tryOnBeforeUnmount', 0],
  ['lifecycle', 'tryOnMounted', 0],
  ['lifecycle', 'tryOnUnmounted', 0],
  ['watch', 'watchArray', 1],
  ['watch', 'watchAtMost', 1],
  ['watch', 'watchDebounced', 1],
  ['watch', 'watchDeep', 1],
  ['watch', 'watchIgnorable', 1],
  ['watch', 'watchImmediate', 1],
  ['watch', 'watchOnce', 1],
  ['watch', 'watchThrottled', 1],
  ['watch', 'watchTriggerable', 1],
  ['watch', 'watchWithFilter', 1],
  ['watch', 'whenever', 1],
  ['cleanup', 'tryOnScopeDispose', 0],
  ['scheduler', 'useIntervalFn', 0],
  ['scheduler', 'useTimeoutFn', 0],
]

for (const [name, rule] of [
  ['callback-style', callbackStyle],
  ['max-lines-per-callback', maxLinesPerCallback],
] as const) {
  const callback =
    name === 'callback-style' ? 'handler' : '() => {\nfirst()\nsecond()\n}'
  const call = `watchDebounced(source, ${callback})`
  const imported = `import { watchDebounced } from '@vueuse/core'; ${call}`
  const options = { max: 3 }
  const ruleOptions = name === 'callback-style' ? {} : options
  const enabled = { 'vue-perfectionist': { vueuse: true, autoImport: true } }
  const custom = {
    source: '@vueuse/core',
    name: 'watchDebounced',
    callbackIndices: [1],
  }
  const diagnostic = (api = 'watchDebounced') =>
    name === 'callback-style'
      ? {
          messageId: 'expectedInlineCallback' as const,
          data: { name: api },
        }
      : {
          messageId: 'exceededMaxLines' as const,
          data: { name: api, lines: 4, max: 3 },
        }

  await run<
    CallbackStyleOptions & MaxLinesPerCallbackOptions,
    CallbackStyleMessageId | MaxLinesPerCallbackMessageId
  >({
    name: `${name} VueUse integration`,
    rule,
    defaultFilenames: { js: 'test.ts' },
    onResult(testcase, result) {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
    },
    valid: [
      {
        description:
          'disabled custom auto-imports stay disabled when built-in groups are empty',
        code: call,
        settings: enabled,
        options: {
          ...ruleOptions,
          groups: [],
          customCallbacks: [{ ...custom, autoImport: false }],
        },
      },
      ...[undefined, false].map(vueuse => ({
        description: 'VueUse built-ins are opt-in, including imported APIs',
        code: imported,
        settings: { 'vue-perfectionist': { vueuse, autoImport: true } },
        options: ruleOptions,
      })),
      {
        description: 'rule opt-out overrides shared VueUse opt-in',
        code: imported,
        settings: enabled,
        options: { ...ruleOptions, vueuse: false },
      },
      ...[undefined, false].map(autoImport => ({
        description: 'unbound VueUse APIs also need auto-import opt-in',
        code: call,
        languageOptions: { globals: { watchDebounced: 'readonly' as const } },
        settings: { 'vue-perfectionist': { vueuse: true, autoImport } },
        options: ruleOptions,
      })),
      ...[
        { groups: [] },
        { groups: ['lifecycle'] as CallbackGroup[] },
        { exclude: ['watchDebounced'] },
      ].map(overrides => ({
        description: 'VueUse built-ins follow groups and exclusions',
        code: imported,
        settings: enabled,
        options: { ...ruleOptions, ...overrides },
      })),
      {
        description: 'explicit empty globals disable both built-in libraries',
        code: call,
        settings: enabled,
        options: { ...ruleOptions, vueGlobals: [] },
      },
      {
        description: 'explicit globals cannot enable VueUse integration',
        code: call,
        options: { ...ruleOptions, vueGlobals: ['watchDebounced'] },
      },
      ...[
        `import { watchDebounced } from 'vue'; ${call}`,
        `import { watchDebounced } from '#imports'; ${call}`,
        `import watchDebounced from '@vueuse/core'; ${call}`,
        `import type { watchDebounced } from '@vueuse/core'; ${call}`,
        `import { type watchDebounced } from '@vueuse/core'; ${call}`,
        `const watchDebounced = register; ${call}`,
        `function local(watchDebounced) { ${call} }`,
        `${call}; const watchDebounced = register`,
        `import { watchDebounced } from '@vueuse/core'; function local(watchDebounced) { ${call} }`,
        `import * as VueUse from '@vueuse/core'; function local(VueUse) { VueUse.${call} }`,
        `import * as VueUse from '@vueuse/core'; VueUse['watchDebounced'](source, ${callback})`,
        `import * as VueUse from '@vueuse/core'; VueUse?.${call}`,
        `import { watchDebounced } from '@vueuse/core'; watchDebounced?.(source, ${callback})`,
        `import { watchDebounced } from '@vueuse/core'; watchDebounced(...sources, ${callback})`,
        `import { watchDebounced } from '@vueuse/core'; watchDebounced(source, ...handlers, ${callback})`,
        `import { watchDebounced } from '@vueuse/core'; watchDebounced(${callback}, () => {})`,
        `import { watchDebounced } from '@vueuse/core'; watchDebounced([${callback}], () => {})`,
        "import { watchDebounced } from '@vueuse/core'; watchDebounced(source)",
        `import { tryOnScopeDispose, useIntervalFn, useTimeoutFn } from '@vueuse/core'; tryOnScopeDispose(${callback}); useIntervalFn(${callback}, 100); useTimeoutFn(${callback}, 100)`,
        `import { debouncedWatch } from '@vueuse/core'; debouncedWatch(source, ${callback})`,
        `import { useEventListener } from '@vueuse/core'; useEventListener('click', ${callback}); useEventListener(target, 'click', ${callback})`,
      ].map(code => ({
        description:
          'preserves source, scope, syntax, group and index boundaries',
        code,
        settings: enabled,
        options: ruleOptions,
      })),
      {
        description: 'custom autoImport false still overrides shared opt-in',
        code: call,
        settings: { 'vue-perfectionist': { vueuse: false, autoImport: true } },
        options: {
          ...ruleOptions,
          customCallbacks: [{ ...custom, autoImport: false }],
        },
      },
      {
        description: 'VueUse integration does not visit template expressions',
        filename: 'Test.vue',
        code: `<template><button @click="${call}" /></template>`,
        settings: enabled,
        options: ruleOptions,
      },
    ],
    invalid: [
      {
        description:
          'custom autoImport opt-out does not disable an enabled built-in',
        code: call,
        settings: enabled,
        options: {
          ...ruleOptions,
          customCallbacks: [{ ...custom, autoImport: false }],
        },
        errors: [diagnostic()],
        output: null,
      },
      ...[undefined, false, true].map(shared => ({
        description: 'rule VueUse opt-in takes priority over shared settings',
        code: imported,
        settings: { 'vue-perfectionist': { vueuse: shared } },
        options: { ...ruleOptions, vueuse: true },
        errors: [diagnostic()],
        output: null,
      })),
      {
        description: 'shared VueUse opt-in checks imports without autoImport',
        code: imported,
        settings: { 'vue-perfectionist': { vueuse: true } },
        options: ruleOptions,
        errors: [diagnostic()],
        output: null,
      },
      ...targets.flatMap(([group, api, index]) =>
        ['@vueuse/core', '@vueuse/shared'].map(source => ({
          description: `checks ${api} callback at index ${index} from ${source}`,
          code: `import { ${api} as run } from '${source}'; run(${index ? 'source, ' : ''}${callback})`,
          options: { ...ruleOptions, vueuse: true, groups: [group] },
          errors: [diagnostic(api)],
          output: null,
        })),
      ),
      ...[
        `import * as VueUse from '@vueuse/shared'; VueUse.${call}`,
        `import * as VueUse from '@vueuse/core'; (VueUse as typeof VueUse).${call}`,
        `import { watchDebounced } from '@vueuse/core'; (watchDebounced as Watch) (source, ${callback})`,
        `import { watchDebounced } from '@vueuse/core'; type watchDebounced = string; ${call}`,
        `import { watchDebounced } from '@vueuse/core'; watchDebounced(source, ${callback}, ...options)`,
      ].map(code => ({
        description: 'resolves aliases, namespaces and transparent wrappers',
        code,
        settings: enabled,
        options: { ...ruleOptions, vueGlobals: [], vueImportSources: [] },
        errors: [diagnostic()],
        output: null,
      })),
      ...[false, true].map(withGlobals => ({
        description: 'both opt-ins recognize unbound VueUse callbacks',
        code: call,
        settings: enabled,
        languageOptions: withGlobals
          ? { globals: { watchDebounced: 'readonly' as const } }
          : {},
        options: ruleOptions,
        errors: [diagnostic()],
        output: null,
      })),
      {
        description:
          'explicit globals override autoImport for enabled built-ins',
        code: call,
        settings: { 'vue-perfectionist': { autoImport: false } },
        options: {
          ...ruleOptions,
          vueuse: true,
          vueGlobals: ['watchDebounced'],
        },
        errors: [diagnostic()],
        output: null,
      },
      ...[undefined, false, true].flatMap(vueuse =>
        [false, true].map(autoImport => ({
          description:
            'explicit custom callbacks survive all VueUse switch values',
          code: autoImport ? call : imported,
          settings: { 'vue-perfectionist': { vueuse, autoImport } },
          options: {
            ...ruleOptions,
            vueuse: false,
            groups: [],
            exclude: ['watchDebounced'],
            vueGlobals: [],
            customCallbacks: [custom],
          },
          errors: [diagnostic()],
          output: null,
        })),
      ),
      {
        description:
          'custom entry can enable auto-import without either shared opt-in',
        code: call,
        options: {
          ...ruleOptions,
          customCallbacks: [{ ...custom, autoImport: true }],
        },
        errors: [diagnostic()],
        output: null,
      },
      ...[imported, call].map(code => ({
        description: 'overlapping built-in and custom positions report once',
        code,
        settings: enabled,
        options: {
          ...ruleOptions,
          customCallbacks: [custom, custom],
        },
        errors: [diagnostic()],
        output: null,
      })),
      ...['', ' lang="ts"'].flatMap(language =>
        ['script', 'script setup'].map(tag => ({
          description: `checks VueUse callbacks in ${tag}${language}`,
          filename: 'Test.vue',
          code: `<${tag}${language}>${imported}</script>`,
          settings: enabled,
          options: ruleOptions,
          errors: [diagnostic()],
          output: null,
        })),
      ),
    ],
  })

  const tester = createRuleTester<unknown>({
    name: `${name} VueUse validation`,
    rule,
    languageOptions: { parser: tsParser },
  })

  describe(`${name} VueUse configuration`, () => {
    it.each(['true', 1, null, [], {}])(
      'rejects invalid rule vueuse: %j',
      async vueuse => {
        await expect(
          tester.valid({ code: '', options: { vueuse } }),
        ).rejects.toThrow()
      },
    )
    it.each(['true', 1, null, [], {}])(
      'rejects invalid shared vueuse even with a rule override: %j',
      async vueuse => {
        await expect(
          tester.valid({
            code: '',
            options: { vueuse: false },
            settings: { 'vue-perfectionist': { vueuse } },
          }),
        ).rejects.toThrow('vueuse must be a boolean')
      },
    )
  })
}
