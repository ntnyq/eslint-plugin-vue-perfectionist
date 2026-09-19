import { runInNewContext } from 'node:vm'
import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { callbackStyle } from '../../src/rules/callback-style.ts'
import { $, run } from '../internal.ts'
import type { Linter } from 'eslint'
import type {
  CallbackStyleMessageId,
  CallbackStyleOptions,
} from '../../src/types/index.ts'

function withVue(code: string): string {
  return `import { onMounted, watch, watchEffect } from 'vue'\n${code}`
}

const ordinaryFunctions = [
  'function () { return this.value }',
  'function () { return arguments[0] }',
  'function recursive() { return recursive() }',
  'function* () { yield 1 }',
  'async function () { return await fetchData() }',
]

const customOptions: CallbackStyleOptions = {
  groups: [],
  customCallbacks: [
    {
      source: 'vue-router',
      name: 'onBeforeRouteLeave',
      callbackIndices: [0],
    },
    {
      source: '@vueuse/core',
      name: 'watchDebounced',
      callbackIndices: [1],
    },
    { source: './events', name: 'subscribe', callbackIndices: [1, 2] },
    { source: './default', name: 'default', callbackIndices: [0] },
  ],
}

await run<CallbackStyleOptions, CallbackStyleMessageId>({
  name: 'callback-style',
  rule: callbackStyle,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
      expect(result.fixed).toBe(false)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
  valid: [
    ...[
      'onMounted(() => { fetchData(); updateTitle() })',
      'onMounted(async () => { await fetchData() })',
      'onMounted((() => {}) as Callback)',
      'onMounted((() => {}) satisfies Callback)',
      'onMounted((() => {})!)',
      'watch(source, (value, oldValue, onCleanup) => { update(value, oldValue, onCleanup) })',
      'watch(() => source.value, () => {})',
      'watch([() => source.value, other], () => {})',
      'watchEffect(onCleanup => { update(onCleanup) })',
      'onMounted()',
      'watch(source)',
      'watch(...args, handler)',
      'onMounted(...args)',
      'watch(source, ...handlers)',
      'onMounted(...args, handler)',
    ].map(code => ({
      description: `accepts or skips ${code}`,
      code: withVue(code),
    })),
    ...ordinaryFunctions.map(callback => ({
      description: `accepts ordinary functions with functionStyle: any: ${callback}`,
      code: withVue(`onMounted(${callback})`),
      options: { functionStyle: 'any' as const },
    })),
    ...[
      'onMounted(handler)',
      'const onMounted = register; onMounted(handler)',
      "import { onMounted } from './events'; onMounted(handler)",
      "import { onMounted } from 'vue'; function run(onMounted) { onMounted(handler) }",
      "import * as Vue from 'vue'; function run(Vue) { Vue.onMounted(handler) }",
      "import onMounted from 'vue'; onMounted(handler)",
      "import type { onMounted } from 'vue'; onMounted(handler)",
      "import { type onMounted } from 'vue'; onMounted(handler)",
      "import type * as Vue from 'vue'; Vue.onMounted(handler)",
      "import Vue from 'vue'; Vue.onMounted(handler)",
      "import { onMounted } from 'vue'; onMounted?.(handler)",
      "import * as Vue from 'vue'; Vue?.onMounted(handler)",
      "import * as Vue from 'vue'; Vue['onMounted'](handler)",
      "import { computed, customRef, onScopeDispose, nextTick } from 'vue'; computed(handler); customRef(handler); onScopeDispose(handler); nextTick(handler)",
    ].map(code => ({
      description: `does not guess API identity: ${code}`,
      code,
    })),
    ...[
      'function onMounted() {}; onMounted(handler)',
      "import type { onMounted } from 'vue'; onMounted(handler)",
      "import { onMounted } from './events'; onMounted(handler)",
    ].map(code => ({
      description:
        'respects shadowing and type-only bindings with explicit globals',
      code,
      options: { vueGlobals: ['onMounted', 'watch'] },
    })),
    {
      description: 'ignores unconfigured Vue import sources',
      code: "import { onMounted as mounted } from '#imports'; mounted(handler)",
    },
    {
      description: 'disables Vue import sources with an empty list',
      code: withVue('onMounted(handler)'),
      options: { vueImportSources: [] },
    },
    {
      description: 'disables built-in groups with an empty list',
      code: withVue('onMounted(handler); watch(source, handler)'),
      options: { groups: [] },
    },
    {
      description: 'excludes original built-in names even through aliases',
      code: "import { onMounted as mounted } from 'vue'; mounted(handler)",
      options: { exclude: ['onMounted'] },
    },
    {
      description: 'allows expression bodies independently of function style',
      code: withVue('onMounted(() => fetchData())'),
      options: { bodyStyle: 'any' },
    },
    ...[
      "import { subscribe } from './other'; subscribe(event, handler, other)",
      'subscribe(event, handler, other)',
    ].map(code => ({
      description: 'requires exact custom import sources',
      code,
      options: customOptions,
    })),
    {
      description: 'does not check Vue template expressions',
      filename: 'Test.vue',
      code: '<template><button @click="onMounted(handler)" /></template>',
      options: { vueGlobals: ['onMounted'] },
    },
  ],
  invalid: [
    ...[
      'onBeforeMount',
      'onMounted',
      'onBeforeUpdate',
      'onUpdated',
      'onBeforeUnmount',
      'onUnmounted',
      'onActivated',
      'onDeactivated',
      'onErrorCaptured',
      'onRenderTracked',
      'onRenderTriggered',
      'onServerPrefetch',
      'watchEffect',
      'watchPostEffect',
      'watchSyncEffect',
    ].map(name => ({
      description: `checks the first callback of ${name} by default`,
      code: `import { ${name} } from 'vue'; ${name}(handler)`,
      errors: [
        { messageId: 'expectedInlineCallback' as const, severity: 2 as const },
      ],
      output: null,
    })),
    ...[
      'handler',
      'service.initialize',
      'handler.bind(service)',
      'createHandler()',
      'enabled ? handlerA : handlerB',
      '(handler as Callback)',
      '(handler satisfies Callback)',
      'handler!',
      '<Callback>handler',
      'handler<string>',
      'null',
      'undefined',
    ].map(callback => ({
      description: `reports ${callback} without an unsafe fix`,
      code: withVue(`onMounted(${callback})`),
      errors: ['expectedInlineCallback' as const],
      output: null,
    })),
    ...ordinaryFunctions.map(callback => ({
      description: `reports ordinary function ${callback} without changing its semantics`,
      code: withVue(`onMounted(${callback})`),
      errors: ['expectedArrowCallback' as const],
      output: null,
    })),
    {
      description: 'reports only the watch callback before a spread',
      code: withVue('watch(() => source.value, handler, ...options)'),
      errors: [{ messageId: 'expectedInlineCallback', column: 27 }],
      output: null,
    },
    {
      description: 'checks lifecycle callbacks before a spread',
      code: withVue('onMounted(handler, ...args)'),
      errors: ['expectedInlineCallback'],
      output: null,
    },
    ...[
      "import { onMounted as mounted } from 'vue'; mounted(handler)",
      "import * as Vue from 'vue'; Vue.onMounted(handler)",
      "import { onMounted } from 'vue'; (onMounted as Hook)(handler)",
      "import { onMounted } from 'vue'; function useFeature() { onMounted(handler) }",
    ].map(code => ({
      description: `recognizes import bindings: ${code}`,
      code,
      errors: ['expectedInlineCallback' as const],
      output: null,
    })),
    {
      description: 'requires explicit globals',
      code: 'onMounted(handler); watch(source, handler)',
      options: { vueGlobals: ['onMounted', 'watch'] },
      errors: ['expectedInlineCallback', 'expectedInlineCallback'],
      output: null,
    },
    {
      description: 'configures Vue sources using original export names',
      code: "import { onMounted as mounted } from '#imports'; mounted(handler)",
      options: { vueImportSources: ['#imports'] },
      errors: ['expectedInlineCallback'],
      output: null,
    },
    {
      description: 'selects built-in groups',
      code: withVue('onMounted(handler); watch(source, handler)'),
      options: { groups: ['watch'] },
      errors: ['expectedInlineCallback'],
      output: null,
    },
    {
      description: 'enables cleanup and scheduler groups explicitly',
      code: "import { onScopeDispose, onWatcherCleanup, nextTick } from 'vue'; onScopeDispose(handler); onWatcherCleanup(handler); nextTick(handler); nextTick()",
      options: { groups: ['cleanup', 'scheduler'] },
      errors: [
        'expectedInlineCallback',
        'expectedInlineCallback',
        'expectedInlineCallback',
      ],
      output: null,
    },
    {
      description: 'requires arrow functions independently of body style',
      code: withVue('onMounted(function () {})'),
      options: { bodyStyle: 'any' },
      errors: ['expectedArrowCallback'],
      output: null,
    },
    {
      description: 'requires block bodies independently of function style',
      code: withVue('onMounted(() => fetchData())'),
      options: { functionStyle: 'any' },
      errors: ['expectedBlockBody'],
      output: withVue('onMounted(() => { return (fetchData()) })'),
    },
    {
      description: 'requires inline callbacks even when both styles allow any',
      code: withVue('onMounted(handler)'),
      options: { functionStyle: 'any', bodyStyle: 'any' },
      errors: ['expectedInlineCallback'],
      output: null,
    },
    {
      description:
        'matches exact custom exports, aliases, namespaces and default imports',
      code: $`
        import { onBeforeRouteLeave as leave } from 'vue-router'
        import * as VueUse from '@vueuse/core'
        import { subscribe } from './events'
        import custom from './default'
        leave(handler)
        VueUse.watchDebounced(source, handler)
        subscribe(event, handler, other)
        custom(handler)
      `,
      options: customOptions,
      errors: [
        'expectedInlineCallback',
        'expectedInlineCallback',
        'expectedInlineCallback',
        'expectedInlineCallback',
        'expectedInlineCallback',
      ],
      output: null,
    },
    {
      description: 'checks custom callback indices before a spread',
      code: "import { subscribe } from './events'; subscribe(event, handler, ...rest)",
      options: customOptions,
      errors: ['expectedInlineCallback'],
      output: null,
    },
    ...[[], ['watch']].map(exclude => ({
      description: `merges custom indices without duplicate reports and excludes only built-ins: ${exclude}`,
      code: withVue('watch(source, handler)'),
      options: {
        customCallbacks: [
          { source: 'vue', name: 'watch', callbackIndices: [1] },
          { source: 'vue', name: 'watch', callbackIndices: [1] },
        ],
        exclude,
      },
      errors: ['expectedInlineCallback' as const],
      output: null,
    })),
    ...(
      [
        ['test.js', withVue('onMounted(handler)')],
        ['test.ts', withVue('onMounted(handler as Callback)')],
        [
          'Test.vue',
          `<script setup>\n${withVue('onMounted(handler)')}\n</script>`,
        ],
        [
          'Test.vue',
          `<script setup lang="ts">\n${withVue('onMounted(handler as Callback)')}\n</script>`,
        ],
        [
          'Test.vue',
          `<script>\n${withVue('export default { setup() { onMounted(handler) } }')}\n</script>`,
        ],
      ] as const
    ).map(([filename, code]) => ({
      description: `checks script callbacks in ${filename}`,
      filename,
      code,
      errors: ['expectedInlineCallback' as const],
      output: null,
    })),
    ...[
      '() => fetchData()',
      'async () => await fetchData()',
      '() => false',
      '() => ({ value: 1 })',
      '() => (first(), second())',
      '() => /* before */ (\n// inside\nfetchData()\n)',
      '() => (fetchData() // after\n)',
      '() => (/* first */ ((fetchData())) /* last */)',
      '(value: number): number => value + 1',
      '<T>(value: T) => value',
      '(() => fetchData()) as Callback',
      '(() => fetchData()) satisfies Callback',
      '(() => fetchData())!',
      '() => (() => 1)',
      '() => watchEffect(() => fetchData())',
    ].map(callback => ({
      description: `preserves syntax, comments and idempotence for ${callback}`,
      code: withVue(`onMounted(${callback})`),
      errors:
        callback === '() => watchEffect(() => fetchData())'
          ? ['expectedBlockBody' as const, 'expectedBlockBody' as const]
          : ['expectedBlockBody' as const],
      output(output: string, input: string) {
        expect(output).toContain('return (')
        for (const comment of input.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g) ??
          []) {
          expect(output).toContain(comment)
        }
      },
      after(result: Linter.FixReport) {
        expect(result.fixed).toBe(true)
      },
    })),
    {
      description: 'has a predictable minimal fix and works in SFC scripts',
      filename: 'Test.vue',
      code: `<script setup lang="ts">\n${withVue('onMounted(() => fetchData())')}\n</script>`,
      errors: ['expectedBlockBody'],
      output: `<script setup lang="ts">\n${withVue('onMounted(() => { return (fetchData()) })')}\n</script>`,
    },
    ...[
      '() => false',
      '() => ({ value: 1 })',
      '() => (1, 2)',
      '() => (\n// keep return\n42\n)',
      'async () => await Promise.resolve(42)',
    ].map(callback => ({
      description: `retains callback return values at runtime for ${callback}`,
      filename: 'test.js',
      code: `onMounted(${callback})`,
      options: { vueGlobals: ['onMounted'] },
      errors: ['expectedBlockBody' as const],
      async output(output: string, input: string) {
        const original: unknown = await runInNewContext(input, {
          onMounted: (fn: () => unknown) => fn(),
        })
        const fixed: unknown = await runInNewContext(output, {
          onMounted: (fn: () => unknown) => fn(),
        })
        expect(fixed).toEqual(original)
      },
    })),
  ],
})

