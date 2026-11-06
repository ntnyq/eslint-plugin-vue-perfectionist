import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

describe('cross-rule diagnostics', () => {
  it('composes injection, template complexity, and composable cleanup checks without fixes', () => {
    const linter = new Linter()
    const source = `<script setup lang="ts">
import { inject, onUnmounted } from 'vue'
function usePolling() {
  const value = inject('form')
  onUnmounted(cleanup)
  return value
}
</script>
<template><div v-if="a || b || c || d" /></template>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/require-injection-key': 'error',
        'vp/no-complex-template-expression': 'error',
        'vp/prefer-on-scope-dispose': 'error',
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/require-injection-key', 'unexpectedStringKey'],
      ['vp/prefer-on-scope-dispose', 'preferScopeDispose'],
      ['vp/no-complex-template-expression', 'tooManyLogicalExpressions'],
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

  it('combines callback style and length without replacing inline callbacks', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      plugins: { vp: plugin },
      settings: { 'vue-perfectionist': { autoImport: true } },
      rules: {
        'vp/callback-style': 'error',
        'vp/max-lines-per-callback': ['error', { max: 3 }],
      },
    }
    const source = `watch(source, (value, oldValue, onCleanup) => {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
})
watch(source, handleChange)`
    const result = linter.verifyAndFix(source, configuration)
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/max-lines-per-callback', 'exceededMaxLines'],
      ['vp/callback-style', 'expectedInlineCallback'],
    ])
    expect(result.messages[0]?.message).toContain(
      'Extract its logic into a separate function and call it from the inline callback.',
    )
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verify(
        `function handleChange(value, oldValue, onCleanup) {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
}
watch(source, (value, oldValue, onCleanup) => {
  return handleChange(value, oldValue, onCleanup)
})`,
        configuration,
      ),
    ).toEqual([])
  })
})
