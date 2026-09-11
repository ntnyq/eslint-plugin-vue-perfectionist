import { runInNewContext } from 'node:vm'
import * as tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import * as vueParser from 'vue-eslint-parser'
import { compileScript, parse } from 'vue/compiler-sfc'
import plugin, { configs } from '../../src'

const linter = new Linter()
const ruleName = 'vue-perfectionist/sort-script-setup'

function setup(body: string): string {
  return `<script setup lang="ts">\n${body}\n</script>`
}

function config(
  options: unknown = {},
  settings: Record<string, unknown> = {},
): Linter.Config {
  return {
    files: ['**/*.vue', '**/*.ts'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'vue-perfectionist': plugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    settings,
    rules: {
      [ruleName]: ['error', options],
    },
  }
}

function lint(
  body: string,
  options: unknown = {},
  settings: Record<string, unknown> = {},
) {
  const messages = linter.verify(
    setup(body),
    config(options, settings),
    'Test.vue',
  )
  expect(messages.filter(message => message.fatal)).toEqual([])
  return messages
}

function fix(
  body: string,
  options: unknown = {},
  settings: Record<string, unknown> = {},
) {
  const code = setup(body)
  const configuration = config(options, settings)
  const result = linter.verifyAndFix(code, configuration, 'Test.vue')
  expect(result.messages.filter(message => message.fatal)).toEqual([])
  expect(
    linter.verifyAndFix(result.output, configuration, 'Test.vue').output,
  ).toBe(result.output)
  return result
}

describe('plugin contract', () => {
  it('registers the rule and self-contained presets', () => {
    expect(plugin.meta.name).toBe('eslint-plugin-vue-perfectionist')
    expect(plugin.configs.recommended).toBe(configs.recommended)
    expect(configs.recommended.plugins?.['vue-perfectionist']).toBe(plugin)
  })

  it('ignores ordinary script and plain TypeScript', () => {
    expect(
      linter.verify(
        '<script lang="ts">const z = 1\nconst a = 2</script>',
        config({ type: 'natural' }),
        'Test.vue',
      ),
    ).toEqual([])
    expect(
      linter.verify(
        'const z = 1\nconst a = 2',
        config({ type: 'natural' }),
        'Test.ts',
      ),
    ).toEqual([])
  })

  it('does not cross the two script blocks', () => {
    const code = `<script lang="ts">const z = 1\nconst a = 2</script>\n${setup(
      'const y = 1\nconst b = 2',
    )}`
    const result = linter.verifyAndFix(
      code,
      config({ type: 'natural' }),
      'Test.vue',
    )
    expect(result.output).toBe(
      `<script lang="ts">const z = 1\nconst a = 2</script>\n${setup(
        'const b = 2\nconst y = 1',
      )}`,
    )
  })

  it('supports JavaScript setup without a TypeScript parser', () => {
    const configuration: Linter.Config = {
      ...config({ type: 'natural' }),
      languageOptions: { parser: vueParser },
    }
    const result = linter.verifyAndFix(
      '<script setup>\nconst z = 1\nconst a = 2\n</script>',
      configuration,
      'Test.vue',
    )
    expect(result.output).toContain('const a = 2\nconst z = 1')
    expect(result.messages).toEqual([])
  })
})

describe('classification and grouping', () => {
  it('preserves intra-group order by default', () => {
    expect(lint('const z = 1\nconst a = 2')).toEqual([])
  })

  it('enforces grouping with unsorted', () => {
    const result = fix('function run() {}\ninterface Props {}')
    expect(result.output).toBe(setup('interface Props {}\nfunction run() {}'))
    expect(result.messages).toEqual([])
  })

  it('recognizes macro declarations and withDefaults without moving them', () => {
    const messages = lint(
      'const emit = defineEmits(["update"])\nconst { title } = withDefaults(defineProps<{ title?: string }>(), { title: "" })',
    )
    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain('define-props')
    expect(messages[0]?.fix).toBeUndefined()
  })

  it('recognizes imported aliases and namespace members', () => {
    const body =
      'import { ref as makeRef } from "vue"\nimport * as Vue from "vue"\nconst z = Vue.computed(() => 1)\nconst a = makeRef(0)'
    expect(lint(body)[0]?.message).toContain('(ref / reactive)')
    expect(fix(body).output).toBe(setup(body))
  })

  it('does not mistake a local ref for Vue ref', () => {
    expect(
      lint(
        'import { ref } from "./helper"\nconst a = ref(0)\nfunction run() {}',
      ),
    ).toEqual([])
  })

  it('does not override a local binding with vueGlobals', () => {
    const body = 'const z = 1\nconst ref = () => 0\nconst a = ref()'
    expect(
      lint(body, {
        groups: ['constant', 'function', 'variable', 'ref'],
        vueGlobals: ['ref'],
      }),
    ).toEqual([])
  })

  it('recognizes explicit Vue globals', () => {
    expect(
      lint('const z = computed(() => 1)\nconst a = ref(0)', {
        vueGlobals: ['ref', 'computed'],
      })[0]?.messageId,
    ).toBe('unsafeReorder')
  })

  it('supports additional exact Vue import sources', () => {
    expect(
      lint(
        'import { ref, computed } from "@vue/reactivity"\nconst z = computed(() => 1)\nconst a = ref(0)',
        { vueImportSources: ['@vue/reactivity'] },
      )[0]?.message,
    ).toContain('ref / reactive')
  })

  it('groups reactive declarations in one bucket', () => {
    expect(
      lint(
        'import { ref, reactive } from "vue"\nconst z = reactive({})\nconst a = ref(0)',
      ),
    ).toEqual([])
    expect(
      lint(
        'import { ref, reactive } from "vue"\nconst z = reactive({})\nconst a = ref(0)',
        { type: 'natural' },
      ),
    ).toHaveLength(1)
  })

  it('matches modifier groups before plain selectors', () => {
    expect(
      lint('async function run() {}\nfunction stop() {}', {
        groups: ['function', 'async-function'],
      })[0]?.message,
    ).toContain('stop')
  })

  it('does not infer ref(null) to be a template-ref', () => {
    expect(
      lint(
        'import { ref, useTemplateRef } from "vue"\nconst el = ref(null)\nconst input = useTemplateRef("input")',
      )[0]?.message,
    ).toContain('template-ref')
  })

  it('classifies watch handles and lifecycle registrations', () => {
    expect(
      lint(
        'import { watchEffect, onMounted } from "vue"\nonMounted(() => {})\nconst stop = watchEffect(() => {})',
      )[0]?.message,
    ).toContain('(watch)')
  })

  it('treats unconfigured statements as partition boundaries', () => {
    expect(
      lint('const z = 1\ndoSomething()\nconst a = 2', { type: 'natural' }),
    ).toEqual([])
  })

  it('allows an explicit unknown group', () => {
    expect(
      lint('doSomething()\nconst a = 2', { groups: ['constant', 'unknown'] })[0]
        ?.messageId,
    ).toBe('unsafeReorder')
  })

  it('allows an empty groups configuration', () => {
    expect(
      lint('function z() {}\nconst a = 2', { groups: [], newlinesBetween: 2 }),
    ).toEqual([])
  })
})

describe('sorting options', () => {
  it.each([
    ['natural', 'const item2 = 0\nconst item10 = 0'],
    ['alphabetical', 'const item10 = 0\nconst item2 = 0'],
  ])('supports %s sorting', (type, output) => {
    expect(fix('const item10 = 0\nconst item2 = 0', { type }).output).toBe(
      setup(output),
    )
  })

  it('applies descending order only inside groups', () => {
    expect(
      fix(
        'function alpha() {}\nfunction zebra() {}\nconst b = 2\nconst a = 1',
        { type: 'natural', order: 'desc' },
      ).output,
    ).toBe(
      setup(
        'const b = 2\nconst a = 1\nfunction zebra() {}\nfunction alpha() {}',
      ),
    )
  })

  it('uses source length and a fallback for equal lengths', () => {
    expect(
      fix('const zz = 0\nconst bb = 0\nconst a = 0', {
        type: 'line-length',
        fallbackSort: { type: 'natural' },
      }).output,
    ).toBe(setup('const a = 0\nconst bb = 0\nconst zz = 0'))
  })

  it('supports custom alphabets', () => {
    expect(
      fix('const a = 0\nconst b = 0', { type: 'custom', alphabet: 'ba' })
        .output,
    ).toBe(setup('const b = 0\nconst a = 0'))
  })

  it('retains ties and disables fallback for unsorted', () => {
    expect(
      lint('const a = 0\nconst A = 1', {
        type: 'alphabetical',
        ignoreCase: true,
      }),
    ).toEqual([])
    expect(
      lint('const z = 0\nconst a = 1', { fallbackSort: { type: 'natural' } }),
    ).toEqual([])
  })

  it('supports subgroup order as a fallback', () => {
    const body = 'type T = {}\ninterface I {}'
    expect(
      fix(body, {
        groups: [['interface', 'type']],
        type: 'custom',
        alphabet: 'x',
        fallbackSort: { type: 'subgroup-order' },
      }).output,
    ).toBe(setup('interface I {}\ntype T = {}'))
  })

  it('normalizes special characters for comparison', () => {
    expect(
      lint('const _a = 0\nconst a = 1', {
        type: 'natural',
        specialCharacters: 'trim',
      }),
    ).toEqual([])
    expect(
      lint('const a_b = 0\nconst ab = 1', {
        type: 'natural',
        specialCharacters: 'remove',
      }),
    ).toEqual([])
  })

  it('supports locale arrays', () => {
    expect(
      fix('const z = 0\nconst a = 0', {
        type: 'alphabetical',
        locales: ['en-US'],
      }).messages,
    ).toEqual([])
  })
})

describe('custom groups and shared settings', () => {
  it('matches import sources and original imported function names', () => {
    const body =
      'import { useRouter as router } from "vue-router"\nimport { ref } from "vue"\nconst count = ref(0)\nconst route = router()'
    expect(
      lint(body, {
        groups: ['router', 'ref'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
            importSourcePattern: '^vue-router$',
          },
        ],
      })[0]?.message,
    ).toContain('(router)')
  })

  it('uses the first matching custom group and anyOf', () => {
    expect(
      fix('function run() {}\nfunction handleClick() {}', {
        groups: ['handlers', 'others'],
        customGroups: [
          {
            groupName: 'handlers',
            anyOf: [
              { selector: 'function', elementNamePattern: '^handle' },
              { elementNamePattern: '^on' },
            ],
          },
          { groupName: 'others', selector: 'function' },
        ],
      }).output,
    ).toBe(setup('function handleClick() {}\nfunction run() {}'))
  })

  it('lets custom overrides win over a standalone group override', () => {
    expect(
      fix('function a() {}\nfunction z() {}', {
        groups: [{ group: 'functions', type: 'natural', order: 'asc' }],
        customGroups: [
          { groupName: 'functions', selector: 'function', order: 'desc' },
        ],
      }).output,
    ).toBe(setup('function z() {}\nfunction a() {}'))
  })

  it('does not use subgroup-specific overrides in a merged bucket', () => {
    expect(
      lint('function z() {}\nfunction a() {}', {
        groups: [['functions', 'constant']],
        customGroups: [
          { groupName: 'functions', selector: 'function', type: 'natural' },
        ],
      }),
    ).toEqual([])
  })

  it('applies upstream, plugin, and rule preferences in order', () => {
    const body = 'const z = 0\nconst a = 1'
    expect(
      fix(
        body,
        {},
        { perfectionist: { type: 'natural', tsconfig: { rootDir: '.' } } },
      ).output,
    ).toBe(setup('const a = 1\nconst z = 0'))
    expect(
      lint(
        body,
        {},
        {
          perfectionist: { type: 'natural' },
          'vue-perfectionist': { type: 'unsorted' },
        },
      ),
    ).toEqual([])
    expect(
      lint(
        body,
        { type: 'unsorted' },
        { 'vue-perfectionist': { type: 'natural' } },
      ),
    ).toEqual([])
  })

  it('replaces fallbackSort between configuration layers', () => {
    expect(
      fix(
        'const aa = 0\nconst zz = 0',
        {
          type: 'line-length',
          order: 'desc',
          fallbackSort: { type: 'natural' },
        },
        { perfectionist: { fallbackSort: { type: 'natural', order: 'asc' } } },
      ).output,
    ).toBe(setup('const zz = 0\nconst aa = 0'))
  })

  it('handles global regex flags deterministically', () => {
    const body = 'function z() {}\nfunction a() {}'
    expect(
      fix(body, {
        groups: ['functions'],
        customGroups: [
          {
            groupName: 'functions',
            elementNamePattern: { pattern: '.*', flags: 'g' },
            type: 'natural',
          },
        ],
      }).output,
    ).toBe(setup('function a() {}\nfunction z() {}'))
  })
})

