import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { requireComponentProps } from '../../src/rules/require-component-props.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  RequireComponentPropsMessageId,
  RequireComponentPropsOptions,
} from '../../src/types/index.ts'

const options: RequireComponentPropsOptions = {
  targets: [{ components: ['AppCounter'], props: ['count'] }],
}
const template = (content: string) => `<template>${content}</template>`

await run<RequireComponentPropsOptions, RequireComponentPropsMessageId>({
  name: 'require-component-props',
  rule: requireComponentProps,
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
    {
      description:
        'uses Vue camelization for uppercase and numeric hyphen segments',
      code: template('<AppCounter :page-Size="1" :value-1="2" />'),
      options: {
        targets: [
          { components: ['AppCounter'], props: ['pageSize', 'value1'] },
        ],
      },
    },
    { code: template('<AppCounter />') },
    { code: template('<AppCounter />'), options: { targets: [] } },
    ...[
      '<Other />',
      '<appcounter />',
      '<Counter />',
      '<AppCounter count="1" />',
      '<app-counter count />',
      '<AppCounter :count="1" />',
      '<AppCounter :count="null" />',
      '<AppCounter :count="undefined" />',
      '<AppCounter :count />',
      '<AppCounter v-bind="{ count: 1 }" />',
      '<AppCounter v-bind="{ count }" />',
      '<AppCounter v-bind="{ count() {} }" />',
      '<AppCounter v-bind="{ get count() { return 1 } }" />',
      '<AppCounter v-bind="{ ...extra, count: 1 }" />',
      '<AppCounter v-bind="{ count: 1, ...extra }" />',
      '<AppCounter :count="1" v-bind="extra" />',
      '<AppCounter v-bind="extra" :count="1" />',
      '<AppCounter v-bind="{ ...{ count: 1 } }" />',
      '<AppCounter v-bind="{ [\'count\']: 1 }" />',
      '<AppCounter :[\'count\']="1" />',
      '<AppCounter v-model:count="value" />',
      '<AppCounter v-model:count.number="value" />',
      '<AppCounter v-pre />',
      '<div v-pre><AppCounter /></div>',
      '<component :is="current" />',
      '<component is="AppCounter" count />',
      '<component :is="\'AppCounter\'" count />',
    ].map(content => ({ code: template(content), options })),
    { code: '<script setup>const count = 1</script>', options },
    { code: 'const count = 1', filename: 'test.js', options },
    { code: 'const count: number = 1', filename: 'test.ts', options },
    {
      code: template('<div /><input /><svg><path /><linearGradient /></svg>'),
      options: {
        targets: [
          {
            components: ['div', 'input', 'svg', 'path', 'linearGradient'],
            props: ['count'],
          },
        ],
      },
    },
    {
      code: template('<AppCounter v-bind="extra" />'),
      options: { ...options, unknownBindings: 'ignore' },
    },
    {
      code: template('<AppCounter page-size="1" v-model="value" />'),
      options: {
        targets: [
          { components: ['app-counter'], props: ['pageSize', 'modelValue'] },
        ],
      },
    },
    {
      code: template('<AppCounter :page-size.camel="1" />'),
      options: {
        targets: [{ components: ['AppCounter'], props: ['pageSize'] }],
      },
    },
  ],
  invalid: [
    {
      code: template('<AppCounter />'),
      options,
      errors: [
        {
          messageId: 'missingProp',
          data: { component: 'AppCounter', prop: 'count' },
          line: 1,
          column: 12,
          endLine: 1,
          endColumn: 22,
        },
      ],
      output: null,
    },
    ...[
      '<app-counter />',
      '<component is="AppCounter" />',
      '<component :is="\'AppCounter\'" />',
      '<AppCounter v-bind="{ other: 1 }" />',
      '<AppCounter @count="handler" />',
      '<AppCounter v-bind="null" />',
      '<AppCounter v-bind="undefined" />',
      '<AppCounter v-bind="{ ...void 0, 1: true }" />',
      '<AppCounter v-bind="{ ...null, other: 1 }" />',
    ].map(content => ({
      code: template(content),
      options,
      errors: ['missingProp' as const],
      output: null,
    })),
    ...[
      '<AppCounter v-bind="extra" />',
      '<AppCounter :[key]="1" />',
      '<AppCounter v-bind="{ [key]: 1 }" />',
      '<AppCounter v-bind="{ ...extra }" />',
      '<AppCounter :count.prop="1" />',
      '<AppCounter :count.attr="1" />',
      '<AppCounter v-model:[key]="value" />',
    ].map(content => ({
      code: template(content),
      options,
      errors: ['unverifiableRequiredProp' as const],
      output: null,
    })),
    {
      description: 'ignore only suppresses uncertain presence',
      code: template('<AppCounter v-bind="{ other: 1 }" />'),
      options: { ...options, unknownBindings: 'ignore' },
      errors: ['missingProp'],
      output: null,
    },
    {
      description: 'forced unrelated attributes do not mask missing props',
      code: template('<AppCounter :other.prop="1" />'),
      options,
      errors: ['missingProp'],
      output: null,
    },
    {
      description: 'merges overlapping targets and normalizes only hyphens',
      code: template('<AppCounter pagesize="1" />'),
      options: {
        targets: [
          { components: ['AppCounter'], props: ['pageSize'] },
          { components: ['app-counter'], props: ['page-size', 'modelValue'] },
        ],
      },
      errors: [
        {
          messageId: 'missingProp',
          data: { component: 'AppCounter', prop: 'pageSize' },
        },
        {
          messageId: 'missingProp',
          data: { component: 'AppCounter', prop: 'modelValue' },
        },
      ],
      output: null,
    },
    ...[false, true].map(typescript => ({
      description: `checks templates with both script blocks (${typescript ? 'TS' : 'JS'})`,
      code: `<script${typescript ? ' lang="ts"' : ''}>export default {}</script><script setup${typescript ? ' lang="ts"' : ''}>const count = 1</script>${template('<AppCounter />')}`,
      languageOptions: typescript
        ? vueLanguageOptions
        : { parserOptions: { parser: null } },
      options,
      errors: ['missingProp' as const],
      output: null,
    })),
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-component-props',
  rule: requireComponentProps,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})
describe('require-component-props configuration', () => {
  it.each([
    { unknownBindings: 'allow' },
    { unknownValues: 'ignore' },
    { targets: null },
    { targets: [{}] },
    ...[
      { components: [], props: ['count'] },
      { components: ['AppCounter'], props: [] },
      { components: [''], props: ['count'] },
      { components: ['AppCounter'], props: [''] },
      { components: ['AppCounter', 'AppCounter'], props: ['count'] },
      { components: ['AppCounter'], props: ['count', 'count'] },
      { components: ['AppCounter'], props: ['count'], extra: true },
      ...['class', 'style', 'key', 'ref', 'onClick', 'on-click', 'is'].map(
        prop => ({ components: ['AppCounter'], props: [prop] }),
      ),
    ].map(target => ({ targets: [target] })),
  ])('rejects invalid options: %j', async invalidOptions => {
    await expect(
      tester.valid({ code: '<template />', options: invalidOptions }),
    ).rejects.toThrow()
  })
})
