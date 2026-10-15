import { Linter } from 'eslint'
import { expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import plugin from '../src/index.ts'
import { vueLanguageOptions } from './internal.ts'

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
