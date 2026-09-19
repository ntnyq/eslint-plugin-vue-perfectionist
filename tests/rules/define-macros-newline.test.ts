import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { format } from 'oxfmt'
import { describe, expect, it } from 'vitest'
import * as vueParser from 'vue-eslint-parser'
import { defineMacrosNewline } from '../../src/rules/define-macros-newline.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type { Linter } from 'eslint'
import type {
  DefineMacrosNewlineMessageId,
  DefineMacrosNewlineOptions,
} from '../../src/types/index.ts'

function sfc(script: string): string {
  return `<script setup lang="ts">\n${script}\n</script>`
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

const tester = createRuleTester<unknown>({
  name: 'define-macros-newline',
  rule: defineMacrosNewline,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

await run<DefineMacrosNewlineOptions, DefineMacrosNewlineMessageId>({
  name: 'define-macros-newline',
  rule: defineMacrosNewline,
  onResult(testcase, result) {
    if (testcase.type !== 'invalid') {
      return
    }

    expect(result.fixed).toBe(true)
    const original = vueParser.parseForESLint(testcase.code, {
      parser: tsParser,
    }).ast
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
  },
  valid: [
    ...[
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
    ].map(script => ({
      description: `accepts or skips: ${script}`,
      code: sfc(script),
    })),
    ...['test.js', 'test.ts', 'test.tsx'].map(filename => ({
      description: `skips ${filename}`,
      filename,
      code: 'defineProps({ name: String })',
    })),
    ...[
      '<script>defineProps({ name: String })</script>',
      '<template>{{ defineExpose({ open }) }}</template>',
      '<template><div /></template>',
      '<script setup src="./setup.ts"></script>',
      '<script>defineExpose({ open })</script><script setup>const value = 1</script>',
      '<script setup>const value = 1</script><script>defineExpose({ open })</script>',
    ].map(code => ({
      description: 'skips content outside the setup script',
      code,
    })),
    {
      description: 'an empty macro list disables all checks',
      code: sfc(
        'defineProps({ name: String }); defineExpose({ open }); defineOptions({ name: "Test" })',
      ),
      options: { macros: [] },
    },
    {
      description:
        'preserves a valid declaration with a trailing comma comment',
      code: sfc('defineExpose({\nopen, // keep trailing comma\n})'),
    },
  ],
  invalid: [
    ...declarations.map(script => ({
      description: `reports an inline declaration and remains valid after Oxfmt: ${script}`,
      code: sfc(script),
      errors: [
        {
          messageId: 'expectedNewlines' as const,
          severity: 2 as const,
          fix: expect.any(Object),
        },
      ],
      async after(result: Linter.FixReport) {
        const formatted = await format('Test.vue', result.output, {
          objectWrap: 'preserve',
          semi: false,
          singleQuote: true,
        })
        expect(formatted.errors).toEqual([])
        await tester.valid({ code: formatted.code })
      },
    })),
    {
      description:
        'checks only setup declarations when both scripts are present',
      code: '<script>defineExpose({ open })</script>\n<script setup>defineProps({ name: String })</script>',
      errors: ['expectedNewlines'],
      output:
        '<script>defineExpose({ open })</script>\n<script setup>defineProps({\nname: String\n})</script>',
    },
    {
      description: 'uses the JavaScript parser for JavaScript SFCs',
      code: '<script setup>defineExpose({ open })</script>',
      languageOptions: { parserOptions: { parser: null } },
      errors: ['expectedNewlines'],
      output: '<script setup>defineExpose({\nopen\n})</script>',
    },
    {
      description: 'checks globals supplied by an existing Vue ESLint config',
      code: sfc('defineProps({ name: String })'),
      languageOptions: { globals: { defineProps: 'readonly' } },
      errors: ['expectedNewlines'],
      output: sfc('defineProps({\nname: String\n})'),
    },
    {
      description: 'reports only the selected macros and replaces the defaults',
      code: sfc(
        'defineProps({ name: String }); defineExpose({ open }); defineOptions({ name: "Test" })',
      ),
      options: { macros: ['defineOptions'] },
      errors: [
        { messageId: 'expectedNewlines', data: { name: 'defineOptions' } },
      ],
      output: sfc(
        'defineProps({ name: String }); defineExpose({ open }); defineOptions({\nname: "Test"\n})',
      ),
    },
    {
      description: 'checks multiple explicitly selected macros',
      code: sfc(
        'defineProps({ name: String }); defineExpose({ open }); defineOptions({ name: "Test" })',
      ),
      options: { macros: ['defineProps', 'defineOptions'] },
      errors: [
        { messageId: 'expectedNewlines', data: { name: 'defineProps' } },
        { messageId: 'expectedNewlines', data: { name: 'defineOptions' } },
      ],
      output: sfc(
        'defineProps({\nname: String\n}); defineExpose({ open }); defineOptions({\nname: "Test"\n})',
      ),
    },
    ...(
      [
        [
          'defineProps<{ name: string }>()',
          'defineProps<{\nname: string\n}>()',
        ],
        [
          'defineProps<{\n  name: string; age: number\n}>()',
          'defineProps<{\n  name: string;\nage: number\n}>()',
        ],
        [
          'defineProps<{ name: string\n}>()',
          'defineProps<{\nname: string\n}>()',
        ],
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
      ] as const
    ).map(([input, output]) => ({
      description: `only inserts required line breaks in ${input}`,
      code: sfc(input),
      errors: ['expectedNewlines' as const],
      output: sfc(output),
    })),
    ...[
      'defineExpose({ ...api, [key]: value, get name() { return "test" }, open() {} })',
      'defineProps<{ readonly name?: string; [key: string]: unknown }>()',
      'defineProps<{ name: { value: string }; fn(): void }>()',
      'defineProps<{ /* before */ name: string; /* between */ age: number /* after */ }>()',
      'defineProps<{ // leading\nname: string; // trailing\nage: number }>()',
      'defineProps<{ name: string /* before comma */, age: number, }>()',
      'defineProps<{\nname: string; /* multi\nline */ age: number }>()',
      'defineExpose({ open, // trailing\nclose /* multi\nline */ })',
      'defineExpose({ /* multi\nline */ open, close })',
    ].map(script => ({
      description: `preserves tokens, comments and fix idempotence: ${script}`,
      code: sfc(script),
      errors: ['expectedNewlines' as const],
    })),
    {
      description: 'preserves CRLF line endings',
      code: sfc('defineExpose({ open, close })').replaceAll('\n', '\r\n'),
      errors: ['expectedNewlines'],
      output: sfc('defineExpose({\nopen,\nclose\n})').replaceAll('\n', '\r\n'),
    },
    {
      description: 'fixes explicitly enabled defineOptions',
      code: sfc('defineOptions({ name: "Test" })'),
      options: { macros: ['defineOptions'] },
      errors: ['expectedNewlines'],
      output: sfc('defineOptions({\nname: "Test"\n})'),
    },
  ],
})

describe('define-macros-newline configuration', () => {
  it.each([
    { macros: ['defineModel'] },
    { macros: ['unknown'] },
    { macros: ['defineProps', 'defineProps'] },
    { macros: [1] },
    { macros: 'defineProps' },
    { macros: null },
    { deep: true },
  ])('rejects invalid options: %j', async options => {
    await expect(tester.valid({ code: sfc(''), options })).rejects.toThrow()
  })
})
