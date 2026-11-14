import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { consistentTemplateElementLayout } from '../../src/rules/consistent-template-element-layout.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  ConsistentTemplateElementLayoutMessageId,
  ConsistentTemplateElementLayoutOptions,
} from '../../src/types/index.ts'

const sfc = (content: string) => `<template>\n${content}\n</template>`
const blockGroups = [
  { tags: ['AppCard', 'app-card'], layout: 'block' as const },
]

function createLongWhitespaceCase() {
  let startedAt = 0
  return {
    description:
      'checks long internal whitespace without quadratic backtracking',
    code: sfc(`<p>left${' '.repeat(60_000)}right</p>`),
    before() {
      startedAt = performance.now()
    },
    after() {
      // A generous budget for parsing and linting; the former regex takes
      // several seconds even though this content has no layout violation.
      expect(performance.now() - startedAt).toBeLessThan(2000)
    },
  }
}

await run<
  ConsistentTemplateElementLayoutOptions,
  ConsistentTemplateElementLayoutMessageId
>({
  name: 'consistent-template-element-layout',
  rule: consistentTemplateElementLayout,
  onResult(testcase, result) {
    if (testcase.type === 'invalid') {
      for (const message of result.messages) {
        expect(message.suggestions).toBeUndefined()
      }
      if (testcase.output === null) {
        expect(result.fixed).toBe(false)
        expect(result.output).toBe(testcase.code)
        for (const message of result.messages) {
          expect(message.fix).toBeUndefined()
        }
      }
    }
  },
  valid: [
    createLongWhitespaceCase(),
    ...[
      `<p>\nleft${' \t'.repeat(20_000)}right\n</p>`,
      `<p>${' \t\r\n'.repeat(10_000)}</p>`,
      `<p>${' \t'.repeat(20_000)}Hello${' \t'.repeat(20_000)}</p>`,
    ].map(code => ({
      description:
        'preserves valid layouts with long internal or boundary whitespace',
      code: sfc(code),
    })),
    ...[
      '<p>Hello</p>',
      '<p>\n  Hello\n</p>',
      '<p>\n  Hello\n  world\n</p>',
      '<p>{{ message }}</p>',
      '<p\n  class="description"\n>\n  Hello\n</p>',
      '<p>Read <a href="/guide">the guide</a>.</p>',
      '<p><strong>Warning:</strong><span>Be careful.</span></p>',
      '<p>\n  Read <a href="/guide">the guide</a>.\n</p>',
      '<span>A</span><span>B</span>',
      '<span>A\n</span>',
      '<a\n href="/guide"\n >the guide</a\n>',
      '<AppCard>A\n</AppCard>',
      '<AppCard\n><AppText>A</AppText\n><AppButton>B</AppButton></AppCard\n>',
      '<component :is="tag">A\n</component>',
      '<slot>A\n</slot>',
      '<template #default>A\n</template>',
      '<div></div>',
      '<div> \n </div>',
      '<img><input><AppIcon />',
      '<section>A</section>\n<section>B</section>',
      '<section>A</section><!-- comment --><section>B</section>',
      '<section>A</section> &nbsp; <section>B</section>',
      '<section>A</section>{{ text }}<section>B</section>',
      '<section>A</section>text<section>B</section>',
      '<section>A</section><span /><section>B</section>',
      '<div>\n<!-- comment -->\n</div>',
    ].map(content => ({
      code: sfc(content),
    })),
    ...['pre', 'textarea', 'script', 'style', 'xmp', 'listing'].map(tag => ({
      description: `preserves ${tag} and descendants in strict safe mode`,
      code: sfc(`<${tag}><p>A\n</p><section /><section /></${tag}>`),
      options: { mode: 'strict' as const, fix: 'safe' as const },
    })),
    ...[
      '<div v-pre><div><p>A\n</p></div><section /><section /></div>',
      '<svg><foreignObject><p>A\n</p></foreignObject></svg>',
      '<math><annotation-xml encoding="text/html"><p>A\n</p></annotation-xml></math>',
    ].map(content => ({
      code: sfc(content),
      options: { mode: 'strict' as const, fix: 'safe' as const },
    })),
    {
      code: sfc('<CodeEditor><p>A\n</p><section /><section /></CodeEditor>'),
      options: { groups: [{ tags: ['CodeEditor'], layout: 'preserve' }] },
    },
    {
      description: 'built-in preserved contexts cannot be overridden',
      code: sfc('<pre><p>A\n</p></pre>'),
      options: { groups: [{ tags: ['pre'], layout: 'block' }], mode: 'strict' },
    },
    {
      description: 'last matching group wins and case is exact',
      code: sfc('<AppCard>A\n</AppCard><app-card>A\n</app-card>'),
      options: {
        groups: [
          { tags: ['AppCard'], layout: 'block' },
          { tags: ['AppCard'], layout: 'inline' },
        ],
      },
    },
    {
      description: 'inline grouping keeps a component in the text flow',
      code: sfc('<p>See <RouterLink to="/">details</RouterLink>.</p>'),
      options: { groups: [{ tags: ['RouterLink'], layout: 'inline' }] },
    },
    {
      description: 'compatible mode keeps component formatter escapes',
      code: sfc('<AppCard\n><AppText>A</AppText\n></AppCard\n>'),
      options: { groups: blockGroups },
    },
    {
      description:
        'compatible mode keeps closing-tag escapes between grouped block siblings',
      code: sfc('<AppCard>A</AppCard\n><app-card>B</app-card>'),
      options: { groups: blockGroups, fix: 'safe' },
    },
    {
      description: 'skips non-HTML template languages',
      code: '<template lang="pug">div\n  p Hello</template>',
      options: { mode: 'strict' },
    },
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: 'const html = "<p>Hello\\n</p>"',
    })),
    { filename: 'test.tsx', code: 'const node = <p>Hello</p>' },
    { code: '<script setup>const html = "<p>Hello\\n</p>"</script>' },
  ],
  invalid: [
    ...['\n', '\r\n', '\r'].flatMap(newline =>
      [
        `<p>${newline}left${' '.repeat(40_000)}right</p>`,
        `<p>left${' '.repeat(40_000)}right${newline}</p>`,
      ].map(code => ({
        description:
          'reports partial expansion around long internal whitespace without fixing it',
        code: sfc(code),
        options: { fix: 'safe' as const },
        errors: ['expectedContentLayout' as const],
        output: null,
      })),
    ),
    {
      description: 'strict mode still reports escaped grouped block siblings',
      code: sfc('<AppCard>A</AppCard\n><app-card>B</app-card>'),
      options: { groups: blockGroups, mode: 'strict' },
      errors: ['expectedSingleLineEndTag', 'expectedSiblingNewline'],
      output: null,
    },
    ...['<p>Hello\n</p>', '<p>\nHello</p>', '<p>Hello\nworld</p>'].flatMap(
      content =>
        [undefined, {}, { fix: 'safe' as const }, { groups: [] }].map(
          options => ({
            description:
              'reports partial text layout without changing rendered text',
            code: sfc(content),
            ...(options ? { options } : {}),
            errors: [
              {
                messageId: 'expectedContentLayout' as const,
                data: { name: 'p' },
              },
            ],
            output: null,
          }),
        ),
    ),
    ...[
      '<p>{{ message }}\n</p>',
      '<p>&nbsp;\n</p>',
      '<p>\n<!-- keep -->Hello</p>',
      '<p>\nRead <a href="/guide">the guide</a>.</p>',
      '<div>\n<section>A</section></div>',
    ].map(content => ({
      code: sfc(content),
      options: { fix: 'safe' as const },
      errors: ['expectedContentLayout' as const],
      output: null,
    })),
    {
      description: 'locates the closing tag for a partial text layout',
      code: sfc('  <p>Hello\n  </p>'),
      errors: [
        {
          messageId: 'expectedContentLayout',
          line: 3,
          column: 3,
          endLine: 3,
          endColumn: 7,
        },
      ],
      output: null,
    },
    ...['', ' ', '\t'].map(gap => ({
      description:
        'reports adjacent block siblings without inserting whitespace',
      code: sfc(`<section>A</section>${gap}<section>B</section>`),
      options: { fix: 'safe' as const },
      errors: [
        {
          messageId: 'expectedSiblingNewline' as const,
          data: { prev: 'section', next: 'section' },
        },
      ],
      output: null,
    })),
    {
      description:
        'checks all consecutive pairs, including void and self-closing blocks',
      code: sfc('<hr><div /><section />'),
      errors: ['expectedSiblingNewline', 'expectedSiblingNewline'],
      output: null,
    },
    {
      description: 'reports a split native block closing tag by default',
      code: sfc('<p>Hello</p\n>'),
      errors: [
        {
          messageId: 'expectedSingleLineEndTag',
          data: { name: 'p' },
          line: 2,
          column: 9,
          endLine: 3,
          endColumn: 2,
        },
      ],
      output: null,
    },
    ...['\n', '\r\n', '\r'].map(newline => ({
      description:
        'fixes only whitespace inside the closing tag and keeps line endings',
      code: sfc(`<p>${newline}  Hello${newline}</p${newline}\t>`),
      options: { fix: 'safe' as const },
      errors: ['expectedSingleLineEndTag' as const],
      output: sfc(`<p>${newline}  Hello${newline}</p>`),
    })),
    ...['span', 'AppCard', 'Pre'].map(tag => ({
      description:
        'strict mode reports sensitive closing tags without changing text',
      code: sfc(`<${tag}>Hello</${tag}\n>`),
      options: { mode: 'strict' as const, fix: 'safe' as const },
      errors: ['expectedSingleLineEndTag' as const],
      output: sfc(`<${tag}>Hello</${tag}>`),
    })),
    {
      code: sfc('<span>Hello</span\n>'),
      options: { mode: 'strict' },
      errors: ['expectedSingleLineEndTag'],
      output: null,
    },
    {
      description:
        'independently reports content layout and a split closing tag',
      code: sfc('<p>\nHello</p\n>'),
      errors: ['expectedContentLayout', 'expectedSingleLineEndTag'],
      output: null,
    },
    {
      code: sfc('<AppCard>A\n</AppCard>'),
      options: { groups: blockGroups, fix: 'safe' },
      errors: ['expectedContentLayout'],
      output: null,
    },
    {
      description:
        'grouped component siblings remain report-only even in strict safe mode',
      code: sfc('<AppCard>A</AppCard><app-card>B</app-card>'),
      options: { groups: blockGroups, mode: 'strict', fix: 'safe' },
      errors: ['expectedSiblingNewline'],
      output: null,
    },
    ...['', ' setup', ' lang="ts"', ' setup lang="ts"'].map(script => ({
      code: `<script${script}>const value = 1</script>${sfc('<p>Hello\n</p>')}`,
      errors: ['expectedContentLayout' as const],
      output: null,
    })),
    {
      description:
        'works with JavaScript dual scripts and the native JS parser',
      code: `<script>export default {}</script><script setup>const value = 1</script>${sfc('<p>Hello\n</p>')}`,
      languageOptions: { parserOptions: { parser: null } },
      errors: ['expectedContentLayout'],
      output: null,
    },
    {
      description: 'works with TypeScript dual scripts',
      code: `<script lang="ts">export default {}</script><script setup lang="ts">const value: number = 1</script>${sfc('<p>Hello\n</p>')}`,
      errors: ['expectedContentLayout'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'consistent-template-element-layout',
  rule: consistentTemplateElementLayout,
  languageOptions: vueLanguageOptions,
})

it.each([
  null,
  'strict',
  { unknown: true },
  { mode: null },
  { mode: 'other' },
  { fix: true },
  { fix: 'unsafe' },
  { groups: null },
  { groups: {} },
  { groups: [null] },
  { groups: [{}] },
  { groups: [{ tags: ['A'] }] },
  { groups: [{ layout: 'block' }] },
  { groups: [{ tags: [], layout: 'block' }] },
  { groups: [{ tags: [''], layout: 'block' }] },
  { groups: [{ tags: ['A', 'A'], layout: 'block' }] },
  { groups: [{ tags: [42], layout: 'block' }] },
  { groups: [{ tags: 'A', layout: 'block' }] },
  { groups: [{ tags: ['A'], layout: 'unknown' }] },
  { groups: [{ tags: ['A'], layout: 'block', unknown: true }] },
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})