describe('partitions, comments and whitespace', () => {
  it.each([
    'const z = 0\n\nconst a = 0',
    'const z = 0\n// section\nconst a = 0',
    'const z = 0\nif (true) {}\nconst a = 0',
    'const z = 0\nawait run()\nconst a = 0',
    'const z = 0\nconst data = await run()\nconst a = 0',
    'const z = 0\nconst x = 1, y = 2\nconst a = 0',
    'const z = 0\nimport "side-effects"\nconst a = 0',
  ])('respects explicit and structural partitions: %s', body => {
    expect(
      lint(body, {
        type: 'natural',
        partitionByNewLine: true,
        partitionByComment: true,
      }),
    ).toEqual([])
  })

  it('moves documentation and trailing comments with declarations', () => {
    expect(
      fix('/** Z */\nconst z = 0 // last\n/** A */\nconst a = 0 // first', {
        type: 'natural',
      }).output,
    ).toBe(
      setup('/** A */\nconst a = 0 // first\n/** Z */\nconst z = 0 // last'),
    )
  })

  it('keeps region markers fixed while sorting their following region', () => {
    expect(
      fix('const z = 0\n// #region next\nconst c = 0\nconst b = 0', {
        type: 'natural',
        partitionByComment: { line: '^\\s*#region', block: false },
      }).output,
    ).toBe(setup('const z = 0\n// #region next\nconst b = 0\nconst c = 0'))
  })

  it.each([
    '// eslint-disable-next-line no-unused-vars\nconst z = 0\nconst a = 0',
    '// @ts-expect-error intentional\nconst z = 0\nconst a = 0',
    '// eslint-disable no-unused-vars\nconst z = 0\nconst a = 0\n// eslint-enable no-unused-vars',
  ])('does not move protected statements: %s', body => {
    expect(fix(body, { type: 'natural' }).output).toBe(setup(body))
  })

  it('formats inside and between groups independently', () => {
    expect(
      fix('const a = 0\n\nconst b = 0\nfunction run() {}', {
        newlinesBetween: 1,
        newlinesInside: 0,
      }).output,
    ).toBe(setup('const a = 0\nconst b = 0\n\nfunction run() {}'))
  })

  it('resolves newline separators across absent groups', () => {
    expect(
      fix('const a = 0\nfunction run() {}', {
        newlinesBetween: 0,
        groups: ['constant', { newlinesBetween: 2 }, 'variable', 'function'],
      }).output,
    ).toBe(setup('const a = 0\n\n\nfunction run() {}'))
  })

  it('supports the legacy newlinesInside compatibility value', () => {
    expect(
      fix('const a = 0\n\nconst b = 0', {
        newlinesBetween: 1,
        newlinesInside: 'newlinesBetween',
      }).output,
    ).toBe(setup('const a = 0\nconst b = 0'))
  })

  it('preserves CRLF when changing whitespace', () => {
    const code =
      '<script setup>\r\nconst a = 0\r\nfunction run() {}\r\n</script>'
    expect(
      linter.verifyAndFix(code, config({ newlinesBetween: 1 }), 'Test.vue')
        .output,
    ).toBe(
      '<script setup>\r\nconst a = 0\r\n\r\nfunction run() {}\r\n</script>',
    )
  })
})

