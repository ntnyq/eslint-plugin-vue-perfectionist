import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { requireVueGeneric } from '../../src/rules/require-vue-generic.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  RequireVueGenericMessageId,
  RequireVueGenericOptions,
} from '../../src/types/index.ts'

const options: RequireVueGenericOptions = {
  targets: [
    {
      components: ['ElTableColumn'],
      ignoreWhen: [{ props: { type: { enum: ['index'] } } }],
    },
  ],
}

function template(content: string): string {
  return `<template>${content}</template>`
}

await run<RequireVueGenericOptions, RequireVueGenericMessageId>({
  name: 'require-vue-generic',
  rule: requireVueGeneric,
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
      description: 'excludes slot outlets from generic comment requirements',
      code: template(
        '<slot /><slot name="footer"><!-- @vue-generic {Item} --><Slot /></slot>',
      ),
      options: { targets: [{ components: ['Slot'] }] },
    },
    { code: template('<ElTableColumn />') },
    { code: template('<ElTableColumn />'), options: { targets: [] } },
    ...[
      '<Other />',
      '<el-tablecolumn />',
      '<eltablecolumn />',
      '<ElTableColumn v-pre />',
      '<div v-pre><ElTableColumn /></div>',
      '<component :is="current" />',
      '<ElTableColumn type="index" />',
      '<el-table-column :type="\'index\'" />',
      '<ElTableColumn :type="`index`" />',
      '<ElTableColumn :type="\'index\' as string" />',
      '<ElTableColumn v-bind="{ type: \'index\' }" />',
      '<ElTableColumn v-bind="{ ...extra, type: \'index\' }" />',
      '<ElTableColumn v-bind="extra" type="index" />',
      "<ElTableColumn :['type']=\"'index'\" />",
      "<ElTableColumn :type=\"flag ? 'index' : 'index'\" />",
      '<!-- @vue-generic {Course} --><ElTableColumn />',
      "<!-- @vue-generic {import('#types').IAiCourse} -->\n<ElTableColumn />",
      '<!-- @vue-generic {Course, string} --><ElTableColumn />',
      '<!-- @vue-generic {{ id: number }} --><ElTableColumn />',
      '<!-- @vue-generic {\nCourse\n} -->\n\n<ElTableColumn />',
      '<!-- @vue-generic {Course} --><!-- note -->\n<ElTableColumn />',
      '<!-- note --><!-- @vue-generic {Course} --><ElTableColumn />',
      '<!-- @vue-generic {} --><!-- @vue-generic {Course} --><ElTableColumn />',
      '<!-- @vue-generic {Course} --><!-- @vue-generic malformed --><ElTableColumn />',
      '<!-- @vue-generic {Course} --><component is="ElTableColumn" />',
      '<!-- @vue-generic {Course} --><component :is="\'ElTableColumn\'" />',
      '<ElTableColumn type="index"><!-- @vue-generic {Course} --><ElTableColumn /></ElTableColumn>',
      '<!-- @vue-generic {Course} --><ElTableColumn v-for="item in items" v-if="ok" />',
    ].map(content => ({
      code: template(content),
      options,
    })),
    ...[
      '<ElTableColumn :type="columnType" />',
      '<ElTableColumn :type />',
      '<ElTableColumn type="index" v-bind="extra" />',
      '<ElTableColumn v-bind="extra" />',
      '<ElTableColumn :[key]="\'index\'" />',
      "<ElTableColumn :type=\"ok ? 'index' : 'selection'\" />",
      '<ElTableColumn :type="ok ? \'index\' : columnType" />',
      '<ElTableColumn v-model:type="columnType" />',
    ].map(content => ({
      code: template(content),
      options: { ...options, unknownValues: 'ignore' as const },
    })),
    {
      description:
        'matches alternatives with conjunctions, normalized props, and combined constraints',
      code: template(
        '<AppColumn field-name="internalId" :count="2" /><AppColumn type="index" />',
      ),
      options: {
        targets: [
          {
            components: ['AppColumn'],
            ignoreWhen: [
              { props: { type: { enum: ['index'] } } },
              {
                props: {
                  fieldName: {
                    pattern: '^internal',
                    minLength: 8,
                    maxLength: 12,
                  },
                  count: {
                    minimum: 2,
                    maximum: 4,
                    multipleOf: 2,
                    enum: [2, 4],
                  },
                },
              },
            ],
          },
        ],
      },
    },
    {
      description: 'supports scalar constraints without coercion',
      code: template('<AppColumn :flag="true" :value="null" />'),
      options: {
        targets: [
          {
            components: ['AppColumn'],
            ignoreWhen: [
              { props: { flag: { enum: [true] }, value: { enum: [null] } } },
            ],
          },
        ],
      },
    },
    { code: '<script setup>const value = 1</script>', options },
    { code: 'const value = 1', filename: 'test.js', options },
    { code: 'const value: number = 1', filename: 'test.ts', options },
    { code: 'const value = <ElTableColumn />', filename: 'test.tsx', options },
    {
      code: template('<div /><input /><svg><path /><linearGradient /></svg>'),
      options: {
        targets: [
          { components: ['div', 'input', 'svg', 'path', 'linearGradient'] },
        ],
      },
    },
    {
      description:
        'definite matches take precedence over uncertain alternatives',
      code: template('<ElTableColumn :type="columnType" fixed="right" />'),
      options: {
        targets: [
          {
            components: ['ElTableColumn'],
            ignoreWhen: [
              { props: { type: { enum: ['index'] } } },
              { props: { fixed: { enum: ['right'] } } },
            ],
          },
        ],
      },
    },
    {
      description: 'accepts CRLF and same-line comments',
      code: template('<!-- @vue-generic {Course} -->\r\n<ElTableColumn />'),
      options,
    },
  ],
  invalid: [
    {
      description: 'checks Slot component generic comments in fallback content',
      code: template('<slot><Slot /></slot>'),
      options: { targets: [{ components: ['Slot'] }] },
      errors: [{ messageId: 'missingVueGeneric', data: { component: 'Slot' } }],
      output: null,
    },
    {
      code: template('<ElTableColumn />'),
      options,
      errors: [
        {
          messageId: 'missingVueGeneric',
          data: { component: 'ElTableColumn' },
          line: 1,
          column: 12,
          endLine: 1,
          endColumn: 25,
        },
      ],
      output: null,
    },
    ...[
      '<el-table-column />',
      '<ElTableColumn type="selection" />',
      '<ElTableColumn generic="Course" />',
      '<ElTableColumn :generic="Course" />',
      '<ElTableColumn :type="columnType" />',
      '<ElTableColumn :type />',
      '<ElTableColumn type="index" v-bind="extra" />',
      '<ElTableColumn v-bind="{ type: \'index\', ...extra }" />',
      '<ElTableColumn :type.prop="\'index\'" />',
      '<ElTableColumn :[key]="\'index\'" />',
      "<ElTableColumn :type=\"ok ? 'index' : 'selection'\" />",
      '<ElTableColumn v-bind="{ get type() { return \'index\' } }" />',
      '<ElTableColumn v-bind="{ other: 1 }" />',
      '<ElTableColumn :type="undefined" />',
      '<!-- @vue-generic {} --><ElTableColumn />',
      '<!-- @vue-generic {   } --><ElTableColumn />',
      '<!-- @vue-generic Course --><ElTableColumn />',
      '<!-- @vue-generic {Course --><ElTableColumn />',
      '<!-- @vue-generic {Course} extra --><ElTableColumn />',
      '<!-- prefix @vue-generic {Course} --><ElTableColumn />',
      '<!-- @vue-generic-other {Course} --><ElTableColumn />',
      '<!-- @Vue-generic {Course} --><ElTableColumn />',
      '<!-- @vue-generic {Course} --><!-- @vue-generic {} --><ElTableColumn />',
      '<!-- @vue-generic {Course} --><Other /><ElTableColumn />',
      '<!-- @vue-generic {Course} -->text<ElTableColumn />',
      '<!-- @vue-generic {Course} -->{{ value }}<ElTableColumn />',
      '<!-- @vue-generic {Course} --><div><ElTableColumn /></div>',
      '<div><!-- @vue-generic {Course} --></div><ElTableColumn />',
      '<!-- @vue-generic {Course} --><ElTableColumn><ElTableColumn /></ElTableColumn>',
      '<!-- @vue-generic {Course} --><ElTableColumn /><ElTableColumn />',
      '<component is="ElTableColumn" />',
      '<component :is="\'ElTableColumn\'" />',
    ].map(content => ({
      code: template(content),
      options,
      errors: ['missingVueGeneric' as const],
      output: null,
    })),
    {
      description: 'whitespace in pre elements interrupts the comment group',
      code: template(
        '<pre><!-- @vue-generic {Course} --> <ElTableColumn /></pre>',
      ),
      options,
      errors: ['missingVueGeneric'],
      output: null,
    },
    ...[
      '<ElTableColumn />',
      '<ElTableColumn type="selection" />',
      "<ElTableColumn :type=\"ok ? 'selection' : 'expand'\" />",
    ].map(content => ({
      description:
        'ignore does not exempt definitely absent or nonmatching props',
      code: template(content),
      options: { ...options, unknownValues: 'ignore' as const },
      errors: ['missingVueGeneric' as const],
      output: null,
    })),
    ...[
      '<AppColumn :type="columnType" />',
      '<AppColumn :type="columnType" fixed="left" />',
      '<AppColumn type="selection" :fixed="side" />',
    ].map(content => ({
      description:
        'a definite mismatch defeats an unknown prop in a conjunction',
      code: template(content),
      options: {
        unknownValues: 'ignore' as const,
        targets: [
          {
            components: ['AppColumn'],
            ignoreWhen: [
              {
                props: {
                  type: { enum: ['index'] },
                  fixed: { enum: ['right'] },
                },
              },
            ],
          },
        ],
      },
      errors: ['missingVueGeneric' as const],
      output: null,
    })),
    ...[{}, { ignoreWhen: [] }].map(target => ({
      description: 'ignore has no effect without exemption conditions',
      code: template('<ElTableColumn v-bind="extra" />'),
      options: {
        targets: [{ components: ['ElTableColumn'], ...target }],
        unknownValues: 'ignore' as const,
      },
      errors: ['missingVueGeneric' as const],
      output: null,
    })),
    {
      description: 'checks multiple independently configured targets',
      code: template(
        '<ElTableColumn type="index" /><BusinessSelect /><BusinessTreeSelect />',
      ),
      options: {
        targets: [
          ...(options.targets ?? []),
          { components: ['BusinessSelect', 'BusinessTreeSelect'] },
        ],
      },
      errors: ['missingVueGeneric', 'missingVueGeneric'],
      output: null,
    },
    ...[false, true].map(typescript => ({
      description: `checks templates with dual ${typescript ? 'TS' : 'JS'} scripts`,
      code: `<script${typescript ? ' lang="ts"' : ''}>export default {}</script><script setup${typescript ? ' lang="ts"' : ''}>const value = 1</script>${template('<ElTableColumn />')}`,
      languageOptions: typescript
        ? vueLanguageOptions
        : { parserOptions: { parser: null } },
      options,
      errors: ['missingVueGeneric' as const],
      output: null,
    })),
    {
      description:
        'declaring the current component generic does not specialize a child',
      code: `<script setup lang="ts" generic="T">const value = 1</script>${template('<ElTableColumn />')}`,
      options,
      errors: ['missingVueGeneric'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-vue-generic',
  rule: requireVueGeneric,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

describe('require-vue-generic configuration', () => {
  it.each([
    { extra: true },
    { unknownValues: 'allow' },
    { targets: null },
    { targets: [{}] },
    { targets: [{ components: [] }] },
    { targets: [{ components: [''] }] },
    { targets: [{ components: ['El TableColumn'] }] },
    { targets: [{ components: ['ElTableColumn', 'ElTableColumn'] }] },
    { targets: [{ components: ['ElTableColumn', 'el-table-column'] }] },
    {
      targets: [
        { components: ['ElTableColumn'] },
        { components: ['el-table-column'] },
      ],
    },
    ...[
      { extra: true },
      { ignoreWhen: null },
      { ignoreWhen: [{}] },
      { ignoreWhen: [{ props: {} }] },
      { ignoreWhen: [{ props: { type: { enum: ['index'] } }, extra: true }] },
      ...[
        {},
        { enum: [] },
        { enum: ['index', 'index'] },
        { enum: [{}] },
        { pattern: '[' },
        { pattern: '^i', minimum: 1 },
        { minimum: 2, maximum: 1 },
        { minLength: 2, maxLength: 1 },
        { multipleOf: 0 },
        { multipleOf: 1.5 },
        { unknown: true },
      ].map(constraint => ({
        ignoreWhen: [{ props: { type: constraint } }],
      })),
      ...['class', 'onClick', 'is', ''].map(name => ({
        ignoreWhen: [{ props: { [name]: { enum: ['index'] } } }],
      })),
      {
        ignoreWhen: [
          {
            props: {
              fieldName: { pattern: 'x' },
              'field-name': { pattern: 'x' },
            },
          },
        ],
      },
    ].map(target => ({
      targets: [{ components: ['ElTableColumn'], ...target }],
    })),
  ])('rejects invalid options: %j', async invalidOptions => {
    await expect(
      tester.valid({ code: '<template />', options: invalidOptions }),
    ).rejects.toThrow()
  })
})
