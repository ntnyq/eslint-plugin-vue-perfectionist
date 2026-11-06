import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import { compile, createRenderer, defineComponent, h, ref } from 'vue'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'
import type { ComponentPublicInstance } from 'vue'

describe('template ref recognition with Vue compilation and runtime', () => {
  it.each([
    { template: '<slot ref="invoice" />', hasRef: false, slotRef: 'invoice' },
    {
      template: '<slot :ref="\'invoice\'" />',
      hasRef: false,
      slotRef: 'invoice',
    },
    {
      template: '<template v-if="true" ref="invoice"><div /></template>',
      hasRef: false,
    },
    {
      template:
        '<template v-for="item in [1]" ref="invoice"><div /></template>',
      hasRef: false,
    },
    { template: '<Slot ref="invoice" />', hasRef: true },
    { template: '<template ref="invoice"><div /></template>', hasRef: true },
    { template: '<slot v-pre ref="invoice" />', hasRef: true },
    { template: '<div v-pre><slot ref="invoice" /></div>', hasRef: true },
    {
      template: '<template v-pre v-if="true" ref="invoice"><div /></template>',
      hasRef: true,
    },
  ])('matches runtime refs for $template', ({ template, hasRef, slotRef }) => {
    const renderer = createRenderer<object, object>({
      patchProp() {},
      insert() {},
      remove() {},
      createElement: () => ({}),
      createText: () => ({}),
      createComment: () => ({}),
      setText() {},
      setElementText() {},
      parentNode: () => null,
      nextSibling: () => null,
    })
    const child = ref<ComponentPublicInstance>()
    const suppliedRefs: unknown[] = []
    const Child = defineComponent({
      components: { Slot: defineComponent({ render: () => null }) },
      // A host root lets the mock renderer remove the entire subtree at once.
      render: compile(`<div>${template}</div>`),
    })
    const app = renderer.createApp({
      render() {
        return h(
          Child,
          { ref: child },
          {
            default(props: { ref?: unknown }) {
              suppliedRefs.push(props.ref)
              return h('span')
            },
          },
        )
      },
    })
    app.mount({})
    try {
      expect(child.value).toBeDefined()
      expect(Object.keys(child.value?.$refs ?? {})).toEqual(
        hasRef ? ['invoice'] : [],
      )
      expect(suppliedRefs).toEqual(slotRef ? [slotRef] : [])
    } finally {
      app.unmount()
    }

    const source = `<template>${template}</template>`
    const result = new Linter().verifyAndFix(
      source,
      {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        plugins: { vp: plugin },
        rules: { 'vp/prefer-ref-pattern': 'error' },
      },
      'Test.vue',
    )
    expect(result.messages.map(message => message.messageId)).toEqual(
      hasRef ? ['unexpectedRefPattern'] : [],
    )
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
  })
})

describe('template ref rule composition', () => {
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
})