describe('dependencies and safe fixes', () => {
  it('prioritizes initialization dependencies over group order', () => {
    expect(
      lint(
        'import { ref } from "vue"\nconst count = ref(0)\nconst snapshot = count.value',
        { groups: ['variable', 'ref'] },
      ),
    ).toEqual([])
  })

  it('keeps initialization dependencies in descending order', () => {
    expect(
      lint('const a = {}\nconst z = a', { type: 'natural', order: 'desc' }),
    ).toEqual([])
  })

  it('does not treat a deferred capture as an immediate read', () => {
    expect(
      lint(
        'import { ref, computed } from "vue"\nconst z = computed(() => a.value)\nconst a = ref(0)',
        { groups: ['computed', 'ref'] },
      ),
    ).toEqual([])
  })

  it('tracks reads through immediately invoked local functions', () => {
    const body =
      'const dependency = {}\nconst first = read()\nfunction read() { return dependency }'
    expect(
      lint(body, { groups: ['variable', 'function'], type: 'natural' }),
    ).toEqual([])
  })

  it('tracks reads through an IIFE', () => {
    expect(
      lint('const z = {}\nconst a = (() => z)()', { type: 'natural' }),
    ).toEqual([])
  })

  it('retains cycles without an automatic fix', () => {
    const body = 'const z = a\nconst a = z'
    expect(fix(body, { type: 'natural' }).output).toBe(setup(body))
  })

  it.each([
    'import { ref } from "vue"\nconst z = ref(0)\nconst a = ref(0)',
    'import { useZ, useA } from "./composables"\nconst z = useZ()\nconst a = useA()',
    'const z = state.value\nconst a = state.other',
    'const { z } = getState()\nconst { a } = getState()',
    'class Z {}\nclass A {}',
    'enum Z { Value }\nenum A { Value }',
  ])('never automatically moves runtime-sensitive statements: %s', body => {
    const result = fix(body, { type: 'natural' })
    expect(result.output).toBe(setup(body))
    expect(result.messages[0]?.messageId).toBe('unsafeReorder')
  })

  it('fixes safe islands without moving surrounding calls', () => {
    const body =
      'const z = 0\nconst a = 0\nimportedCall()\nconst y = 0\nconst b = 0'
    expect(fix(body, { type: 'natural' }).output).toBe(
      setup(
        'const a = 0\nconst z = 0\nimportedCall()\nconst b = 0\nconst y = 0',
      ),
    )
  })

  it('does not reorder interface merging or function overloads', () => {
    const body =
      'interface Z { value: string }\ninterface Z { other: number }\ninterface A {}\nfunction f(x: string): string\nfunction f(x: number): number\nfunction f(x: unknown) { return x }'
    expect(fix(body, { type: 'natural' }).output).toBe(setup(body))
  })

  it('turns off all fixes without changing safe diagnostics', () => {
    const result = fix('const z = 0\n\nconst a = 0', {
      type: 'natural',
      newlinesInside: 0,
      fix: 'none',
    })
    expect(result.output).toBe(setup('const z = 0\n\nconst a = 0'))
    expect(result.messages[0]?.messageId).toBe('unexpectedOrder')
    expect(result.messages[0]?.fix).toBeUndefined()
  })

  it('produces code accepted by the Vue compiler', () => {
    const output = fix(
      'function zebra() { return 2 }\nfunction alpha() { return 1 }\ninterface Props { title: string }\nconst z = 2\nconst a = 1',
      { type: 'natural' },
    ).output
    const parsed = parse(output)
    expect(parsed.errors).toEqual([])
    expect(() => compileScript(parsed.descriptor, { id: 'test' })).not.toThrow()
  })
})

