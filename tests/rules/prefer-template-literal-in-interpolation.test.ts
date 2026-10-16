/* eslint-disable no-template-curly-in-string -- Fixtures contain literal template expressions. */
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { compile, createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { preferTemplateLiteralInInterpolation } from '../../src/rules/prefer-template-literal-in-interpolation.ts'
import { createVueSFC } from '../helpers/create-vue-sfc.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  PreferTemplateLiteralInInterpolationMessageId,
  PreferTemplateLiteralInInterpolationOptions,
} from '../../src/types/index.ts'

function template(content: string) {
  return createVueSFC({
    template: `<template><span>${content}</span></template>`,
  })
}

function interpolation(expression: string, nullable = false) {
  return `{{ \`\${(${expression})${nullable ? " ?? ''" : ''}}分\` }}`
}

const unsafeExpressions = [
  'score',
  'area.score',
  'getScore()',
  'undefined',
  '{}',
  '[]',
  '() => 1',
  '/x/',
  'Symbol()',
  'ok ? 1 : data',
  'ok ? [] : 1',
  'value as number',
  'value!',
  'value satisfies number',
  'value as any as number',
]
const safeExpressions = [
  '0',
  '42',
  '-1',
  '+1',
  '~1',
  'false',
  'true',
  '12n',
  '-12n',
  "'ready'",
  '`ready`',
  '`score: ${value}`',
  'ok ? 1 : 2',
  'ok ? false : "ready"',
  '!value',
  'typeof value',
  '/* before */ (1) /* after */',
  '"https://example.com"',
]
const whitespaceFragments = [
  '共  {{ 1 }} 项',
  '共\n{{ 1 }} 项',
  '共\r\n{{ 1 }} 项',
  '共\t{{ 1 }} 项',
  '{{ 1 }}\n分',
  '{{ 1 }}&#10;分',
]

await run<
  PreferTemplateLiteralInInterpolationOptions,
  PreferTemplateLiteralInInterpolationMessageId
