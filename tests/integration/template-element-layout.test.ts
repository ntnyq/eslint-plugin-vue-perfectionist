import { Linter } from 'eslint'
import { format as formatOxfmt } from 'oxfmt'
import { format as formatPrettier } from 'prettier'
import { describe, expect, it } from 'vitest'
import { compileTemplate as compileMinimum } from 'vue-minimum/compiler-sfc'
import { compileTemplate } from 'vue/compiler-sfc'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'
import type { ConsistentTemplateElementLayoutOptions } from '../../src/index.ts'

function configuration(
  options: ConsistentTemplateElementLayoutOptions,
): Linter.Config {
  return {
    files: ['**/*.vue'],
    languageOptions: vueLanguageOptions,
    plugins: { vp: plugin },
    rules: { 'vp/consistent-template-element-layout': ['error', options] },
  }
}

const linter = new Linter()
const safe = configuration({ mode: 'strict', fix: 'safe' })

describe('template layout fix semantics', () => {
  it('repairs a closing tag while leaving unsafe content layout reported', () => {
    const original = '<template>\n<p>\nHello</p\n>\n</template>'
    const fixed = linter.verifyAndFix(original, safe, 'Test.vue')
    expect(fixed.fixed).toBe(true)
    expect(fixed.output).toBe('<template>\n<p>\nHello</p>\n</template>')
    expect(fixed.messages.map(message => message.messageId)).toEqual([
      'expectedContentLayout',
    ])
    expect(fixed.messages[0]).not.toHaveProperty('fix')
    expect(linter.verifyAndFix(fixed.output, safe, 'Test.vue')).toEqual({
      ...fixed,
      fixed: false,
    })
  })
  for (const [version, compile] of [
    ['minimum', compileMinimum],
    ['current', compileTemplate],
  ] as const) {
    for (const whitespace of ['condense', 'preserve'] as const) {
      it.each([
        '<p>Hello</p\n>',
        '<p>\nHello\n</p\r\n>',
        '<p>Read <a href="/">the guide</a\n>.</p>',
        '<p>{{ message }}</p\n>',
        '<p>&nbsp;&#32; &amp;</p\n>',
        '<div><!-- keep --><span>A</span\n> <span>B</span\n></div>',
        '<AppCard><template #default="{ label }">{{ label }}<span>!</span\n></template></AppCard\n>',
        '<div><p v-if="ok">A</p\n><p v-else>B</p\n></div>',
      ])(`preserves ${version} ${whitespace} compilation: %s`, source => {
        const original = `<template>${source}</template>`
        const fixed = linter.verifyAndFix(original, safe, 'Test.vue')
        expect(fixed.fixed).toBe(true)
        expect(fixed.messages.every(message => !message.fix)).toBe(true)
        const fixedSource = fixed.output.slice(
          '<template>'.length,
          -'</template>'.length,
        )
        const before = compile({
          source,
          filename: 'Test.vue',
          id: 'test',
          compilerOptions: { whitespace },
        })
        const after = compile({
          source: fixedSource,
          filename: 'Test.vue',
          id: 'test',
          compilerOptions: { whitespace },
        })
        expect(before.errors).toEqual([])
        expect(after.errors).toEqual([])
        expect(after.code).toBe(before.code)
        const second = linter.verifyAndFix(fixed.output, safe, 'Test.vue')
        expect(second.fixed).toBe(false)
        expect(second.output).toBe(fixed.output)
      })
      it(`does not rewrite text or sibling whitespace for ${version} ${whitespace}`, () => {
        for (const source of [
          '<p>Hello\n</p>',
          '<section>A</section> <section>B</section>',
        ]) {
          const original = `<template>${source}</template>`
          const fixed = linter.verifyAndFix(original, safe, 'Test.vue')
          expect(fixed.fixed).toBe(false)
          expect(fixed.output).toBe(original)
          expect(fixed.messages).toHaveLength(1)
          expect(fixed.messages[0]).not.toHaveProperty('fix')
          const before = compile({
            source,
            filename: 'Test.vue',
            id: 'test',
            compilerOptions: { whitespace },
          })
          const after = compile({
            source: source
              .replace('Hello\n', '\nHello\n')
              .replace('</section> ', '</section>\n'),
            filename: 'Test.vue',
            id: 'test',
            compilerOptions: { whitespace },
          })
          const preservesCompilation =
            !source.startsWith('<p>') && whitespace === 'preserve'
          expect(after.code === before.code).toBe(preservesCompilation)
        }
      })
    }
  }
})

