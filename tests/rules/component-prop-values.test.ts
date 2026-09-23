import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { componentPropValues } from '../../src/rules/component-prop-values.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  ComponentPropValueConstraint,
  ComponentPropValuesMessageId,
  ComponentPropValuesOptions,
} from '../../src/types/index.ts'

function optionsFor(
  constraint: ComponentPropValueConstraint = { multipleOf: 10 },
  unknownValues: 'ignore' | 'report' = 'ignore',
): ComponentPropValuesOptions {
  return {
    targets: [{ components: ['AppCounter'], props: { count: constraint } }],
    unknownValues,
  }
}
const options = optionsFor()
const strict = optionsFor({ multipleOf: 10 }, 'report')
const template = (content: string) => `<template>${content}</template>`
const counter = (attributes: string) => template(`<AppCounter ${attributes} />`)

await run<ComponentPropValuesOptions, ComponentPropValuesMessageId>({
  name: 'component-prop-values',
  rule: componentPropValues,
  onResult(testcase, result) {
    if (testcase.type !== 'invalid') {
      return
    }
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(testcase.code)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    { code: counter(':count="25"') },
    { code: counter(':count="25"'), options: { targets: [] } },
    ...[
      '',
      ':count="0"',
      ':count="-10"',
      ':count="+20"',
      ':count="~(-21)"',
      ':count="10 * 3"',
      ':count="10 + 20"',
      ':count="30 - 20"',
      ':count="100 / 10"',
      ':count="30 % 20"',
      ':count="10 ** 2"',
      ':count="flag ? 20 : 30"',
      ':count="(flag ? 1 : 2) * 10"',
      'v-bind="{ count: 25, count: 20 }"',
      'v-bind="extra" :count="20"',
      'v-bind="{ ...extra, count: 20 }"',
      'v-bind="{ ...{ count: 20 } }"',
      'v-bind="{ count: 20, ...null, ...false, ...1 }"',
      'count="wrong" v-bind="{ count: 20 }"',
      'v-bind="extra"',
    ].map(attributes => ({ code: counter(attributes), options: strict })),
    ...[
      ':count="value"',
      ':count="getCount()"',
      ':count="value * 10"',
      ':count="flag ? 20 : value"',
      ':count="25" v-bind="extra"',
      'v-bind="{ count: 25, ...extra }"',
    ].map(attributes => ({ code: counter(attributes), options })),
    ...[
      '<Other :count="25" />',
      '<appcounter :count="25" />',
      '<AppCounter v-pre :count="25" />',
      '<div v-pre><AppCounter :count="25" /></div>',
      '<component :is="current" :count="25" />',
    ].map(content => ({ code: template(content), options: strict })),
    { code: 'const count = 25', filename: 'test.js', options },
    { code: 'const count: number = 25', filename: 'test.ts', options },
    { code: '<script setup>const count = 25</script>', options },
    {
      code: template('<div :count="25" /><svg :count="25" />'),
      options: {
        targets: [
          { components: ['div', 'svg'], props: { count: { multipleOf: 10 } } },
        ],
      },
    },
    ...['0', '10', '100'].map(expression => ({
      code: counter(`:count="${expression}"`),
      options: optionsFor({ multipleOf: 10, minimum: 0, maximum: 100 }),
    })),
    ...['true', 'false', 'null', '10', "'primary'"].map(expression => ({
      code: counter(`:count="${expression}"`),
      options: optionsFor(
        { enum: [true, false, null, 10, 'primary'] },
        'report',
      ),
    })),
    {
      code: counter('count="primary"'),
      options: optionsFor({
        enum: ['primary', 'secondary'],
        pattern: '^pri',
        minLength: 1,
        maxLength: 7,
      }),
    },
    ...['count="😀"', ':count="`😀`"', ':count="\'😀\'"'].map(attributes => ({
      code: counter(attributes),
      options: optionsFor(
        { minLength: 1, maxLength: 1, pattern: '^.$' },
        'report',
      ),
    })),
    {
      code: counter('count'),
      options: optionsFor(
        { minLength: 0, maxLength: 0, pattern: '' },
        'report',
      ),
    },
    {
      description: 'regex matching is unanchored unless requested',
      code: counter('count="prefix-ready-suffix"'),
      options: optionsFor({ pattern: 'ready' }),
    },
    {
      description:
        'equivalent normalized constraints merge regardless of key or enum order',
      code: template('<app-counter :page-size="20" />'),
      options: {
        targets: [
          {
            components: ['AppCounter'],
            props: { pageSize: { enum: [10, 20], minimum: 10 } },
          },
          {
            components: ['app-counter'],
            props: { 'page-size': { minimum: 10, enum: [20, 10] } },
          },
        ],
      },
    },
  ],
  invalid: [
    {
      description: 'bounds deep expression analysis',
      code: counter(`:count="${'+('.repeat(34)}20${')'.repeat(34)}"`),
      options: strict,
      errors: ['unverifiablePropValue'],
      output: null,
    },
    {
      description: 'bounds cross-products of conditional candidates',
      code: counter(
        `:count="(${'flag ? 10 : '.repeat(8)}20) * (${'flag ? 10 : '.repeat(8)}20)"`,
      ),
      options: strict,
      errors: ['unverifiablePropValue'],
      output: null,
    },
    {
      code: counter(':count="25"'),
      options,
      errors: [
        {
          messageId: 'invalidPropValue',
          data: {
            component: 'AppCounter',
            prop: 'count',
            expected: 'a multiple of 10',
            actual: '25',
          },
          line: 1,
          column: 31,
          endLine: 1,
          endColumn: 33,
        },
      ],
      output: null,
    },
    ...[
      'count',
      'count="20"',
      ':count="\'20\'"',
      ':count="25"',
      ':count="-25"',
      ':count="20.5"',
      ':count="10 * 2.5"',
      ':count="true"',
      ':count="null"',
      ':count="undefined"',
      ':count="void getCount()"',
      ':count="1n"',
      ':count="-1n"',
      ':count="~1n"',
      ':count="[]"',
      ':count="{}"',
      ':count="/x/"',
      ':count="() => 20"',
      ':count="1 / 0"',
      ':count="0 / 0"',
      ':count="1e309"',
      'v-bind="{ count: 20, count: 25 }"',
      'v-bind="{ ...extra, count: 25 }"',
      'v-bind="{ count: 20 }" :count="25"',
      'v-bind="{ [\'count\']: 25 }"',
      ':[\'count\']="25"',
    ].map(attributes => ({
      code: counter(attributes),
      options,
      errors: ['invalidPropValue' as const],
      output: null,
    })),
    ...[
      ':count="flag ? 20 : 25"',
      ':count="flag ? 25 : value"',
      ':count="flag ? other ? 20 : 25 : 30"',
      ':count="(flag ? 2 : 2.5) * 10"',
      ':count="(flag ? 2.5 : value) * 10"',
    ].map(attributes => ({
      code: counter(attributes),
      options,
      errors: ['possiblyInvalidPropValue' as const],
      output: null,
    })),
    ...[
      ':count="value"',
      ':count="state.count"',
      ':count="getCount()"',
      ':count="value * 10"',
      ':count="flag ? 20 : value"',
      ':count',
      'v-model:count.number="value"',
      ':count="20" v-bind="extra"',
      ':count="20" :[key]="25"',
      'v-bind="{ count: 20, ...extra }"',
      'v-bind="{ get count() { return 20 } }"',
      'v-bind="{ count: 20, [key]: 25 }"',
      ':count="+\'20\'"',
    ].map(attributes => ({
      code: counter(attributes),
      options: strict,
      errors: ['unverifiablePropValue' as const],
      output: null,
    })),
    ...[
      '<app-counter :count="25" />',
      '<component is="AppCounter" :count="25" />',
      '<component :is="\'AppCounter\'" :count="25" />',
    ].map(content => ({
      code: template(content),
      options,
      errors: ['invalidPropValue' as const],
      output: null,
    })),
    ...[
      { code: counter(':count="-10"'), constraint: { minimum: 0 } },
      { code: counter(':count="110"'), constraint: { maximum: 100 } },
      {
        code: counter(':count="25"'),
        constraint: { minimum: 30, multipleOf: 10 },
      },
      { code: counter('count="a"'), constraint: { minLength: 2 } },
      { code: counter('count="abc"'), constraint: { maxLength: 2 } },
      {
        code: counter('count="secondary"'),
        constraint: { pattern: '^primary$' },
      },
      { code: counter(':count="20"'), constraint: { minLength: 1 } },
      { code: counter('count="10"'), constraint: { enum: [10] } },
      { code: counter(':count="false"'), constraint: { enum: [true] } },
      { code: counter(':count="null"'), constraint: { enum: [false] } },
      { code: counter(':count="{}"'), constraint: { enum: [null] } },
      { code: counter(':count="undefined"'), constraint: { enum: [null] } },
    ].map(({ code, constraint }) => ({
      code,
      options: optionsFor(constraint),
      errors: ['invalidPropValue' as const],
      output: null,
    })),
    ...[
      { expression: `\`hello\${value}\``, constraint: { maxLength: 20 } },
      { expression: '!value', constraint: { enum: [true] } },
      { expression: 'typeof value', constraint: { enum: ['number'] } },
    ].map(({ expression, constraint }) => ({
      code: counter(`:count="${expression}"`),
      options: optionsFor(constraint, 'report'),
      errors: ['unverifiablePropValue' as const],
      output: null,
    })),
    {
      description: 'TS wrappers preserve the actual value',
      code: `<script setup lang="ts"></script>${counter(':count="((25 as number) satisfies number)!"')}`,
      options,
      errors: ['invalidPropValue'],
      output: null,
    },
    {
      description: 'JS SFCs work without a TS parser',
      code: `<script setup>const value = 20</script>${counter(':count="25"')}`,
      languageOptions: { parserOptions: { parser: null } },
      options,
      errors: ['invalidPropValue'],
      output: null,
    },
    {
      description: 'dual scripts do not change template scope',
      code: `<script>export default {}</script><script setup lang="ts">const value = 20</script>${counter(':count="25"')}`,
      options,
      errors: ['invalidPropValue'],
      output: null,
    },
    ...[
      `<script setup>const undefined = 20</script>${counter(':count="undefined"')}`,
      template('<AppCounter v-for="undefined in items" :count="undefined" />'),
      template(
        '<Wrapper v-slot="{ undefined }"><AppCounter :count="undefined" /></Wrapper>',
      ),
    ].map(code => ({
      code,
      options: strict,
      errors: ['unverifiablePropValue' as const],
      output: null,
    })),
    {
      description: 'mixed prop spellings keep precedence uncertain',
      code: template('<AppCounter :page-size="20" :pageSize="25" />'),
      options: {
        targets: [
          {
            components: ['AppCounter'],
            props: { pageSize: { multipleOf: 10 } },
          },
        ],
        unknownValues: 'report',
      },
      errors: ['unverifiablePropValue'],
      output: null,
    },
    {
      description: 'default v-model checks modelValue',
      code: template('<AppCounter v-model="value" />'),
      options: {
        targets: [
          {
            components: ['AppCounter'],
            props: { modelValue: { multipleOf: 10 } },
          },
        ],
        unknownValues: 'report',
      },
      errors: ['unverifiablePropValue'],
      output: null,
    },
    {
      description:
        'multiple failing constraints produce a single prop diagnostic',
      code: counter(':count="25"'),
      options: optionsFor({ multipleOf: 10, minimum: 30 }),
      errors: [
        {
          messageId: 'invalidPropValue',
          data: {
            component: 'AppCounter',
            prop: 'count',
            expected: 'a multiple of 10 and at least 30',
            actual: '25',
          },
        },
      ],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'component-prop-values',
  rule: componentPropValues,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})
describe('component-prop-values configuration', () => {
  it.each([
    { unknownValues: 'allow' },
    { unknownBindings: 'ignore' },
    { targets: null },
    { targets: [{ components: [], props: { count: { multipleOf: 10 } } }] },
    { targets: [{ components: ['AppCounter'], props: {} }] },
    {
      targets: [
        {
          components: ['AppCounter'],
          props: { count: { multipleOf: 10 } },
          extra: true,
        },
      ],
    },
    ...[
      null,
      [],
      {},
      10,
      { type: 'number' },
      { mutlipleOf: 10 },
      { multipleOf: 0 },
      { multipleOf: -10 },
      { multipleOf: 0.1 },
      { multipleOf: Number.MAX_SAFE_INTEGER + 1 },
      { multipleOf: Infinity },
      { minimum: Infinity },
      { maximum: -Infinity },
      { minimum: NaN },
      { minimum: '0' },
      { maximum: false },
      { minimum: 20, maximum: 10 },
      { minLength: -1 },
      { maxLength: 1.5 },
      { minLength: 3, maxLength: 2 },
      { maxLength: Number.MAX_SAFE_INTEGER + 1 },
      { minLength: '1' },
      { minimum: 0, pattern: '.' },
      { multipleOf: 10, minLength: 1 },
      { pattern: '[' },
      { pattern: true },
      { enum: [] },
      { enum: [1, 1] },
      { enum: [NaN] },
      { enum: [Infinity] },
      { enum: [{}] },
      { enum: [[1]] },
      { enum: ['x'], extra: true },
    ].map(count => ({
      targets: [{ components: ['AppCounter'], props: { count } }],
    })),
    ...['', ' ', 'ref', 'class', 'style', 'key', 'onClick'].map(name => ({
      targets: [
        { components: ['AppCounter'], props: { [name]: { multipleOf: 10 } } },
      ],
    })),
  ])('rejects invalid options: %j', async invalidOptions => {
    await expect(
      tester.valid({ code: '<template />', options: invalidOptions }),
    ).rejects.toThrow()
  })
  it('rejects conflicting normalized contracts', async () => {
    await expect(
      tester.valid({
        code: '<template />',
        options: {
          targets: [
            {
              components: ['AppCounter'],
              props: { pageSize: { multipleOf: 10 } },
            },
            {
              components: ['app-counter'],
              props: { 'page-size': { multipleOf: 20 } },
            },
          ],
        },
      }),
    ).rejects.toThrow(/Conflicting values/u)
  })
})
