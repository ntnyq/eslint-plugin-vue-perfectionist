import { readFileSync } from 'node:fs'
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import { compile, createRenderer, defineComponent } from 'vue'
import plugin from '../src/index.ts'
import { vueLanguageOptions } from './internal.ts'

/**
 * Mount the compiler's output with Vue's prop resolution, without a browser.
 */
function resolveRuntimeProps(
  template: string,
  state: Record<string, unknown> = {},
) {
  let received: Partial<Record<'count' | 'disabled' | 'isReady', unknown>> = {}
  const AppCounter = defineComponent({
    props: { count: null, disabled: Boolean, isReady: Boolean },
    setup(props) {
      received = { ...props }
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
    components: { AppCounter },
    setup: () => state,
    render: compile(template),
  })
  app.mount({})
  app.unmount()
  return received
}

describe('component prop contracts with Vue compilation and runtime', () => {
  it.each(['require-component-props', 'component-prop-types'])(
    'keeps %s documentation examples consistent with rendered diagnostics',
    name => {
      const markdown = readFileSync(
        new URL(`../docs/rules/${name}.md`, import.meta.url),
        'utf8',
      )
      const examples = [
        ...markdown.matchAll(
          /::: (correct|incorrect)\s+```vue\n([\s\S]*?)\n```\s+:::/gu,
        ),
      ]
      expect(examples.length).toBeGreaterThan(0)
      const linter = new Linter()
      for (const example of examples) {
        const messages = linter.verify(
          example[2] ?? '',
          {
            files: ['**/*.vue'],
            languageOptions: vueLanguageOptions,
            plugins: { 'vue-perfectionist': plugin },
            rules: {
              'vue-perfectionist/require-component-props': [
                'error',
                { targets: [{ components: ['AppCounter'], props: ['count'] }] },
              ],
              'vue-perfectionist/component-prop-types': [
                'error',
                {
                  targets: [
                    { components: ['AppStepper'], props: { count: 'number' } },
                    {
                      components: ['AppButton'],
                      props: {
                        disabled: { type: 'boolean', booleanCasting: true },
                      },
                    },
                  ],
                },
              ],
            },
          },
          'Test.vue',
        )
        expect(messages.some(message => message.fatal)).toBe(false)
        expect(messages.length === 0).toBe(example[1] === 'correct')
      }
    },
  )
  it.each([
    ['count="wrong" v-bind="{ count: 1 }"', 1],
    ['v-bind="{ count: 1 }" count="wrong"', 'wrong'],
    ['v-bind="{ ...extra, count: 1 }"', 1],
    ['v-bind="{ count: 1, ...extra }"', 'wrong'],
    [':count="1" v-bind="extra"', 'wrong'],
    ['v-bind="extra" :count="1"', 1],
  ])('uses Vue merge order for %s', (attributes, expected) => {
    expect(
      resolveRuntimeProps(`<AppCounter ${attributes} />`, {
        extra: { count: 'wrong' },
      }).count,
    ).toBe(expected)
  })

  it.each([
    ['disabled', true],
    ['disabled=""', true],
    ['disabled="disabled"', true],
    [':disabled="\'\'"', true],
    ['v-bind="{ disabled: \'disabled\' }"', true],
    [':disabled="false"', false],
  ])('uses Vue Boolean casting for %s', (attributes, expected) => {
    expect(resolveRuntimeProps(`<AppCounter ${attributes} />`).disabled).toBe(
      expected,
    )
  })

  it('casts hyphenated Boolean names', () => {
    expect(
      resolveRuntimeProps('<AppCounter is-ready="is-ready" />').isReady,
    ).toBe(true)
  })

  it('combines both rules under the public namespace without fixes', () => {
    const linter = new Linter()
    const config: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { 'vue-perfectionist': plugin },
      rules: {
        'vue-perfectionist/require-component-props': [
          'error',
          {
            targets: [
              { components: ['AppCounter'], props: ['count', 'label'] },
            ],
          },
        ],
        'vue-perfectionist/component-prop-types': [
          'error',
          {
            targets: [
              {
                components: ['AppCounter'],
                props: { count: 'number', label: 'string' },
              },
            ],
          },
        ],
      },
    }
    const code = '<template><AppCounter count="20" /></template>'
    const result = linter.verifyAndFix(code, config, 'Test.vue')
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vue-perfectionist/require-component-props', 'missingProp'],
      ['vue-perfectionist/component-prop-types', 'invalidPropType'],
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
