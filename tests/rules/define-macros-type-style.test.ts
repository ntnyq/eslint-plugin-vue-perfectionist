import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { defineMacrosTypeStyle } from '../../src/rules/define-macros-type-style.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import { checkedMacroTypes, sfc, skippedMacroTypes } from '../macro-types.ts'
import type {
  DefineMacrosTypeStyle,
  DefineMacrosTypeStyleMessageId,
  DefineMacrosTypeStyleOptions,
} from '../../src/types/index.ts'

const macros = ['defineProps', 'defineEmits', 'defineSlots'] as const
const localDeclarations = [
  'interface Props { title: string }',
  'type Props = { title: string }',
  'type Props<T = string> = { title: T }',
  'interface Props {}; interface Props { title: string }',
  'interface Props {}; const Props = 1',
  'const Props = 1; type Props = {}',
  'import type { External } from "types"; type Props = External',
  'import type { External } from "types"; type Props = Partial<External>',
  'import type { External } from "types"; interface Props extends External {}',
]
const importedDeclarations = [
  'import type { Props } from "types"',
  'import { type Props } from "types"',
  'import { Props } from "types"',
  'import type { External as Props } from "types"',
  'import Props from "types"',
  'import type Props from "types"',
]
const allStyles: DefineMacrosTypeStyle[] = ['inline', 'local', 'imported']
const combinations: DefineMacrosTypeStyle[][] = [
  ['inline'],
  ['local'],
  ['imported'],
  ['inline', 'local'],
  ['inline', 'imported'],
  ['local', 'imported'],
  allStyles,
]

