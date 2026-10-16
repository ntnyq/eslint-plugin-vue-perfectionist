import { runInNewContext } from 'node:vm'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import { sortScriptSetup } from '../../src/rules/sort-script-setup'
import { createVueSFC } from '../helpers/create-vue-sfc.ts'
import { run, vueLanguageOptions } from '../internal'
import type {
  SortScriptSetupMessageId,
  SortScriptSetupOptions,
} from '../../src/types'

await run<SortScriptSetupOptions, SortScriptSetupMessageId>({
  name: 'sort-script-setup',
  rule: sortScriptSetup,
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
    {
      description: 'keeps auto-import recognition opt-in',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      settings: { 'vue-perfectionist': { autoImport: false } },
    },
    {
      description: 'explicit empty globals override shared auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      options: { vueGlobals: [] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      description: 'does not override local bindings with auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          const ref = () => 0
          const a = ref()
          </script>
        `,
      }),
      options: { groups: ['constant', 'function', 'variable', 'ref'] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      description: 'preserves eager callback dependencies with auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const state = ref(0)
          watchEffect(() => state.value)
          </script>
        `,
      }),
      options: { groups: ['watch', 'ref'] },
      settings: { 'vue-perfectionist': { autoImport: true } },
    },
    {
      description: 'preserves intra-group order by default',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          const a = 2
          </script>
        `,
      }),
    },
    {
      description: 'does not mistake a local ref for Vue ref',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref } from "./helper"
          const a = ref(0)
          function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'does not override a local binding with vueGlobals',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          const ref = () => 0
          const a = ref()
          </script>
        `,
      }),
      options: {
        groups: ['constant', 'function', 'variable', 'ref'],
        vueGlobals: ['ref'],
      },
    },
    {
      description: 'groups reactive declarations in one bucket',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, reactive } from "vue"
          const z = reactive({})
          const a = ref(0)
          </script>
        `,
      }),
    },
    {
      description: 'treats unconfigured statements as partition boundaries',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          doSomething()
          const a = 2
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'allows an empty groups configuration',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          const a = 2
          </script>
        `,
      }),
      options: {
        groups: [],
        newlinesBetween: 2,
      },
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: true,
      },
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        ignoreCase: true,
      },
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        ignoreCase: true,
      },
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: 'x',
      },
    },
    {
      description: 'supports alphabetical sorting',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'alphabetical',
      },
    },
    {
      description: 'retains ties and disables fallback for unsorted',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const A = 1
          </script>
        `,
      }),
      options: {
        type: 'alphabetical',
        ignoreCase: true,
      },
    },
    {
      description: 'retains ties and disables fallback for unsorted',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        fallbackSort: {
          type: 'natural',
        },
      },
    },
    {
      description: 'normalizes special characters for comparison',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const _a = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
        specialCharacters: 'trim',
      },
    },
    {
      description: 'normalizes special characters for comparison',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a_b = 0
          const ab = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
        specialCharacters: 'remove',
      },
    },
    {
      description:
        'does not use subgroup-specific overrides in a merged bucket',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          function a() {}
          </script>
        `,
      }),
      options: {
        groups: [['functions', 'constant']],
        customGroups: [
          {
            groupName: 'functions',
            selector: 'function',
            type: 'natural',
          },
        ],
      },
    },
    {
      description: 'ignores sorting preferences in both settings namespaces',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      settings: {
        perfectionist: {
          type: 'natural',
        },
        'vue-perfectionist': {
          type: 'natural',
        },
      },
    },
    {
      description: 'uses explicit rule options regardless of settings',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'unsorted',
      },
      settings: {
        'vue-perfectionist': {
          type: 'natural',
        },
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0

          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          // section
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          if (true) {}
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          await run()
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const data = await run()
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const x = 1, y = 2
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          import "side-effects"
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description:
        'does not move protected statements: // eslint-disable-next-line no-unused-vars\nconst z = 0\nconst a = 0',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // eslint-disable-next-line no-unused-vars
          const z = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'does not move protected statements: // @ts-expect-error intentional\nconst z = 0\nconst a = 0',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // @ts-expect-error intentional
          const z = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'does not move protected statements: // eslint-disable no-unused-vars\nconst z = 0\nconst a = 0\n// eslint-enable no-unused-vars',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // eslint-disable no-unused-vars
          const z = 0
          const a = 0
          // eslint-enable no-unused-vars
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => z.value, () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(() => z.value, () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch([() => z.value], () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch([() => z.value], () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(read, () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(read, () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch([read], () => {})',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch([read], () => {})
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => 0, read, { immediate: true })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(() => 0, read, { immediate: true })
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => 0, read, options)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watch(() => 0, read, options)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchEffect(read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watchEffect(read)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchSyncEffect(read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watchSyncEffect(read)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchEffect((read as () => number))',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchSyncEffect } from "vue"
          function read() { return z.value }
          const z = ref(0)
          const stop = watchEffect((read as () => number))
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watch(() => 0, read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watch(() => 0, read)
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watch(() => 0, read, { immediate: false })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watch(() => 0, read, { immediate: false })
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(read, { flush: "post" })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchEffect(read, { flush: "post" })
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(read, { flush: "post" } as const)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchEffect(read, { flush: "post" } as const)
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchPostEffect(read)',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchPostEffect(read)
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(() => { onCleanup(read) })',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch, watchEffect, watchPostEffect } from "vue"
          function read() { return z.value }
          const stop = watchEffect(() => { onCleanup(read) })
          const z = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description: 'resolves function-valued variables used as watch callbacks',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watchEffect } from "vue"
          const read = () => z.value
          const z = ref(0)
          const stop = watchEffect(read)
          </script>
        `,
      }),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'tracks Vue callbacks nested in immediately called local functions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watchEffect } from "vue"
          function start() { return watchEffect(() => z.value) }
          const z = ref(0)
          const stop = start()
          </script>
        `,
      }),
      options: {
        groups: ['function', 'variable', 'ref'],
      },
    },
    {
      description:
        'resolves imported aliases and explicit globals for synchronous callbacks',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, watch as observe } from "vue"
          const z = ref(0)
          const stop = observe(() => z.value, () => {})
          </script>
        `,
      }),
      options: {
        groups: ['watch', 'ref'],
      },
    },
    {
      description:
        'resolves imported aliases and explicit globals for synchronous callbacks',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = ref(0)
          const stop = watchEffect(() => z.value)
          </script>
        `,
      }),
      options: {
        groups: ['watch', 'ref'],
        vueGlobals: ['ref', 'watchEffect'],
      },
    },
    {
      description:
        'tracks a named customRef factory without executing returned accessors',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { customRef } from "vue"
          function factory() { record(z); return { get: () => later, set() {} } }
          const z = {}
          const value = customRef(factory)
          const later = {}
          </script>
        `,
      }),
      options: {
        groups: ['function', 'ref', 'variable'],
      },
    },
    {
      description:
        'does not infer Vue callback execution from a foreign customRef name',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { customRef } from "./helpers"
          const a = customRef(() => z)
          const z = {}
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'prioritizes initialization dependencies over group order',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref } from "vue"
          const count = ref(0)
          const snapshot = count.value
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'ref'],
      },
    },
    {
      description: 'keeps initialization dependencies in descending order',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = {}
          const z = a
          </script>
        `,
      }),
      options: {
        type: 'natural',
        order: 'desc',
      },
    },
    {
      description: 'does not treat a deferred capture as an immediate read',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, computed } from "vue"
          const z = computed(() => a.value)
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        groups: ['computed', 'ref'],
      },
    },
    {
      description: 'tracks reads through immediately invoked local functions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const dependency = {}
          const first = read()
          function read() { return dependency }
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'function'],
        type: 'natural',
      },
    },
    {
      description: 'tracks reads through an IIFE',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = {}
          const a = (() => z)()
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'retains cycles without an automatic fix',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = a
          const a = z
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'does not reorder interface merging or function overloads',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          interface Z { value: string }
          interface Z { other: number }
          interface A {}
          function f(x: string): string
          function f(x: number): number
          function f(x: unknown) { return x }
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'does not recognize type-only imports as runtime APIs',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import type { ref } from "vue"
          const a = ref(0)
          const b = 1
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'constant', 'ref'],
      },
    },
    {
      description: 'does not recognize type-only imports as runtime APIs',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { type ref } from "vue"
          const a = ref(0)
          const b = 1
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'constant', 'ref'],
      },
    },
    {
      description:
        'does not match calls inside function bodies as custom initializers',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function run() { useRouter() }
          const a = 1
          </script>
        `,
      }),
      options: {
        groups: ['function', 'constant', 'router'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
          },
        ],
      },
    },
    {
      description: 'does not infer sources for unresolved auto-imports',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const route = useRouter()
          const a = 1
          </script>
        `,
      }),
      options: {
        groups: ['variable', 'constant', 'router'],
        customGroups: [
          {
            groupName: 'router',
            importSourcePattern: '^vue-router$',
          },
        ],
      },
    },
    {
      description: 'leaves dynamic and optional Vue calls unclassified',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import * as Vue from "vue"
          const a = Vue["ref"](0)
          const b = Vue.ref?.(0)
          </script>
        `,
      }),
      options: {
        groups: ['ref', 'variable'],
      },
    },
    {
      description: 'does not move expose across await',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          defineExpose({ a })
          await run()
          const b = 2
          </script>
        `,
      }),
      options: {
        groups: ['constant', 'define-expose'],
      },
    },
    {
      description:
        'keeps unknown members stable even with a global name comparator',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          zebra()
          alpha()
          </script>
        `,
      }),
      options: {
        type: 'natural',
        groups: ['unknown'],
      },
    },
    {
      description: 'ignores invalid settings when rule options are provided',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'unsorted',
      },
      settings: {
        perfectionist: {
          type: 'usage',
        },
      },
    },
    {
      description: 'ignores ordinary script',
      code: '<script lang="ts">const z = 1\nconst a = 2</script>',
      options: { type: 'natural' },
    },
    {
      description: 'ignores plain TypeScript without SFC parser services',
      code: 'const z = 1\nconst a = 2',
      filename: 'Test.ts',
      options: { type: 'natural' },
    },
    {
      description:
        'preserves synchronous callback dependencies in JavaScript setup',
      code: '<script setup>\nimport { ref, watch } from "vue"\nconst z = ref(0)\nwatch(() => z.value, () => {})\n</script>',
      languageOptions: { parserOptions: { parser: null } },
      options: { groups: ['watch', 'ref'] },
    },
  ],
  invalid: [
    ...(['callNamePattern', 'importSourcePattern'] as const).flatMap(key =>
      ['', { pattern: '' }, ['']].flatMap(pattern =>
        [false, true].map(anyOf => ({
          description: `matches only calls with ${key} ${JSON.stringify(pattern)} and anyOf: ${anyOf}`,
          code: createVueSFC({
            script: `
              <script setup lang="ts">
              import { make } from "./factory"
              const z = 1
              make()
              </script>
            `,
          }),
          options: {
            groups: ['matches', 'constant', 'unknown'],
            customGroups: [
              {
                groupName: 'matches',
                ...(anyOf
                  ? { anyOf: [{ [key]: pattern }] }
                  : { [key]: pattern }),
              },
            ],
          },
          errors: [
            {
              messageId: 'unsafeReorder' as const,
              data: { name: 'make', before: 'z', group: 'matches' },
            },
          ],
          output: null,
        })),
      ),
    ),
    ...[false, true].map(withGlobals => ({
      description: `classifies auto-imports without unsafe fixes, globals: ${withGlobals}`,
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      settings: { 'vue-perfectionist': { autoImport: true } },
      languageOptions: withGlobals
        ? {
            globals: {
              computed: 'readonly' as const,
              ref: 'readonly' as const,
            },
          }
        : {},
      errors: [
        {
          messageId: 'unsafeReorder' as const,
          data: { name: 'a', before: 'z', group: 'ref / reactive' },
        },
      ],
      output: null,
    })),
    {
      description: 'enforces grouping with unsorted',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function run() {}
          interface Props {}
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'Props',
            before: 'run',
            group: 'interface / type',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          interface Props {}
          function run() {}
          </script>
        `,
      }),
    },
    {
      description:
        'recognizes macro declarations and withDefaults without moving them',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const emit = defineEmits(["update"])
          const { title } = withDefaults(defineProps<{ title?: string }>(), { title: "" })
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'title',
            before: 'emit',
            group: 'define-props',
          },
        },
      ],
      output: null,
    },
    {
      description: 'recognizes imported aliases and namespace members',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref as makeRef } from "vue"
          import * as Vue from "vue"
          const z = Vue.computed(() => 1)
          const a = makeRef(0)
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'recognizes explicit Vue globals',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        vueGlobals: ['ref', 'computed'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'supports additional exact Vue import sources',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, computed } from "@vue/reactivity"
          const z = computed(() => 1)
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        vueImportSources: ['@vue/reactivity'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'groups reactive declarations in one bucket',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, reactive } from "vue"
          const z = reactive({})
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'matches modifier groups before plain selectors',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          async function run() {}
          function stop() {}
          </script>
        `,
      }),
      options: {
        groups: ['function', 'async-function'],
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'stop',
            before: 'run',
            group: 'function',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function stop() {}
          async function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'does not infer ref(null) to be a template-ref',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, useTemplateRef } from "vue"
          const el = ref(null)
          const input = useTemplateRef("input")
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'input',
            before: 'el',
            group: 'template-ref',
          },
        },
      ],
      output: null,
    },
    {
      description: 'classifies watch handles and lifecycle registrations',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { watchEffect, onMounted } from "vue"
          onMounted(() => {})
          const stop = watchEffect(() => {})
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'stop',
            before: 'onMounted',
            group: 'watch',
          },
        },
      ],
      output: null,
    },
    {
      description: 'allows an explicit unknown group',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          doSomething()
          const a = 2
          </script>
        `,
      }),
      options: {
        groups: ['constant', 'unknown'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'doSomething',
            group: 'constant',
          },
        },
      ],
      output: null,
    },
    {
      description:
        'negotiates multiple locales for Unicode names: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const ä = 1
          const z = 2
          </script>
        `,
      }),
      options: {
        type: 'natural',
        locales: ['zz-ZZ', 'sv-SE', 'en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'ä',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 2
          const ä = 1
          </script>
        `,
      }),
    },
    {
      description:
        'negotiates multiple locales for Unicode names: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const ä = 1
          const z = 2
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        locales: ['zz-ZZ', 'sv-SE', 'en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'ä',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 2
          const ä = 1
          </script>
        `,
      }),
    },
    {
      description:
        'negotiates multiple locales for Unicode names: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const ä = 1
          const z = 2
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        locales: ['zz-ZZ', 'sv-SE', 'en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'ä',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 2
          const ä = 1
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'Item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: false,
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'Item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
        ignoreCase: false,
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'Item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'constant',
            type: 'natural',
          },
        ],
        ignoreCase: false,
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item2',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item2 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'keeps numeric precedence when natural sorting is case sensitive',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 0
          const Item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        ignoreCase: false,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'Item2',
            before: 'item10',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const Item2 = 0
          const item10 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const 𠮶 = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: '𠮶𠮷',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: '𠮶',
            before: '𠮷',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮶 = 0
          const 𠮷 = 0
          </script>
        `,
      }),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const 𠮷 = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: '𠮷a',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: '𠮷',
            before: 'a',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const a = 0
          </script>
        `,
      }),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮶 = 0
          const 𠮷 = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: '𠮶𠮷',
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: '𠮷',
            before: '𠮶',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const 𠮷 = 0
          const 𠮶 = 0
          </script>
        `,
      }),
    },
    {
      description: 'supports natural sorting',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 0
          const item2 = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'item10',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 0
          const item10 = 0
          </script>
        `,
      }),
    },
    {
      description: 'applies descending order only inside groups',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function alpha() {}
          function zebra() {}
          const b = 2
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
        order: 'desc',
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'b',
            before: 'alpha',
            group: 'constant',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const b = 2
          const a = 1
          function zebra() {}
          function alpha() {}
          </script>
        `,
      }),
    },
    {
      description: 'uses source length and a fallback for equal lengths',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const zz = 0
          const bb = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        fallbackSort: {
          type: 'natural',
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'zz',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const bb = 0
          const zz = 0
          </script>
        `,
      }),
    },
    {
      description: 'supports custom alphabets',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const b = 0
          </script>
        `,
      }),
      options: {
        type: 'custom',
        alphabet: 'ba',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'b',
            before: 'a',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const b = 0
          const a = 0
          </script>
        `,
      }),
    },
    {
      description: 'supports subgroup order as a fallback',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          type T = {}
          interface I {}
          </script>
        `,
      }),
      options: {
        groups: [['interface', 'type']],
        type: 'custom',
        alphabet: 'x',
        fallbackSort: {
          type: 'subgroup-order',
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'I',
            before: 'T',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          interface I {}
          type T = {}
          </script>
        `,
      }),
    },
    {
      description: 'supports locale arrays',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'alphabetical',
        locales: ['en-US'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const z = 0
          </script>
        `,
      }),
    },
    {
      description:
        'matches import sources and original imported function names',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { useRouter as router } from "vue-router"
          import { ref } from "vue"
          const count = ref(0)
          const route = router()
          </script>
        `,
      }),
      options: {
        groups: ['router', 'ref'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
            importSourcePattern: '^vue-router$',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'route',
            before: 'count',
            group: 'router',
          },
        },
      ],
      output: null,
    },
    {
      description: 'uses the first matching custom group and anyOf',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function run() {}
          function handleClick() {}
          </script>
        `,
      }),
      options: {
        groups: ['handlers', 'others'],
        customGroups: [
          {
            groupName: 'handlers',
            anyOf: [
              {
                selector: 'function',
                elementNamePattern: '^handle',
              },
              {
                elementNamePattern: '^on',
              },
            ],
          },
          {
            groupName: 'others',
            selector: 'function',
          },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'handleClick',
            before: 'run',
            group: 'handlers',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function handleClick() {}
          function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'lets custom overrides win over a standalone group override',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function a() {}
          function z() {}
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'functions',
            type: 'natural',
            order: 'asc',
          },
        ],
        customGroups: [
          {
            groupName: 'functions',
            selector: 'function',
            order: 'desc',
          },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'z',
            before: 'a',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          function a() {}
          </script>
        `,
      }),
    },
    {
      description: 'sorts using explicit rule options',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          const z = 0
          </script>
        `,
      }),
    },
    {
      description:
        'inherits rule order for fallback sorting and ignores settings',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const aa = 0
          const zz = 0
          </script>
        `,
      }),
      options: {
        type: 'line-length',
        order: 'desc',
        fallbackSort: {
          type: 'natural',
        },
      },
      settings: {
        perfectionist: {
          fallbackSort: {
            type: 'natural',
            order: 'asc',
          },
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'zz',
            before: 'aa',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const zz = 0
          const aa = 0
          </script>
        `,
      }),
    },
    {
      description: 'handles global regex flags deterministically',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function z() {}
          function a() {}
          </script>
        `,
      }),
      options: {
        groups: ['functions'],
        customGroups: [
          {
            groupName: 'functions',
            elementNamePattern: {
              pattern: '.*',
              flags: 'g',
            },
            type: 'natural',
          },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function a() {}
          function z() {}
          </script>
        `,
      }),
    },
    {
      description:
        'moves documentation and trailing comments with declarations',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          /** Z */
          const z = 0 // last
          /** A */
          const a = 0 // first
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          /** A */
          const a = 0 // first
          /** Z */
          const z = 0 // last
          </script>
        `,
      }),
    },
    {
      description:
        'keeps region markers fixed while sorting their following region',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          // #region next
          const c = 0
          const b = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByComment: {
          line: '^\\s*#region',
          block: false,
        },
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'b',
            before: 'c',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          // #region next
          const b = 0
          const c = 0
          </script>
        `,
      }),
    },
    {
      description: 'formats inside and between groups independently',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0

          const b = 0
          function run() {}
          </script>
        `,
      }),
      options: {
        newlinesBetween: 1,
        newlinesInside: 0,
      },
      errors: [
        {
          messageId: 'unexpectedNewlinesInside',
          data: {
            count: 0,
          },
        },
        {
          messageId: 'unexpectedNewlinesBetween',
          data: {
            count: 1,
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const b = 0

          function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'resolves newline separators across absent groups',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          function run() {}
          </script>
        `,
      }),
      options: {
        newlinesBetween: 0,
        groups: [
          'constant',
          {
            newlinesBetween: 2,
          },
          'variable',
          'function',
        ],
      },
      errors: [
        {
          messageId: 'unexpectedNewlinesBetween',
          data: {
            count: 2,
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0


          function run() {}
          </script>
        `,
      }),
    },
    {
      description: 'supports the legacy newlinesInside compatibility value',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0

          const b = 0
          </script>
        `,
      }),
      options: {
        newlinesBetween: 1,
        newlinesInside: 'newlinesBetween',
      },
      errors: [
        {
          messageId: 'unexpectedNewlinesInside',
          data: {
            count: 0,
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const b = 0
          </script>
        `,
      }),
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref } from "vue"
          const z = ref(0)
          const a = ref(0)
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { useZ, useA } from "./composables"
          const z = useZ()
          const a = useA()
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'composable',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = state.value
          const a = state.other
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'variable',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const { z } = getState()
          const { a } = getState()
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'variable',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          class Z {}
          class A {}
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'A',
            before: 'Z',
            group: 'enum / class',
          },
        },
      ],
      output: null,
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          enum Z { Value }
          enum A { Value }
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'A',
            before: 'Z',
            group: 'enum / class',
          },
        },
      ],
      output: null,
    },
    {
      description: 'fixes safe islands without moving surrounding calls',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0
          const a = 0
          importedCall()
          const y = 0
          const b = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'b',
            before: 'y',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 0
          const z = 0
          importedCall()
          const b = 0
          const y = 0
          </script>
        `,
      }),
    },
    {
      description: 'turns off all fixes without changing safe diagnostics',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 0

          const a = 0
          </script>
        `,
      }),
      options: {
        type: 'natural',
        newlinesInside: 0,
        fix: 'none',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'a',
            before: 'z',
          },
        },
      ],
      output: null,
    },
    {
      description: 'produces code accepted by the Vue compiler',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function zebra() { return 2 }
          function alpha() { return 1 }
          interface Props { title: string }
          const z = 2
          const a = 1
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedGroupOrder',
          data: {
            name: 'Props',
            before: 'zebra',
            group: 'interface / type',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          interface Props { title: string }
          const a = 1
          const z = 2
          function alpha() { return 1 }
          function zebra() { return 2 }
          </script>
        `,
      }),
      after({ output }) {
        const parsed = parse(output)
        expect(parsed.errors).toEqual([])
        expect(() =>
          compileScript(parsed.descriptor, { id: 'test' }),
        ).not.toThrow()
      },
    },
    {
      description: 'tracks runtime sources for default imported composables',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import useStore from "./store"
          const a = 1
          const store = useStore()
          </script>
        `,
      }),
      options: {
        groups: ['store', 'constant'],
        customGroups: [
          {
            groupName: 'store',
            callNamePattern: '^useStore$',
            importSourcePattern: '^./store$',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'store',
            before: 'a',
            group: 'store',
          },
        },
      ],
      output: null,
    },
    {
      description: 'can match a secondary destructuring binding',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const a = 1
          const { x, special } = getState()
          </script>
        `,
      }),
      options: {
        groups: ['special', 'constant'],
        customGroups: [
          {
            groupName: 'special',
            elementNamePattern: '^special$',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'x',
            before: 'a',
            group: 'special',
          },
        },
      ],
      output: null,
    },
    {
      description: 'recognizes calls inside TypeScript expression wrappers',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          import { ref, computed } from "vue"
          const z = computed(() => 1) as unknown
          const a = ref(0)!
          </script>
        `,
      }),
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'ref / reactive',
          },
        },
      ],
      output: null,
    },
    {
      description:
        'does not partition the outer scope on an async function body',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          async function zebra() { await run() }
          function alpha() {}
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'alpha',
            before: 'zebra',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function alpha() {}
          async function zebra() { await run() }
          </script>
        `,
      }),
    },
    {
      description: 'does not use nested comments as top-level partitions',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          function zebra() { /* section */ }
          function alpha() {}
          </script>
        `,
      }),
      options: {
        type: 'natural',
        partitionByComment: true,
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'alpha',
            before: 'zebra',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          function alpha() {}
          function zebra() { /* section */ }
          </script>
        `,
      }),
    },
    {
      description:
        'preserves an ASI-sensitive boundary after a proposed movement',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const z = 1
          function a() {}
          (() => {})()
          </script>
        `,
      }),
      options: {
        groups: ['function', 'constant'],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'function',
          },
        },
      ],
      output: null,
    },
    {
      description: 'does not move statements with ambiguous detached comments',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          // heading

          const z = 1
          const a = 2
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'a',
            before: 'z',
            group: 'constant',
          },
        },
      ],
      output: null,
    },
    {
      description:
        'allows explicit unknown-group sorting without claiming safe fixes',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          zebra()
          alpha()
          </script>
        `,
      }),
      options: {
        groups: [
          {
            group: 'unknown',
            type: 'natural',
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: {
            name: 'alpha',
            before: 'zebra',
            group: 'unknown',
          },
        },
      ],
      output: null,
    },
    {
      description: 'accepts natural sorting with multiple locales',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const item10 = 1
          const item2 = 2
          </script>
        `,
      }),
      options: {
        type: 'natural',
        locales: ['en-US', 'zh-CN'],
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'item2',
            before: 'item10',
          },
        },
      ],
      output: createVueSFC({
        script: `
          <script setup lang="ts">
          const item2 = 2
          const item10 = 1
          </script>
        `,
      }),
    },
    {
      description:
        'retains runtime results when independently initialized constants move',
      code: createVueSFC({
        script: `
          <script setup lang="ts">
          const zebra = 2
          const alpha = 1
          record([zebra, alpha])
          </script>
        `,
      }),
      options: {
        type: 'natural',
      },
      errors: [
        {
          messageId: 'unexpectedOrder',
          data: {
            name: 'alpha',
            before: 'zebra',
          },
        },
      ],
      output(output, input) {
        expect(output).toBe(
          createVueSFC({
            script: `
              <script setup lang="ts">
              const alpha = 1
              const zebra = 2
              record([zebra, alpha])
              </script>
            `,
          }),
        )
        const transformed = output.slice(
          output.indexOf('>') + 1,
          output.lastIndexOf('</script>'),
        )
        const original = input.slice(
          input.indexOf('>') + 1,
          input.lastIndexOf('</script>'),
        )
        const before: unknown[] = []
        const after: unknown[] = []
        runInNewContext(original, {
          record: (value: unknown) => before.push(value),
        })
        runInNewContext(transformed, {
          record: (value: unknown) => after.push(value),
        })
        expect(after).toEqual(before)
      },
    },
    {
      description: 'does not cross the two script blocks',
      code: `<script lang="ts">const z = 1\nconst a = 2</script>\n${createVueSFC(
        {
          script: `
          <script setup lang="ts">
          const y = 1
          const b = 2
          </script>
        `,
        },
      )}`,
      options: { type: 'natural' },
      errors: ['unexpectedOrder'],
      output: `<script lang="ts">const z = 1\nconst a = 2</script>\n${createVueSFC(
        {
          script: `
          <script setup lang="ts">
          const b = 2
          const y = 1
          </script>
        `,
        },
      )}`,
    },
    {
      description: 'supports JavaScript setup without a TypeScript parser',
      code: '<script setup>\nconst z = 1\nconst a = 2\n</script>',
      languageOptions: { parserOptions: { parser: null } },
      options: { type: 'natural' },
      errors: ['unexpectedOrder'],
      output: '<script setup>\nconst a = 2\nconst z = 1\n</script>',
    },
    {
      description: 'preserves CRLF when changing whitespace',
      code: '<script setup>\r\nconst a = 0\r\nfunction run() {}\r\n</script>',
      options: { newlinesBetween: 1 },
      errors: ['unexpectedNewlinesBetween'],
      output:
        '<script setup>\r\nconst a = 0\r\n\r\nfunction run() {}\r\n</script>',
    },
  ],
})

// Invalid options deliberately cross the public type boundary to exercise validation.
const tester = createRuleTester<unknown>({
  name: 'sort-script-setup',
  rule: sortScriptSetup,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

describe('option validation', () => {
  it.each([
    { type: 'usage' },
    { newlinesBetween: 'always' },
    { newlinesBetween: -1 },
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
