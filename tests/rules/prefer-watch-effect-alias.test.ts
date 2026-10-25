import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { preferWatchEffectAlias } from '../../src/rules/prefer-watch-effect-alias.ts'
import { run } from '../internal.ts'
import type {
  PreferWatchEffectAliasMessageId,
  PreferWatchEffectAliasOptions,
} from '../../src/types/index.ts'

const sfc = (script: string) => `<script setup lang="ts">${script}</script>`
const withVue = (code: string) => `import { watchEffect } from 'vue'; ${code}`
const post = "watchEffect(update, { flush: 'post' })"
const autoSettings = { 'vue-perfectionist': { autoImport: true } }

function diagnostic(flush: 'post' | 'sync' = 'post') {
  return {
    messageId: 'preferredAlias' as const,
    data: {
      flush,
      alias: flush === 'post' ? 'watchPostEffect' : 'watchSyncEffect',
    },
  }
}

await run<PreferWatchEffectAliasOptions, PreferWatchEffectAliasMessageId>({
  name: 'prefer-watch-effect-alias',
  rule: preferWatchEffectAlias,
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
    ...[
      'watchEffect(update)',
      'watchEffect(update, {})',
      "watchEffect(update, { flush: 'pre' })",
      'watchEffect(update, { flush: timing })',
      'watchEffect(update, { flush })',
      'watchEffect(update, options)',
      "const options = { flush: 'post' }; watchEffect(update, options)",
      'watchEffect(update, getOptions())',
      "watchEffect(update, { flush: 'post', ...options })",
      "watchEffect(update, { ...options, flush: 'post' })",
      "watchEffect(update, { flush: 'post', [key]: value })",
      "watchEffect(update, { [key]: value, flush: 'post' })",
      "watchEffect(update, { get flush() { return 'post' } })",
      "watchEffect(update, { flush() { return 'post' } })",
      "watchEffect(update, { flush: 'post', flush: 'pre' })",
      "watchEffect(update, { flush: 'post', flush: timing })",
      "watchEffect(update, { flush: 'post', get flush() { return 'post' } })",
      // eslint-disable-next-line no-template-curly-in-string
      'watchEffect(update, { flush: `po${suffix}` })',
      "watchEffect(update, { flush: 'po' + 'st' })",
      "watchEffect(update, { flush: 'POST' })",
      'watchEffect(update, null)',
      'watchEffect(update, ...options)',
      "watchEffect(...effects, { flush: 'post' })",
      "watchEffect(update, { flush: 'post' }, extra)",
      "watchEffect?.(update, { flush: 'post' })",
      "const { watchEffect: effect } = Vue; effect(update, { flush: 'post' })",
      "function run(watchEffect: Function) { watchEffect(update, { flush: 'post' }) }",
      "{ const watchEffect = custom; watchEffect(update, { flush: 'post' }) }",
    ].map(code => ({
      code: withVue(code),
    })),
    ...[
      post,
      `const watchEffect = custom; ${post}`,
      `function watchEffect() {}; ${post}`,
      `import { watchEffect } from 'other'; ${post}`,
      `import watchEffect from 'vue'; ${post}`,
      `import type { watchEffect } from 'vue'; ${post}`,
      `import { type watchEffect } from 'vue'; ${post}`,
      "import * as Vue from 'other'; Vue.watchEffect(update, { flush: 'post' })",
      "import Vue from 'vue'; Vue.watchEffect(update, { flush: 'post' })",
      "import * as Vue from 'vue'; Vue['watchEffect'](update, { flush: 'post' })",
      "import * as Vue from 'vue'; Vue?.watchEffect(update, { flush: 'post' })",
      "import * as Vue from 'vue'; Vue.watchEffect?.(update, { flush: 'post' })",
      "import * as Vue from 'vue'; function run(Vue: object) { Vue.watchEffect(update, { flush: 'post' }) }",
      "import { watch, watchPostEffect, watchSyncEffect } from 'vue'; watch(source, update, { flush: 'post' }); watchPostEffect(update); watchSyncEffect(update)",
    ].map(code => ({
      code,
    })),
    {
      description: 'explicit globals disable shared auto-import recognition',
      code: post,
      settings: autoSettings,
      options: { vueGlobals: [] },
    },
    {
      description: 'globals do not override local bindings',
      code: `const watchEffect = custom; ${post}`,
      settings: autoSettings,
      options: { vueGlobals: ['watchEffect'] },
    },
    {
      code: withVue(post),
      options: { vueImportSources: [] },
    },
    {
      code: withVue(post),
      options: { vueImportSources: ['#imports'] },
    },
    {
      description: 'type-only imports do not become auto-imported APIs',
      code: `import type { watchEffect } from 'vue'; ${post}`,
      settings: autoSettings,
    },
    {
      description: 'setup locals shadow ordinary script imports',
      filename: 'Test.vue',
      code: `<script lang="ts">import { watchEffect } from 'vue'</script>${sfc(`const watchEffect = custom; ${post}`)}`,
    },
    {
      description: 'template expressions are outside the rule scope',
      code: `${sfc("import { watchEffect } from 'vue'")}<template>{{ watchEffect(update, { flush: 'post' }) }}</template>`,
      filename: 'Test.vue',
    },
  ],
  invalid: [
    ...(['post', 'sync'] as const).flatMap(flush =>
      [
        `watchEffect(update, { flush: '${flush}' })`,
        `watchEffect(() => { update() }, { 'flush': '${flush}', onTrack: debug })`,
        `watchEffect(function () {}, { [\`flush\`]: \`${flush}\` })`,
        `watchEffect(update, { ['flush']: '${flush}' as const })`,
        `(watchEffect as Function)(update, ({ flush: '${flush}' } satisfies Options))`,
        `watchEffect!(update, { flush: '${flush}' })`,
        `watchEffect(update, { flush: 'pre', flush: '${flush}' })`,
      ].map(code => ({
        code: withVue(code),
        errors: [diagnostic(flush)],
        output: null,
      })),
    ),
    ...[
      "import { watchEffect as effect } from 'vue'; effect(update, { flush: 'post' })",
      "import { 'watchEffect' as effect } from 'vue'; effect(update, { flush: 'post' })",
      "import * as Vue from 'vue'; Vue.watchEffect(update, { flush: 'post' })",
      "import * as Vue from 'vue'; (Vue as object).watchEffect(update, { flush: 'post' })",
      `${withVue('')} function useLayout() { ${post} }`,
      "import { watchEffect } from 'vue'; watchEffect(update, { fl\\u0075sh: 'po\\u0073t' })",
    ].map(code => ({
      code,
      errors: [diagnostic()],
      output: null,
    })),
    {
      description: 'reports the callee with the intended alias',
      code: `import { watchEffect } from 'vue'\n${post}`,
      filename: 'test.js',
      errors: [
        {
          ...diagnostic(),
          line: 2,
          column: 1,
          endLine: 2,
          endColumn: 12,
        },
      ],
      output: null,
    },
    ...['<script>', '<script setup>'].map(tag => ({
      description: 'supports JavaScript SFC scripts with the JS parser',
      code: `${tag}${withVue(post)}</script>`,
      filename: 'Test.vue',
      languageOptions: { parserOptions: { parser: null } },
      errors: [diagnostic()],
      output: null,
    })),
    {
      code: sfc(withVue(post)),
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'ordinary scripts cannot see setup-local shadows',
      code: `<script lang="ts">${withVue(post)}</script>${sfc('const watchEffect = custom')}`,
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'both scripts can use a hoisted Vue import',
      code: `<script lang="ts">${withVue(post)}</script>${sfc(post)}`,
      filename: 'Test.vue',
      errors: [diagnostic(), diagnostic()],
      output: null,
    },
    {
      description: 'keeps comments, debug options, and CRLF untouched',
      code: `import { watchEffect } from 'vue'\r\nwatchEffect(/* effect */ update, {\r\n  onTrack: createDebugger(),\r\n  flush: /* timing */ 'post',\r\n})`,
      errors: [diagnostic()],
      output: null,
    },
    {
      code: post,
      settings: autoSettings,
      languageOptions: { globals: { watchEffect: 'readonly' } },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'rule-level globals override disabled shared auto-imports',
      code: post,
      settings: { 'vue-perfectionist': { autoImport: false } },
      options: { vueGlobals: ['watchEffect'] },
      errors: [diagnostic()],
      output: null,
    },
    {
      code: `import { watchEffect as effect } from '#imports'; effect(update, { flush: 'sync' })`,
      options: { vueImportSources: ['#imports'] },
      errors: [diagnostic('sync')],
      output: null,
    },
    {
      code: `import * as Vue from '@vue/runtime-core'; Vue.watchEffect(update, { flush: 'post' })`,
      options: { vueImportSources: ['@vue/runtime-core'], vueGlobals: [] },
      errors: [diagnostic()],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-watch-effect-alias',
  rule: preferWatchEffectAlias,
  languageOptions: { parser: tsParser },
})

it.each([
  { unknown: true },
  { vueGlobals: true },
  { vueGlobals: ['watchEffect', 'watchEffect'] },
  { vueGlobals: [1] },
  { vueImportSources: 'vue' },
  { vueImportSources: ['vue', 'vue'] },
  { vueImportSources: [null] },
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})

it('rejects invalid shared auto-import settings', async () => {
  await expect(
    tester.valid({
      code: post,
      settings: { 'vue-perfectionist': { autoImport: 'yes' } },
    }),
  ).rejects.toThrow('autoImport must be a boolean')
})