const formatters = [
  {
    name: 'Oxfmt',
    async format(code: string, sensitivity: 'css' | 'strict' | 'ignore') {
      const result = await formatOxfmt('Test.vue', code, {
        printWidth: 40,
        htmlWhitespaceSensitivity: sensitivity,
      })
      expect(result.errors).toEqual([])
      return result.code
    },
  },
  {
    name: 'Prettier',
    format(code: string, sensitivity: 'css' | 'strict' | 'ignore') {
      return formatPrettier(code, {
        parser: 'vue',
        printWidth: 40,
        htmlWhitespaceSensitivity: sensitivity,
      })
    },
  },
]

for (const formatter of formatters) {
  describe(`${formatter.name} template layout round trips`, () => {
    for (const sensitivity of ['css', 'ignore'] as const) {
      it.each([
        '<p>Hello</p>',
        '<p>\nHello\n</p>',
        '<div><section>A</section><section>B</section></div>',
        '<p>Read <a href="/guide/very-long-path-to-the-guide-page">the documentation</a> carefully.</p>',
        '<p><strong>Warning:</strong><span>Be careful.</span></p>',
        '<AppCard><AppText>Status:</AppText><AppButton>Save</AppButton></AppCard>',
        '<p>{{ veryLongFunctionName(firstArgument, secondArgument) }}</p>',
      ])(
        `accepts ${sensitivity} output without fix churn: %s`,
        async content => {
          const config = configuration({ fix: 'safe' })
          const formatted = await formatter.format(
            `<template>${content}</template>`,
            sensitivity,
          )
          const result = linter.verifyAndFix(formatted, config, 'Test.vue')
          expect(result.messages).toEqual([])
          expect(result.fixed).toBe(false)
          expect(await formatter.format(result.output, sensitivity)).toBe(
            formatted,
          )
        },
      )
    }
    it('keeps strict formatter escapes for inline and unknown components', async () => {
      const content =
        '<template><AppCard><span>Read <a href="/guide/very-long-path-to-the-guide-page">the guide</a> carefully.</span></AppCard></template>'
      const formatted = await formatter.format(content, 'strict')
      const result = linter.verifyAndFix(
        formatted,
        configuration({ fix: 'safe' }),
        'Test.vue',
      )
      expect(result.messages).toEqual([])
      expect(result.fixed).toBe(false)
      expect(await formatter.format(result.output, 'strict')).toBe(formatted)
    })
    it('keeps formatter escapes for explicitly grouped components in compatible mode', async () => {
      const content =
        '<template><AppCard><AppText>Status:</AppText><AppButton>Save</AppButton></AppCard></template>'
      const formatted = await formatter.format(content, 'css')
      const result = linter.verifyAndFix(
        formatted,
        configuration({
          fix: 'safe',
          groups: [{ tags: ['AppCard'], layout: 'block' }],
        }),
        'Test.vue',
      )
      expect(result.messages).toEqual([])
      expect(result.fixed).toBe(false)
    })
    it('keeps formatter escapes between grouped block siblings', async () => {
      const content =
        '<template><AppCard><AppBlock>A</AppBlock><AppBlock>B</AppBlock></AppCard></template>'
      const formatted = await formatter.format(content, 'css')
      const result = linter.verifyAndFix(
        formatted,
        configuration({
          fix: 'safe',
          groups: [{ tags: ['AppCard', 'AppBlock'], layout: 'block' }],
        }),
        'Test.vue',
      )
      expect(result.messages).toEqual([])
      expect(result.fixed).toBe(false)
      expect(await formatter.format(result.output, 'css')).toBe(formatted)
    })
    it('retains formatter layout after a safe block closing-tag repair', async () => {
      const original = '<template>\n  <p>Hello</p\n  >\n</template>\n'
      const fixed = linter.verifyAndFix(
        original,
        configuration({ fix: 'safe' }),
        'Test.vue',
      )
      expect(fixed.fixed).toBe(true)
      expect(fixed.messages).toEqual([])
      expect(await formatter.format(fixed.output, 'css')).toBe(fixed.output)
    })
  })
}
