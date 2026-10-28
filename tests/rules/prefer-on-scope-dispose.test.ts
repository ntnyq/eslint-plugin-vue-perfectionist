import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { preferOnScopeDispose } from '../../src/rules/prefer-on-scope-dispose.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  PreferOnScopeDisposeMessageId,
  PreferOnScopeDisposeOptions,
} from '../../src/types/index.ts'

function sfc(code: string) {
  return `<script setup lang="ts">${code}</script>`
}

const imported = "import { onUnmounted } from 'vue'; "
const call = 'onUnmounted(cleanup)'

await run<PreferOnScopeDisposeOptions, PreferOnScopeDisposeMessageId>({
  name: 'prefer-on-scope-dispose',
  rule: preferOnScopeDispose,
  onResult(_, result) {
    expect(result.fixed).toBe(false)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      'function usePolling(undefined) { onUnmounted(cleanup, undefined) }',
      'function usePolling() { const undefined = instance; onUnmounted(cleanup, undefined) }',
      'function usePolling() { onUnmounted(cleanup, null) }',
      'function usePolling() { onUnmounted(cleanup, target || undefined) }',
      'function usePolling() { onUnmounted(cleanup, ...targets) }',
      'function usePolling() { onUnmounted(...callbacks, undefined) }',
      'function usePolling() { onUnmounted(cleanup, undefined, extra) }',
    ].map(code => ({
      code: sfc(imported + code),
    })),
    {
      code: `<script>${imported}</script><script setup>const undefined = instance; function usePolling() { onUnmounted(cleanup, undefined) }</script>`,
    },
    {
      code: sfc(
        `${imported}function usePolling() { onUnmounted(cleanup, undefined) }`,
      ),
      options: { hooks: [], vueGlobals: ['onUnmounted'] },
    },
    {
      code: sfc(
        `${imported}function usePolling() { onUnmounted(cleanup, undefined) }`,
      ),
      options: { ignoreNames: ['usePolling'], functionPattern: '' },
    },
    {
      code: sfc(`${imported}function usePolling() { ${call} }`),
      options: { vueImportSources: ['#vue'] },
    },
    {
      code: sfc(`function usePolling() { onUnmounted(cleanup, undefined) }`),
      options: { hooks: ['onBeforeUnmount'] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      description: 'hook selection replaces the default list',
      code: sfc(`${imported}function usePolling() { ${call} }`),
      options: { hooks: ['onBeforeUnmount'] },
    },
    {
      description:
        'does not inspect class field initializers as composable bodies',
      code: sfc(
        `${
          imported
        }function usePolling() { class Resource { cleanup = ${call} } }`,
      ),
    },
    {
      description: 'setup-local bindings shadow an ordinary-script Vue import',
      code: `<script>${imported}</script><script setup>const onUnmounted = register; function usePolling() { ${call} }</script>`,
    },

    ...[
      call,
      `function setup() { ${call} }`,
      `function user() { ${call} }`,
      `function usePolling() { onMounted(() => { ${call} }) }`,
      `function usePolling() { return () => { ${call} } }`,
      `function usePolling() { function cleanupLater() { ${call} } }`,
      `const setup = function usePolling() { ${call} }`,
      `export default () => { ${call} }`,
      `const api = { usePolling() { ${call} } }`,
      `class Resource { usePolling() { ${call} } }`,
      `function usePolling() { class Resource { static { ${call} } } }`,
      `function usePolling(value = ${call}) {}`,
      'function usePolling() { onUnmounted(cleanup, instance) }',
      'function usePolling() { onUnmounted(...callbacks) }',
      'function usePolling() { onUnmounted() }',
      'function usePolling() { onUnmounted?.(cleanup) }',
      'function usePolling(onUnmounted) { onUnmounted(cleanup) }',
      'function usePolling() { const onUnmounted = register; onUnmounted(cleanup) }',
    ].map(code => ({
      code: sfc(imported + code),
    })),
    ...[
      `function usePolling() { ${call} }`,
      `import { onUnmounted } from 'other'; function usePolling() { ${call} }`,
      `import onUnmounted from 'vue'; function usePolling() { ${call} }`,
      `import type { onUnmounted } from 'vue'; function usePolling() { ${call} }`,
      "import * as Vue from 'vue'; function usePolling() { Vue['onUnmounted'](cleanup) }",
      "import Vue from 'vue'; function usePolling() { Vue.onUnmounted(cleanup) }",
      "import { onBeforeUnmount } from 'vue'; function usePolling() { onBeforeUnmount(cleanup) }",
      "import { onScopeDispose } from 'vue'; function usePolling() { onScopeDispose(cleanup) }",
    ].map(code => ({
      code: sfc(code),
    })),
    {
      code: sfc(`${imported}function useDom() { ${call} }`),
      options: { ignoreNames: ['useDom'] },
    },
    {
      code: sfc(`${imported}function usePolling() { ${call} }`),
      options: { hooks: [] },
    },
    {
      code: sfc(`${imported}function usePolling() { ${call} }`),
      options: { vueImportSources: [] },
    },
    {
      code: sfc(`${imported}function usePolling() { ${call} }`),
      options: { functionPattern: '^create' },
    },
    {
      code: sfc(`function usePolling() { ${call} }`),
      options: { vueGlobals: [] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      code: sfc(`function usePolling(onUnmounted) { ${call} }`),
      options: { vueGlobals: ['onUnmounted'] },
    },
    {
      code: sfc(
        `import type { onUnmounted } from 'vue'; function usePolling() { ${call} }`,
      ),
      options: { vueGlobals: ['onUnmounted'] },
    },
    {
      code: '<template>{{ onUnmounted(cleanup) }}</template>',
      options: { vueGlobals: ['onUnmounted'] },
    },
  ],
  invalid: [
    ...[
      'undefined',
      'void 0',
      'void getTarget()',
      'undefined as undefined',
    ].map(target => ({
      code: sfc(
        `${imported}function usePolling() { onUnmounted(cleanup, ${target}) }`,
      ),
      errors: ['preferScopeDispose' as const],
      output: null,
    })),
    {
      code: `${imported}function usePolling() { onUnmounted(cleanup, undefined) }`,
      filename: 'test.js',
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: `<script>${imported}function usePolling() { onUnmounted(cleanup, undefined) }</script><script setup>const undefined = instance</script>`,
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(
        `import * as Vue from '#vue'; function createPolling() { Vue.onBeforeUnmount(cleanup, void 0) }`,
      ),
      options: {
        hooks: ['onBeforeUnmount'],
        vueImportSources: ['#vue'],
        functionPattern: '^create',
      },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(`function usePolling() { onUnmounted(cleanup, undefined) }`),
      options: { vueImportSources: [], vueGlobals: ['onUnmounted'] },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(`${imported}function setup() { ${call} }`),
      options: { functionPattern: '', vueGlobals: [] },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      description: 'reports both lifecycle APIs when both are selected',
      code: sfc(
        "import { onUnmounted, onBeforeUnmount } from 'vue'; function usePolling() { onUnmounted(cleanup); onBeforeUnmount(cleanup) }",
      ),
      options: { hooks: ['onUnmounted', 'onBeforeUnmount'] },
      errors: ['preferScopeDispose', 'preferScopeDispose'],
      output: null,
    },

    ...[
      `function usePolling() { ${call} }`,
      `export function usePolling() { ${call} }`,
      `export default function usePolling() { ${call} }`,
      `const usePolling = () => { ${call} }`,
      `const usePolling = () => ${call}`,
      `const usePolling = function () { ${call} }`,
      `const usePolling = function internal() { ${call} }`,
      `const usePolling = (() => { ${call} }) satisfies Function`,
      `function usePolling() { if (enabled) { ${call} } }`,
      `async function usePolling() { ${call} }`,
      `function setup() { function usePolling() { ${call} } }`,
      'function usePolling() { onUnmounted(() => clearInterval(timer)) }',
    ].map(code => ({
      code: sfc(imported + code),
      errors: [
        {
          messageId: 'preferScopeDispose' as const,
          data: { name: 'usePolling', hook: 'onUnmounted' },
        },
      ],
      output: null,
    })),
    {
      code: sfc(
        "import { onUnmounted as cleanupOnUnmount } from 'vue'; function usePolling() { cleanupOnUnmount(cleanup) }",
      ),
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(
        "import * as Vue from 'vue'; function usePolling() { Vue.onUnmounted(cleanup) }",
      ),
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(
        `${
          imported
        }function usePolling() { (onUnmounted as Function)(cleanup) }`,
      ),
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(`${imported}function createPolling() { ${call} }`),
      options: { functionPattern: '^create', ignoreNames: [] },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(
        "import { onBeforeUnmount } from 'vue'; function usePolling() { onBeforeUnmount(cleanup) }",
      ),
      options: { hooks: ['onBeforeUnmount'] },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(`function usePolling() { ${call} }`),
      options: { vueGlobals: ['onUnmounted'] },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(`function usePolling() { ${call} }`),
      settings: { 'vue-perfectionist': { autoImport: true } },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(
        "import { onUnmounted } from '#vue'; function usePolling() { onUnmounted(cleanup) }",
      ),
      options: { vueImportSources: ['#vue'] },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: `${imported}function usePolling() { ${call} }`,
      filename: 'test.js',
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: `${imported}function usePolling() { ${call} }`,
      filename: 'test.ts',
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: `<script>${imported}function usePolling() { ${call} }</script>`,
      languageOptions: { parserOptions: { parser: null } },
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: `<script>${imported}function usePolling() { ${call} }</script><script setup>const onUnmounted = register</script>`,
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: `<script>${imported}</script><script setup>function usePolling() { ${call} }</script>`,
      errors: ['preferScopeDispose'],
      output: null,
    },
    {
      code: sfc(
        `${
          imported
        }function usePolling() { ${call}; nested(() => ${call}); ${call} }`,
      ),
      errors: ['preferScopeDispose', 'preferScopeDispose'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-on-scope-dispose',
  rule: preferOnScopeDispose,
  languageOptions: vueLanguageOptions,
})
it.each([
  { unknown: true },
  { functionPattern: '[' },
  { functionPattern: 1 },
  { ignoreNames: [''] },
  { ignoreNames: ['a', 'a'] },
  { hooks: ['onMounted'] },
  { hooks: ['onUnmounted', 'onUnmounted'] },
  { hooks: null },
  { vueGlobals: true },
  { vueGlobals: ['onUnmounted', 'onUnmounted'] },
  { vueImportSources: ['vue', 'vue'] },
  { vueImportSources: 'vue' },
  null,
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})
