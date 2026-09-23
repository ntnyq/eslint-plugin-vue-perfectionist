import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../src/index.ts'
import { vueLanguageOptions } from './internal.ts'

describe('component value contracts through the public plugin', () => {
  it('composes presence, type, and value rules without fixes', () => {
    const linter = new Linter()
    const config: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { 'vue-perfectionist': plugin },
      rules: {
        'vue-perfectionist/require-component-props': [
          'error',
          {
            targets: [{ components: ['AppCounter'], props: ['count'] }],
          },
        ],
        'vue-perfectionist/component-prop-types': [
          'error',
          {
            targets: [
              { components: ['AppCounter'], props: { count: 'number' } },
            ],
          },
        ],
        'vue-perfectionist/component-prop-values': [
          'error',
          {
            targets: [
              {
                components: ['AppCounter'],
                props: { count: { multipleOf: 10 } },
              },
            ],
            unknownValues: 'report',
          },
        ],
      },
    }
    const code = `<template>
      <AppCounter />
      <AppCounter :count="25" />
      <AppCounter :count="20" />
      <AppCounter :count="count" />
      <AppCounter count="20" />
    </template>`
    const result = linter.verifyAndFix(code, config, 'Test.vue')
    expect(result.messages.map(message => message.messageId)).toEqual([
      'missingProp',
      'invalidPropValue',
      'unverifiablePropValue',
      'invalidPropType',
      'invalidPropValue',
    ])
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(code)
    expect(
      result.messages.every(message => !message.fix && !message.suggestions),
    ).toBe(true)
    expect(linter.verifyAndFix(result.output, config, 'Test.vue')).toEqual(
      result,
    )
  })
})