await run<DefineMacrosTypeStyleOptions, DefineMacrosTypeStyleMessageId>({
  name: 'define-macros-type-style',
  rule: defineMacrosTypeStyle,
  onResult(testcase, result) {
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(testcase.code)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...macros.flatMap(macro =>
      localDeclarations.map(declaration => ({
        code: sfc(`${declaration}; ${macro}<Props>()`),
      })),
    ),
    ...importedDeclarations.map(declaration => ({
      code: sfc(`${declaration}; defineProps<Props>()`),
      options: { macros: { defineProps: 'imported' as const } },
    })),
    ...[
      'import * as Contracts from "types"; defineProps<Contracts.Props>()',
      'import type * as Contracts from "types"; defineProps<Contracts.Nested.Props<string>>()',
      'defineProps<import("types").Props>()',
      'defineProps<import("types").Props<string>>()',
    ].map(script => ({
      code: sfc(script),
      options: { macros: { defineProps: 'imported' as const } },
    })),
    ...[
      '{}',
      '(event: "save") => void',
      '({ title: string })',
      '{ title: import("types").Title }',
    ].map(type => ({
      code: sfc(`defineProps<${type}>()`),
      options: { macros: { defineProps: 'inline' as const } },
    })),
    ...combinations.flatMap(styles =>
      styles.map(style => ({
        description: `accepts ${style} in ${styles.join(', ')}`,
        code: sfc(
          style === 'inline'
            ? 'defineProps<{}>()'
            : style === 'local'
              ? 'type Props = {}; defineProps<Props>()'
              : 'import type { Props } from "types"; defineProps<Props>()',
        ),
        options: { macros: { defineProps: styles } },
      })),
    ),
    ...skippedMacroTypes.map(script => ({ code: sfc(script) })),
    { code: sfc('defineProps<Props>(); type Props = {}') },
    {
      code: sfc(
        'type Props<T> = {}; defineProps<Props<import("types").Value>>()',
      ),
    },
    {
      code: sfc('defineProps<{}>(); defineEmits<{}>(); defineSlots<{}>()'),
      options: {
        macros: { defineProps: false, defineEmits: false, defineSlots: false },
      },
    },
    ...[false, true].flatMap(reverse =>
      [
        'interface Props {}',
        'export type Props = {}',
        'import type { Props } from "types"',
      ].map(declaration => {
        const ordinary = `<script lang="ts">${declaration}</script>`
        const setup = sfc('defineProps<Props>()')
        return {
          code: reverse ? setup + ordinary : ordinary + setup,
          options: {
            macros: {
              defineProps: ['local', 'imported'] as DefineMacrosTypeStyle[],
            },
          },
        }
      }),
    ),
    { code: '<script lang="ts">defineProps<{}>()</script>' },
    {
      code: `<script lang="ts">defineProps<{}>()</script>${sfc('const value = 1')}`,
    },
    { code: '<template>{{ defineProps() }}</template>' },
    {
      code: '<script setup>defineProps({ title: String })</script>',
      languageOptions: { parserOptions: { parser: null } },
    },
    { code: 'defineProps<{}>()', filename: 'test.ts' },
    { code: 'defineProps({})', filename: 'test.js' },
    { code: 'defineProps<{}>()', languageOptions: { parser: tsParser } },
  ],
  invalid: [
    ...macros.flatMap(macro =>
      [undefined, {}, { macros: {} }].map(options => ({
        code: sfc(`${macro}<{}>()`),
        options,
        errors: [
          {
            messageId: 'unexpectedTypeStyle' as const,
            data: { macro, expected: 'local', actual: 'inline' },
          },
        ],
        output: null,
      })),
    ),
    ...checkedMacroTypes.map(script => ({
      code: sfc(script),
      errors: ['unexpectedTypeStyle' as const],
      output: null,
    })),
    ...importedDeclarations.map(declaration => ({
      code: sfc(`${declaration}; defineProps<Props>()`),
      errors: [
        {
          messageId: 'unexpectedTypeStyle' as const,
          data: { macro: 'defineProps', expected: 'local', actual: 'imported' },
        },
      ],
      output: null,
    })),
    ...[
      'defineProps<Missing>()',
      'defineProps<Partial<Props>>()',
      'declare interface Props {}; defineProps<Props>()',
      'declare type Props = {}; defineProps<Props>()',
      'declare global { interface Props {} }; defineProps<Props>()',
      'class Props {}; defineProps<Props>()',
      'enum Props {}; defineProps<Props>()',
      'const Props = {}; defineProps<Props>()',
      'interface Props {}; class Props {}; defineProps<Props>()',
      'type Props = {}; interface Props {}; defineProps<Props>()',
      'import type { Props } from "types"; interface Props {}; defineProps<Props>()',
      'import * as Props from "types"; defineProps<Props>()',
    ].map(script => ({
      code: sfc(script),
      options: { macros: { defineProps: allStyles } },
      errors: ['unknownTypeSource' as const],
      output: null,
    })),
    {
      code: '<script setup lang="ts" generic="Props">defineProps<Props>()</script>',
      errors: ['unknownTypeSource'],
      output: null,
    },
    ...[
      'Props | Other',
      'Props & Other',
      '{ [K in Keys]: string }',
      'T extends U ? Props : Other',
      'Props["title"]',
      'typeof props',
      'typeof import("types").Props',
      'import("types")',
      'string',
      'unknown',
      'Props[]',
      '[Props]',
    ].map(type => ({
      code: sfc(`defineProps<${type}>()`),
      errors: ['unsupportedTypeForm' as const],
      output: null,
    })),
    ...[
      'namespace Contracts { export interface Props {} }; defineProps<Contracts.Props>()',
      'import Contracts from "types"; defineProps<Contracts.Props>()',
      'import { Contracts } from "types"; defineProps<Contracts.Props>()',
    ].map(script => ({
      code: sfc(script),
      errors: ['unsupportedTypeForm' as const],
      output: null,
    })),
    {
      code: sfc('defineProps<{}>(); defineEmits<{}>(); defineSlots<{}>()'),
      options: { macros: { defineProps: false } },
      errors: ['unexpectedTypeStyle', 'unexpectedTypeStyle'],
      output: null,
    },
    {
      code: sfc('defineProps<{}>()'),
      options: { macros: { defineProps: ['imported', 'local'] } },
      errors: [
        {
          messageId: 'unexpectedTypeStyle',
          data: {
            macro: 'defineProps',
            expected: 'local, imported',
            actual: 'inline',
          },
          line: 2,
          column: 13,
          endLine: 2,
          endColumn: 15,
        },
      ],
      output: null,
    },
    {
      code: sfc('defineProps<{}>()').replaceAll('\n', '\r\n'),
      errors: ['unexpectedTypeStyle'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'define-macros-type-style',
  rule: defineMacrosTypeStyle,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})
it.each([
  { unknown: true },
  { macros: { unknown: 'local' } },
  { macros: null },
  ...[true, null, [], ['local', 'local'], ['local', false], 'external', 1].map(
    value => ({ macros: { defineProps: value } }),
  ),
])('rejects invalid options %j', async options => {
  await expect(
    tester.valid({ code: sfc('defineProps<Props>()'), options }),
  ).rejects.toThrow()
})
