import * as tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

const config: Linter.Config = {
  files: ['**/*.vue'],
  languageOptions: vueLanguageOptions,
  plugins: { vp: plugin },
  rules: {
    'vp/callback-style': 'error',
    'vp/max-lines-per-callback': ['error', { max: 3 }],
    'vp/prefer-function-result-pattern': 'error',
    'vp/prefer-ref-pattern': 'error',
    'vp/consistent-template-ref-name': 'error',
  },
}
const variants = ['', ' lang="ts"'].flatMap(language =>
  [false, true].flatMap(setupFirst =>
    [false, true].map(namespace => ({
      language,
      setupFirst,
      namespace,
    })),
  ),
)

const scriptContexts = [
  {
    name: 'standalone TypeScript',
    filename: 'Test.ts',
    languageOptions: { parser: tsParser },
    open: '',
    close: '',
  },
  {
    name: 'ordinary script',
    filename: 'Test.vue',
    languageOptions: vueLanguageOptions,
    open: '<script lang="ts">\n',
    close: '\n</script>',
  },
  {
    name: 'setup script',
    filename: 'Test.vue',
    languageOptions: vueLanguageOptions,
    open: '<script setup lang="ts">\n',
    close: '\n</script>',
  },
]

it.each(
  scriptContexts.flatMap(context =>
    ['type', 'interface'].flatMap(declarationKind =>
      [false, true].map(typesFirst => ({
        ...context,
        declarationKind,
        typesFirst,
      })),
    ),
  ),
)(
  'resolves runtime imports alongside $declarationKind declarations ($name, types first: $typesFirst)',
  ({ filename, languageOptions, open, close, declarationKind, typesFirst }) => {
    const types =
      declarationKind === 'type'
        ? 'type Effect = string\ntype PostEffect = string'
        : 'interface Effect {}\ninterface PostEffect {}'
    const imports =
      "import { watchEffect as Effect, watchPostEffect as PostEffect } from 'vue'"
    const declarations = typesFirst
      ? `${types}\n${imports}`
      : `${imports}\n${types}`
    const source = `${open}${declarations}\nEffect(() => 1, { flush: 'post' })${close}`
    const expected = `${open}${declarations}\nPostEffect(() => { return (1) })${close}`
    const composedConfig: Linter.Config = {
      files: ['**/*.{ts,vue}'],
      languageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/callback-style': 'error',
        'vp/prefer-watch-effect-alias': 'error',
      },
    }
    const linter = new Linter()

    expect(
      linter
        .verify(source, composedConfig, filename)
        .map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/prefer-watch-effect-alias', 'preferredAlias'],
      ['vp/callback-style', 'expectedBlockBody'],
    ])
    expect(linter.verifyAndFix(source, composedConfig, filename)).toEqual({
      fixed: true,
      messages: [],
      output: expected,
    })
    expect(linter.verifyAndFix(expected, composedConfig, filename)).toEqual({
      fixed: false,
      messages: [],
      output: expected,
    })
  },
)

it.each(
  scriptContexts.flatMap(context =>
    [
      'type watchEffect = string',
      'interface watchEffect {}',
      "import type { watchEffect } from 'vue'",
      "import { type watchEffect } from 'vue'",
    ].map(declaration => ({
      ...context,
      declaration,
    })),
  ),
)(
  'does not treat a pure type binding as an auto-import ($name, $declaration)',
  ({ filename, languageOptions, open, close, declaration }) => {
    const source = `${open}${declaration}\nwatchEffect(() => 1, { flush: 'post' })${close}`
    const result = new Linter().verifyAndFix(
      source,
      {
        files: ['**/*.{ts,vue}'],
        languageOptions,
        plugins: { vp: plugin },
        settings: { 'vue-perfectionist': { autoImport: true } },
        rules: {
          'vp/callback-style': 'error',
          'vp/prefer-watch-effect-alias': [
            'error',
            { vueGlobals: ['watchEffect', 'watchPostEffect'] },
          ],
        },
      },
      filename,
    )
    expect(result).toEqual({ fixed: false, messages: [], output: source })
  },
)

it.each([false, true])(
  'isolates wrapped namespace receivers across scripts (setup first: %s)',
  setupFirst => {
    const calls = `
(Vue as typeof Vue).defineComponent(() => { const save = () => {} });
(Vue satisfies typeof Vue).onMounted(handler);
(Vue!).onMounted(() => {
  first()
  second()
});
const ready = (Vue as typeof Vue).ref(false);
`
    const ordinary = `<script lang="ts">import * as Vue from 'vue';${calls}</script>`
    const setup = `<script setup lang="ts">
const Vue = { defineComponent: value => value, onMounted: fn => fn(), ref: value => value };${calls}</script>`
    const source = setupFirst ? setup + ordinary : ordinary + setup
    const composedConfig: Linter.Config = {
      ...config,
      settings: { 'vue-perfectionist': { autoImport: true } },
      rules: {
        'vp/prefer-function-declaration': 'error',
        'vp/callback-style': 'error',
        'vp/max-lines-per-callback': ['error', { max: 3 }],
        'vp/prefer-function-result-pattern': 'error',
      },
    }
    const linter = new Linter()
    const result = linter.verifyAndFix(source, composedConfig, 'Test.vue')
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/prefer-function-declaration', 'expectedFunctionDeclaration'],
      ['vp/callback-style', 'expectedInlineCallback'],
      ['vp/max-lines-per-callback', 'exceededMaxLines'],
      ['vp/prefer-function-result-pattern', 'unexpectedFunctionResultPattern'],
    ])
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verifyAndFix(result.output, composedConfig, 'Test.vue'),
    ).toEqual(result)
  },
)