const tester = createRuleTester<unknown>({
  name: 'callback-style',
  rule: callbackStyle,
  languageOptions: { parser: tsParser },
})

describe('callback-style configuration', () => {
  it.each([
    ['groups', ['unknown']],
    ['groups', ['watch', 'watch']],
    ['functionStyle', 'function'],
    ['bodyStyle', 'expression'],
    ['unknown', true],
    ['vueGlobals', [1]],
    ['vueImportSources', 'vue'],
    ['exclude', [false]],
    [
      'customCallbacks',
      [{ source: 'vue', name: 'watch', callbackIndices: [-1] }],
    ],
    [
      'customCallbacks',
      [{ source: 'vue', name: 'watch', callbackIndices: [0.5] }],
    ],
    [
      'customCallbacks',
      [{ source: 'vue', name: 'watch', callbackIndices: [1, 1] }],
    ],
    [
      'customCallbacks',
      [{ source: 'vue', name: 'watch', callbackIndices: [] }],
    ],
    ['customCallbacks', [{ source: 'vue', name: 'watch' }]],
    ['customCallbacks', [{ source: '', name: 'watch', callbackIndices: [0] }]],
    [
      'customCallbacks',
      [{ source: 'vue', name: 'watch', callbackIndices: [0], extra: true }],
    ],
  ])('rejects invalid %s options: %j', async (key, value) => {
    await expect(
      tester.valid({ code: '', options: { [key]: value } }),
    ).rejects.toThrow()
  })
})
