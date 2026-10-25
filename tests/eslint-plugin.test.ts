import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin, * as pluginExports from '../src'
import { vueLanguageOptions } from './internal'

describe('plugin contract', () => {
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

  it('reports function expressions through an aliased plugin without fixes', () => {
    const linter = new Linter()
    const source = `<script setup>
const useForm = () => {
  const save = () => {}
  return { save }
}
</script>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/prefer-function-declaration': 'error' },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages).toHaveLength(2)
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.ruleId).toBe('vp/prefer-function-declaration')
      expect(message.messageId).toBe('expectedFunctionDeclaration')
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

  it.each([false, true])(
    'checks template ref inference through an aliased plugin with autoImport: %s',
    autoImport => {
      const linter = new Linter()
      const source = `<script setup lang="ts">
const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')
</script>
<template><video ref="videoRef" /></template>`
      const configuration: Linter.Config = {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        plugins: { vp: plugin },
        settings: { 'vue-perfectionist': { autoImport } },
        rules: {
          'vp/consistent-template-ref-name': 'error',
          'vp/prefer-ref-pattern': 'error',
          'vp/prefer-use-template-ref-inference': 'error',
        },
      }
      const result = linter.verifyAndFix(source, configuration, 'Test.vue')
      expect(result.messages.map(message => message.messageId)).toEqual(
        autoImport ? ['unexpectedTypeArguments'] : [],
      )
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
      for (const message of result.messages) {
        expect(message.ruleId).toBe('vp/prefer-use-template-ref-inference')
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
      expect(
        linter.verifyAndFix(result.output, configuration, 'Test.vue'),
      ).toEqual(result)
    },
  )

  it('checks composable definitions through an aliased plugin without fixes', () => {
    const linter = new Linter()
    const source = 'function useComments(id, thread = "") {}'
    const result = linter.verifyAndFix(source, {
      plugins: { vp: plugin },
      rules: {
        'vp/prefer-composable-options': ['error', { maxPositionalParams: 2 }],
      },
    })
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toMatchObject({
      ruleId: 'vp/prefer-composable-options',
      messageId: 'expectedOptionsObject',
    })
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages[0]?.fix).toBeUndefined()
    expect(result.messages[0]?.suggestions).toBeUndefined()
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

  it.each([false, true])(
    'recognizes boolean state auto-imports with an aliased plugin: %s',
    autoImport => {
      const linter = new Linter()
      const source = `<script setup lang="ts">
const loading = ref(false)
const ready = shallowRef<boolean>()
const [open, toggle] = useToggle()
function local(ref: Function) { const state = ref(false) }
</script>`
      const result = linter.verifyAndFix(
        source,
        {
          files: ['**/*.vue'],
          languageOptions: {
            ...vueLanguageOptions,
            globals: {
              ref: 'readonly',
              shallowRef: 'readonly',
              useToggle: 'readonly',
            },
          },
          plugins: { vp: plugin },
          settings: { 'vue-perfectionist': { autoImport } },
          rules: { 'vp/prefer-function-result-pattern': 'error' },
        },
        'Test.vue',
      )
      expect(result.messages.map(message => message.messageId)).toEqual(
        autoImport
          ? Array.from({ length: 3 }, () => 'unexpectedFunctionResultPattern')
          : [],
      )
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
    },
  )

  it.each(['', ' lang="ts"'])(
    'shares auto-import settings across rules with an aliased plugin: %s',
    language => {
      const linter = new Linter()
      const source = `<script setup${language}>
const panel = useTemplateRef('field')
const z = computed(() => 1)
const a = ref(0)
onMounted(handler)
</script>`
      const configuration: Linter.Config = {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        plugins: { vp: plugin },
        settings: { 'vue-perfectionist': { autoImport: true } },
        rules: {
          'vp/callback-style': 'error',
          'vp/consistent-template-ref-name': 'error',
          'vp/prefer-ref-pattern': 'error',
          'vp/sort-script-setup': ['error', { groups: ['ref', 'computed'] }],
        },
      }
      const result = linter.verifyAndFix(source, configuration, 'Test.vue')
      expect(result.messages.map(message => message.messageId)).toEqual([
        'inconsistentTemplateRefName',
        'unexpectedRefPattern',
        'unsafeReorder',
        'expectedInlineCallback',
      ])
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
      expect(
        linter.verify(
          source,
          {
            ...configuration,
            settings: { 'vue-perfectionist': { autoImport: false } },
          },
          'Test.vue',
        ),
      ).toEqual([])
    },
  )

  it('reports watch effect aliases through an aliased plugin without fixes', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      plugins: { vp: plugin },
      settings: { 'vue-perfectionist': { autoImport: true } },
      rules: { 'vp/prefer-watch-effect-alias': 'error' },
    }
    const source = "watchEffect(update, { flush: 'sync', onTrack: debug })"
    const result = linter.verifyAndFix(source, configuration)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toMatchObject({
      ruleId: 'vp/prefer-watch-effect-alias',
      messageId: 'preferredAlias',
    })
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages[0]?.fix).toBeUndefined()
    expect(result.messages[0]?.suggestions).toBeUndefined()
    expect(linter.verifyAndFix(result.output, configuration)).toEqual(result)
  })

  it('exports rules without built-in configs', () => {
    expect(plugin.meta.name).toBe('eslint-plugin-vue-perfectionist')
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
      'no-complex-v-for-source',
      'padding-line-between-tags',
      'prefer-composable-options',
      'prefer-define-model',
      'prefer-function-declaration',
      'prefer-function-result-pattern',
      'prefer-ref-pattern',
      'prefer-simple-event-handler',
      'prefer-template-literal-in-interpolation',
      'prefer-use-template-ref-inference',
      'prefer-watch-effect-alias',
      'require-component-props',
      'require-component-slots',
      'require-macro-type-name',
      'require-vue-generic',
      'sort-script-setup',
    ])
  })

  it.each([
    {
      description: 'only checks consistency when enabled alone',
      code: 'const input = useTemplateRef("input")',
      pattern: false,
      messageIds: [],
    },
    {
      description: 'keeps the pattern rule independent',
      code: 'const inputRef = useTemplateRef("fieldRef")',
      pattern: true,
      messageIds: ['inconsistentTemplateRefName'],
    },
    {
      description: 'reports both conventions when both fail',
      code: 'const inputRef = useTemplateRef("field")',
      pattern: true,
      messageIds: ['inconsistentTemplateRefName', 'unexpectedRefPattern'],
    },
  ])('$description', ({ code, pattern, messageIds }) => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { 'vue-perfectionist': plugin },
      rules: {
        'vue-perfectionist/consistent-template-ref-name': 'error',
        'vue-perfectionist/prefer-ref-pattern': pattern ? 'error' : 'off',
      },
    }
    const source = `<script setup>import { useTemplateRef } from 'vue'; ${code}</script>`
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages.map(message => message.messageId)).toEqual(
      messageIds,
    )
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
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
