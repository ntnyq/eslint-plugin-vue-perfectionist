import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { requireMacroTypeName } from '../../src/rules/require-macro-type-name.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import { checkedMacroTypes, sfc, skippedMacroTypes } from '../macro-types.ts'
import type {
  RequireMacroTypeNameMessageId,
  RequireMacroTypeNameOptions,
} from '../../src/types/index.ts'

const macros = [
  ['defineProps', 'Props'],
  ['defineEmits', 'Emits'],
  ['defineSlots', 'Slots'],
] as const
const customNames = [
  'ButtonProps',
  '属性',
  'Événements',
  '$Props',
  '_Props',
  'Pr〇ps',
  '𐐀Props',
  'P\u{200C}ro p'.replace(' ', ''),
  'type',
  'namespace',
  'as',
  'satisfies',
  'using',
  'out',
  'intrinsic',
  'eval',
  'arguments',
]

await run<RequireMacroTypeNameOptions, RequireMacroTypeNameMessageId>({
  name: 'require-macro-type-name',
  rule: requireMacroTypeName,
  onResult(testcase, result) {
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(testcase.code)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...macros.flatMap(([macro, name]) =>
      [
        `${macro}<${name}>()`,
        `type ${name} = {}; ${macro}<${name}>()`,
        `interface ${name} {}; ${macro}<${name}>()`,
        `import type { External as ${name} } from "types"; ${macro}<${name}>()`,
        `${macro}<${name}<Other>>()`,
        `${macro}<(${name})>()`,
      ].map(script => ({ code: sfc(script) })),
    ),
    ...customNames.map(name => ({
      code: sfc(`type ${name} = {}; defineProps<${name}>()`),
      options: { macros: { defineProps: name } },
    })),
    ...checkedMacroTypes.map(script => ({
      code: sfc(script.replace('{}>', 'Props>')),
    })),
    ...skippedMacroTypes.map(script => ({ code: sfc(script) })),
    { code: sfc('defineProps<\\u0050rops>()') },
    {
      code: sfc('defineProps<{}>(); defineEmits<{}>(); defineSlots<{}>()'),
      options: {
        macros: { defineProps: false, defineEmits: false, defineSlots: false },
      },
    },
    {
      code: sfc(
        'defineProps<ButtonProps>(); defineEmits<Emits>(); defineSlots<Slots>()',
      ),
      options: { macros: { defineProps: 'ButtonProps' } },
    },
    ...[true, false].map(reverse => {
      const script =
        '<script lang="ts">defineProps<Wrong>(); interface Props {}</script>'
      const setup = sfc('defineProps<Props>()')
      return { code: reverse ? setup + script : script + setup }
    }),
    {
      code: '<script setup lang="ts" generic="Props">defineProps<Props>()</script>',
    },
    { code: '<script lang="ts">defineProps<Wrong>()</script>' },
    { code: '<template>{{ defineProps() }}</template>' },
    {
      code: '<script setup>defineProps({ title: String })</script>',
      languageOptions: { parserOptions: { parser: null } },
    },
    { code: 'defineProps<Wrong>()', filename: 'test.ts' },
    { code: 'defineProps({})', filename: 'test.js' },
    { code: 'defineProps<Wrong>()', languageOptions: { parser: tsParser } },
  ],
  invalid: [
    ...macros.flatMap(([macro, expected]) =>
      [undefined, {}, { macros: {} }].map(options => ({
        code: sfc(`${macro}<Wrong>()`),
        ...(options ? { options } : {}),
        errors: [
          {
            messageId: 'unexpectedTypeName' as const,
            data: { macro, expected, actual: 'Wrong' },
          },
        ],
        output: null,
      })),
    ),
    ...macros.map(([macro, expected]) => ({
      code: sfc(`${macro}<{}>()`),
      errors: [
        { messageId: 'expectedNamedType' as const, data: { macro, expected } },
      ],
      output: null,
    })),
    ...checkedMacroTypes.map(script => ({
      code: sfc(script),
      errors: ['expectedNamedType' as const],
      output: null,
    })),
    ...[
      'Contracts.Props',
      'import("types").Props',
      'Props & Other',
      'Props | Other',
      '(event: "save") => void',
      '{ [K in Keys]: string }',
      'T extends U ? Props : Other',
      'Props["title"]',
      'typeof props',
      'string',
    ].map(type => ({
      code: sfc(`defineProps<${type}>()`),
      errors: ['expectedNamedType' as const],
      output: null,
    })),
    ...['Partial<Props>', 'props', 'ButtonProps'].map(type => ({
      code: sfc(`defineProps<${type}>()`),
      errors: ['unexpectedTypeName' as const],
      output: null,
    })),
    {
      code: sfc(
        'import type { Props as ButtonProps } from "types"; defineProps<ButtonProps>()',
      ),
      errors: ['unexpectedTypeName'],
      output: null,
    },
    {
      code: sfc('defineProps<Wrong<Other>>()'),
      errors: [
        {
          messageId: 'unexpectedTypeName',
          data: { macro: 'defineProps', expected: 'Props', actual: 'Wrong' },
          line: 2,
          column: 13,
          endLine: 2,
          endColumn: 18,
        },
      ],
      output: null,
    },
    {
      code: sfc('defineProps<{}>()'),
      errors: [
        {
          messageId: 'expectedNamedType',
          line: 2,
          column: 13,
          endLine: 2,
          endColumn: 15,
        },
      ],
      output: null,
    },
    {
      code: sfc(
        'defineProps<Props>(); defineEmits<Emits>(); defineSlots<Slots>()',
      ),
      options: {
        macros: {
          defineProps: 'ButtonProps',
          defineEmits: 'ButtonEmits',
          defineSlots: 'ButtonSlots',
        },
      },
      errors: [
        'unexpectedTypeName',
        'unexpectedTypeName',
        'unexpectedTypeName',
      ],
      output: null,
    },
    {
      code: sfc('defineProps<{}>(); defineEmits<{}>(); defineSlots<{}>()'),
      options: { macros: { defineProps: false } },
      errors: ['expectedNamedType', 'expectedNamedType'],
      output: null,
    },
    {
      code: sfc('defineProps<Wrong>()').replaceAll('\n', '\r\n'),
      errors: ['unexpectedTypeName'],
      output: null,
    },
    {
      code: sfc('defineProps<Wrong>()'),
      languageOptions: { globals: { defineProps: 'readonly' } },
      errors: ['unexpectedTypeName'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-macro-type-name',
  rule: requireMacroTypeName,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})
it.each([
  { unknown: 'Props' },
  { macros: { unknown: 'Props' } },
  { macros: null },
  ...[
    true,
    null,
    [],
    ['Props'],
    1,
    '',
    ' Props',
    'Props ',
    'P rops',
    'A.B',
    '1Props',
    'Props<T>',
    'A-B',
    '💡',
    '\\u0050rops',
    'class',
    'await',
    'yield',
    'interface',
    'implements',
    'let',
    'static',
    'private',
    'public',
    'package',
    'protected',
    'null',
    'true',
    'false',
    'any',
    'unknown',
    'never',
    'number',
    'bigint',
    'boolean',
    'string',
    'symbol',
    'void',
    'object',
    'undefined',
  ].map(value => ({ macros: { defineProps: value } })),
])('rejects invalid options %j', async options => {
  await expect(
    tester.valid({ code: sfc('defineProps<Props>()'), options }),
  ).rejects.toThrow()
})

it.each(customNames)('accepts a compiler-valid type alias name: %s', name => {
  const filename = 'contract.ts'
  const source = ts.createSourceFile(
    filename,
    `export {}; type ${name} = {}`,
    ts.ScriptTarget.Latest,
    true,
  )
  const options = { noLib: true }
  const host = ts.createCompilerHost(options)
  host.getSourceFile = file => (file === filename ? source : undefined)
  const program = ts.createProgram([filename], options, host)
  expect(program.getSyntacticDiagnostics()).toEqual([])
  expect(program.getSemanticDiagnostics()).toEqual([])
})
