import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { noComplexTemplateExpression } from '../../src/rules/no-complex-template-expression.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  NoComplexTemplateExpressionMessageId,
  NoComplexTemplateExpressionOptions,
} from '../../src/types/index.ts'

function template(expression: string, directive = ':disabled') {
  return `<template><div ${directive}="${expression}" /></template>`
}

await run<
  NoComplexTemplateExpressionOptions,
  NoComplexTemplateExpressionMessageId
>({
  name: 'no-complex-template-expression',
  rule: noComplexTemplateExpression,
  onResult(_, result) {
    expect(result.fixed).toBe(false)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      '(value as { [a || b || c || d]: string })',
      '(value as { [a ? b : c ? d : e]: string })',
      '(value satisfies { [a || b || c || d]: string })',
      'format<{ [a || b || c || d]: string }>(value)',
    ].map(expression => ({
      code: template(expression),
    })),
    ...[
      '<template><div v-for="row in rows"><div v-for="row in rows" v-if="row.a || b || c || d" /></div></template>',
      '<template><List v-slot="{ row }"><List v-slot="{ row }" :disabled="row.a || b || c || d" /></List></template>',
      '<template><div v-for="item in items">{{ item.a || b || c || d }}</div></template>',
      '<template><div v-for="item in items" :disabled="typeof item || b || c || d" /></template>',
    ].map(code => ({
      code,
      options: { ignoreScopeReferences: true },
    })),
    {
      code: '<template><div v-if="a || b">{{ c ? d : e }}</div></template>',
      options: {
        directives: [],
        checkInterpolations: false,
        maxLogicalExpressions: 0,
        maxConditionalDepth: 0,
      },
    },
    ...[
      'ready',
      'a && b && c',
      'a || b || c',
      'a ?? b ?? c',
      'a ? b : c',
      '[a ? b : c, d ? e : f]',
      "t('label')",
      'formatDate(date)',
      "'a && b && c && d'",
      'a + b * c / d',
      'items.some(item => item.active)',
      'foo?.bar',
    ].map(expression => ({
      code: template(expression),
    })),
    ...[
      '@click',
      'v-for',
      'v-slot',
      'v-custom',
      'v-text',
      'v-html',
      'v-memo',
    ].map(directive => ({
      code: template(
        directive === 'v-for'
          ? 'item in a || b || c || d'
          : directive === 'v-slot'
            ? '{ value = a || b || c || d }'
            : 'a || b || c || d',
        directive,
      ),
    })),
    { code: '<template><div :[a||b||c||d]="value" /></template>' },
    {
      code: template('a || b || c || d'),
      options: { maxLogicalExpressions: 3 },
    },
    {
      code: template('a ? b : c ? d : e'),
      options: { maxConditionalDepth: 2 },
    },
    { code: template('a || b || c || d'), options: { directives: [] } },
    {
      code: '<template>{{ a || b || c || d }}</template>',
      options: { checkInterpolations: false },
    },
    {
      code: '<template><div v-for="item in items" :disabled="item.a || b || c || d" /></template>',
      options: { ignoreScopeReferences: true },
    },
    {
      code: '<template><AppList v-slot="{ row }"><span>{{ row.a || b || c || d }}</span></AppList></template>',
      options: { ignoreScopeReferences: true },
    },
    { code: '<template><div :disabled /></template>' },
    { code: '<template><div :disabled="" /></template>' },
    { code: '<script setup>const value = a || b || c || d</script>' },
    { code: 'const value = a || b || c || d', filename: 'test.ts' },
    { code: 'const value = a || b || c || d', filename: 'test.js' },
  ],
  invalid: [
    ...[
      '<template><div v-for="item in items" :disabled="(a || b || c || d) as typeof item" /></template>',
      '<template><List v-slot="{ row }">{{ (a || b || c || d) satisfies typeof row }}</List></template>',
      '<template><div v-for="item in items" :disabled="(value: typeof item) => a || b || c || d" /></template>',
      '<template><div v-for="item in items" v-if="item.a || b || c || d" /></template>',
      '<template><div v-if="ready" /><div v-for="item in items" v-else-if="item.a || b || c || d" /></template>',
      '<template><List v-slot="{ row }" :disabled="row.a || b || c || d" /></template>',
      '<template><div v-for="item in items" :disabled="items.some(item => item.a || b || c || d)" /></template>',
    ].map(code => ({
      code,
      options: { ignoreScopeReferences: true },
      errors: ['tooManyLogicalExpressions' as const],
      output: null,
    })),
    ...(['text', 'html', 'memo', 'model'] as const).map(directive => ({
      code: template(
        directive === 'model' ? 'values[a || b || c || d]' : 'a || b || c || d',
        `v-${directive}`,
      ),
      options: { directives: [directive], checkInterpolations: false },
      errors: ['tooManyLogicalExpressions' as const],
      output: null,
    })),
    {
      code: template(
        'a ? (value as { [b ? c : d ? e : f]: string }) : g ? h : i',
      ),
      errors: [{ messageId: 'tooDeepConditional', data: { depth: 2, max: 1 } }],
      output: null,
    },
    {
      code: '<template><div :disabled="a || b">{{ c || d }}</div></template>',
      options: { directives: [], maxLogicalExpressions: 0 },
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    ...[
      'v-if',
      'v-else-if',
      'v-show',
      ':disabled',
      'v-bind:disabled',
      'v-bind',
    ].map(directive => ({
      code: template('a || b || c || d', directive),
      errors: ['tooManyLogicalExpressions' as const],
      output: null,
    })),
    ...[
      'a && b && c && d',
      'a ?? b ?? c ?? d',
      'format(a || b, c && d, e ?? f)',
      '[a || b, c || d, e || f]',
      '{ [a || b]: c || d || e }',
      'items.some(item => item.a || item.b || item.c || item.d)',
      '(a || b || c || d) as boolean',
    ].map(expression => ({
      code: template(expression),
      errors: ['tooManyLogicalExpressions' as const],
      output: null,
    })),
    ...[
      'a ? b : c ? d : e',
      '(a ? b : c) ? d : e',
      'a ? format(b ? c : d) : e',
    ].map(expression => ({
      code: template(expression),
      errors: ['tooDeepConditional' as const],
      output: null,
    })),
    {
      code: template('a || b'),
      options: { maxLogicalExpressions: 0 },
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    {
      code: template('a ? b : c'),
      options: { maxConditionalDepth: 0 },
      errors: ['tooDeepConditional'],
      output: null,
    },
    {
      code: template('a || b || c || d', 'v-text'),
      options: { directives: ['text'] },
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    {
      code: '<template>{{ a || b || c || d }}</template>',
      errors: [
        {
          messageId: 'tooManyLogicalExpressions',
          data: { count: 3, max: 2 },
          column: 14,
          endColumn: 30,
        },
      ],
      output: null,
    },
    {
      code: template('a || b || c || (d ? e : f ? g : h)'),
      errors: [
        { messageId: 'tooManyLogicalExpressions', data: { count: 3, max: 2 } },
        { messageId: 'tooDeepConditional', data: { depth: 2, max: 1 } },
      ],
      output: null,
    },
    {
      code: '<template><div v-for="item in items" :disabled="item.a || b || c || d" /></template>',
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    {
      code: '<template><AppList v-slot="{ row }"><span>{{ row.a || b || c || d }}</span></AppList></template>',
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    {
      code: '<template><div v-for="item in items" :disabled="a || b || c || d" /></template>',
      options: { ignoreScopeReferences: true },
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    {
      code: template('a || b || c || d'),
      languageOptions: { parserOptions: { parser: null } },
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    {
      code: `<script>export default {}</script><script setup>const a = true</script>${template(
        'a || b || c || d',
      )}`,
      errors: ['tooManyLogicalExpressions'],
      output: null,
    },
    {
      code: '<template><div v-if="a || b || c || d">{{ e ? f : g ? h : i }}</div></template>',
      errors: ['tooManyLogicalExpressions', 'tooDeepConditional'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'no-complex-template-expression',
  rule: noComplexTemplateExpression,
  languageOptions: vueLanguageOptions,
})
it.each([
  { unknown: true },
  { maxLogicalExpressions: -1 },
  { maxLogicalExpressions: 1.5 },
  { maxConditionalDepth: null },
  { maxConditionalDepth: -1 },
  { maxConditionalDepth: 1.5 },
  { maxConditionalDepth: '1' },
  { directives: ['on'] },
  { directives: ['bind', 'bind'] },
  { checkInterpolations: 1 },
  { ignoreScopeReferences: 'true' },
  null,
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})
