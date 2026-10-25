import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import { compile, createRenderer, defineComponent } from 'vue'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

/**
 * Observe the slots produced by Vue's compiler and passed to the component.
 */
function resolveRuntimeSlots(template: string): string[] {
  let supplied: string[] = []
  const AppButton = defineComponent({
    setup(_props, { slots }) {
      supplied = Object.keys(slots)
      return () => null
    },
  })
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
  const app = renderer.createApp({
    components: { AppButton },
    render: compile(template),
  })
  app.mount({})
  app.unmount()
  return supplied
}

describe('component slot contracts with Vue compilation and runtime', () => {
  it.each<[string, boolean]>([
    ['<AppButton />', false],
    ['<AppButton> \n\t\r\f </AppButton>', false],
    ['<AppButton>&#x20;&#x9;&#xA;</AppButton>', false],
    ['<AppButton>&nbsp;</AppButton>', true],
    ['<AppButton>&#x2003;</AppButton>', true],
    ['<AppButton>\u{A0}</AppButton>', true],
    ['<AppButton>\u{2003}</AppButton>', true],
    ['<AppButton><template #header /> \n\t </AppButton>', false],
    ['<AppButton><template #header />&nbsp;</AppButton>', true],
    ['<AppButton><template #header />&#x2003;</AppButton>', true],
  ])(
    'matches default slot whitespace handling for %s',
    (template, hasDefault) => {
      expect(resolveRuntimeSlots(template).includes('default')).toBe(hasDefault)

      const source = `<template>${template}</template>`
      const result = new Linter().verifyAndFix(
        source,
        {
          files: ['**/*.vue'],
          languageOptions: vueLanguageOptions,
          plugins: { vp: plugin },
          rules: {
            'vp/require-component-slots': [
              'error',
              { targets: [{ components: ['AppButton'], slots: ['default'] }] },
            ],
          },
        },
        'Test.vue',
      )
      expect(result.messages.map(message => message.messageId)).toEqual(
        hasDefault ? [] : ['missingSlot'],
      )
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
    },
  )
})