>({
  name: 'prefer-template-literal-in-interpolation',
  rule: preferTemplateLiteralInInterpolation,
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
  valid: [
    ...[
      'plain text',
      '{{ score }}',
      '{{ first }} {{ second }}',
      '{{ 1 }} {{ 2 }}',
      '{{ 1 }}{{ 2 }}',
      '{{ `${score}分` }}',
      '<b>Score</b>{{ 1 }}',
      'Score<!-- boundary -->{{ 1 }}',
      '{{ 1 }}<!-- boundary -->分',
      '{{ 1 }}<b>分</b>',
      '{{ 1 }}&nbsp;{{ 2 }}',
    ].flatMap(content => [
      { code: template(content) },
      { code: template(content), options: { reportUnfixable: true } },
    ]),
    ...unsafeExpressions.map(expression => ({
      description: `skips an unproven expression: ${expression}`,
      code: template(`{{ ${expression} }}分`),
    })),
    ...whitespaceFragments.map(content => ({
      code: template(content),
    })),
    ...[
      'pre',
      'textarea',
      'title',
      'script',
      'style',
      'xmp',
      'iframe',
      'noembed',
      'noframes',
      'noscript',
      'plaintext',
      'listing',
      'svg',
      'math',
    ].map(tag => ({
      code: `<template><${tag}>{{ 1 }}分</${tag}></template>`,
      options: { reportUnfixable: true },
    })),
    {
      code: '<template><pre><span>{{ 1 }}分</span></pre></template>',
      options: { reportUnfixable: true },
    },
    {
      code: '<template><svg><foreignObject><span>{{ 1 }}分</span></foreignObject></svg></template>',
      options: { reportUnfixable: true },
    },
    {
      code: '<template><div v-pre><span>{{ 1 }}分</span></div></template>',
      options: { reportUnfixable: true },
    },
    {
      code: '<template lang="pug">span {{ 1 }}分</template>',
      options: { reportUnfixable: true },
    },
    {
      code: '<template><span v-text="value">{{ 1 }}分</span></template>',
      options: { reportUnfixable: true },
    },
    {
      code: '<template><span v-html="value">{{ 1 }}分</span></template>',
      options: { reportUnfixable: true },
    },
    { code: template('{{ }}分') },
    { code: template('{{ broken( }}分') },
    { code: template('{{ 1 // comment\n }}分') },
    { code: template('{{ 1 &#47;&#47; comment\n }}分') },
    ...['test.js', 'test.ts', 'test.tsx'].map(filename => ({
      filename,
      code: 'const value = `${score}分`',
    })),
    { code: '<script setup>const value = `${score}分`</script>' },
    { code: '<template><span :title="`${score}分`" /></template>' },
    {
      code: '<template><span v-for="undefined in values">{{ undefined }}分</span></template>',
    },
    {
      code: `<script setup>const undefined = []</script>${template(
        '{{ undefined }}分',
      )}`,
    },
  ],
  invalid: [
    {
      code: template('{{ 1 &#47;&#47; comment\n }}分'),
      options: { reportUnfixable: true },
      errors: ['expectedTemplateLiteral'],
      output: null,
    },
    ...safeExpressions.flatMap(expression => [
      {
        description: `fixes a statically safe result: ${expression}`,
        code: template(`{{ ${expression} }}分`),
        errors: ['expectedTemplateLiteral' as const],
        output: template(interpolation(expression)),
      },
      {
        description: `fixes a JavaScript template result: ${expression}`,
        code: template(`{{ ${expression} }}分`),
        languageOptions: { parserOptions: { parser: null } },
        errors: ['expectedTemplateLiteral' as const],
        output: template(interpolation(expression)),
      },
    ]),
    ...[
      'null',
      'void value',
      'ok ? 0 : null',
      'ok ? void effect() : 1',
      'null!',
    ].map(expression => ({
      code: template(`{{ ${expression} }}分`),
      errors: ['expectedTemplateLiteral' as const],
      output: template(interpolation(expression, true)),
    })),
    ...['1 as number', '1 satisfies number', '(1 as unknown)!'].map(
      expression => ({
        code: template(`{{ ${expression} }}分`),
        errors: ['expectedTemplateLiteral' as const],
        output: template(interpolation(expression)),
      }),
    ),
    ...unsafeExpressions.map(expression => ({
      code: template(`{{ ${expression} }}分`),
      options: { reportUnfixable: true },
      errors: ['expectedTemplateLiteral' as const],
      output: null,
    })),
    ...whitespaceFragments.map(content => ({
      code: template(content),
      options: { reportUnfixable: true },
      errors: ['expectedTemplateLiteral' as const],
      output: null,
    })),
    {
      code: template('共 {{ 0 }}/{{ 10 }} 项'),
      errors: [
        {
          messageId: 'expectedTemplateLiteral',
          line: 1,
          column: 17,
          endLine: 1,
          endColumn: 37,
        },
      ],
      output: template('{{ `共 ${(0)}/${(10)} 项` }}'),
    },
    {
      description: 'does not partially fix an unsafe run',
      code: template('{{ 1 }}/{{ value }}分'),
      options: { reportUnfixable: true },
      errors: ['expectedTemplateLiteral'],
      output: null,
    },
    {
      description: 'preserves comments and fixes each contiguous fragment once',
      code: template('{{ 1 }}分<!-- note -->共 {{ 2 }} 项<b />{{ 3 }}分'),
      errors: [
        'expectedTemplateLiteral',
        'expectedTemplateLiteral',
        'expectedTemplateLiteral',
      ],
      output: template(
        `${interpolation(
          '1',
        )}<!-- note -->{{ \`共 \${(2)} 项\` }}<b />${interpolation('3')}`,
      ),
    },
    {
      description: 'leaves outer indentation and CRLF unchanged',
      code: '<template>\r\n  {{ 1 }}分<span />\r\n</template>',
      errors: ['expectedTemplateLiteral'],
      output: `<template>\r\n  ${interpolation('1')}<span />\r\n</template>`,
    },
    {
      description: 'escapes decoded entities without double decoding',
      code: template('&amp;lt;&lt;&gt;&nbsp;{{ 1 }}分'),
      errors: ['expectedTemplateLiteral'],
      output: template('{{ `\\u0026lt;\\u003c\\u003e\u{A0}${(1)}分` }}'),
    },
    {
      description: 'escapes template syntax and Vue closing delimiters',
      code: template('`\\${price} }} {{ 1 }}分'),
      errors: ['expectedTemplateLiteral'],
      output: template(
        '{{ `\\u0060\\u005c\\u0024\\u007bprice\\u007d \\u007d\\u007d ${(1)}分` }}',
      ),
    },
    {
      description: 'preserves entity spelling in expressions',
      code: template('{{ &quot;ready&quot; }}分'),
      errors: ['expectedTemplateLiteral'],
      output: template(interpolation('&quot;ready&quot;')),
    },
    {
      code: template('{{ 1 }}分'),
      options: { reportUnfixable: true },
      errors: ['expectedTemplateLiteral'],
      output: template(interpolation('1')),
    },
    ...['', ' setup', ' lang="ts"', ' setup lang="ts"'].map(script => ({
      code: `<script${script}>const score = 1</script>${template('{{ 1 }}分')}`,
      errors: ['expectedTemplateLiteral' as const],
      output: `<script${script}>const score = 1</script>${template(
        interpolation('1'),
      )}`,
    })),
    {
      code: `<script>export default {}</script><script setup lang="ts">const score = 1</script>${template(
        '{{ 1 }}分',
      )}`,
      errors: ['expectedTemplateLiteral'],
      output: `<script>export default {}</script><script setup lang="ts">const score = 1</script>${template(
        interpolation('1'),
      )}`,
    },
    {
      code: '<template lang="html"><AppLabel>{{ 1 }}分</AppLabel></template>',
      errors: ['expectedTemplateLiteral'],
      output: `<template lang="html"><AppLabel>${interpolation(
        '1',
      )}</AppLabel></template>`,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-template-literal-in-interpolation',
  rule: preferTemplateLiteralInInterpolation,
  languageOptions: vueLanguageOptions,
})

it.each([
  { unknown: true },
  { reportUnfixable: 'true' },
  { reportUnfixable: null },
  'always',
  null,
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})

// Exercise the actual Vue compiler and display conversion under both supported
// whitespace modes, including expression side effects and coercion order.
await run<
  PreferTemplateLiteralInInterpolationOptions,
  PreferTemplateLiteralInInterpolationMessageId
>({
  name: 'prefer-template-literal-in-interpolation-runtime',
  rule: preferTemplateLiteralInInterpolation,
  async onResult(testcase, result) {
    if (testcase.type !== 'invalid') {
      return
    }
    for (const whitespace of ['condense', 'preserve'] as const) {
      async function render(source: string) {
        const calls: string[] = []
        const body = source.slice('<template>'.length, -'</template>'.length)
        const html = await renderToString(
          createSSRApp({
            render: compile(body, { whitespace }),
            setup() {
              return {
                next(label: string) {
                  calls.push(label)
                  return label
                },
                value: {
                  toString() {
                    calls.push('coerce')
                    return 'value'
                  },
                },
              }
            },
          }),
        )
        return {
          html,
          calls,
        }
      }
      const before = await render(testcase.code)
      expect(await render(result.output)).toEqual(before)
      if (testcase.code.includes('next(')) {
        expect(before.calls).toEqual(['first', 'second', 'coerce', 'last'])
      }
    }
  },
  valid: [],
  invalid: [
    {
      code: template(
        '{{ void next("first") }}/{{ `s:${next("second")}:${value}` }}/{{ typeof next("last") }}分',
      ),
      errors: ['expectedTemplateLiteral'],
      output: template(
        '{{ `${(void next("first")) ?? \'\'}/${(`s:${next("second")}:${value}`)}/${(typeof next("last"))}分` }}',
      ),
    },
    ...[
      [
        '共 {{ 0 }}/{{ false }}/{{ 12n }}/{{ null }} 项',
        "{{ `共 ${(0)}/${(false)}/${(12n)}/${(null) ?? ''} 项` }}",
      ],
      [
        '&amp;lt;&lt;&gt;&nbsp;{{ 1 }}分',
        '{{ `\\u0026lt;\\u003c\\u003e\u{A0}${(1)}分` }}',
      ],
      [
        '`\\${price} }} {{ 1 }}分',
        '{{ `\\u0060\\u005c\\u0024\\u007bprice\\u007d \\u007d\\u007d ${(1)}分` }}',
      ],
      ['{{ &quot;ready&quot; }}分', interpolation('&quot;ready&quot;')],
      ['{{ true ? 0 : null }}分', interpolation('true ? 0 : null', true)],
    ].map(([code, output]) => ({
      code: template(code ?? ''),
      errors: ['expectedTemplateLiteral' as const],
      output: template(output ?? ''),
    })),
  ],
})
