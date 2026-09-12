import { runInNewContext } from 'node:vm'
import * as tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import * as vueParser from 'vue-eslint-parser'
import plugin from '../../src/index.ts'
import type { CallbackStyleOptions } from '../../src/index.ts'

function config(options: CallbackStyleOptions = {}): Linter.Config[] {
  return [
    {
      files: ['**/*.{js,ts,vue}'],
      plugins: { 'vue-perfectionist': plugin },
      rules: { 'vue-perfectionist/callback-style': ['error', options] },
    },
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tsParser },
    },
    {
      files: ['**/*.vue'],
      languageOptions: {
        parser: vueParser,
        parserOptions: { parser: tsParser },
      },
    },
  ]
}

function verify(
  code: string,
  options: CallbackStyleOptions = {},
  filename = 'test.ts',
) {
  return new Linter().verify(code, config(options), filename)
}

function withVue(code: string): string {
  return `import { onMounted, watch, watchEffect } from 'vue'\n${code}`
}

describe('callback-style', () => {
  it.each([
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
  ])('checks the first callback of %s by default', name => {
    expect(
      verify(`import { ${name} } from 'vue'; ${name}(handler)`),
    ).toMatchObject([{ messageId: 'expectedInlineCallback', severity: 2 }])
  })

  it.each([
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
  ])('reports %s without an unsafe fix', callback => {
    const code = withVue(`onMounted(${callback})`)
    const messages = verify(code)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ messageId: 'expectedInlineCallback' })
    expect(messages[0]?.fix).toBeUndefined()
    expect(messages[0]?.suggestions).toBeUndefined()
    expect(new Linter().verifyAndFix(code, config(), 'test.ts')).toMatchObject({
      fixed: false,
      output: code,
    })
  })

  it.each([
    'function () { return this.value }',
    'function () { return arguments[0] }',
    'function recursive() { return recursive() }',
    'function* () { yield 1 }',
    'async function () { return await fetchData() }',
  ])(
    'reports ordinary function %s without changing its semantics',
    callback => {
      const code = withVue(`onMounted(${callback})`)
      expect(verify(code)).toMatchObject([
        { messageId: 'expectedArrowCallback' },
      ])
      expect(
        new Linter().verifyAndFix(code, config(), 'test.ts'),
      ).toMatchObject({
        fixed: false,
        output: code,
      })
      expect(verify(code, { functionStyle: 'any' })).toEqual([])
    },
  )

  it.each([
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
  ])('accepts or skips %s', code => {
    expect(verify(withVue(code))).toEqual([])
  })

  it('reports only the watch callback and checks arguments before a spread', () => {
    expect(
      verify(withVue('watch(() => source.value, handler, ...options)')),
    ).toMatchObject([{ messageId: 'expectedInlineCallback', column: 27 }])
    expect(verify(withVue('onMounted(handler, ...args)'))).toHaveLength(1)
  })

  it.each([
    "import { onMounted as mounted } from 'vue'; mounted(handler)",
    "import * as Vue from 'vue'; Vue.onMounted(handler)",
    "import { onMounted } from 'vue'; (onMounted as Hook)(handler)",
    "import { onMounted } from 'vue'; function useFeature() { onMounted(handler) }",
  ])('recognizes import bindings: %s', code => {
    expect(verify(code)).toMatchObject([
      { messageId: 'expectedInlineCallback' },
    ])
  })

  it.each([
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
  ])('does not guess API identity: %s', code => {
    expect(verify(code)).toEqual([])
  })

  it('requires explicit globals and respects shadowing and type-only bindings', () => {
    const options: CallbackStyleOptions = { vueGlobals: ['onMounted', 'watch'] }
    expect(
      verify('onMounted(handler); watch(source, handler)', options),
    ).toHaveLength(2)
    expect(
      verify('function onMounted() {}; onMounted(handler)', options),
    ).toEqual([])
    expect(
      verify(
        "import type { onMounted } from 'vue'; onMounted(handler)",
        options,
      ),
    ).toEqual([])
    expect(
      verify(
        "import { onMounted } from './events'; onMounted(handler)",
        options,
      ),
    ).toEqual([])
  })

  it('configures Vue sources using original export names', () => {
    const code =
      "import { onMounted as mounted } from '#imports'; mounted(handler)"
    expect(verify(code)).toEqual([])
    expect(verify(code, { vueImportSources: ['#imports'] })).toHaveLength(1)
    expect(
      verify(withVue('onMounted(handler)'), { vueImportSources: [] }),
    ).toEqual([])
  })

  it('selects groups and excludes original built-in names', () => {
    expect(
      verify(withVue('onMounted(handler); watch(source, handler)'), {
        groups: [],
      }),
    ).toEqual([])
    expect(
      verify(withVue('onMounted(handler); watch(source, handler)'), {
        groups: ['watch'],
      }),
    ).toHaveLength(1)
    expect(
      verify("import { onMounted as mounted } from 'vue'; mounted(handler)", {
        exclude: ['onMounted'],
      }),
    ).toEqual([])
    const code =
      "import { onScopeDispose, onWatcherCleanup, nextTick } from 'vue'; onScopeDispose(handler); onWatcherCleanup(handler); nextTick(handler); nextTick()"
    expect(verify(code, { groups: ['cleanup', 'scheduler'] })).toHaveLength(3)
  })

  it('configures function and body styles independently while requiring inline callbacks', () => {
    expect(
      verify(withVue('onMounted(() => fetchData())'), { bodyStyle: 'any' }),
    ).toEqual([])
    expect(
      verify(withVue('onMounted(function () {})'), { bodyStyle: 'any' }),
    ).toMatchObject([{ messageId: 'expectedArrowCallback' }])
    expect(
      verify(withVue('onMounted(() => fetchData())'), { functionStyle: 'any' }),
    ).toMatchObject([{ messageId: 'expectedBlockBody' }])
    expect(
      verify(withVue('onMounted(handler)'), {
        functionStyle: 'any',
        bodyStyle: 'any',
      }),
    ).toMatchObject([{ messageId: 'expectedInlineCallback' }])
  })

  it('matches exact custom exports, aliases, namespaces and default imports', () => {
    const options: CallbackStyleOptions = {
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
    expect(
      verify(
        `
      import { onBeforeRouteLeave as leave } from 'vue-router'
      import * as VueUse from '@vueuse/core'
      import { subscribe } from './events'
      import custom from './default'
      leave(handler)
      VueUse.watchDebounced(source, handler)
      subscribe(event, handler, other)
      custom(handler)
    `,
        options,
      ),
    ).toHaveLength(5)
    expect(
      verify(
        "import { subscribe } from './other'; subscribe(event, handler, other)",
        options,
      ),
    ).toEqual([])
    expect(verify('subscribe(event, handler, other)', options)).toEqual([])
    expect(
      verify(
        "import { subscribe } from './events'; subscribe(event, handler, ...rest)",
        options,
      ),
    ).toHaveLength(1)
  })

  it('merges custom indices without duplicate reports and excludes only built-ins', () => {
    const customCallbacks = [
      { source: 'vue', name: 'watch', callbackIndices: [1] },
      { source: 'vue', name: 'watch', callbackIndices: [1] },
    ]
    const code = withVue('watch(source, handler)')
    expect(verify(code, { customCallbacks })).toHaveLength(1)
    expect(verify(code, { customCallbacks, exclude: ['watch'] })).toHaveLength(
      1,
    )
  })

  it.each([
    ['test.js', withVue('onMounted(handler)')],
    ['test.ts', withVue('onMounted(handler as Callback)')],
    ['Test.vue', `<script setup>\n${withVue('onMounted(handler)')}\n</script>`],
    [
      'Test.vue',
      `<script setup lang="ts">\n${withVue('onMounted(handler as Callback)')}\n</script>`,
    ],
    [
      'Test.vue',
      `<script>\n${withVue('export default { setup() { onMounted(handler) } }')}\n</script>`,
    ],
  ])('checks script callbacks in %s', (filename, code) => {
    expect(verify(code, {}, filename)).toMatchObject([
      { messageId: 'expectedInlineCallback' },
    ])
  })

  it('does not check Vue template expressions', () => {
    expect(
      verify(
        '<template><button @click="onMounted(handler)" /></template>',
        { vueGlobals: ['onMounted'] },
        'Test.vue',
      ),
    ).toEqual([])
  })

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
  ])('rejects invalid %s options: %j', (key, value) => {
    expect(() => verify('', { [key]: value })).toThrow()
  })
})

