import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

describe('model rule composition', () => {
  it('renames model contracts through an aliased plugin only when opted in', () => {
    const linter = new Linter()
    const source =
      '<script setup>const files = defineModel("file-list")</script>'
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/define-model-name-casing': ['error', { fix: true }] },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result).toEqual({
      fixed: true,
      messages: [],
      output: '<script setup>const files = defineModel("fileList")</script>',
    })
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({ ...result, fixed: false })
  })

  it('checks model conventions together through an aliased plugin without renaming contracts', () => {
    const linter = new Linter()
    const source = `<script setup lang="ts">
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ 'update:title': [string] }>()
const files = defineModel('file-list')
</script>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/prefer-define-model': 'error',
        'vp/define-model-name-casing': 'error',
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/prefer-define-model', 'preferDefineModel'],
      ['vp/define-model-name-casing', 'unexpectedNameCasing'],
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
})
