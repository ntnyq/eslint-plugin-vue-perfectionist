import * as tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { format } from 'oxfmt'
import { describe, expect, it } from 'vitest'
import * as vueParser from 'vue-eslint-parser'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../internal.ts'
import type { DefineMacrosNewlineOptions } from '../../src/index.ts'

function sfc(script: string): string {
  return `<script setup lang="ts">\n${script}\n</script>`
}

function config(options: DefineMacrosNewlineOptions = {}): Linter.Config[] {
  return [
    {
      files: ['**/*.{vue,js,ts,tsx}'],
      plugins: { 'vue-perfectionist': plugin },
      rules: { 'vue-perfectionist/define-macros-newline': ['error', options] },
    },
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: { parser: tsParser },
    },
    { files: ['**/*.vue'], languageOptions: vueLanguageOptions },
  ]
}

function verify(code: string, options: DefineMacrosNewlineOptions = {}) {
  return new Linter().verify(code, config(options), 'Test.vue')
}

const declarations = [
  'defineProps<{ name: string }>()',
  'defineProps<{ name: string; age?: number }>()',
  'defineEmits<{ change: [value: string] }>()',
  'defineEmits<{ (event: "change", value: string): void; (event: "close"): void }>()',
  'defineSlots<{ default(props: { name: string }): unknown }>()',
  'defineProps({ name: String, options: { type: Object, required: true } })',
  'defineEmits({ change: (value: string) => !!value, close: null })',
  'defineExpose({ open, close })',
  'withDefaults(defineProps<{ name?: string }>(), { name: "test" })',
]