it.each(variants)(
  'isolates setup-local APIs ($language, setup first: $setupFirst, namespace: $namespace)',
  ({ language, setupFirst, namespace }) => {
    const prefix = namespace ? 'Vue.' : ''
    const imports = namespace
      ? 'import * as Vue from "vue"'
      : 'import { onMounted, ref, useTemplateRef, h } from "vue"'
    const locals = namespace
      ? 'const Vue = { onMounted: fn => fn(), ref: value => value, useTemplateRef: key => key, h: (...args) => args }'
      : 'const onMounted = fn => fn(); const ref = value => value; const useTemplateRef = key => key; const h = (...args) => args'
    const calls = `
${prefix}onMounted(handler)
${prefix}onMounted(() => 1)
${prefix}onMounted(() => {
  first()
  second()
})
const ready = ${prefix}ref(false)
const element = ${prefix}useTemplateRef('panel')
${prefix}h('div', { ref: 'panel' })
`
    const ordinary = `<script${language}>${imports}${calls}</script>`
    const setup = `<script setup${language}>${locals}${calls}</script>`
    const template = '<template><div :ref="ready" /></template>'
    const source = (setupFirst ? setup + ordinary : ordinary + setup) + template
    const fixedOrdinary = ordinary.replace(
      'onMounted(() => 1)',
      'onMounted(() => { return (1) })',
    )
    const expected =
      (setupFirst ? setup + fixedOrdinary : fixedOrdinary + setup) + template
    const linter = new Linter()
    const result = linter.verifyAndFix(source, config, 'Test.vue')

    expect(result.output).toBe(expected)
    expect(result.messages.map(message => message.messageId)).toEqual([
      'expectedInlineCallback',
      'exceededMaxLines',
      'unexpectedFunctionResultPattern',
      'inconsistentTemplateRefName',
      'unexpectedRefPattern',
      'unexpectedRefPattern',
    ])
    expect(linter.verifyAndFix(result.output, config, 'Test.vue')).toEqual({
      ...result,
      fixed: false,
    })
    expect(() =>
      compileScript(parse(source).descriptor, { id: 'scope-regression' }),
    ).not.toThrow()
  },
)

it.each(variants)(
  'retains setup imports in module scope ($language, setup first: $setupFirst, namespace: $namespace)',
  ({ language, setupFirst, namespace }) => {
    const imports = namespace
      ? 'import * as Vue from "vue"'
      : 'import { onMounted, useTemplateRef } from "vue"'
    const prefix = namespace ? 'Vue.' : ''
    const ordinary = `<script${language}>${prefix}onMounted(handler); const element = ${prefix}useTemplateRef('panel')</script>`
    const setup = `<script setup${language}>${imports}</script>`
    const source = setupFirst ? setup + ordinary : ordinary + setup

    expect(
      new Linter()
        .verify(source, config, 'Test.vue')
        .map(message => message.messageId),
    ).toEqual([
      'expectedInlineCallback',
      'inconsistentTemplateRefName',
      'unexpectedRefPattern',
    ])
  },
)

it.each([false, true])(
  'isolates default imports while retaining custom targets (setup first: %s)',
  setupFirst => {
    const ordinary =
      '<script>import subscribe from "events"; const result = subscribe(handler)</script>'
    const setup =
      '<script setup>const subscribe = fn => fn(); const result = subscribe(handler)</script>'
    const source = setupFirst ? setup + ordinary : ordinary + setup
    const messages = new Linter().verify(
      source,
      {
        ...config,
        rules: {
          'vp/callback-style': [
            'error',
            {
              customCallbacks: [
                { source: 'events', name: 'default', callbackIndices: [0] },
              ],
            },
          ],
          'vp/prefer-function-result-pattern': [
            'error',
            {
              targets: [
                {
                  source: 'events',
                  names: ['default'],
                  pattern: '^subscription',
                },
              ],
            },
          ],
        },
      },
      'Test.vue',
    )
    expect(messages.map(message => message.messageId)).toEqual([
      'unexpectedFunctionResultPattern',
      'expectedInlineCallback',
    ])
  },
)

it.each(['', ' lang="ts"'])(
  'preserves distinct default import matching across composed rules (%s)',
  language => {
    const source = `<script setup${language}>
import useSubscription from 'events'
const marker = 1
const result = useSubscription(handler)
</script>`
    const linter = new Linter()
    const composedConfig: Linter.Config = {
      ...config,
      languageOptions: language
        ? vueLanguageOptions
        : { ...vueLanguageOptions, parserOptions: { parser: null } },
      rules: {
        'vp/sort-script-setup': [
          'error',
          { groups: ['composable', 'constant'] },
        ],
        'vp/callback-style': [
          'error',
          {
            customCallbacks: [
              { source: 'events', name: 'default', callbackIndices: [0] },
            ],
          },
        ],
        'vp/prefer-function-result-pattern': [
          'error',
          {
            targets: [
              {
                source: 'events',
                names: ['default'],
                pattern: '^subscription',
              },
            ],
          },
        ],
      },
    }
    const result = linter.verifyAndFix(source, composedConfig, 'Test.vue')
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/sort-script-setup', 'unsafeReorder'],
      ['vp/prefer-function-result-pattern', 'unexpectedFunctionResultPattern'],
      ['vp/callback-style', 'expectedInlineCallback'],
    ])
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verifyAndFix(result.output, composedConfig, 'Test.vue'),
    ).toEqual(result)
  },
)