describe('callback-style fixes', () => {
  it.each([
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
  ])('preserves syntax, comments and idempotence for %s', callback => {
    const code = withVue(`onMounted(${callback})`)
    const linter = new Linter()
    const result = linter.verifyAndFix(code, config(), 'test.ts')
    expect(result.fixed).toBe(true)
    expect(result.messages).toEqual([])
    expect(result.output).toContain('return (')
    for (const comment of code.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g) ?? []) {
      expect(result.output).toContain(comment)
    }
    expect(
      linter.verifyAndFix(result.output, config(), 'test.ts'),
    ).toMatchObject({
      output: result.output,
      fixed: false,
      messages: [],
    })
  })

  it('has a predictable minimal fix and works in SFC scripts', () => {
    const code = `<script setup lang="ts">\n${withVue('onMounted(() => fetchData())')}\n</script>`
    const result = new Linter().verifyAndFix(code, config(), 'Test.vue')
    expect(result.output).toBe(
      code.replace('=> fetchData()', '=> { return (fetchData()) }'),
    )
    expect(result.messages).toEqual([])
  })

  it.each([
    '() => false',
    '() => ({ value: 1 })',
    '() => (1, 2)',
    '() => (\n// keep return\n42\n)',
    'async () => await Promise.resolve(42)',
  ])('retains callback return values at runtime for %s', async callback => {
    const code = `onMounted(${callback})`
    const result = new Linter().verifyAndFix(
      code,
      config({ vueGlobals: ['onMounted'] }),
      'test.js',
    )
    expect(result.messages).toEqual([])
    const original: unknown = await runInNewContext(code, {
      onMounted: (fn: () => unknown) => fn(),
    })
    const fixed: unknown = await runInNewContext(result.output, {
      onMounted: (fn: () => unknown) => fn(),
    })
    expect(fixed).toEqual(original)
  })
})
