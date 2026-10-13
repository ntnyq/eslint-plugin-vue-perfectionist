import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { noComplexVForSource } from '../../src/rules/no-complex-v-for-source.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  NoComplexVForSourceMessageId,
  NoComplexVForSourceOptions,
} from '../../src/types/index.ts'

function template(source: string, delimiter = 'in') {
  return `<template><div v-for="item ${delimiter} ${source}" /></template>`
}

const references = [
  'items',
  'ITEMS',
  'filteredItems',
  'props.items',
  'state.list.items',
  'this.items',
  'groups[key]',
  'groups[0]',
  "state['items']",
  'groups[`items`]',
  'groups[-1]',
  'groups[state.key]',
  'state?.items',
  'groups?.[key]',
  '(items)',
  '(/* source */ items)',
]
const literals = [
  '10',
  '0',
  '1.5',
  '+10',
  '-10',
  "'hello'",
  '`hello`',
  'true',
  'false',
  'null',
  '10n',
  '-10n',
]
const calls = [
  'getItems()',
  'items.filter(predicate)',
  'getData().items',
  'groups[getKey()]',
  'getItems?.()',
  'api?.getItems()',
  'getData()?.items',
  'groups?.[getKey?.()]',
  'getFactory()()',
  'api[method]()',
  'getItems(10)',
  'getItems(normalize(value))',
  'getItems(...args)',
  'getItems([1, 2], { active: true })',
  'getItems(ok ? first : second)',
  'items.filter(item => item.active)',
  'items.filter(function (item) { return item.active })',
]
const complexSources = [
  '[1, 2, 3]',
  '{ a: 1 }',
  'enabled ? a : b',
  'items || []',
  'items && other',
  'items ?? fallback',
  '[a, b][0]',
  '({ items }).items',
  '(enabled ? a : b).items',
  '(items || fallback).list',
  'groups[enabled ? a : b]',
  'groups[key || fallback]',
  'groups[index + 1]',
  'groups[[key]]',
  'count + 1',
  'items = other',
  'count++',
  '(prepare(), items)',
  'new Set(items)',
  'new Set(items).values()',
  '() => items',
  'function () { return items }',
  '(() => items)()',
  '(ok ? getFirst : getSecond)()',
  '[a, b].filter(predicate)',
  // eslint-disable-next-line no-template-curly-in-string -- Tests a literal template expression.
  '`items-${key}`',
  'tag`items`',
  '/items/',
  '!items',
  '+count',
  'typeof items',
]

