import { expect } from 'vitest'
import { sortComposableBody } from '../../../src/rules/sort-composable-body.ts'
import { run } from '../../helpers/rule-tester.ts'
import type {
  SortComposableBodyMessageId,
  SortComposableBodyOptions,
  SortComposableBodySelector,
} from '../../../src/types/index.ts'

const body = (source: string, parameters = '') =>
  `function useCounter(${parameters}) {\n  ${source.replaceAll('\n', '\n  ')}\n}`
const selectors: [SortComposableBodySelector, string, string, boolean][] = [
  ['interface', 'interface Target {}', '', true],
  ['type', 'type Target = number', '', true],
  ['constant', 'const target = 1', '', true],
  ['function', 'function target() {}', '', true],
  ['enum', 'enum Target { Value }', '', false],
  ['class', 'class Target {}', '', false],
  ['variable', 'let target = outer', '', false],
  ['call', 'target()', '', false],
  ['ref', 'const target = ref(0)', "import { ref } from 'vue'", false],
  [
    'reactive',
    'const target = reactive({})',
    "import { reactive } from 'vue'",
    false,
  ],
  [
    'computed',
    'const target = computed(() => 0)',
    "import { computed } from 'vue'",
    false,
  ],
  [
    'inject',
    'const target = inject(key)',
    "import { inject } from 'vue'",
    false,
  ],
  ['provide', 'provide(key, 0)', "import { provide } from 'vue'", false],
  [
    'template-ref',
    'const target = useTemplateRef("el")',
    "import { useTemplateRef } from 'vue'",
    false,
  ],
  [
    'watch',
    'const target = watch(() => 0, () => {})',
    "import { watch } from 'vue'",
    false,
  ],
  [
    'lifecycle-hook',
    'onMounted(() => {})',
    "import { onMounted } from 'vue'",
    false,
  ],
  [
    'composable',
    'const target = localUse()',
    "import { useCounter as localUse } from './counter'",
    false,
  ],
]
await run<SortComposableBodyOptions, SortComposableBodyMessageId>({
  name: 'sort-composable-body classification',
  rule: sortComposableBody,
  defaultFilenames: { js: 'test.ts' },
  valid: [
    ...[
      ["import { ref } from 'vue'", 'ref', 'ref(0)'],
      ["import type { ref } from 'vue'", '', 'ref(0)'],
      ["import { type ref } from 'vue'", '', 'ref(0)'],
      ["import { ref } from 'other'", '', 'ref(0)'],
      ['', '', 'ref(0)'],
      ['', 'ref', 'ref(0)'],
      ["import * as Vue from 'vue'", 'Vue', 'Vue.ref(0)'],
      ["import * as Vue from 'vue'", '', 'Vue["ref"](0)'],
      ["import { ref } from 'vue'", '', 'ref?.(0)'],
    ].map(([imports, parameters, call]) => ({
      description: `does not infer Vue identity for ${imports} / ${parameters} / ${call}`,
      code: `${imports}\n${body(`function reset() {}\nconst value = ${call}`, parameters)}`,
      options: { groups: ['ref', 'function'] },
    })),
    {
      code: `${body('function reset() {}\nconst value = ref(0)')}`,
      settings: { 'vue-perfectionist': { autoImport: true } },
      options: { groups: ['ref', 'function'], vueGlobals: [] },
    },
    {
      description: 'unbound compiler macro names are ordinary variable calls',
      code: body('function reset() {}\nconst props = defineProps()'),
      options: {
        groups: ['variable', 'function'],
        ignoreNames: ['useCounter'],
      },
    },
  ],
  invalid: [
    ...(
      [
        ['async', 'async function target() {}', true],
        ['const', 'const target = getValue()', false],
        ['let', 'let target = 1', false],
        ['var', 'var target = 1', false],
      ] satisfies ['async' | 'const' | 'let' | 'var', string, boolean][]
    ).map(([modifier, statement, safe]) => ({
      description: `matches the ${modifier} modifier inside the body`,
      code: body(`const anchor = 0\n${statement}`),
      options: {
        groups: ['selected', 'constant'],
        customGroups: [
          {
            groupName: 'selected',
            elementNamePattern: '^target$',
            modifiers: [modifier],
          },
        ],
      },
      errors: [
        safe ? ('unexpectedGroupOrder' as const) : ('unsafeReorder' as const),
      ],
      output: safe ? body(`${statement}\nconst anchor = 0`) : null,
    })),
    ...selectors.map(([selector, statement, imports, safe]) => {
      const anchor =
        selector === 'constant' ? 'function anchor() {}' : 'const anchor = 0'
      return {
        description: `classifies ${selector}`,
        code: `${imports}\n${body(`${anchor}\n${statement}`)}`,
        options: { groups: [selector, 'unknown'] },
        errors: [
          {
            messageId: safe
              ? ('unexpectedGroupOrder' as const)
              : ('unsafeReorder' as const),
            data: {
              group: selector,
              before: 'anchor',
              name: ['interface', 'type', 'enum', 'class'].includes(selector)
                ? 'Target'
                : selector === 'provide'
                  ? 'provide'
                  : selector === 'lifecycle-hook'
                    ? 'onMounted'
                    : 'target',
            },
          },
        ],
        output: safe ? `${imports}\n${body(`${statement}\n${anchor}`)}` : null,
      }
    }),
    ...(
      [
        [
          "import { ref as makeRef } from 'vue'",
          '(makeRef as Function)(0)',
          {},
        ],
        ["import * as Vue from 'vue'", '(Vue as typeof Vue).ref(0)', {}],
        [
          "import { ref } from '@vue/runtime-core'",
          'ref(0)',
          { vueImportSources: ['@vue/runtime-core'] },
        ],
        ['', 'ref(0)', { vueGlobals: ['ref'] }],
      ] satisfies [string, string, SortComposableBodyOptions][]
    ).map(([imports, call, extra]) => ({
      description: `resolves runtime identity in ${call}`,
      code: `${imports}\n${body(`function reset() {}\nconst value = ${call}`)}`,
      options: { ...extra, groups: ['ref', 'function'] },
      errors: ['unsafeReorder' as const],
      output: null,
    })),
    {
      description: 'honors shared auto-import recognition',
      code: body('function reset() {}\nconst value = ref(0)'),
      settings: { 'vue-perfectionist': { autoImport: true } },
      options: { groups: ['ref', 'function'] },
      errors: ['unsafeReorder'],
      output: null,
    },
    {
      description: 'disables macros in composable bodies',
      code: body(
        'function reset() {}\nconst props = withDefaults(defineProps(), {})',
      ),
      options: { groups: ['variable', 'function'] },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: { group: 'variable', name: 'props', before: 'reset' },
        },
      ],
      output: null,
    },
    {
      description: 'classifies destructuring once and matches any binding',
      code: body('function reset() {}\nconst { first, target } = getState()'),
      options: {
        groups: ['selected', 'function'],
        customGroups: [
          {
            groupName: 'selected',
            elementNamePattern: '^target$',
            modifiers: ['const', 'destructured'],
          },
        ],
      },
      errors: [
        {
          messageId: 'unsafeReorder',
          data: { name: 'first', before: 'reset', group: 'selected' },
        },
      ],
      output: null,
    },
    {
      description: 'keeps imported classification local to each SFC script',
      filename: 'Test.vue',
      code: '<script lang="ts">import { ref } from "vue"</script>\n<script setup lang="ts">function useCounter(ref) {\n  function reset() {}\n  const value = ref(0)\n}\nfunction useOther() {\n  function reset() {}\n  const value = ref(0)\n}</script>',
      options: { groups: ['ref', 'function'] },
      errors: ['unsafeReorder'],
      output: null,
    },
  ],
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
      expect(result.fixed).toBe(false)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
})
