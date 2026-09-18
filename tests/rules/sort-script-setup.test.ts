import { runInNewContext } from 'node:vm'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import { sortScriptSetup } from '../../src/rules/sort-script-setup'
import { run, vueLanguageOptions } from '../internal'
import type { MessageId, SortScriptSetupOptions } from '../../src/types'

function setup(body: string): string {
  return `<script setup lang="ts">\n${body}\n</script>`
}

await run<SortScriptSetupOptions, MessageId>({
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
      description: 'preserves intra-group order by default',
      code: setup('const z = 1\nconst a = 2'),
    },
    {
      description: 'does not mistake a local ref for Vue ref',
      code: setup(
        'import { ref } from "./helper"\nconst a = ref(0)\nfunction run() {}',
      ),
    },
    {
      description: 'does not override a local binding with vueGlobals',
      code: setup('const z = 1\nconst ref = () => 0\nconst a = ref()'),
      options: {
        groups: ['constant', 'function', 'variable', 'ref'],
        vueGlobals: ['ref'],
      },
    },
    {
      description: 'groups reactive declarations in one bucket',
      code: setup(
        'import { ref, reactive } from "vue"\nconst z = reactive({})\nconst a = ref(0)',
      ),
    },
    {
      description: 'treats unconfigured statements as partition boundaries',
      code: setup('const z = 1\ndoSomething()\nconst a = 2'),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'allows an empty groups configuration',
      code: setup('function z() {}\nconst a = 2'),
      options: {
        groups: [],
        newlinesBetween: 2,
      },
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: setup('const Item2 = 0\nconst item2 = 0'),
      options: {
        type: 'natural',
        ignoreCase: true,
      },
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: setup('const Item2 = 0\nconst item2 = 0'),
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
      code: setup('const Item2 = 0\nconst item2 = 0'),
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
      code: setup('const 𠮷 = 0\nconst a = 0'),
      options: {
        type: 'custom',
        alphabet: 'x',
      },
    },
    {
      description: 'supports alphabetical sorting',
      code: setup('const item10 = 0\nconst item2 = 0'),
      options: {
        type: 'alphabetical',
      },
    },
    {
      description: 'retains ties and disables fallback for unsorted',
      code: setup('const a = 0\nconst A = 1'),
      options: {
        type: 'alphabetical',
        ignoreCase: true,
      },
    },
    {
      description: 'retains ties and disables fallback for unsorted',
      code: setup('const z = 0\nconst a = 1'),
      options: {
        fallbackSort: {
          type: 'natural',
        },
      },
    },
    {
      description: 'normalizes special characters for comparison',
      code: setup('const _a = 0\nconst a = 1'),
      options: {
        type: 'natural',
        specialCharacters: 'trim',
      },
    },
    {
      description: 'normalizes special characters for comparison',
      code: setup('const a_b = 0\nconst ab = 1'),
      options: {
        type: 'natural',
        specialCharacters: 'remove',
      },
    },
    {
      description:
        'does not use subgroup-specific overrides in a merged bucket',
      code: setup('function z() {}\nfunction a() {}'),
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
      code: setup('const z = 0\nconst a = 1'),
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
      code: setup('const z = 0\nconst a = 1'),
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
      code: setup('const z = 0\n\nconst a = 0'),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: setup('const z = 0\n// section\nconst a = 0'),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: setup('const z = 0\nif (true) {}\nconst a = 0'),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: setup('const z = 0\nawait run()\nconst a = 0'),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: setup('const z = 0\nconst data = await run()\nconst a = 0'),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: setup('const z = 0\nconst x = 1, y = 2\nconst a = 0'),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description: 'respects explicit and structural partitions',
      code: setup('const z = 0\nimport "side-effects"\nconst a = 0'),
      options: {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      },
    },
    {
      description:
        'does not move protected statements: // eslint-disable-next-line no-unused-vars\nconst z = 0\nconst a = 0',
      code: setup(
        '// eslint-disable-next-line no-unused-vars\nconst z = 0\nconst a = 0',
      ),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'does not move protected statements: // @ts-expect-error intentional\nconst z = 0\nconst a = 0',
      code: setup('// @ts-expect-error intentional\nconst z = 0\nconst a = 0'),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'does not move protected statements: // eslint-disable no-unused-vars\nconst z = 0\nconst a = 0\n// eslint-enable no-unused-vars',
      code: setup(
        '// eslint-disable no-unused-vars\nconst z = 0\nconst a = 0\n// eslint-enable no-unused-vars',
      ),
      options: {
        type: 'natural',
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => z.value, () => {})',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watch(() => z.value, () => {})',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch([() => z.value], () => {})',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watch([() => z.value], () => {})',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(read, () => {})',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watch(read, () => {})',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch([read], () => {})',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watch([read], () => {})',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => 0, read, { immediate: true })',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watch(() => 0, read, { immediate: true })',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watch(() => 0, read, options)',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watch(() => 0, read, options)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchEffect(read)',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watchEffect(read)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchSyncEffect(read)',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watchSyncEffect(read)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'preserves state read by synchronous Vue callbacks: watchEffect((read as () => number))',
      code: setup(
        'import { ref, watch, watchEffect, watchSyncEffect } from "vue"\nfunction read() { return z.value }\nconst z = ref(0)\nconst stop = watchEffect((read as () => number))',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watch(() => 0, read)',
      code: setup(
        'import { ref, watch, watchEffect, watchPostEffect } from "vue"\nfunction read() { return z.value }\nconst stop = watch(() => 0, read)\nconst z = ref(0)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watch(() => 0, read, { immediate: false })',
      code: setup(
        'import { ref, watch, watchEffect, watchPostEffect } from "vue"\nfunction read() { return z.value }\nconst stop = watch(() => 0, read, { immediate: false })\nconst z = ref(0)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(read, { flush: "post" })',
      code: setup(
        'import { ref, watch, watchEffect, watchPostEffect } from "vue"\nfunction read() { return z.value }\nconst stop = watchEffect(read, { flush: "post" })\nconst z = ref(0)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(read, { flush: "post" } as const)',
      code: setup(
        'import { ref, watch, watchEffect, watchPostEffect } from "vue"\nfunction read() { return z.value }\nconst stop = watchEffect(read, { flush: "post" } as const)\nconst z = ref(0)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchPostEffect(read)',
      code: setup(
        'import { ref, watch, watchEffect, watchPostEffect } from "vue"\nfunction read() { return z.value }\nconst stop = watchPostEffect(read)\nconst z = ref(0)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'keeps deferred Vue callbacks free of immediate dependencies: watchEffect(() => { onCleanup(read) })',
      code: setup(
        'import { ref, watch, watchEffect, watchPostEffect } from "vue"\nfunction read() { return z.value }\nconst stop = watchEffect(() => { onCleanup(read) })\nconst z = ref(0)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description: 'resolves function-valued variables used as watch callbacks',
      code: setup(
        'import { ref, watchEffect } from "vue"\nconst read = () => z.value\nconst z = ref(0)\nconst stop = watchEffect(read)',
      ),
      options: {
        groups: ['function', 'watch', 'ref'],
      },
    },
    {
      description:
        'tracks Vue callbacks nested in immediately called local functions',
      code: setup(
        'import { ref, watchEffect } from "vue"\nfunction start() { return watchEffect(() => z.value) }\nconst z = ref(0)\nconst stop = start()',
      ),
      options: {
        groups: ['function', 'variable', 'ref'],
      },
    },
    {
      description:
        'resolves imported aliases and explicit globals for synchronous callbacks',
      code: setup(
        'import { ref, watch as observe } from "vue"\nconst z = ref(0)\nconst stop = observe(() => z.value, () => {})',
      ),
      options: {
        groups: ['watch', 'ref'],
      },
    },
    {
      description:
        'resolves imported aliases and explicit globals for synchronous callbacks',
      code: setup('const z = ref(0)\nconst stop = watchEffect(() => z.value)'),
      options: {
        groups: ['watch', 'ref'],
        vueGlobals: ['ref', 'watchEffect'],
      },
    },
    {
      description:
        'tracks a named customRef factory without executing returned accessors',
      code: setup(
        'import { customRef } from "vue"\nfunction factory() { record(z); return { get: () => later, set() {} } }\nconst z = {}\nconst value = customRef(factory)\nconst later = {}',
      ),
      options: {
        groups: ['function', 'ref', 'variable'],
      },
    },
    {
      description:
        'does not infer Vue callback execution from a foreign customRef name',
      code: setup(
        'import { customRef } from "./helpers"\nconst a = customRef(() => z)\nconst z = {}',
      ),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'prioritizes initialization dependencies over group order',
      code: setup(
        'import { ref } from "vue"\nconst count = ref(0)\nconst snapshot = count.value',
      ),
      options: {
        groups: ['variable', 'ref'],
      },
    },
    {
      description: 'keeps initialization dependencies in descending order',
      code: setup('const a = {}\nconst z = a'),
      options: {
        type: 'natural',
        order: 'desc',
      },
    },
    {
      description: 'does not treat a deferred capture as an immediate read',
      code: setup(
        'import { ref, computed } from "vue"\nconst z = computed(() => a.value)\nconst a = ref(0)',
      ),
      options: {
        groups: ['computed', 'ref'],
      },
    },
    {
      description: 'tracks reads through immediately invoked local functions',
      code: setup(
        'const dependency = {}\nconst first = read()\nfunction read() { return dependency }',
      ),
      options: {
        groups: ['variable', 'function'],
        type: 'natural',
      },
    },
    {
      description: 'tracks reads through an IIFE',
      code: setup('const z = {}\nconst a = (() => z)()'),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'retains cycles without an automatic fix',
      code: setup('const z = a\nconst a = z'),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'does not reorder interface merging or function overloads',
      code: setup(
        'interface Z { value: string }\ninterface Z { other: number }\ninterface A {}\nfunction f(x: string): string\nfunction f(x: number): number\nfunction f(x: unknown) { return x }',
      ),
      options: {
        type: 'natural',
      },
    },
    {
      description: 'does not recognize type-only imports as runtime APIs',
      code: setup(
        'import type { ref } from "vue"\nconst a = ref(0)\nconst b = 1',
      ),
      options: {
        groups: ['variable', 'constant', 'ref'],
      },
    },
    {
      description: 'does not recognize type-only imports as runtime APIs',
      code: setup(
        'import { type ref } from "vue"\nconst a = ref(0)\nconst b = 1',
      ),
      options: {
        groups: ['variable', 'constant', 'ref'],
      },
    },
    {
      description:
        'does not match calls inside function bodies as custom initializers',
      code: setup('function run() { useRouter() }\nconst a = 1'),
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
      code: setup('const route = useRouter()\nconst a = 1'),
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
      code: setup(
        'import * as Vue from "vue"\nconst a = Vue["ref"](0)\nconst b = Vue.ref?.(0)',
      ),
      options: {
        groups: ['ref', 'variable'],
      },
    },
    {
      description: 'does not move expose across await',
      code: setup('const a = 1\ndefineExpose({ a })\nawait run()\nconst b = 2'),
      options: {
        groups: ['constant', 'define-expose'],
      },
    },
    {
      description:
        'keeps unknown members stable even with a global name comparator',
      code: setup('zebra()\nalpha()'),
      options: {
        type: 'natural',
        groups: ['unknown'],
      },
    },
    {
      description: 'ignores invalid settings when rule options are provided',
      code: setup('const a = 1'),
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
    {
      description: 'enforces grouping with unsorted',
      code: setup('function run() {}\ninterface Props {}'),
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
      output: setup('interface Props {}\nfunction run() {}'),
    },
    {
      description:
        'recognizes macro declarations and withDefaults without moving them',
      code: setup(
        'const emit = defineEmits(["update"])\nconst { title } = withDefaults(defineProps<{ title?: string }>(), { title: "" })',
      ),
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
      code: setup(
        'import { ref as makeRef } from "vue"\nimport * as Vue from "vue"\nconst z = Vue.computed(() => 1)\nconst a = makeRef(0)',
      ),
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
      code: setup('const z = computed(() => 1)\nconst a = ref(0)'),
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
      code: setup(
        'import { ref, computed } from "@vue/reactivity"\nconst z = computed(() => 1)\nconst a = ref(0)',
      ),
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
      code: setup(
        'import { ref, reactive } from "vue"\nconst z = reactive({})\nconst a = ref(0)',
      ),
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
      code: setup('async function run() {}\nfunction stop() {}'),
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
      output: setup('function stop() {}\nasync function run() {}'),
    },
    {
      description: 'does not infer ref(null) to be a template-ref',
      code: setup(
        'import { ref, useTemplateRef } from "vue"\nconst el = ref(null)\nconst input = useTemplateRef("input")',
      ),
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
      code: setup(
        'import { watchEffect, onMounted } from "vue"\nonMounted(() => {})\nconst stop = watchEffect(() => {})',
      ),
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
      code: setup('doSomething()\nconst a = 2'),
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
      code: setup('const ä = 1\nconst z = 2'),
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
      output: setup('const z = 2\nconst ä = 1'),
    },
    {
      description:
        'negotiates multiple locales for Unicode names: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: setup('const ä = 1\nconst z = 2'),
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
      output: setup('const z = 2\nconst ä = 1'),
    },
    {
      description:
        'negotiates multiple locales for Unicode names: {"groups":[{"group":"constant","type":"natural"}]}',
      code: setup('const ä = 1\nconst z = 2'),
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
      output: setup('const z = 2\nconst ä = 1'),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: setup('const Item2 = 0\nconst item2 = 0'),
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
      output: setup('const item2 = 0\nconst Item2 = 0'),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"natural"}',
      code: setup('const item2 = 0\nconst Item2 = 0'),
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
      output: setup('const Item2 = 0\nconst item2 = 0'),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: setup('const Item2 = 0\nconst item2 = 0'),
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
      output: setup('const item2 = 0\nconst Item2 = 0'),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"type":"line-length","fallbackSort":{"type":"natural"}}',
      code: setup('const item2 = 0\nconst Item2 = 0'),
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
      output: setup('const Item2 = 0\nconst item2 = 0'),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: setup('const Item2 = 0\nconst item2 = 0'),
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
      output: setup('const item2 = 0\nconst Item2 = 0'),
    },
    {
      description:
        'honors case sensitivity in natural comparisons: {"groups":[{"group":"constant","type":"natural"}]}',
      code: setup('const item2 = 0\nconst Item2 = 0'),
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
      output: setup('const Item2 = 0\nconst item2 = 0'),
    },
    {
      description:
        'keeps numeric precedence when natural sorting is case sensitive',
      code: setup('const item10 = 0\nconst Item2 = 0'),
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
      output: setup('const Item2 = 0\nconst item10 = 0'),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: setup('const 𠮷 = 0\nconst 𠮶 = 0'),
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
      output: setup('const 𠮶 = 0\nconst 𠮷 = 0'),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: setup('const a = 0\nconst 𠮷 = 0'),
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
      output: setup('const 𠮷 = 0\nconst a = 0'),
    },
    {
      description:
        'compares custom alphabets and name lengths by Unicode code point',
      code: setup('const 𠮶 = 0\nconst 𠮷 = 0'),
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
      output: setup('const 𠮷 = 0\nconst 𠮶 = 0'),
    },
    {
      description: 'supports natural sorting',
      code: setup('const item10 = 0\nconst item2 = 0'),
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
      output: setup('const item2 = 0\nconst item10 = 0'),
    },
    {
      description: 'applies descending order only inside groups',
      code: setup(
        'function alpha() {}\nfunction zebra() {}\nconst b = 2\nconst a = 1',
      ),
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
      output: setup(
        'const b = 2\nconst a = 1\nfunction zebra() {}\nfunction alpha() {}',
      ),
    },
    {
      description: 'uses source length and a fallback for equal lengths',
      code: setup('const zz = 0\nconst bb = 0\nconst a = 0'),
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
      output: setup('const a = 0\nconst bb = 0\nconst zz = 0'),
    },
    {
      description: 'supports custom alphabets',
      code: setup('const a = 0\nconst b = 0'),
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
      output: setup('const b = 0\nconst a = 0'),
    },
    {
      description: 'supports subgroup order as a fallback',
      code: setup('type T = {}\ninterface I {}'),
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
      output: setup('interface I {}\ntype T = {}'),
    },
    {
      description: 'supports locale arrays',
      code: setup('const z = 0\nconst a = 0'),
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
      output: setup('const a = 0\nconst z = 0'),
    },
    {
      description:
        'matches import sources and original imported function names',
      code: setup(
        'import { useRouter as router } from "vue-router"\nimport { ref } from "vue"\nconst count = ref(0)\nconst route = router()',
      ),
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
      code: setup('function run() {}\nfunction handleClick() {}'),
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
      output: setup('function handleClick() {}\nfunction run() {}'),
    },
    {
      description: 'lets custom overrides win over a standalone group override',
      code: setup('function a() {}\nfunction z() {}'),
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
      output: setup('function z() {}\nfunction a() {}'),
    },
    {
      description: 'sorts using explicit rule options',
      code: setup('const z = 0\nconst a = 1'),
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
      output: setup('const a = 1\nconst z = 0'),
    },
    {
      description:
        'inherits rule order for fallback sorting and ignores settings',
      code: setup('const aa = 0\nconst zz = 0'),
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
      output: setup('const zz = 0\nconst aa = 0'),
    },
    {
      description: 'handles global regex flags deterministically',
      code: setup('function z() {}\nfunction a() {}'),
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
      output: setup('function a() {}\nfunction z() {}'),
    },
    {
      description:
        'moves documentation and trailing comments with declarations',
      code: setup(
        '/** Z */\nconst z = 0 // last\n/** A */\nconst a = 0 // first',
      ),
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
      output: setup(
        '/** A */\nconst a = 0 // first\n/** Z */\nconst z = 0 // last',
      ),
    },
    {
      description:
        'keeps region markers fixed while sorting their following region',
      code: setup('const z = 0\n// #region next\nconst c = 0\nconst b = 0'),
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
      output: setup('const z = 0\n// #region next\nconst b = 0\nconst c = 0'),
    },
    {
      description: 'formats inside and between groups independently',
      code: setup('const a = 0\n\nconst b = 0\nfunction run() {}'),
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
      output: setup('const a = 0\nconst b = 0\n\nfunction run() {}'),
    },
    {
      description: 'resolves newline separators across absent groups',
      code: setup('const a = 0\nfunction run() {}'),
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
      output: setup('const a = 0\n\n\nfunction run() {}'),
    },
    {
      description: 'supports the legacy newlinesInside compatibility value',
      code: setup('const a = 0\n\nconst b = 0'),
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
      output: setup('const a = 0\nconst b = 0'),
    },
    {
      description: 'never automatically moves runtime-sensitive statements',
      code: setup(
        'import { ref } from "vue"\nconst z = ref(0)\nconst a = ref(0)',
      ),
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
      code: setup(
        'import { useZ, useA } from "./composables"\nconst z = useZ()\nconst a = useA()',
      ),
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
      code: setup('const z = state.value\nconst a = state.other'),
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
      code: setup('const { z } = getState()\nconst { a } = getState()'),
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
      code: setup('class Z {}\nclass A {}'),
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
      code: setup('enum Z { Value }\nenum A { Value }'),
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
      code: setup(
        'const z = 0\nconst a = 0\nimportedCall()\nconst y = 0\nconst b = 0',
      ),
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
      output: setup(
        'const a = 0\nconst z = 0\nimportedCall()\nconst b = 0\nconst y = 0',
      ),
    },
    {
      description: 'turns off all fixes without changing safe diagnostics',
      code: setup('const z = 0\n\nconst a = 0'),
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
      code: setup(
        'function zebra() { return 2 }\nfunction alpha() { return 1 }\ninterface Props { title: string }\nconst z = 2\nconst a = 1',
      ),
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
      output: setup(
        'interface Props { title: string }\nconst a = 1\nconst z = 2\nfunction alpha() { return 1 }\nfunction zebra() { return 2 }',
      ),
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
      code: setup(
        'import useStore from "./store"\nconst a = 1\nconst store = useStore()',
      ),
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
      code: setup('const a = 1\nconst { x, special } = getState()'),
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
      code: setup(
        'import { ref, computed } from "vue"\nconst z = computed(() => 1) as unknown\nconst a = ref(0)!',
      ),
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
      code: setup(
        'async function zebra() { await run() }\nfunction alpha() {}',
      ),
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
      output: setup(
        'function alpha() {}\nasync function zebra() { await run() }',
      ),
    },
    {
      description: 'does not use nested comments as top-level partitions',
      code: setup('function zebra() { /* section */ }\nfunction alpha() {}'),
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
      output: setup('function alpha() {}\nfunction zebra() { /* section */ }'),
    },
    {
      description:
        'preserves an ASI-sensitive boundary after a proposed movement',
      code: setup('const z = 1\nfunction a() {}\n(() => {})()'),
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
      code: setup('// heading\n\nconst z = 1\nconst a = 2'),
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
      code: setup('zebra()\nalpha()'),
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
      code: setup('const item10 = 1\nconst item2 = 2'),
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
      output: setup('const item2 = 2\nconst item10 = 1'),
    },
    {
      description:
        'retains runtime results when independently initialized constants move',
      code: setup('const zebra = 2\nconst alpha = 1\nrecord([zebra, alpha])'),
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
          setup('const alpha = 1\nconst zebra = 2\nrecord([zebra, alpha])'),
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
      code: `<script lang="ts">const z = 1\nconst a = 2</script>\n${setup('const y = 1\nconst b = 2')}`,
      options: { type: 'natural' },
      errors: ['unexpectedOrder'],
      output: `<script lang="ts">const z = 1\nconst a = 2</script>\n${setup('const b = 2\nconst y = 1')}`,
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
      tester.valid({ code: setup('const a = 1'), options }),
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
      tester.valid({ code: setup('const z = 0\nconst a = 1'), settings }),
    ).resolves.toMatchObject({ result: { fixed: false, messages: [] } })
  })

  it('rejects numeric newline overrides in partitioned custom groups', async () => {
    await expect(
      tester.valid({
        code: setup('function a() {}'),
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
