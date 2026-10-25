import { createRuleTester } from 'eslint-vitest-rule-tester'
import { format } from 'oxfmt'
import { describe, expect, it } from 'vitest'
import { compile, createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { paddingLineBetweenTags } from '../../src/rules/padding-line-between-tags.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type { Linter } from 'eslint'
import type {
  PaddingLineBetweenTagsBlankLine,
  PaddingLineBetweenTagsMessageId,
  PaddingLineBetweenTagsOptions,
} from '../../src/types/index.ts'

function template(content: string) {
  return `<template>\n${content}\n</template>`
}

const tester = createRuleTester<unknown>({
  name: 'padding-line-between-tags',
  rule: paddingLineBetweenTags,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

await run<[PaddingLineBetweenTagsOptions], PaddingLineBetweenTagsMessageId>({
  name: 'padding-line-between-tags',
  rule: paddingLineBetweenTags,
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
      'pre',
      'textarea',
      'script',
      'style',
      'xmp',
      'listing',
      'plaintext',
    ].map(tag => ({
      description: `keeps native ${tag} contexts excluded`,
      code: template(`<${tag}><Item />\n<Item /></${tag}>`),
    })),
    ...[
      '',
      '<Item />',
      '<Item />\n\n<Item />',
      '<div />\n\n<span />',
      '<Item />\n<!-- separator -->\n<Item />',
      '<Item /><!-- separator --><Item />',
      '<Item />text<Item />',
      '<Item />\n{{ value }}\n<Item />',
      '<Item />&#32;<Item />',
      '<Item />&nbsp;<Item />',
      '<Item />\n<!-- multi\nline -->\n<Item />',
      '<pre><div><Item />\n<Item /></div></pre>',
      '<textarea><Item />\n<Item /></textarea>',
      '<div v-pre><section><Item />\n<Item /></section></div>',
      '<svg><g />\n<g /></svg>',
      '<math><mi />\n<mi /></math>',
    ].map(content => ({
      code: template(content),
    })),
    ...['test.js', 'test.ts'].map(filename => ({
      description: `ignores standalone ${filename}`,
      code: 'const markup = "<Item /><Item />"',
      filename,
    })),
    {
      description: 'does not check script or style blocks',
      code: '<script>const markup = "<Item /><Item />"</script><style>.a { color: red }</style>',
    },
    {
      description: 'empty targets replace the default',
      code: template('<Item /><Item />'),
      options: [{ targets: [] }] satisfies [PaddingLineBetweenTagsOptions],
    },
    {
      description: 'only explicitly configured pairs are checked',
      code: template('<Other />\n<Other />\n<Item />\n<div />\n<Item />'),
      options: [{ targets: [{ tag: 'Item' }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
    },
    {
      description: 'source tag names are case-sensitive and not normalized',
      code: template('<Item />\n<item />\n<item />\n<my-item />\n<my-item />'),
      options: [{ targets: [{ tag: 'Item' }, { tag: 'MyItem' }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
    },
    {
      description: 'does not infer the component selected by is',
      code: template('<component :is="Item" />\n<component is="Item" />'),
      options: [{ targets: [{ tag: 'Item' }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
    },
    ...(['never', 0] as const).flatMap(blankLine =>
      ['', ' ', '\n', '\n  '].map(gap => ({
        description: 'zero blank lines allows inline and separate-line tags',
        code: template(`<Item />${gap}<Item />`),
        options: [{ targets: [{ tag: 'Item', blankLine }] }] satisfies [
          PaddingLineBetweenTagsOptions,
        ],
      })),
    ),
    ...[1, 2, 3].flatMap(count =>
      (['always', 'ignore', count] as const).map(blankLine => ({
        description: `accepts ${count} blank lines for ${blankLine}`,
        code: template(`<Item />${'\n'.repeat(count + 1)}<Item />`),
        options: [{ targets: [{ tag: 'Item', blankLine }] }] satisfies [
          PaddingLineBetweenTagsOptions,
        ],
      })),
    ),
    {
      description: 'ignore overrides an earlier wildcard entry',
      code: template('<Item />\n<Item />'),
      options: [
        {
          targets: [
            { prev: '*', next: '*' },
            { tag: 'Item', blankLine: 'ignore' },
          ],
        },
      ] satisfies [PaddingLineBetweenTagsOptions],
    },
    {
      description: 'full pairs are directional',
      code: template('<Content />\n<Header />'),
      options: [{ targets: [{ prev: 'Header', next: 'Content' }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
    },
  ],
  invalid: [
    {
      description: 'an empty options object keeps the default wildcard policy',
      code: template('<Item />\n<Other />'),
      options: [{}] satisfies [PaddingLineBetweenTagsOptions],
      errors: ['expectedBlankLines'],
      output: template('<Item />\n\n<Other />'),
    },
    ...[
      'Pre',
      'Textarea',
      'Script',
      'Style',
      'Xmp',
      'Listing',
      'Plaintext',
    ].map(tag => ({
      description: `checks descendants of the ${tag} component`,
      code: template(`<${tag}><section><Item />\n<Item /></section></${tag}>`),
      errors: ['expectedBlankLines' as const],
      output: template(
        `<${tag}><section><Item />\n\n<Item /></section></${tag}>`,
      ),
    })),
    ...[1e9, Number.MAX_SAFE_INTEGER].map(blankLine => ({
      description: 'reports large safe counts without allocating a replacement',
      code: template('<Item />\n<Item />'),
      options: [{ targets: [{ tag: 'Item', blankLine }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
      errors: [
        {
          messageId: 'expectedBlankLines' as const,
          data: { count: blankLine, prev: 'Item', next: 'Item' },
        },
      ],
      output: null,
    })),
    ...[
      { eol: '\n', blankLine: 65_535 },
      { eol: '\r\n', blankLine: 32_767 },
    ].map(({ eol, blankLine }) => ({
      description: 'fixes padding at the replacement length limit',
      code: template(`<Item />${eol}<Item />`),
      options: [{ targets: [{ tag: 'Item', blankLine }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
      errors: ['expectedBlankLines' as const],
      output: template(`<Item />${eol.repeat(blankLine + 1)}<Item />`),
    })),
    ...[
      { gap: '\n', blankLine: 65_536 },
      { gap: '\r\n', blankLine: 32_768 },
      { gap: ' \n\t', blankLine: 65_535 },
    ].map(({ gap, blankLine }) => ({
      description:
        'includes line-ending width and preserved whitespace in the fix limit',
      code: template(`<Item />${gap}<Item />`),
      options: [{ targets: [{ tag: 'Item', blankLine }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
      errors: ['expectedBlankLines' as const],
      output: null,
    })),
    {
      description: 'defaults to exactly one blank line with a precise location',
      code: template('  <Item />\n  <Other />'),
      errors: [
        {
          messageId: 'expectedBlankLines',
          data: { count: 1, prev: 'Item', next: 'Other' },
          line: 3,
          column: 3,
          endLine: 3,
          endColumn: 12,
        },
      ],
      output: template('  <Item />\n\n  <Other />'),
    },
    {
      description: 'removes excess blank lines under the default policy',
      code: template('<Item />\n\n\n<Item />'),
      errors: ['expectedBlankLines'],
      output: template('<Item />\n\n<Item />'),
    },
    ...[0, 1, 2, 3].flatMap(count =>
      [0, 1, 2, 3]
        .filter(actual => actual !== count)
        .map(actual => ({
          description: `changes ${actual} blank lines to exactly ${count}`,
          code: template(`<Item />${'\n'.repeat(actual + 1)}<Item />`),
          options: [
            { targets: [{ tag: 'Item', blankLine: count }] },
          ] satisfies [PaddingLineBetweenTagsOptions],
          errors: ['expectedBlankLines' as const],
          output: template(`<Item />${'\n'.repeat(count + 1)}<Item />`),
        })),
    ),
    ...(['always', 'never'] as const).map(blankLine => ({
      description: `fixes the ${blankLine} policy`,
      code: template(
        `<Item />${blankLine === 'always' ? '\n' : '\n\n'}<Item />`,
      ),
      options: [{ targets: [{ tag: 'Item', blankLine }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
      errors: [
        blankLine === 'always'
          ? ('expectedAtLeastOneBlankLine' as const)
          : ('expectedBlankLines' as const),
      ],
      output: template(
        `<Item />${blankLine === 'always' ? '\n\n' : '\n'}<Item />`,
      ),
    })),
    ...([1, 2, 'always'] satisfies PaddingLineBetweenTagsBlankLine[]).flatMap(
      blankLine =>
        ['', ' '].map(gap => ({
          description:
            'reports inline siblings without adding rendered whitespace',
          code: template(`<Item />${gap}<Item />`),
          options: [{ targets: [{ tag: 'Item', blankLine }] }] satisfies [
            PaddingLineBetweenTagsOptions,
          ],
          errors: [
            blankLine === 'always'
              ? ('expectedAtLeastOneBlankLine' as const)
              : ('expectedBlankLines' as const),
          ],
          output: null,
        })),
    ),
    {
      description: 'checks three consecutive siblings and nested siblings',
      code: template(
        '<section>\n  <Item />\n  <Item />\n  <Item />\n</section>\n<footer />',
      ),
      errors: [
        'expectedBlankLines',
        'expectedBlankLines',
        'expectedBlankLines',
      ],
      output: template(
        '<section>\n  <Item />\n\n  <Item />\n\n  <Item />\n</section>\n\n<footer />',
      ),
    },
    {
      description: 'does not bridge comments but still checks subsequent pairs',
      code: template('<Item />\n<!-- keep -->\n<Item />\n<Item />'),
      options: [{ targets: [{ tag: 'Item' }] }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
      errors: ['expectedBlankLines'],
      output: template('<Item />\n<!-- keep -->\n<Item />\n\n<Item />'),
    },
    {
      description:
        'later full entries override shorthand without extra priority',
      code: template('<Item />\n\n<Item />'),
      options: [
        { targets: [{ tag: 'Item' }, { prev: '*', next: '*', blankLine: 2 }] },
      ] satisfies [PaddingLineBetweenTagsOptions],
      errors: ['expectedBlankLines'],
      output: template('<Item />\n\n\n<Item />'),
    },
    ...[
      { prev: 'Header', next: 'Content' },
      { prev: '*', next: 'Content' },
      { prev: 'Header', next: '*' },
    ].map(entry => ({
      description: 'supports ordered pairs and a wildcard on either side',
      code: template('<Header />\n<Content />'),
      options: [{ targets: [entry] }] satisfies [PaddingLineBetweenTagsOptions],
      errors: ['expectedBlankLines' as const],
      output: template('<Header />\n\n<Content />'),
    })),
    {
      description: 'a later shorthand can override ignore',
      code: template('<Item />\n<Item />'),
      options: [
        {
          targets: [
            { prev: '*', next: '*', blankLine: 'ignore' },
            { tag: 'Item' },
          ],
        },
      ] satisfies [PaddingLineBetweenTagsOptions],
      errors: ['expectedBlankLines'],
      output: template('<Item />\n\n<Item />'),
    },
    {
      description: 'preserves multiline tags and conditional order',
      code: template(
        '<Item\n  v-if="ok"\n>text</Item>\n<Item v-else-if="pending" />\n<Item v-else />',
      ),
      errors: ['expectedBlankLines', 'expectedBlankLines'],
      output: template(
        '<Item\n  v-if="ok"\n>text</Item>\n\n<Item v-else-if="pending" />\n\n<Item v-else />',
      ),
    },
    ...['\n', '\r\n', '\r'].map(eol => ({
      description:
        'preserves line endings, trailing spaces, and tab indentation',
      code: template('<Item />  \n \t\n\t\n\t<Item />').replaceAll(
        '\n',
        () => eol,
      ),
      errors: ['expectedBlankLines' as const],
      output: template('<Item />  \n\n\t<Item />').replaceAll('\n', () => eol),
    })),
    ...['', ' lang="ts"'].map(language => ({
      description: 'works with ordinary and setup scripts in either language',
      code: `<script${language}>export default {}</script><script setup${language}>const value = 1</script>${template('<Item />\n<Item />')}`,
      languageOptions: language ? {} : { parserOptions: { parser: null } },
      errors: ['expectedBlankLines' as const],
      output: `<script${language}>export default {}</script><script setup${language}>const value = 1</script>${template('<Item />\n\n<Item />')}`,
    })),
    ...['condense', 'preserve'].flatMap(whitespace =>
      ([0, 1, 2] as const).map(blankLine => ({
        description: `preserves rendered spacing in ${whitespace} mode for ${blankLine}`,
        code: template('<span>first</span>\n\n\n\n<span>second</span>'),
        options: [
          { targets: [{ prev: '*', next: '*', blankLine }] },
        ] satisfies [PaddingLineBetweenTagsOptions],
        errors: ['expectedBlankLines' as const],
        output: template(
          `<span>first</span>${'\n'.repeat(blankLine + 1)}<span>second</span>`,
        ),
        async after(result: Linter.FixReport) {
          async function render(code: string) {
            return renderToString(
              createSSRApp({
                render: compile(
                  code.slice('<template>'.length, -'</template>'.length),
                  {
                    whitespace:
                      whitespace === 'condense' ? 'condense' : 'preserve',
                  },
                ),
              }),
            )
          }
          expect(await render(result.output)).toBe(
            await render(
              template('<span>first</span>\n\n\n\n<span>second</span>'),
            ),
          )
        },
      })),
    ),
    {
      description: 'default padding remains valid after formatter processing',
      code: template('<Item />\n<Item />'),
      errors: ['expectedBlankLines'],
      output: template('<Item />\n\n<Item />'),
      async after(result) {
        const formatted = await format('Test.vue', result.output, {})
        expect(formatted.errors).toEqual([])
        await tester.valid({ code: formatted.code })
      },
    },
  ],
})

describe('padding-line-between-tags configuration', () => {
  it.each(
    [
      null,
      'Item',
      [],
      [{ tag: 'Item' }],
      { extra: true },
      { targets: [], extra: true },
      ...[null, {}, 'Item', true].map(targets => ({
        targets,
      })),
      ...[
        [null],
        [{}],
        [{ tag: '*' }],
        [{ tag: '' }],
        [{ prev: 'Item' }],
        [{ next: 'Item' }],
        [{ prev: '', next: 'Item' }],
        [{ tag: 'Item', prev: 'Item' }],
        [{ tag: 'Item', next: 'Item' }],
        [{ tag: 'Item', prev: 'Item', next: 'Item' }],
        ...[
          -1,
          1.5,
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NaN,
          Number.MAX_SAFE_INTEGER + 1,
          true,
          null,
          'consistent',
          '1',
        ].map(blankLine => [{ tag: 'Item', blankLine }]),
        [{ tag: 'Item', extra: true }],
        [{ prev: ['Item'], next: 'Item' }],
      ].map(targets => ({
        targets,
      })),
    ].map(options => ({
      options,
    })),
  )('rejects invalid configuration: %j', async ({ options }) => {
    await expect(
      tester.valid({
        code: template(''),
        options: [options],
      }),
    ).rejects.toThrow()
  })
})