describe('define-macros-newline', () => {
  it.each(declarations)('reports an inline declaration: %s', script => {
    expect(verify(sfc(script))).toMatchObject([
      { messageId: 'expectedNewlines', severity: 2, fix: expect.any(Object) },
    ])
  })

  it.each([
    'defineProps<{\n  name: string\n}>()',
    'defineProps<{\n  nested: { name: string; age: number }\n}>()',
    'defineEmits<{\n  change: [value: { name: string; age: number }]\n}>()',
    'defineSlots<{\n  default(props: { name: string }): unknown\n}>()',
    'defineExpose({\n  open,\n  close,\n})',
    'defineProps({\n  name: {\n    type: String,\n    required: true,\n  },\n  age: Number,\n})',
    'defineProps<{\n  name: string\n\n  age: number\n}>()',
    'defineProps<{}>(); defineEmits<{}>(); defineSlots<{}>()',
    'defineProps({}); defineEmits({}); defineExpose({})',
    'defineProps({ /* empty */ }); defineEmits<{ /* empty */ }>()',
    'defineProps(); defineEmits(); defineSlots(); defineExpose()',
    'defineProps(["name"]); defineEmits(["change"])',
    'type Props = { name: string }; defineProps<Props>()',
    'const exposed = { open, close }; defineExpose(exposed)',
    'defineProps<Props & { name: string }>()',
    'defineProps<{ name: string } | { age: number }>()',
    'defineProps<Partial<{ name: string }>>()',
    'defineProps<{ [K in Keys]: string }>()',
    'defineExpose({ open } as Exposed)',
    'defineProps({ name: String } satisfies Props)',
    'withDefaults(defineProps<Props>(), { name: "test" })',
    'defineOptions({ name: "Test" })',
    'defineModel<{ name: string }>("user", { required: true })',
    'const ordinary = { name: "test" }; otherMacro({ open })',
    'obj.defineProps({ name: String }); obj["defineExpose"]({ open })',
    'defineExpose?.({ open })',
    'function defineExpose(value) {}; defineExpose({ open })',
    'const defineProps = value => value; defineProps({ name: String })',
    'function local(defineExpose) { defineExpose({ open }) }',
    'import { defineProps } from "other"; defineProps({ name: String })',
    'import { defineProps } from "vue"; defineProps({ name: String })',
    'import { defineProps as props } from "vue"; props({ name: String })',
    'import * as Vue from "vue"; Vue.defineProps({ name: String })',
  ])('accepts or skips: %s', script => {
    expect(verify(sfc(script))).toEqual([])
  })

  it.each(['test.js', 'test.ts', 'test.tsx'])('skips %s', filename => {
    expect(
      new Linter().verify('defineProps({ name: String })', config(), filename),
    ).toEqual([])
  })

  it.each([
    '<script>defineProps({ name: String })</script>',
    '<template>{{ defineExpose({ open }) }}</template>',
    '<template><div /></template>',
    '<script setup src="./setup.ts"></script>',
    '<script>defineExpose({ open })</script><script setup>const value = 1</script>',
    '<script setup>const value = 1</script><script>defineExpose({ open })</script>',
  ])('skips content outside the setup script: %s', code => {
    expect(verify(code)).toEqual([])
  })

  it('checks only setup declarations when both scripts are present', () => {
    const code =
      '<script>defineExpose({ open })</script>\n<script setup>defineProps({ name: String })</script>'
    const result = new Linter().verifyAndFix(code, config(), 'Test.vue')
    expect(result.messages).toEqual([])
    expect(result.output).toBe(
      '<script>defineExpose({ open })</script>\n<script setup>defineProps({\nname: String\n})</script>',
    )
  })

  it('uses the JavaScript parser for JavaScript SFCs', () => {
    const configuration: Linter.Config[] = [
      ...config(),
      {
        files: ['**/*.vue'],
        languageOptions: { parserOptions: { parser: null } },
      },
    ]
    const result = new Linter().verifyAndFix(
      '<script setup>defineExpose({ open })</script>',
      configuration,
      'Test.vue',
    )
    expect(result.messages).toEqual([])
    expect(result.output).toBe(
      '<script setup>defineExpose({\nopen\n})</script>',
    )
  })

  it('checks globals supplied by an existing Vue ESLint config', () => {
    expect(
      new Linter().verify(
        sfc('defineProps({ name: String })'),
        [
          ...config(),
          { languageOptions: { globals: { defineProps: 'readonly' } } },
        ],
        'Test.vue',
      ),
    ).toMatchObject([{ messageId: 'expectedNewlines' }])
  })

  it('reports only the selected macros and replaces the defaults', () => {
    const code = sfc(
      'defineProps({ name: String }); defineExpose({ open }); defineOptions({ name: "Test" })',
    )
    expect(verify(code, { macros: ['defineOptions'] })).toMatchObject([
      { message: expect.stringContaining('"defineOptions"') },
    ])
    expect(
      verify(code, { macros: ['defineProps', 'defineOptions'] }),
    ).toHaveLength(2)
    expect(verify(code, { macros: [] })).toEqual([])
  })

  it.each([
    { macros: ['defineModel'] },
    { macros: ['unknown'] },
    { macros: ['defineProps', 'defineProps'] },
    { macros: [1] },
    { macros: 'defineProps' },
    { macros: null },
    { deep: true },
  ])('rejects invalid options: %j', options => {
    expect(() =>
      new Linter().verify(
        sfc(''),
        [
          ...config(),
          {
            rules: {
              'vue-perfectionist/define-macros-newline': ['error', options],
            },
          },
        ],
        'Test.vue',
      ),
    ).toThrow()
  })
})

