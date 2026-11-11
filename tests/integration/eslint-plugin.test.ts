import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin, * as pluginExports from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

describe('plugin contract', () => {
  it('exports rules without built-in configs', () => {
    expect(plugin.meta.name).toBe('eslint-plugin-vue-perfectionist')
    expect(plugin.meta.version).toBeTypeOf('string')
    expect(pluginExports.plugin).toBe(plugin)
    expect(pluginExports).not.toHaveProperty('configs')
    expect(plugin).not.toHaveProperty('configs')
    expect(Object.keys(plugin.rules ?? {})).toEqual([
      'callback-style',
      'component-prop-types',
      'component-prop-values',
      'consistent-template-ref-name',
      'define-macros-newline',
      'define-macros-type-style',
      'define-model-name-casing',
      'max-lines-per-callback',
      'no-complex-template-expression',
      'no-complex-v-for-source',
      'no-restricted-html-elements',
      'no-template-type-assertion',
      'padding-line-between-tags',
      'prefer-composable-options',
      'prefer-define-model',
      'prefer-function-declaration',
      'prefer-function-result-pattern',
      'prefer-on-scope-dispose',
      'prefer-ref-pattern',
      'prefer-simple-event-handler',
      'prefer-template-literal-in-interpolation',
      'prefer-use-template-ref-inference',
      'prefer-watch-effect-alias',
      'require-component-props',
      'require-component-slots',
      'require-injection-key',
      'require-macro-type-name',
      'require-props-prefix',
      'require-vue-generic',
      'sort-composable-destructure',
      'sort-composable-return',
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
      name: 'explicit rule options with ignored settings',
      rule: ['error', { type: 'natural' }],
      settings: {
        perfectionist: { order: 'desc' },
        'vue-perfectionist': { order: 'desc' },
      },
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
