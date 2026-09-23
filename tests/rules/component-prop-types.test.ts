import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { componentPropTypes } from '../../src/rules/component-prop-types.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  ComponentPropTypeConstraint,
  ComponentPropTypesMessageId,
  ComponentPropTypesOptions,
} from '../../src/types/index.ts'

function optionsFor(
  type: ComponentPropTypeConstraint = 'number',
  unknownValues: 'ignore' | 'report' = 'ignore',
): ComponentPropTypesOptions {
  return {
    targets: [{ components: ['AppCounter'], props: { count: type } }],
    unknownValues,
  }
}
const options = optionsFor()
const template = (content: string) => `<template>${content}</template>`
const counter = (attributes: string) => template(`<AppCounter ${attributes} />`)

await run<ComponentPropTypesOptions, ComponentPropTypesMessageId>({
  name: 'component-prop-types',
  rule: componentPropTypes,
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
    { code: counter('count="wrong"') },
    { code: counter('count="wrong"'), options: { targets: [] } },
    ...[
      '',
      ':count="1"',
      ':count="-42"',
      ':count="+42"',
      ':count="~42"',
      ':count="condition ? 1 : 2"',
      ':count="value"',
      ':count="state.count"',
      ':count="getCount()"',
      ':count',
      'v-model:count.number="value"',
      'count="wrong" v-bind="{ count: 1 }"',
      'v-bind="{ count: \'wrong\', count: 1 }"',
      'v-bind="{ ...extra, count: 1 }"',
      'v-bind="extra" :count="1"',
      ':count="1" v-bind="extra"',
      'v-bind="{ count: 1, ...extra }"',
      ':count="1" :[key]="\'wrong\'"',
      'v-bind="{ ...{ count: 1 } }"',
      'v-bind="{ count: 1, ...null, ...true, ...42 }"',
    ].map(attributes => ({ code: counter(attributes), options })),
    ...[
      '<Other count="wrong" />',
      '<appcounter count="wrong" />',
      '<AppCounter v-pre count="wrong" />',
      '<div v-pre><AppCounter count="wrong" /></div>',
      '<component :is="current" count="wrong" />',
    ].map(content => ({ code: template(content), options })),
    {
      code: '<script setup lang="ts">const count: number = 1</script>',
      options,
    },
    { code: 'const count = "wrong"', filename: 'test.js', options },
    { code: 'const count: string = "wrong"', filename: 'test.ts', options },
    {
      code: template('<div count="wrong" /><svg count="wrong" />'),
      options: {
        targets: [{ components: ['div', 'svg'], props: { count: 'number' } }],
      },
    },
    ...[
      ['string', "'hello'"],
      ['string', '`hello`'],
      // The interpolation belongs to the template fixture.
      // eslint-disable-next-line no-template-curly-in-string
      ['string', '`hello${value}`'],
      ['boolean', 'true'],
      ['boolean', 'false'],
      ['boolean', '!value'],
      ['boolean', '!!value'],
      ['array', '[]'],
      ['array', '[item]'],
      ['array', '[...items]'],
      ['object', '{}'],
      ['object', '{ value }'],
      ['object', '/x/'],
      ['function', '() => {}'],
      ['function', 'function () {}'],
      ['bigint', '1n'],
      ['bigint', '-1n'],
      ['null', 'null'],
      ['undefined', 'void 0'],
      ['undefined', 'undefined'],
    ].map(([type, expression]) => ({
      description: `infers ${expression} as ${type}`,
      code: counter(`:count="${expression}"`),
      options: optionsFor(type as ComponentPropTypeConstraint, 'report'),
    })),
    {
      code: counter(':count="flag ? 1 : \'2\'"'),
      options: optionsFor(['number', 'string']),
    },
    ...[
      'count',
      'count=""',
      'count="count"',
      ':count="\'\'"',
      ':count="\'count\'"',
      'v-bind="{ count: \'\' }"',
      ':count="flag ? \'\' : false"',
    ].map(attributes => ({
      code: counter(attributes),
      options: optionsFor({ type: 'boolean', booleanCasting: true }, 'report'),
    })),
    {
      code: template('<AppCounter is-ready="is-ready" />'),
      options: {
        targets: [
          {
            components: ['AppCounter'],
            props: { isReady: { type: 'boolean', booleanCasting: true } },
          },
        ],
      },
    },
    {
      description: 'merges equivalent unordered constraints',
      code: counter(':count="1"'),
      options: {
        targets: [
          {
            components: ['AppCounter'],
            props: { count: ['number', 'string'] },
          },
          {
            components: ['app-counter'],
            props: {
              count: { type: ['string', 'number'], booleanCasting: false },
            },
          },
        ],
      },
    },
    {
      description:
        'type checks only definitely provided props, even in strict mode',
      code: counter('v-bind="extra"'),
      options: optionsFor('number', 'report'),
    },
  ],
  invalid: [
    {
      description: 'checks JavaScript templates without a TypeScript parser',
      code: `<script>export default {}</script>${counter('count="wrong"')}`,
      languageOptions: { parserOptions: { parser: null } },
      options,
      errors: ['invalidPropType'],
      output: null,
    },
    {
      description: 'a string with unknown contents may undergo Boolean casting',
      // eslint-disable-next-line no-template-curly-in-string
      code: counter(':count="`${value}`"'),
      options: optionsFor({ type: 'boolean', booleanCasting: true }),
      errors: ['possiblyInvalidPropType'],
      output: null,
    },
    {
      description: 'malformed expressions remain unknown without crashing',
      code: counter(':count="value +"'),
      options: optionsFor('number', 'report'),
      errors: ['unverifiablePropType'],
      output: null,
    },
    {
      description: 'points to the effective object property value',
      code: counter('v-bind="{ count: \'bad\' }"'),
      options,
      errors: [
        {
          messageId: 'invalidPropType',
          line: 1,
          column: 40,
          endLine: 1,
          endColumn: 45,
        },
      ],
      output: null,
    },
    {
      code: counter('count="20"'),
      options,
      errors: [
        {
          messageId: 'invalidPropType',
          data: {
            component: 'AppCounter',
            prop: 'count',
            expected: 'number',
            actual: 'string',
          },
          line: 1,
          column: 29,
          endLine: 1,
          endColumn: 33,
        },
      ],
      output: null,
    },
    ...[
      'count',
      ':count="\'20\'"',
      ':count="null"',
      ':count="undefined"',
      'v-bind="{ count: 1 }" count="wrong"',
      'v-bind="{ ...extra, count: \'wrong\' }"',
      'v-bind="{ count: 1, count: \'wrong\' }"',
      ":['count']=\"'wrong'\"",
      "v-bind=\"{ ['count']: 'wrong' }\"",
      'v-bind="{ count: () => {} }"',
      'v-bind="{ count() {} }"',
    ].map(attributes => ({
      code: counter(attributes),
      options,
      errors: ['invalidPropType' as const],
      output: null,
    })),
    ...['count="false"', 'count="true"', ':count="\'false\'"'].map(
      attributes => ({
        code: counter(attributes),
        options: optionsFor({ type: 'boolean', booleanCasting: true }),
        errors: ['invalidPropType' as const],
        output: null,
      }),
    ),
    ...['count', 'count=""', 'count="count"'].map(attributes => ({
      code: counter(attributes),
      options: optionsFor('boolean'),
      errors: ['invalidPropType' as const],
      output: null,
    })),
    ...['[]', 'null', '() => {}'].map(expression => ({
      code: counter(`:count="${expression}"`),
      options: optionsFor('object'),
      errors: ['invalidPropType' as const],
      output: null,
    })),
    ...[
      '<app-counter count="wrong" />',
      '<component is="AppCounter" count="wrong" />',
      '<component :is="\'AppCounter\'" count="wrong" />',
    ].map(content => ({
      code: template(content),
      options,
      errors: ['invalidPropType' as const],
      output: null,
    })),
    ...[
      ':count="value"',
      ':count="state.count"',
      ':count="getCount()"',
      ':count',
      'v-model:count="value"',
      'v-model:count.number="value"',
      ':count="1" v-bind="extra"',
      'v-bind="{ count: 1, ...extra }"',
      'v-bind="{ count: 1, [key]: 2 }"',
      ':count="1" :[key]="2"',
      'v-bind="{ get count() { return 1 } }"',
    ].map(attributes => ({
      code: counter(attributes),
      options: optionsFor('number', 'report'),
      errors: ['unverifiablePropType' as const],
      output: null,
    })),
    {
      description:
        'a known bad conditional branch remains reportable with an unknown branch',
      code: counter(':count="flag ? \'wrong\' : value"'),
      options,
      errors: ['possiblyInvalidPropType'],
      output: null,
    },
    {
      code: counter(':count="flag ? 1 : \'2\'"'),
      options,
      errors: [
        {
          messageId: 'possiblyInvalidPropType',
          data: {
            component: 'AppCounter',
            prop: 'count',
            expected: 'number',
            actual: 'string',
          },
        },
      ],
      output: null,
    },
    {
      code: counter(':count="flag ? 1 : value"'),
      options: optionsFor('number', 'report'),
      errors: ['unverifiablePropType'],
      output: null,
    },
    {
      description: 'type assertions do not establish runtime types',
      code: `<script setup lang="ts"></script>${counter(
        ':count="(\'wrong\' as unknown) as number"',
      )}`,
      options,
      errors: ['invalidPropType'],
      output: null,
    },
    {
      description:
        'satisfies and non-null assertions retain the original value category',
      code: `<script setup lang="ts"></script>${counter(
        ':count="(null! satisfies number)"',
      )}`,
      options,
      errors: ['invalidPropType'],
      output: null,
    },
    ...[
      `<script setup>const undefined = 1</script>${counter(':count="undefined"')}`,
      template('<AppCounter v-for="undefined in items" :count="undefined" />'),
      template(
        '<Wrapper v-slot="{ undefined }"><AppCounter :count="undefined" /></Wrapper>',
      ),
      `${template('<AppCounter :count="undefined" />')}<script setup>const undefined = 1</script>`,
    ].map(code => ({
      description: 'does not classify shadowed undefined as the global value',
      code,
      options: optionsFor('number', 'report'),
      errors: ['unverifiablePropType' as const],
      output: null,
    })),
    {
      description: 'mixed raw spellings keep value precedence unknown',
      code: template('<AppCounter page-size="wrong" :pageSize="1" />'),
      options: {
        targets: [
          { components: ['AppCounter'], props: { pageSize: 'number' } },
        ],
        unknownValues: 'report',
      },
      errors: ['unverifiablePropType'],
      output: null,
    },
    {
      description:
        'default v-model supplies modelValue without modifier coercion',
      code: template('<AppCounter v-model.number="value" />'),
      options: {
        targets: [
          { components: ['AppCounter'], props: { modelValue: 'number' } },
        ],
        unknownValues: 'report',
      },
      errors: ['unverifiablePropType'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'component-prop-types',
  rule: componentPropTypes,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})
describe('component-prop-types configuration', () => {
  it.each([
    { unknownValues: 'allow' },
    { unknownBindings: 'ignore' },
    { targets: null },
    { targets: [{ components: [], props: { count: 'number' } }] },
    { targets: [{ components: ['AppCounter'], props: {} }] },
    {
      targets: [
        { components: ['AppCounter'], props: { count: 'number' }, extra: true },
      ],
    },
    ...[
      null,
      42,
      [],
      ['number', 'number'],
      'Number',
      'any',
      { type: [] },
      { booleanCasting: true },
      { type: 'boolean', booleanCasting: 'true' },
      { type: 'number', extra: true },
    ].map(count => ({
      targets: [{ components: ['AppCounter'], props: { count } }],
    })),
    ...['', ' ', 'ref', 'class', 'style', 'key', 'onClick'].map(name => ({
      targets: [{ components: ['AppCounter'], props: { [name]: 'number' } }],
    })),
  ])('rejects invalid options: %j', async invalidOptions => {
    await expect(
      tester.valid({ code: '<template />', options: invalidOptions }),
    ).rejects.toThrow()
  })
  it.each([
    [
      { components: ['AppCounter'], props: { pageSize: 'number' } },
      { components: ['app-counter'], props: { 'page-size': 'string' } },
    ],
    [
      { components: ['AppCounter'], props: { count: 'boolean' } },
      {
        components: ['AppCounter'],
        props: { count: { type: 'boolean', booleanCasting: true } },
      },
    ],
    [
      {
        components: ['AppCounter'],
        props: { pageSize: 'number', 'page-size': 'string' },
      },
    ],
  ])('rejects conflicting normalized contracts: %j', async (...targets) => {
    await expect(
      tester.valid({ code: '<template />', options: { targets } }),
    ).rejects.toThrow(/Conflicting types/u)
  })
})