describe('define-macros-newline fixes', () => {
  it.each([
    ['defineProps<{ name: string }>()', 'defineProps<{\nname: string\n}>()'],
    [
      'defineProps<{\n  name: string; age: number\n}>()',
      'defineProps<{\n  name: string;\nage: number\n}>()',
    ],
    ['defineProps<{ name: string\n}>()', 'defineProps<{\nname: string\n}>()'],
    [
      'defineProps<{\n  name: string }>()',
      'defineProps<{\n  name: string\n}>()',
    ],
    ['defineExpose({open,close,})', 'defineExpose({\nopen,\nclose,\n})'],
    [
      'defineProps<{name: string,age: number,}>()',
      'defineProps<{\nname: string,\nage: number,\n}>()',
    ],
    [
      'defineExpose({ open, /* keep */ close /* end */ })',
      'defineExpose({\nopen, /* keep */\nclose /* end */\n})',
    ],
    [
      'defineProps<{ /* docs */ name: string }>()',
      'defineProps<{\n/* docs */ name: string\n}>()',
    ],
    [
      'withDefaults(defineProps<{ name?: string }>(), { name: "test" })',
      'withDefaults(defineProps<{\nname?: string\n}>(), { name: "test" })',
    ],
    ['defineExpose(({ open }))', 'defineExpose(({\nopen\n}))'],
  ])('only inserts required line breaks in %s', (input, output) => {
    const result = new Linter().verifyAndFix(sfc(input), config(), 'Test.vue')
    expect(result).toMatchObject({
      output: sfc(output),
      fixed: true,
      messages: [],
    })
  })

  it.each([
    ...declarations,
    'defineExpose({ ...api, [key]: value, get name() { return "test" }, open() {} })',
    'defineProps<{ readonly name?: string; [key: string]: unknown }>()',
    'defineProps<{ name: { value: string }; fn(): void }>()',
    'defineProps<{ /* before */ name: string; /* between */ age: number /* after */ }>()',
    'defineProps<{ // leading\nname: string; // trailing\nage: number }>()',
    'defineProps<{ name: string /* before comma */, age: number, }>()',
    'defineProps<{\nname: string; /* multi\nline */ age: number }>()',
    'defineExpose({ open, // trailing\nclose /* multi\nline */ })',
    'defineExpose({ /* multi\nline */ open, close })',
    'defineExpose({\nopen, // keep trailing comma\n})',
  ])('preserves tokens, comments and fix idempotence: %s', script => {
    const code = sfc(script)
    const linter = new Linter()
    const result = linter.verifyAndFix(code, config(), 'Test.vue')
    expect(result.messages).toEqual([])
    const original = vueParser.parseForESLint(code, { parser: tsParser }).ast
    const fixed = vueParser.parseForESLint(result.output, {
      parser: tsParser,
    }).ast
    expect(original.tokens?.length).toBeGreaterThan(0)
    const tokens = (ast: typeof original) =>
      ast.tokens?.map(token => [token.type, token.value])
    const comments = (ast: typeof original) =>
      ast.comments?.map(comment => [comment.type, comment.value])
    expect(tokens(fixed)).toEqual(tokens(original))
    expect(comments(fixed)).toEqual(comments(original))
    expect(
      linter.verifyAndFix(result.output, config(), 'Test.vue'),
    ).toMatchObject({
      fixed: false,
      output: result.output,
      messages: [],
    })
  })

  it('preserves CRLF line endings', () => {
    const code = sfc('defineExpose({ open, close })').replaceAll('\n', '\r\n')
    const result = new Linter().verifyAndFix(code, config(), 'Test.vue')
    expect(result.output).toBe(
      sfc('defineExpose({\nopen,\nclose\n})').replaceAll('\n', '\r\n'),
    )
    expect(result.messages).toEqual([])
  })

  it('fixes explicitly enabled defineOptions', () => {
    expect(
      new Linter().verifyAndFix(
        sfc('defineOptions({ name: "Test" })'),
        config({ macros: ['defineOptions'] }),
        'Test.vue',
      ),
    ).toMatchObject({
      output: sfc('defineOptions({\nname: "Test"\n})'),
      fixed: true,
      messages: [],
    })
  })

  it.each(declarations)('remains valid after Oxfmt: %s', async script => {
    const linter = new Linter()
    const fixed = linter.verifyAndFix(sfc(script), config(), 'Test.vue')
    const formatted = await format('Test.vue', fixed.output, {
      objectWrap: 'preserve',
      semi: false,
      singleQuote: true,
    })
    expect(formatted.errors).toEqual([])
    expect(
      linter.verifyAndFix(formatted.code, config(), 'Test.vue'),
    ).toMatchObject({
      fixed: false,
      output: formatted.code,
      messages: [],
    })
  })
})
