import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin, * as pluginExports from '../src'
import { vueLanguageOptions } from './internal'

describe('plugin contract', () => {
  it('exports rules without built-in configs', () => {
    expect(plugin.meta.name).toBe('eslint-plugin-vue-perfectionist')
    expect(pluginExports.plugin).toBe(plugin)
    expect(pluginExports).not.toHaveProperty('configs')
    expect(plugin).not.toHaveProperty('configs')
    expect(Object.keys(plugin.rules ?? {})).toEqual([
      'callback-style',
      'define-macros-newline',
      'prefer-ref-pattern',
      'sort-script-setup',
    ])
  })

  it.each<{
    name: string
    rule: Linter.RuleEntry
    settings: NonNullable<Linter.Config['settings']>
  }>([
    {
      name: 'explicit rule options',
      rule: ['error', { type: 'natural' }],
      settings: {},
    },
    {
      name: 'shared settings',
      rule: 'error',
      settings: { perfectionist: { type: 'natural' } },
    },
  ])('applies $name with user-composed configuration', ({ rule, settings }) => {
    const linter = new Linter()
    const configuration: Linter.Config[] = [
      {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        settings,
      },
      {
        files: ['**/*.vue'],
        plugins: { 'vue-perfectionist': plugin },
        rules: {
          'vue-perfectionist/sort-script-setup': rule,
        },
      },
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
  })
})
