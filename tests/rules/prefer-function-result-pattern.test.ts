import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { preferFunctionResultPattern } from '../../src/rules/prefer-function-result-pattern.ts'
import { run } from '../internal.ts'
import type {
  PreferFunctionResultPatternMessageId,
  PreferFunctionResultPatternOptions,
} from '../../src/types/index.ts'

const autoImport = { 'vue-perfectionist': { autoImport: true } }
const pattern = '^(is|has|should|can)[A-Z]'
const vueTarget = { source: 'vue', names: ['ref', 'shallowRef'], pattern }
const toggleTarget = {
  source: '@vueuse/core',
  names: ['useToggle'],
  pattern,
  returnIndex: 0,
  booleanOnly: true,
}
const targets: PreferFunctionResultPatternOptions['targets'] = [
  {
    source: '@vueuse/core',
    names: ['useDark', 'useOnline'],
    pattern: '^is[A-Z]',
  },
  { source: './state', names: ['useFlag'], pattern, returnIndex: 1 },
  { source: './state', names: ['createRef'], pattern, booleanOnly: true },
  { source: './default', names: ['default'], pattern },
]

function withVue(code: string): string {
  return `import { ref, shallowRef } from 'vue'\n${code}`
}

function withToggle(code: string): string {
  return `import { useToggle } from '@vueuse/core'\n${code}`
}

function withComputed(code: string): string {
  return `import { computed } from 'vue'\n${code}`
}

const errors: PreferFunctionResultPatternMessageId[] = [
  'unexpectedFunctionResultPattern',
]

await run<
  PreferFunctionResultPatternOptions,
  PreferFunctionResultPatternMessageId