describe('integration regressions', () => {
  it('tracks runtime sources for default imported composables', () => {
    expect(
      lint(
        'import useStore from "./store"\nconst a = 1\nconst store = useStore()',
        {
          groups: ['store', 'constant'],
          customGroups: [
            {
              groupName: 'store',
              callNamePattern: '^useStore$',
              importSourcePattern: '^./store$',
            },
          ],
        },
      )[0]?.message,
    ).toContain('(store)')
  })

  it('does not recognize type-only imports as runtime APIs', () => {
    expect(
      lint('import type { ref } from "vue"\nconst a = ref(0)\nconst b = 1', {
        groups: ['variable', 'constant', 'ref'],
      }),
    ).toEqual([])
    expect(
      lint('import { type ref } from "vue"\nconst a = ref(0)\nconst b = 1', {
        groups: ['variable', 'constant', 'ref'],
      }),
    ).toEqual([])
  })

  it('applies a natural preset with existing Vue parser configuration', () => {
    const configuration = [config(), configs['recommended-natural']]
    const result = linter.verifyAndFix(
      setup('const z = 1\nconst a = 2'),
      configuration,
      'Test.vue',
    )
    expect(result.output).toBe(setup('const a = 2\nconst z = 1'))
    expect(result.messages).toEqual([])
  })

  it('lets shared preferences override the recommended default', () => {
    const configuration = [
      config({}, { perfectionist: { type: 'natural' } }),
      configs.recommended,
    ]
    expect(
      linter.verifyAndFix(
        setup('const z = 1\nconst a = 2'),
        configuration,
        'Test.vue',
      ).output,
    ).toBe(setup('const a = 2\nconst z = 1'))
  })

  it('does not match calls inside function bodies as custom initializers', () => {
    expect(
      lint('function run() { useRouter() }\nconst a = 1', {
        groups: ['function', 'constant', 'router'],
        customGroups: [{ groupName: 'router', callNamePattern: '^useRouter$' }],
      }),
    ).toEqual([])
  })

  it('does not infer sources for unresolved auto-imports', () => {
    expect(
      lint('const route = useRouter()\nconst a = 1', {
        groups: ['variable', 'constant', 'router'],
        customGroups: [
          { groupName: 'router', importSourcePattern: '^vue-router$' },
        ],
      }),
    ).toEqual([])
  })

  it('can match a secondary destructuring binding', () => {
    expect(
      lint('const a = 1\nconst { x, special } = getState()', {
        groups: ['special', 'constant'],
        customGroups: [
          { groupName: 'special', elementNamePattern: '^special$' },
        ],
      })[0]?.message,
    ).toContain('(special)')
  })

  it('recognizes calls inside TypeScript expression wrappers', () => {
    expect(
      lint(
        'import { ref, computed } from "vue"\nconst z = computed(() => 1) as unknown\nconst a = ref(0)!',
      )[0]?.message,
    ).toContain('ref / reactive')
  })

  it('does not partition the outer scope on an async function body', () => {
    expect(
      fix('async function zebra() { await run() }\nfunction alpha() {}', {
        type: 'natural',
      }).output,
    ).toBe(setup('function alpha() {}\nasync function zebra() { await run() }'))
  })

  it('does not use nested comments as top-level partitions', () => {
    expect(
      fix('function zebra() { /* section */ }\nfunction alpha() {}', {
        type: 'natural',
        partitionByComment: true,
      }).output,
    ).toBe(setup('function alpha() {}\nfunction zebra() { /* section */ }'))
  })

  it('leaves dynamic and optional Vue calls unclassified', () => {
    expect(
      lint(
        'import * as Vue from "vue"\nconst a = Vue["ref"](0)\nconst b = Vue.ref?.(0)',
        { groups: ['ref', 'variable'] },
      ),
    ).toEqual([])
  })

  it('does not move expose across await', () => {
    const body = 'const a = 1\ndefineExpose({ a })\nawait run()\nconst b = 2'
    expect(fix(body, { groups: ['constant', 'define-expose'] }).output).toBe(
      setup(body),
    )
  })

  it('preserves an ASI-sensitive boundary after a proposed movement', () => {
    const body = 'const z = 1\nfunction a() {}\n(() => {})()'
    const result = fix(body, { groups: ['function', 'constant'] })
    expect(result.output).toBe(setup(body))
    expect(result.messages[0]?.messageId).toBe('unsafeReorder')
  })

  it('does not move statements with ambiguous detached comments', () => {
    const body = '// heading\n\nconst z = 1\nconst a = 2'
    expect(fix(body, { type: 'natural' }).output).toBe(setup(body))
  })

  it('keeps unknown members stable even with a global name comparator', () => {
    expect(
      lint('zebra()\nalpha()', { type: 'natural', groups: ['unknown'] }),
    ).toEqual([])
  })

  it('allows explicit unknown-group sorting without claiming safe fixes', () => {
    expect(
      lint('zebra()\nalpha()', {
        groups: [{ group: 'unknown', type: 'natural' }],
      })[0]?.messageId,
    ).toBe('unsafeReorder')
  })

  it('accepts natural sorting with multiple locales', () => {
    expect(
      fix('const item10 = 1\nconst item2 = 2', {
        type: 'natural',
        locales: ['en-US', 'zh-CN'],
      }).output,
    ).toBe(setup('const item2 = 2\nconst item10 = 1'))
  })

  it('rejects numeric newline overrides in partitioned custom groups', () => {
    expect(() =>
      lint('function a() {}', {
        partitionByNewLine: true,
        groups: ['f'],
        customGroups: [
          { groupName: 'f', selector: 'function', newlinesInside: 0 },
        ],
      }),
    ).toThrow()
  })

  it('retains runtime results when independently initialized constants move', () => {
    const body = 'const zebra = 2\nconst alpha = 1\nrecord([zebra, alpha])'
    const output = fix(body, { type: 'natural' }).output
    const transformed = output.slice(
      output.indexOf('>') + 1,
      output.lastIndexOf('</script>'),
    )
    const before: unknown[] = []
    const after: unknown[] = []
    runInNewContext(body, { record: (value: unknown) => before.push(value) })
    runInNewContext(transformed, {
      record: (value: unknown) => after.push(value),
    })
    expect(after).toEqual(before)
  })
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
  ])('rejects invalid configuration: %j', options => {
    expect(() => lint('const a = 1', options)).toThrow()
  })

  it('validates shared fields after precedence resolution', () => {
    expect(() =>
      lint('const a = 1', {}, { perfectionist: { type: 'usage' } }),
    ).toThrow()
    expect(() =>
      lint(
        'const a = 1',
        {},
        {
          'vue-perfectionist': {
            // cSpell: disable-next-line
            tyep: 'natural',
          },
        },
      ),
    ).toThrow()
    expect(
      lint(
        'const a = 1',
        { type: 'unsorted' },
        { perfectionist: { type: 'usage' } },
      ),
    ).toEqual([])
  })
})
