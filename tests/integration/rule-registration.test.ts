import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

it.each([
  {
    name: 'require-composable-return-bindings',
    source:
      '<script setup>function usePage(target) { const count = 0; return { total: count, target, enabled: true } }</script>',
    options: [{ allowAliases: false, allowParameters: true }],
    messageIds: ['unexpectedAlias', 'expectedBinding'],
  },
  {
    name: 'prefer-function-declaration',
    source:
      '<script setup>const useForm = () => { const save = () => {}; return { save } }</script>',
    options: [],
    messageIds: ['expectedFunctionDeclaration', 'expectedFunctionDeclaration'],
  },
  {
    name: 'prefer-composable-options',
    source: '<script setup>function useComments(id, thread = "") {}</script>',
    options: [{ maxPositionalParams: 2 }],
    messageIds: ['expectedOptionsObject'],
  },
  {
    name: 'prefer-watch-effect-alias',
    source:
      '<script setup>watchEffect(update, { flush: "sync", onTrack: debug })</script>',
    options: [],
    messageIds: ['preferredAlias'],
  },
])(
  'registers $name under a plugin alias',
  ({ name, source, options, messageIds }) => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      settings: { 'vue-perfectionist': { autoImport: true } },
      rules: { [`vp/${name}`]: ['error', ...options] },
    }
    const messages = linter.verify(source, configuration, 'Test.vue')
    expect(
      messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual(messageIds.map(messageId => [`vp/${name}`, messageId]))
  },
)

describe('individual rules through the public namespace', () => {
  it('checks exact native HTML names through an aliased plugin without fixes', () => {
    const linter = new Linter()
    const source = '<template><button /><Button /><input /></template>'
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/no-restricted-html-elements': [
          'error',
          {
            elements: [
              'button',
              { name: 'input', message: 'Use <AppInput> instead.' },
            ],
          },
        ],
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages.map(message => message.message)).toEqual([
      'Native HTML element <button> is not allowed.',
      'Native HTML element <input> is not allowed. Use <AppInput> instead.',
    ])
    expect(result.messages.map(message => message.ruleId)).toEqual([
      'vp/no-restricted-html-elements',
      'vp/no-restricted-html-elements',
    ])
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

  it('checks required component slots through an aliased plugin', () => {
    const linter = new Linter()
    const source = `<template>
<AppDialog><template #header /><template #[name] /></AppDialog>
<app-dialog />
</template>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/require-component-slots': [
          'error',
          {
            targets: [
              { components: ['AppDialog'], slots: ['header', 'footer'] },
            ],
          },
        ],
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages.map(message => message.messageId)).toEqual([
      'unverifiableRequiredSlot',
      'missingSlot',
      'missingSlot',
    ])
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.ruleId).toBe('vp/require-component-slots')
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

  it('fixes tag padding through an aliased plugin and replaces defaults', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/padding-line-between-tags': [
          'error',
          { targets: [{ tag: 'Item' }] },
        ],
      },
    }
    const source =
      '<template><Other />\n<Other />\n<Item />\n<Item /></template>'
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result).toEqual({
      fixed: true,
      messages: [],
      output: '<template><Other />\n<Other />\n<Item />\n\n<Item /></template>',
    })
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({
      ...result,
      fixed: false,
    })
    expect(
      linter.verifyAndFix(
        source,
        {
          ...configuration,
          rules: { 'vp/padding-line-between-tags': ['error', { targets: [] }] },
        },
        'Test.vue',
      ),
    ).toEqual({ fixed: false, messages: [], output: source })
  })

  it('checks generic comments and exemptions through an aliased plugin', () => {
    const linter = new Linter()
    const source = `<template>
<!-- @vue-generic {import('#types').IAiCourse} -->
<ElTableColumn />
<ElTableColumn type="index" />
<ElTableColumn :type="columnType" />
<ElTableColumn />
</template>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/require-vue-generic': [
          'error',
          {
            targets: [
              {
                components: ['ElTableColumn'],
                ignoreWhen: [{ props: { type: { enum: ['index'] } } }],
              },
            ],
            unknownValues: 'ignore',
          },
        ],
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toMatchObject({
      ruleId: 'vp/require-vue-generic',
      messageId: 'missingVueGeneric',
      line: 6,
      column: 2,
    })
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages[0]?.fix).toBeUndefined()
    expect(result.messages[0]?.suggestions).toBeUndefined()
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

  it('fixes mixed template text through an aliased plugin and stabilizes', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/prefer-template-literal-in-interpolation': 'error' },
    }
    const result = linter.verifyAndFix(
      '<template><span>{{ ok ? 0 : null }}分</span></template>',
      configuration,
      'Test.vue',
    )
    expect(result.fixed).toBe(true)
    expect(result.messages).toEqual([])
    expect(result.output).toBe(
      // eslint-disable-next-line no-template-curly-in-string
      "<template><span>{{ `${(ok ? 0 : null) ?? ''}分` }}</span></template>",
    )
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({ ...result, fixed: false })
  })

  it('fixes watch effect aliases through an aliased plugin and stabilizes', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/prefer-watch-effect-alias': 'error' },
    }
    const source = `<script setup lang="ts">
import { watchEffect } from 'vue'
watchEffect(update, { flush: 'post' })
watchEffect(update, { flush: 'sync', onTrack: debug })
</script>`
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result).toEqual({
      fixed: true,
      messages: [],
      output: `<script setup lang="ts">
import { watchEffect, watchPostEffect, watchSyncEffect } from 'vue'
watchPostEffect(update)
watchSyncEffect(update, {  onTrack: debug })
</script>`,
    })
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({
      ...result,
      fixed: false,
    })
  })
})
