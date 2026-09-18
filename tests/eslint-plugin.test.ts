import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin, { configs } from '../src'
import { vueLanguageOptions } from './internal'

describe('plugin contract', () => {
  it('registers the rule and self-contained presets', () => {
    expect(plugin.meta.name).toBe('eslint-plugin-vue-perfectionist')
    expect(plugin.configs.recommended).toBe(configs.recommended)
    expect(configs.recommended.plugins?.['vue-perfectionist']).toBe(plugin)
    expect(plugin.rules?.['callback-style']).toBeDefined()
    expect(plugin.rules?.['define-macros-newline']).toBeDefined()
    for (const preset of Object.values(configs)) {
      expect(preset.rules?.['vue-perfectionist/callback-style']).toBeUndefined()
      expect(
        preset.rules?.['vue-perfectionist/define-macros-newline'],
      ).toBeUndefined()
    }
    expect(plugin.rules).toHaveProperty('prefer-ref-pattern')
    for (const config of Object.values(configs)) {
      expect(config.rules).not.toHaveProperty(
        'vue-perfectionist/prefer-ref-pattern',
      )
    }
  })

  it.each([
    { preset: configs['recommended-natural'], settings: {} },
    {
      preset: configs.recommended,
      settings: { perfectionist: { type: 'natural' } },
    },
  ])(
    'applies $preset.name with existing Vue parser configuration',
    ({ preset, settings }) => {
      const linter = new Linter()
      const configuration: Linter.Config[] = [
        {
          files: ['**/*.vue'],
          languageOptions: vueLanguageOptions,
          settings,
        },
        preset,
      ]
      const result = linter.verifyAndFix(
        '<script setup lang="ts">\nconst z = 1\nconst a = 2\n</script>',
        configuration,
        'Test.vue',
      )
      expect(result.output).toBe(
        '<script setup lang="ts">\nconst a = 2\nconst z = 1\n</script>',
      )
      expect(result.messages).toEqual([])
      expect(
        linter.verifyAndFix(result.output, configuration, 'Test.vue').fixed,
      ).toBe(false)
    },
  )
})
