import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { maxLinesPerCallback } from '../../src/rules/max-lines-per-callback.ts'
import { run } from '../internal.ts'
import type {
  MaxLinesPerCallbackMessageId,
  MaxLinesPerCallbackOptions,
} from '../../src/types/index.ts'

function callbackWithLines(lines: number): string {
  return `() => {\n${'  update()\n'.repeat(lines - 2)}}`
}

function withVue(code: string): string {
  return `import { watch, onMounted, watchEffect } from 'vue'\n${code}`
}

const longCallback = callbackWithLines(4)
const customCallback = {
  source: '@vueuse/core',
  name: 'watchDebounced',
  callbackIndices: [1],
}
const autoSettings = { 'vue-perfectionist': { autoImport: true } }

function diagnostic(name = 'onMounted', lines = 4, max = 3) {
  return {
    messageId: 'exceededMaxLines' as const,
    data: { name, lines, max },
  }
}

await run<MaxLinesPerCallbackOptions, MaxLinesPerCallbackMessageId>({
  name: 'max-lines-per-callback',
  rule: maxLinesPerCallback,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(testcase.code)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    {
      description: 'namespace wrappers do not bypass parameter shadowing',
      code: `import * as Vue from 'vue'; function local(Vue: unknown) { (Vue as typeof Vue).onMounted(${longCallback}) }`,
      options: { max: 3 },
    },
    { code: withVue(`onMounted(${callbackWithLines(20)})`) },
    { code: withVue('onMounted(() => {})'), options: { max: 1 } },
    {
      description: 'counts only the callback, not surrounding call lines',
      code: withVue('onMounted(\n\n  () => {}\n\n)'),
      options: { max: 1 },
    },
    {
      description: 'does not count wrappers or comments outside the function',
      code: withVue(
        'onMounted((\n/* before */\n() => {}\n/* after */\n) as Callback)',
      ),
      options: { max: 1 },
    },
    ...[
      `watch(${longCallback}, () => {})`,
      `watch([${longCallback}], () => {})`,
      `const handler = ${longCallback}; onMounted(handler)`,
      `function handler() {\nupdate()\nupdate()\n}; onMounted(handler)`,
      `onMounted(condition ? ${longCallback} : handler)`,
      `onMounted(factory(${longCallback}))`,
      'onMounted(service.handler)',
      'onMounted(handler.bind(service))',
      'onMounted(null)',
      'onMounted()',
      'watch(source)',
      `watch(...args, ${longCallback})`,
      `onMounted(...args, ${longCallback})`,
      `onMounted(...[${longCallback}])`,
    ].map(code => ({
      description: `skips non-target callbacks: ${code}`,
      code: withVue(code),
      options: { max: 3 },
    })),
    ...[
      `onMounted(${longCallback})`,
      `import { onMounted } from 'other'; onMounted(${longCallback})`,
      `import onMounted from 'vue'; onMounted(${longCallback})`,
      `import type { onMounted } from 'vue'; onMounted(${longCallback})`,
      `import { type onMounted } from 'vue'; onMounted(${longCallback})`,
      `import type * as Vue from 'vue'; Vue.onMounted(${longCallback})`,
      `import Vue from 'vue'; Vue.onMounted(${longCallback})`,
      `import { onMounted } from 'vue'; function local(onMounted) { onMounted(${longCallback}) }`,
      `import * as Vue from 'vue'; function local(Vue) { Vue.onMounted(${longCallback}) }`,
      `import { onMounted } from 'vue'; onMounted?.(${longCallback})`,
      `import * as Vue from 'vue'; Vue?.onMounted(${longCallback})`,
      `import * as Vue from 'vue'; Vue['onMounted'](${longCallback})`,
      `import { computed, customRef } from 'vue'; computed(${longCallback}); customRef(${longCallback})`,
      `import { onScopeDispose, nextTick } from 'vue'; onScopeDispose(${longCallback}); nextTick(${longCallback})`,
    ].map(code => ({
      description: 'respects default API identity and groups',
      code,
      options: { max: 3 },
    })),
    ...[
      `function onMounted() {}; onMounted(${longCallback})`,
      `onMounted(${longCallback}); const onMounted = register`,
      `function local(onMounted) { onMounted(${longCallback}) }`,
      `import { onMounted } from 'other'; onMounted(${longCallback})`,
      `import type { onMounted } from 'vue'; onMounted(${longCallback})`,
    ].map(code => ({
      description: 'auto-imports cannot override local bindings',
      code,
      settings: autoSettings,
      options: { max: 3, vueGlobals: ['onMounted'] },
    })),
    ...[
      { groups: [] },
      { groups: ['watch'] as const },
      { exclude: ['onMounted'] },
      { vueImportSources: [] },
    ].map(options => ({
      description: 'can disable built-in targets',
      code: withVue(`onMounted(${longCallback})`),
      options: {
        max: 3,
        ...options,
        ...('groups' in options ? { groups: [...options.groups] } : {}),
      },
    })),
    {
      code: `onMounted(${longCallback})`,
      settings: autoSettings,
      options: { max: 3, vueGlobals: [] },
    },
    ...[
      [undefined, undefined],
      [false, undefined],
      [true, false],
    ].map(([shared, autoImport]) => ({
      description: 'custom auto-import defaults and per-entry opt-out',
      code: `watchDebounced(source, ${longCallback})`,
      settings: { 'vue-perfectionist': { autoImport: shared } },
      options: { max: 3, customCallbacks: [{ ...customCallback, autoImport }] },
    })),
    ...[
      `const watchDebounced = register; watchDebounced(source, ${longCallback})`,
      `function local(watchDebounced) { watchDebounced(source, ${longCallback}) }`,
      `import { watchDebounced } from 'other'; watchDebounced(source, ${longCallback})`,
      `import type { watchDebounced } from '@vueuse/core'; watchDebounced(source, ${longCallback})`,
    ].map(code => ({
      code,
      settings: autoSettings,
      options: { max: 3, customCallbacks: [customCallback] },
    })),
    {
      description: 'skips blank and comment-only lines independently',
      code: withVue(
        'onMounted(() => {\n\n// comment\n/* first\n\nlast */\nupdate() // trailing\n})',
      ),
      options: { max: 3, skipBlankLines: true, skipComments: true },
    },
    {
      description: 'supports comment-only empty bodies',
      code: withVue('onMounted(() => {\n// one\n/* two */ /* three */\n})'),
      options: { max: 2, skipComments: true },
    },
    {
      description: 'does not visit template expressions',
      filename: 'Test.vue',
      code: `<template><button @click="onMounted(${longCallback})" /></template>`,
      settings: autoSettings,
      options: { max: 3 },
    },
  ],
  invalid: [
    {
      description: 'recognizes wrapped namespace receivers for length checks',
      code: `import * as Vue from 'vue'; (Vue as typeof Vue).onMounted(${longCallback})`,
      options: { max: 3 },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'reports the callback range and default limit',
      code: withVue(`onMounted(${callbackWithLines(21)})`),
      errors: [
        {
          ...diagnostic('onMounted', 21, 20),
          line: 2,
          column: 11,
          endLine: 22,
          endColumn: 2,
        },
      ],
      output: null,
    },
    ...['\n', '\r\n', '\r', '\u{2028}', '\u{2029}'].map(eol => ({
      description: `counts physical lines with ${JSON.stringify(eol)} endings`,
      code: withVue(`onMounted(${longCallback})`).replaceAll('\n', () => eol),
      options: { max: 3 },
      errors: [diagnostic()],
      output: null,
    })),
    ...(
      [
        ['() => {\n\nupdate()\n}', {}, 4],
        ['() => {\n\nupdate()\n}', { skipBlankLines: true }, 3],
        ['() => {\n// comment\nupdate()\n}', {}, 4],
        ['() => {\n// comment\nupdate()\n}', { skipComments: true }, 3],
        ['() => {\n/* start\n\nend */\nupdate()\n}', { skipComments: true }, 3],
        [
          '() => {\n/* start\n\nend */\nupdate()\n}',
          { skipBlankLines: true },
          5,
        ],
        ['() => {\n\n// comment\nupdate()\n}', { skipComments: true }, 4],
        ['() => {\n\n// comment\nupdate()\n}', { skipBlankLines: true }, 4],
        [
          '() => { // opening\n/* before */ update() /* after */\n}',
          { skipComments: true },
          3,
        ],
        [
          '() => {\n/* starts\n*/ update() /* continues\nends */\n}',
          { skipComments: true },
          3,
        ],
        [
          '() => {\nconst text = `first\n// not a comment\n/* not a comment */\nlast`\n}',
          { skipComments: true },
          6,
        ],
        [
          '() => {\nconst pattern = /https?:/\nupdate()\n}',
          { skipComments: true },
          4,
        ],
        ['(\nvalue,\noldValue,\n) => {\nupdate(value, oldValue)\n}', {}, 6],
        ['async function named() {\nawait update()\n}', {}, 3],
        ['function* () {\nyield update()\n}', {}, 3],
        ['() => (\nfirst() +\nsecond()\n)', {}, 4],
        ['() => {\nfunction nested() {\nupdate()\n}\nnested()\n}', {}, 6],
      ] satisfies [string, MaxLinesPerCallbackOptions, number][]
    ).map(([callback, options, lines]) => ({
      description: `counts callback syntax: ${callback}`,
      code: withVue(`onMounted(${callback})`),
      options: { max: 2, ...options },
      errors: [diagnostic('onMounted', lines, 2)],
      output: null,
    })),
    ...[
      `(${longCallback}) as Callback`,
      `(${longCallback}) satisfies Callback`,
      `(${longCallback})!`,
      `<Callback>(${longCallback})`,
      `(${longCallback})<string>`,
    ].map(callback => ({
      code: withVue(`onMounted(${callback})`),
      options: { max: 3 },
      errors: [diagnostic()],
      output: null,
    })),
    ...[
      'onActivated',
      'onBeforeMount',
      'onBeforeUnmount',
      'onBeforeUpdate',
      'onDeactivated',
      'onErrorCaptured',
      'onMounted',
      'onRenderTracked',
      'onRenderTriggered',
      'onServerPrefetch',
      'onUnmounted',
      'onUpdated',
      'watchEffect',
      'watchPostEffect',
      'watchSyncEffect',
    ].map(name => ({
      code: `import { ${name} } from 'vue'; ${name}(${longCallback})`,
      options: { max: 3 },
      errors: [diagnostic(name)],
      output: null,
    })),
    ...['onScopeDispose', 'onWatcherCleanup', 'nextTick'].map(name => ({
      code: `import { ${name} } from 'vue'; ${name}(${longCallback}); ${name}()`,
      options: { max: 3, groups: ['cleanup', 'scheduler'] },
      errors: [diagnostic(name)],
      output: null,
    })),
    {
      description:
        'checks watch callback before a spread, leaving its source alone',
      code: withVue(`watch(${longCallback}, ${longCallback}, ...options)`),
      options: { max: 3 },
      errors: [diagnostic('watch')],
      output: null,
    },
    {
      description:
        'nested matched callbacks count in the enclosing callback too',
      code: withVue(`onMounted(() => {\nwatchEffect(${longCallback})\n})`),
      options: { max: 3 },
      errors: [diagnostic('onMounted', 6), diagnostic('watchEffect')],
      output: null,
    },
    ...[
      `import { onMounted as mounted } from 'vue'; mounted(${longCallback})`,
      `import * as Vue from 'vue'; Vue.onMounted(${longCallback})`,
      `import { onMounted } from 'vue'; (onMounted as Hook)(${longCallback})`,
      `import { onMounted } from 'vue'; function useFeature() { onMounted(${longCallback}) }`,
    ].map(code => ({
      code,
      options: { max: 3 },
      errors: [diagnostic()],
      output: null,
    })),
    {
      code: `import { onMounted as mounted } from '#imports'; mounted(${longCallback})`,
      options: { max: 3, vueImportSources: ['#imports'] },
      errors: [diagnostic()],
      output: null,
    },
    ...[false, true].map(withGlobals => ({
      code: `onMounted(${longCallback})`,
      settings: autoSettings,
      languageOptions: withGlobals
        ? { globals: { onMounted: 'readonly' as const } }
        : {},
      options: { max: 3 },
      errors: [diagnostic()],
      output: null,
    })),
    {
      code: `onMounted(${longCallback})`,
      settings: { 'vue-perfectionist': { autoImport: false } },
      options: { max: 3, vueGlobals: ['onMounted'] },
      errors: [diagnostic()],
      output: null,
    },
    ...[
      [true, undefined],
      [false, true],
      [undefined, true],
    ].map(([shared, autoImport]) => ({
      description:
        'custom callbacks inherit or override shared auto-imports independently',
      code: `watchDebounced(source, ${longCallback})`,
      settings: { 'vue-perfectionist': { autoImport: shared } },
      options: {
        max: 3,
        groups: [],
        vueGlobals: [],
        customCallbacks: [{ ...customCallback, autoImport }],
      },
      errors: [diagnostic('watchDebounced')],
      output: null,
    })),
    {
      description:
        'explicit custom imports match even with auto-imports disabled',
      code: `import { watchDebounced as watchLater } from '@vueuse/core'; import * as VueUse from '@vueuse/core'; import custom from './events';\nwatchLater(source, ${longCallback}); VueUse.watchDebounced(source, ${longCallback}); custom(${longCallback})`,
      options: {
        max: 3,
        customCallbacks: [
          { ...customCallback, autoImport: false },
          { source: './events', name: 'default', callbackIndices: [0] },
        ],
      },
      errors: [
        diagnostic('watchDebounced'),
        diagnostic('watchDebounced'),
        diagnostic('default'),
      ],
      output: null,
    },
    {
      description:
        'custom positions merge, bypass built-in exclusions, and stop before spreads',
      code: withVue(
        `watch(${longCallback}, ${longCallback}, ...rest, ${longCallback})`,
      ),
      options: {
        max: 3,
        exclude: ['watch'],
        customCallbacks: [
          { source: 'vue', name: 'watch', callbackIndices: [0, 1, 3] },
          { source: 'vue', name: 'watch', callbackIndices: [1] },
        ],
      },
      errors: [diagnostic('watch'), diagnostic('watch')],
      output: null,
    },
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: withVue(`onMounted(${longCallback})`),
      options: { max: 3 },
      errors: [diagnostic()],
      output: null,
    })),
    ...['', ' lang="ts"'].flatMap(language =>
      ['script', 'script setup'].map(tag => ({
        description: `checks ${tag}${language}`,
        filename: 'Test.vue',
        code: `<${tag}${language}>\n${withVue(`onMounted(${longCallback})`)}\n</script>`,
        languageOptions: language ? {} : { parserOptions: { parser: null } },
        options: { max: 3 },
        errors: [diagnostic()],
        output: null,
      })),
    ),
    {
      description: 'checks both scripts and ignores the template in one SFC',
      filename: 'Test.vue',
      code: `<script lang="ts">${withVue(`onMounted(${longCallback})`)}</script>\n<script setup lang="ts">watchEffect(${longCallback})</script>\n<template><button @click="onMounted(${longCallback})" /></template>`,
      options: { max: 3 },
      errors: [diagnostic(), diagnostic('watchEffect')],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'max-lines-per-callback',
  rule: maxLinesPerCallback,
  languageOptions: { parser: tsParser },
})

describe('max-lines-per-callback configuration', () => {
  it.each([
    ...[0, -1, 1.5, '20', null].map(max => ({
      max,
    })),
    { unknown: true },
    { skipBlankLines: 'true' },
    { skipComments: 1 },
    { groups: ['unknown'] },
    { groups: ['watch', 'watch'] },
    { vueGlobals: [1] },
    { vueImportSources: 'vue' },
    { exclude: [false] },
    ...[
      { ...customCallback, autoImport: 'true' },
      { ...customCallback, callbackIndices: [-1] },
      { ...customCallback, callbackIndices: [0.5] },
      { ...customCallback, callbackIndices: [1, 1] },
      { ...customCallback, callbackIndices: [] },
      { ...customCallback, source: '' },
      { ...customCallback, name: '' },
      { ...customCallback, extra: true },
      { source: 'vue', name: 'watch' },
    ].map(custom => ({
      customCallbacks: [custom],
    })),
  ])('rejects invalid options: %j', async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  })
})