>({
  name: 'prefer-function-result-pattern',
  rule: preferFunctionResultPattern,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    expect(result.fixed).toBe(false)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    if (testcase.type === 'invalid') {
      expect(result.output).toBe(testcase.code)
    }
  },
  valid: [
    ...['isReady', 'hasPermission', 'shouldRender', 'canEdit'].map(name => ({
      code: withComputed(`const ${name} = computed(() => count.value > 0)`),
    })),
    ...[
      '() => count.value',
      '() => flag.value',
      '() => checkPermission()',
      '() => 1',
      '() => "yes"',
      '() => value + 1',
      '() => ~value',
      '() => value && true',
      '() => value || false',
      '() => value ?? false',
      '() => condition ? true : undefined',
      '() => condition ? true : "yes"',
      '() => {}',
      '() => { return }',
      '() => { if (condition) return true }',
      '() => { const fn = () => true; return fn() }',
      '() => { try { return true } finally { return 0 } }',
      'async () => true',
      'async function () { return true }',
      'function* () { return true }',
      '(): boolean | undefined => true',
      '(): unknown => true',
      '(): Flag => true',
      'getter',
      'true',
      '',
      '{ get: () => flag.value, set(value) {} }',
      '{ get: async () => true, set(value) {} }',
      '{ get: () => true, ...options }',
      '{ ...options, get: () => true }',
      '{ [key]: () => true, get: () => true }',
      '{ get: () => true, get: () => 0 }',
      '{ get get() { return () => true } }',
      '{ get, set(value) {} }',
      '{ set(value) {} }',
    ].map(argument => ({
      description: `skips computed without definite boolean evidence: ${argument}`,
      code: withComputed(`const ready = computed(${argument})`),
    })),
    ...['boolean | undefined', 'boolean | string', 'unknown', 'Flag'].map(
      type => ({
        description: 'computed type arguments take precedence over its getter',
        code: withComputed(`const ready = computed<${type}>(() => true)`),
      }),
    ),
    ...[
      "import { computed } from './other'; const ready = computed(() => true)",
      "import { computed } from 'vue'; function f(computed) { const ready = computed(() => true) }",
      "import type { computed } from 'vue'; const ready = computed<boolean>(() => true)",
      "import { computed } from 'vue'; const ready = computed?.(() => true)",
    ].map(code => ({
      code,
      settings: autoImport,
    })),
    {
      code: 'const ready = computed(() => true)',
    },
    {
      description: 'explicit targets replace the default computed target',
      code: withComputed('const ready = computed(() => true)'),
      options: { targets: [vueTarget] },
    },
    {
      description: 'custom computed exports keep generic boolean filtering',
      code: "import { computed } from './state'; const ready = computed(() => true)",
      options: {
        targets: [
          {
            source: './state',
            names: ['computed'],
            pattern,
            booleanOnly: true,
          },
        ],
      },
    },
    {
      description:
        'accepts grouped custom methods and selected default bindings',
      code: `import { useDark, useOnline } from '@vueuse/core'
import makeFlag from './default'
import { useFlag } from './state'
const isDark = useDark()
const isOnline = useOnline()
const [toggle, hasAccess = false] = useFlag()
const isReady = makeFlag()`,
      options: { targets },
    },
    {
      description: 'explicit targets replace all defaults',
      code: `${withVue('const ready = ref(false)')}\n${withToggle('const [open] = useToggle()')}`,
      options: { targets },
    },
    {
      description: 'the last target overrides a group for one method',
      code: withVue(
        'const hasAccess = ref(false); const isOpen = shallowRef(false)',
      ),
      options: {
        targets: [
          { ...vueTarget, pattern: '^is[A-Z]' },
          { ...vueTarget, names: ['ref'], pattern: '^has[A-Z]' },
        ],
      },
    },
    {
      description: 'boolean filtering on an override does not fall back',
      code: withVue('const count = ref(0)'),
      options: { targets: [vueTarget, { ...vueTarget, booleanOnly: true }] },
    },
    {
      description: 'disabling auto-import on an override does not fall back',
      code: 'const state = ref(false)',
      settings: autoImport,
      options: {
        targets: [vueTarget, { ...vueTarget, autoImport: false }],
      },
    },
    ...['Ready', ''].map(pattern => ({
      description: `does not add implicit anchors to pattern ${pattern}`,
      code: withVue('const wasReadyBefore = ref(0)'),
      options: { targets: [{ ...vueTarget, pattern }] },
    })),
    ...[
      'const result = useFlag()',
      'const { value } = useFlag()',
      'const [] = useFlag()',
      'const [first] = useFlag()',
      'const [, { value }] = useFlag()',
      'const [, [value]] = useFlag()',
    ].map(code => ({
      code: `import { useFlag } from './state'; ${code}`,
      options: { targets },
    })),
    {
      description: 'ignores non-call initializers and awaited results',
      code: withVue(
        'let state; const ready = false; const pending = await ref(false)',
      ),
    },
    {
      description: 'auto-import recognition does not infer custom aliases',
      code: 'const state = makeRef(false); const dark = darkMode()',
      settings: autoImport,
      options: { targets: [vueTarget, ...targets] },
    },
    ...['isOpen', 'hasPermission', 'shouldRender', 'canEdit'].map(name => ({
      code: withVue(`const ${name} = ref(false)`),
    })),
    ...['ref', 'shallowRef'].flatMap(method =>
      [
        '0',
        "'yes'",
        '{}',
        '[]',
        'null',
        'undefined',
        'initial',
        '!value',
        'a === b',
        '',
      ].map(value => ({
        description: `skips nonliteral or nonboolean ${method}(${value})`,
        code: withVue(`const state = ${method}(${value})`),
      })),
    ),
    ...[
      'string | boolean',
      'boolean | undefined',
      'unknown',
      'any',
      'Boolean',
      'Flag',
    ].map(type => ({
      description: `does not infer boolean state from ${type}`,
      code: withVue(`const state = ref<${type}>(false)`),
    })),
    ...[
      'const [isOpen, toggle] = useToggle()',
      'const [hasAccess] = useToggle(true)',
      'const [, toggle] = useToggle(false)',
      'const [...state] = useToggle()',
      'const [{ value }] = useToggle()',
      'const toggle = useToggle(isOpen)',
      'const pair = useToggle()',
      "const [value] = useToggle('on', { truthyValue: 'on', falsyValue: 'off' })",
      'const [state] = useToggle(false, options)',
      'const [state] = useToggle(initial)',
      'const [state] = useToggle(...args)',
      'const [state] = useToggle<boolean, boolean>(false)',
    ].map(code => ({
      code: withToggle(code),
    })),
    ...[
      "import { ref } from 'other'; const state = ref(false)",
      "import { useToggle } from 'vue'; const [state] = useToggle()",
      "import ref from 'vue'; const state = ref(false)",
      "import useToggle from '@vueuse/core'; const [state] = useToggle()",
      "import * as Vue from 'vue'; const state = Vue['ref'](false)",
      "import * as Vue from 'vue'; const state = Vue?.ref(false)",
      "import { ref } from 'vue'; const state = ref?.(false)",
      "import * as Vue from 'vue'; function f(Vue) { const state = Vue.ref(false) }",
      "import { ref } from 'vue'; function f(ref) { const state = ref(false) }",
      "import type { ref } from 'vue'; const state = ref(false)",
      "import { type ref } from 'vue'; const state = ref(false)",
      "import type * as Vue from 'vue'; const state = Vue.ref(false)",
      "import type ref from 'vue'; const state = ref(false)",
      'function f(ref) { const state = ref(false) }',
      'const ref = factory; const state = ref(false)',
      'function useToggle() {} const [state] = useToggle()',
      "import { ref } from 'vue'; const other = ref; const state = other(false)",
      "import { ref } from 'vue'; const { value } = ref(false)",
      "import { ref } from 'vue'; let state; state = ref(false)",
    ].map(code => ({
      code,
      settings: autoImport,
    })),
    { code: 'const state = ref(false); const [open] = useToggle()' },
    {
      code: 'const state = ref(false)',
      languageOptions: { globals: { ref: 'readonly' } },
    },
    {
      code: 'const state = ref(false); const [open] = useToggle()',
      settings: autoImport,
      options: { targets: [] },
    },
    {
      code: withVue('const wasReady = ref(true)'),
      options: { targets: [{ ...vueTarget, pattern: '^was[A-Z]' }] },
    },
    {
      description: 'accepts escaped regular expression metacharacters',
      code: withVue('const $Ready = ref(true)'),
      options: { targets: [{ ...vueTarget, pattern: '^\\$[A-Z]' }] },
    },
    {
      code: "import { useDark } from '@vueuse/core'; const dark = useDark()",
      options: { targets: [] },
    },
    {
      code: "import { useDark } from 'other'; const dark = useDark()",
      options: { targets },
    },
    {
      code: "import { createRef } from './state'; const count = createRef(0)",
      options: { targets },
    },
    {
      description: 'a target can disable shared auto-import recognition',
      code: 'const dark = useDark()',
      settings: autoImport,
      options: {
        targets: targets.map(target => ({
          ...target,
          autoImport: false,
        })),
      },
    },
    {
      code: 'function f(useDark) { const dark = useDark() }',
      options: {
        targets: targets.map(target => ({
          ...target,
          autoImport: true,
        })),
      },
    },
    {
      code: "import { useFlag } from './state'; const [toggle, isReady = false] = useFlag()",
      options: { targets },
    },
    {
      code: "import { useFlag } from './state'; const [toggle, ...rest] = useFlag()",
      options: { targets },
    },
    {
      code: "import * as Vue from 'vue'; const state = Vue.ref?.(false)",
    },
    {
      filename: 'Test.vue',
      code: '<template><div>{{ ref(false) }}</div></template>',
      settings: autoImport,
    },
  ],
  invalid: [
    ...[
      '() => true',
      '() => false',
      '() => !value',
      '() => !!value',
      '() => (false as const)',
      '() => (false satisfies boolean)',
      '() => !a && !b',
      '() => !a || !b',
      '() => true ?? false',
      '() => condition ? true : !value',
      '() => { return count.value > 0 }',
      'function () { return false }',
      '(): boolean => flag.value',
      '(): true | false => checkPermission()',
      'function (): boolean { return flag.value }',
      '{ get: () => true, set(value) {} }',
      '{ get() { return !value }, set(value) {} }',
      '{ get(): boolean { return flag.value }, set(value) {} }',
      '{ "get": () => true, set(value) {} }',
      '((() => true) as () => boolean)',
    ].map(argument => ({
      description: `checks computed boolean getter: ${argument}`,
      code: withComputed(`const ready = computed(${argument})`),
      errors,
      output: null,
    })),
    ...['==', '!=', '===', '!==', '<', '<=', '>', '>=', 'in', 'instanceof'].map(
      operator => ({
        code: withComputed(
          `const ready = computed(() => left ${operator} right)`,
        ),
        errors,
        output: null,
      }),
    ),
    ...['boolean', 'true', 'false', 'true | false'].map(type => ({
      code: withComputed(`const ready = computed<${type}>(() => flag.value)`),
      errors,
      output: null,
    })),
    ...[
      "import { computed as derive } from 'vue'; const ready = derive(() => true)",
      "import * as Vue from 'vue'; const ready = Vue.computed(() => true)",
    ].map(code => ({
      code,
      errors,
      output: null,
    })),
    {
      code: 'const ready = computed(() => true)',
      settings: autoImport,
      errors,
      output: null,
    },
    {
      description: 'computed targets can disable boolean filtering',
      code: withComputed('const count = computed(() => 1)'),
      options: { targets: [{ source: 'vue', names: ['computed'], pattern }] },
      errors,
      output: null,
    },
    {
      description: 'computed targets support custom patterns',
      code: withComputed('const isReady = computed(() => true)'),
      options: {
        targets: [
          {
            source: 'vue',
            names: ['computed'],
            pattern: '^has[A-Z]',
            booleanOnly: true,
          },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedFunctionResultPattern',
          data: { name: 'isReady', pattern: '^has[A-Z]' },
        },
      ],
      output: null,
    },
    ...['', ' lang="ts"'].flatMap(language =>
      ['script', 'script setup'].map(tag => ({
        filename: 'Test.vue',
        code: `<${tag}${language}>${withComputed('const ready = computed(() => true)')}</script>`,
        languageOptions: {
          parserOptions: { parser: language ? tsParser : null },
        },
        errors,
        output: null,
      })),
    ),
    {
      filename: 'test.js',
      code: withComputed('const ready = computed(() => true)'),
      errors,
      output: null,
    },
    {
      description:
        'reports grouped custom methods and selected default bindings',
      code: `import { useDark, useOnline } from '@vueuse/core'
import makeFlag from './default'
import { useFlag } from './state'
const dark = useDark()
const online = useOnline()
const [toggle, access = false] = useFlag()
const ready = makeFlag()`,
      options: { targets },
      errors: [...errors, ...errors, ...errors, ...errors],
      output: null,
    },
    {
      description: 'uses separate patterns for methods within an earlier group',
      code: withVue(
        'const isReady = ref(false); const hasAccess = shallowRef(false)',
      ),
      options: {
        targets: [
          { ...vueTarget, pattern: '^is[A-Z]' },
          { ...vueTarget, names: ['ref'], pattern: '^has[A-Z]' },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedFunctionResultPattern',
          data: { name: 'isReady', pattern: '^has[A-Z]' },
        },
        {
          messageId: 'unexpectedFunctionResultPattern',
          data: { name: 'hasAccess', pattern: '^is[A-Z]' },
        },
      ],
      output: null,
    },
    {
      description: 'checks all results unless booleanOnly is enabled',
      code: withVue('const count = ref(0); const name = shallowRef("name")'),
      options: { targets: [vueTarget] },
      errors: [...errors, ...errors],
      output: null,
    },
    {
      description: 'turning off boolean filtering overrides an earlier filter',
      code: withToggle(
        'const [value] = useToggle("on", { truthyValue: "on", falsyValue: "off" })',
      ),
      options: {
        targets: [toggleTarget, { ...toggleTarget, booleanOnly: false }],
      },
      errors,
      output: null,
    },
    {
      description: 'only the target with autoImport enabled recognizes globals',
      code: 'const state = ref(false); const dark = useDark(); const online = useOnline()',
      settings: autoImport,
      options: { targets: [{ ...vueTarget, autoImport: false }, ...targets] },
      errors: [...errors, ...errors],
      output: null,
    },
    {
      description: 'explicit imports still match when auto-import is disabled',
      code: withVue('const state = ref(false)'),
      options: { targets: [{ ...vueTarget, autoImport: false }] },
      errors,
      output: null,
    },
    {
      description: 'matches exact modules before applying target precedence',
      code: withVue('const state = ref(false)'),
      options: {
        targets: [vueTarget, { ...vueTarget, source: 'other', pattern: '.*' }],
      },
      errors,
      output: null,
    },
    {
      description:
        'auto-imported names use the last target when sources are ambiguous',
      code: 'const isReady = ref(false)',
      settings: autoImport,
      options: {
        targets: [
          vueTarget,
          { ...vueTarget, source: 'other', pattern: '^has' },
        ],
      },
      errors: [
        {
          messageId: 'unexpectedFunctionResultPattern',
          data: { name: 'isReady', pattern: '^has' },
        },
      ],
      output: null,
    },
    ...['true', 'false', '<boolean>()', '<true | false>()'].map(value => ({
      description: `uses static boolean evidence for custom functions: ${value}`,
      code: `import { createRef } from './state'; const state = createRef${value.startsWith('<') ? value : `(${value})`}`,
      options: { targets },
      errors,
      output: null,
    })),
    {
      description: 'a custom useToggle export uses generic boolean filtering',
      code: "import { useToggle } from './state'; const state = useToggle<boolean>()",
      options: {
        targets: [
          {
            source: './state',
            names: ['useToggle'],
            pattern,
            booleanOnly: true,
          },
        ],
      },
      errors,
      output: null,
    },
    {
      description: 'default imports match the original default export name',
      code: "import ref from 'vue'; const state = ref(false)",
      options: { targets: [{ ...vueTarget, names: ['default'] }] },
      errors,
      output: null,
    },
    ...['ref', 'shallowRef'].flatMap(method =>
      [
        'true',
        'false',
        '(false)',
        'false as const',
        'false satisfies boolean',
      ].map(value => ({
        code: withVue(`const loading = ${method}(${value})`),
        errors,
        output: null,
      })),
    ),
    ...['boolean', 'true', 'false', 'true | false'].map(type => ({
      code: withVue(`const loading = ref<${type}>()`),
      errors,
      output: null,
    })),
    ...[
      'is',
      'has',
      'should',
      'can',
      'island',
      'hashtag',
      'is_open',
      'IsOpen',
      '_isOpen',
    ].map(name => ({
      code: withVue(`const ${name} = ref(false)`),
      errors,
      output: null,
    })),
    {
      code: withVue('const loading = ref(false)'),
      errors: [
        {
          messageId: 'unexpectedFunctionResultPattern',
          data: { name: 'loading', pattern },
          line: 2,
          column: 7,
          endLine: 2,
          endColumn: 14,
        },
      ],
      output: null,
    },
    ...[
      "import { ref as makeRef } from 'vue'; const ready = makeRef(false)",
      "import * as Vue from 'vue'; const ready = Vue.shallowRef<boolean>()",
      "import { ref } from 'vue'; const ready = (ref(false) as unknown)",
      "import { ref } from 'vue'; const ready = (ref!)(false)",
      "import { useToggle as toggle } from '@vueuse/core'; const [ready] = toggle()",
      "import * as VueUse from '@vueuse/core'; const [ready] = VueUse.useToggle(false)",
    ].map(code => ({
      code,
      errors,
      output: null,
    })),
    ...[
      'const [open, toggle] = useToggle()',
      'const [open = false, toggle] = useToggle(false)',
      'const [open] = useToggle(true)',
    ].map(code => ({
      code: withToggle(code),
      errors,
      output: null,
    })),
    {
      code: withVue('const isReady = ref(false)'),
      options: { targets: [{ ...vueTarget, pattern: '^was[A-Z]' }] },
      errors,
      output: null,
    },
    ...[
      "import { useDark as dark } from '@vueuse/core'; const state = dark()",
      "import { useFlag } from './state'; const [toggle, state] = useFlag()",
      "import { createRef } from './state'; const state = createRef<boolean>()",
      "import makeFlag from './default'; const state = makeFlag()",
    ].map(code => ({
      code,
      options: { targets },
      errors,
      output: null,
    })),
    {
      description: 'reports only the last matching target for a binding',
      code: withVue('const state = ref(false)'),
      options: {
        targets: [vueTarget, { ...vueTarget, names: ['ref'], pattern: '^has' }],
      },
      errors,
      output: null,
    },
    {
      description: 'checks separate tuple positions independently',
      code: withToggle('const [state, action] = useToggle()'),
      options: {
        targets: [
          toggleTarget,
          {
            ...toggleTarget,
            returnIndex: 1,
            pattern: '^toggle',
            booleanOnly: false,
          },
        ],
      },
      errors: [...errors, ...errors],
      output: null,
    },
    {
      code: "import { useFlag } from './state'; const [toggle, ready = false] = useFlag()",
      options: { targets },
      errors,
      output: null,
    },
    {
      code: 'const dark = useDark()',
      options: {
        targets: targets.map(target => ({
          ...target,
          autoImport: true,
        })),
      },
      errors,
      output: null,
    },
    ...[
      {},
      {
        ref: 'readonly',
        shallowRef: 'readonly',
        useToggle: 'readonly',
      } as const,
    ].map(globals => ({
      code: 'const loading = ref(false); const ready = shallowRef<boolean>(); const [open] = useToggle()',
      settings: autoImport,
      languageOptions: { globals },
      errors: [...errors, ...errors, ...errors],
      output: null,
    })),
    {
      code: 'const loading = ref(false)',
      settings: { 'vue-perfectionist': { autoImport: false } },
      options: { targets: [{ ...vueTarget, autoImport: true }] },
      errors,
      output: null,
    },
    ...['js', 'ts'].map(extension => ({
      filename: `test.${extension}`,
      code: withVue('const ready = ref(false)'),
      errors,
      output: null,
    })),
    ...['', ' lang="ts"'].flatMap(language =>
      ['script', 'script setup'].map(tag => ({
        filename: 'Test.vue',
        code: `<${tag}${language}>${withVue('const ready = ref(false)')}</script>`,
        languageOptions: {
          parserOptions: { parser: language ? tsParser : null },
        },
        errors,
        output: null,
      })),
    ),
    {
      filename: 'Test.vue',
      code: `<script lang="ts">${withVue('export const ready = ref(false)')}</script>
<script setup lang="ts">const open = shallowRef<boolean>()</script>`,
      errors: [...errors, ...errors],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-function-result-pattern',
  rule: preferFunctionResultPattern,
  languageOptions: { parser: tsParser },
})

describe('prefer-function-result-pattern configuration', () => {
  it.each([
    { unknown: true },
    { prefixes: ['is'] },
    { globals: ['ref'] },
    { customFunctions: [] },
    { targets: null },
    { targets: {} },
    { targets: [null] },
    { targets: [{}] },
    ...[
      { source: '' },
      { source: 1 },
      { source: undefined },
      { names: undefined },
      { names: [] },
      { names: [''] },
      { names: ['ref', 'ref'] },
      { names: 'ref' },
      { names: [1] },
      { pattern: undefined },
      { pattern: 1 },
      { pattern: '[' },
      { returnIndex: -1 },
      { returnIndex: 0.5 },
      { returnIndex: '0' },
      { booleanOnly: 'yes' },
      { autoImport: 'yes' },
      { extra: true },
    ].map(override => ({
      targets: [{ ...vueTarget, ...override }],
    })),
  ])('rejects invalid options: %j', async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  })
})