await run<NoComplexVForSourceOptions, NoComplexVForSourceMessageId>({
  name: 'no-complex-v-for-source',
  rule: noComplexVForSource,
  onResult(testcase, result) {
    if (testcase.type === 'invalid') {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
  valid: [
    ...[...references, ...literals, ...calls].flatMap(source => [
      {
        description: `accepts a simple source: ${source}`,
        code: template(source),
      },
      {
        description: `accepts a JavaScript source with of: ${source}`,
        code: template(source, 'of'),
        languageOptions: { parserOptions: { parser: null } },
      },
    ]),
    ...references.map(source => ({
      code: template(source),
      options: { allowCallExpression: false, allowLiteral: false },
    })),
    ...literals.map(source => ({
      code: template(source),
      options: { allowCallExpression: false },
    })),
    ...calls.map(source => ({
      code: template(source),
      options: { allowLiteral: false },
    })),
    ...[
      'items as Item[]',
      'items!',
      'items satisfies Item[]',
      '(items as Item[])?.[0]',
      'getItems<Item>()',
      '(getItems as Factory)()',
      'groups[key as string]',
    ].map(source => ({
      code: template(source),
    })),
    {
      code: template('items as Item[]'),
      options: { allowLiteral: false, allowCallExpression: false },
    },
    {
      code: template('getItems()'),
      options: { allowLiteral: true, allowCallExpression: true },
    },
    ...['test.js', 'test.ts', 'test.tsx'].map(filename => ({
      filename,
      code: 'const items = [1, 2]; for (const item of [1, 2]) {}',
    })),
    { code: '<script setup>const items = [1, 2]</script>' },
    {
      description:
        'does not follow initializers or inspect other template expressions',
      code: `<script setup>const items = getItems()</script><template><div v-for="item in items" :data-items="[1, 2]">{{ ok ? a : b }}</div></template>`,
      options: { allowCallExpression: false },
    },
    { code: '<template><div v-for /></template>' },
    { code: '<template><div v-for="" /></template>' },
    { code: template('getItems(') },
    { code: '<template><div v-for="not a loop" /></template>' },
    {
      description: 'does not check destructuring defaults on the left side',
      code: '<template><div v-for="({ value = getDefault() }, index) in items" /></template>',
      options: { allowCallExpression: false },
    },
  ],
  invalid: [
    ...complexSources.flatMap(source => [
      {
        description: `rejects a complex source: ${source}`,
        code: template(source),
        errors: ['unexpectedComplexSource' as const],
        output: null,
      },
      {
        description: `rejects a JavaScript source with of: ${source}`,
        code: template(source, 'of'),
        languageOptions: { parserOptions: { parser: null } },
        errors: ['unexpectedComplexSource' as const],
        output: null,
      },
    ]),
    ...calls.map(source => ({
      code: template(source),
      options: { allowCallExpression: false },
      errors: ['unexpectedComplexSource' as const],
      output: null,
    })),
    ...literals.map(source => ({
      code: template(source),
      options: { allowLiteral: false },
      errors: ['unexpectedComplexSource' as const],
      output: null,
    })),
    ...[
      '[1, 2] as number[]',
      '(items || fallback)!',
      '([a, b] as Item[])[0]',
      'groups[(ok ? a : b) as string]',
      '(items satisfies Item[]) || fallback',
    ].map(source => ({
      code: template(source),
      errors: ['unexpectedComplexSource' as const],
      output: null,
    })),
    ...[
      'getItems<Item>()',
      '(getItems() as Item[])!',
      'groups[getKey() as string]',
      '(getItems as Factory)()',
    ].map(source => ({
      code: template(source),
      options: { allowCallExpression: false },
      errors: ['unexpectedComplexSource' as const],
      output: null,
    })),
    ...['10 as const', '(10 satisfies number)!', '10', 'getItems()'].map(
      source => ({
        code: template(source),
        options: { allowLiteral: false, allowCallExpression: false },
        errors: ['unexpectedComplexSource' as const],
        output: null,
      }),
    ),
    ...['', ' setup', ' lang="ts"', ' setup lang="ts"'].map(script => ({
      description: `checks templates independently of script mode: ${script}`,
      code: `<script${script}>const items = [1, 2]</script>${template('[1, 2]')}`,
      errors: ['unexpectedComplexSource' as const],
      output: null,
    })),
    {
      code: `<script lang="ts">export default {}</script><script setup lang="ts">const items = [1, 2]</script>${template('[1, 2]')}`,
      errors: ['unexpectedComplexSource'],
      output: null,
    },
    {
      description:
        'reports the source once, excluding aliases and the delimiter',
      code: '<template>\n  <div v-for="(item, index) in items || []" />\n</template>',
      errors: [
        {
          messageId: 'unexpectedComplexSource',
          line: 2,
          column: 32,
          endLine: 2,
          endColumn: 43,
        },
      ],
      output: null,
    },
    {
      description: 'checks nested template loops and components independently',
      code: '<template><template v-for="group in [a, b]"><AppItem v-for="item of group.items || []" /></template><div v-for="item in items" /></template>',
      errors: ['unexpectedComplexSource', 'unexpectedComplexSource'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'no-complex-v-for-source',
  rule: noComplexVForSource,
  languageOptions: vueLanguageOptions,
})

it.each([
  { unknown: true },
  { allowCallExpression: 'true' },
  { allowCallExpression: null },
  { allowLiteral: 1 },
  { allowLiteral: [] },
  'always',
  null,
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})
