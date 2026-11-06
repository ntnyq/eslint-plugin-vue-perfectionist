import { createRuleTester } from 'eslint-vitest-rule-tester'
import { format } from 'oxfmt'
import { describe, expect, it } from 'vitest'
import { compile, createSSRApp } from 'vue'
import * as vueParser from 'vue-eslint-parser'
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

/**
 * Count comment range reads through the parser service without relying on
 * machine-dependent timing or changing the parser's own AST and token store.
 *
 * @returns A Vue parser and the number of comment range reads by the rule.
 */
function createCommentRangeCounter() {
  let rangeReads = 0
  return {
    get rangeReads() {
      return rangeReads
    },
    parser: {
      ...vueParser,
      parseForESLint(...args: Parameters<typeof vueParser.parseForESLint>) {
        const result = vueParser.parseForESLint(...args)
        const services = result.services
        const fragment = services?.getDocumentFragment()
        if (!services || !fragment) {
          return result
        }
        const trackedFragment = {
          ...fragment,
          comments: fragment.comments.map(comment => ({
            ...comment,
            get range() {
              rangeReads++
              return comment.range
            },
          })),
        }
        return {
          ...result,
          services: {
            ...services,
            getDocumentFragment: () => trackedFragment,
          },
        }
      },
    },
  }
}

const tableColumns = template(`  <ElTableColumn
    v-if="visibleColumn.updateTime"
    :width="200"
    :label="t('label.updateTime')"
    prop="updateTime"
    align="center"
    sortable="custom"
  >
    <template #default="{ row }">{{
      formatTime(row.updateTime)
    }}</template>
  </ElTableColumn>
  <!-- @vue-generic {import('#types').IExperimentReportTemplate} -->
  <ElTableColumn
    :width="180"
    :label="t('label.action')"
    align="center"
    fixed="right"
  >
    <template #default="{ row }">
      <TableActionList
        :row
        :actions="tableActions"
        test-id="experiment-template-list-row-actions"
      />
    </template>
  </ElTableColumn>`)

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
    ...[128, 1024].map(size => {
      const counter = createCommentRangeCounter()
      return {
        description: `bounds comment scanning across ${size} sibling tags`,
        code: template('<Item />\n\n<!-- keep -->\n'.repeat(size)),
        options: [{ ignoreComments: true }],
        languageOptions: { parser: counter.parser },
        after() {
          expect(counter.rangeReads).toBeGreaterThan(0)
          // Allow indexed lookups and a local scan, but reject a full scan of
          // every comment for every pair. This stays independent of timings.
          expect(counter.rangeReads).toBeLessThan(size * 64)
        },
      }
    }),
    ...['ignore', 'unmatched'].map(policy => {
      const counter = createCommentRangeCounter()
      return {
        description: `does not inspect comment ranges for ${policy} pairs`,
        code: template('<Item />\n<!-- keep -->\n'.repeat(128)),
        options: [
          {
            ignoreComments: true,
            targets:
              policy === 'ignore'
                ? [
                    { prev: '*', next: '*' },
                    { tag: 'Item', blankLine: 'ignore' },
                  ]
                : [{ tag: 'Other' }],
          },
        ] satisfies [PaddingLineBetweenTagsOptions],
        languageOptions: { parser: counter.parser },
        after() {
          expect(counter.rangeReads).toBe(0)
        },
      }
    }),
    {
      description: 'explicit false keeps comments as pair boundaries',
      code: tableColumns,
      options: [{ ignoreComments: false }],
    },
    ...[
      '<Item />\n\n<Item />',
      '<Item />\n\n<!-- keep -->\n<Item />',
      '<Item />\n<!-- keep -->\n\n<Item />',
      '<Item />\n<!-- first -->\n\n<!-- second -->\n<Item />',
      '<Item />\n\n<!-- multi\n\nline -->\n<Item />',
      '<Item /><!-- keep -->text<Item />',
      '<Item />\n<!-- keep -->\n{{ value }}\n<Item />',
      '<Item />\n<!-- keep -->&#32;\n<Item />',
      '<Item />&#10;<!-- keep -->\n<Item />',
      '<Item /><!-- keep -->&nbsp;<Item />',
      '<Item /><!-- keep -->\f<Item />',
      '<pre><Item />\n<!-- keep -->\n<Item /></pre>',
      '<div v-pre><Item />\n<!-- keep -->\n<Item /></div>',
      '<svg><g />\n<!-- keep -->\n<g /></svg>',
    ].map(content => ({
      description:
        'ignoring comments preserves valid padding and scope boundaries',
      code: template(content),
      options: [{ ignoreComments: true }],
    })),
    ...(['never', 0, 'ignore'] as const).flatMap(blankLine =>
      [
        '<Item /><!-- keep --><Item />',
        '<Item />\n<!-- multi\n\nline -->\n<Item />',
      ].map(content => ({
        description: `comment lines do not count as padding for ${blankLine}`,
        code: template(content),
        options: [
          { ignoreComments: true, targets: [{ tag: 'Item', blankLine }] },
        ],
      })),
    ),
    ...([2, 'always', 'ignore'] as const).map(blankLine => ({
      description: 'counts blank lines on both sides of comments',
      code: template('<Item />\n\n<!-- keep -->\n\n<Item />'),
      options: [
        { ignoreComments: true, targets: [{ tag: 'Item', blankLine }] },
      ],
    })),
    ...[
      [],
      [{ tag: 'Other' }],
      [{ prev: 'Other', next: 'Item' }],
      [
        { prev: '*', next: '*' },
        { tag: 'Item', blankLine: 'ignore' },
      ],
    ].map(targets => ({
      description: 'ignoring comments preserves target matching and precedence',
      code: template('<Item />\n<!-- keep -->\n<Item />'),
      options: [{ ignoreComments: true, targets }],
    })),
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
      description: 'excludes comments before, inside, and after a tag pair',
      code: template(
        '<!-- before -->\n<Item><!-- inside --></Item>\n<Item />\n<Item /><!-- after -->',
      ),
      options: [{ ignoreComments: true }],
      errors: ['expectedBlankLines', 'expectedBlankLines'],
      output: template(
        '<!-- before -->\n<Item><!-- inside --></Item>\n\n<Item />\n\n<Item /><!-- after -->',
      ),
    },
    {
      description:
        'adds padding before the generic directive between table columns',
      code: tableColumns,
      options: [{ ignoreComments: true, targets: [{ tag: 'ElTableColumn' }] }],
      errors: [
        {
          messageId: 'expectedBlankLines',
          data: { count: 1, prev: 'ElTableColumn', next: 'ElTableColumn' },
          line: 15,
          column: 3,
        },
      ],
      output: tableColumns.replace(
        '\n  <!-- @vue-generic',
        '\n\n  <!-- @vue-generic',
      ),
    },
    ...['\n', '\r\n', '\r'].flatMap(eol =>
      [
        '<!-- keep -->',
        '<!-- multi\n\nline -->',
        '<!-- first -->\n\t<!-- second -->',
        '<!-- @vue-generic {Row} -->',
        '<!-- <Item /> &nbsp; {{ value }} -->',
      ].map(comment => ({
        description:
          'preserves comment contents, line endings, and indentation',
        code: template(`<Item />  \n\t${comment}\n\t<Item />`).replaceAll(
          '\n',
          () => eol,
        ),
        options: [{ ignoreComments: true }] satisfies [
          PaddingLineBetweenTagsOptions,
        ],
        errors: ['expectedBlankLines' as const],
        output: template(`<Item />  \n\n\t${comment}\n\t<Item />`).replaceAll(
          '\n',
          () => eol,
        ),
      })),
    ),
    ...[0, 1, 2].map(blankLine => ({
      description:
        'removes excess padding across multiple comments without changing them',
      code: template(
        '<Item />\n\n<!-- first -->\n\n<!-- second -->\n\n<Item />',
      ),
      options: [
        { ignoreComments: true, targets: [{ tag: 'Item', blankLine }] },
      ] satisfies [PaddingLineBetweenTagsOptions],
      errors: ['expectedBlankLines' as const],
      output: template(
        `<Item />\n<!-- first -->${'\n'.repeat(blankLine === 2 ? 2 : 1)}<!-- second -->${'\n'.repeat(blankLine ? 2 : 1)}<Item />`,
      ),
    })),
    ...(
      [
        { blankLine: 2, before: '\n', after: '\n'.repeat(3) },
        { blankLine: 'always', before: '\n', after: '\n\n' },
        { blankLine: 'never', before: '\n\n', after: '\n' },
      ] as const
    ).map(({ blankLine, before, after }) => ({
      description: `applies ${blankLine} before leading comments`,
      code: template(`<Item />${before}<!-- keep -->\n<Item />`),
      options: [
        { ignoreComments: true, targets: [{ tag: 'Item', blankLine }] },
      ] satisfies [PaddingLineBetweenTagsOptions],
      errors: [
        blankLine === 'always'
          ? ('expectedAtLeastOneBlankLine' as const)
          : ('expectedBlankLines' as const),
      ],
      output: template(`<Item />${after}<!-- keep -->\n<Item />`),
    })),
    ...[
      '<!-- inline -->\n',
      '<!-- inline -->\n<!-- @vue-generic {Row} -->',
      '\n<!-- @vue-generic {Row} -->',
    ].map(gap => ({
      description:
        'adds padding only at an existing line break outside comments',
      code: template(`<Item />${gap}<Item />`),
      options: [{ ignoreComments: true }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
      errors: ['expectedBlankLines' as const],
      output: template(`<Item />${gap.replace('\n', '\n\n')}<Item />`),
    })),
    ...['<!-- keep -->', ' <!-- multi\n\nline --> '].map(gap => ({
      description:
        'does not use a line break inside a comment to fix inline whitespace',
      code: template(`<Item />${gap}<Item />`),
      options: [{ ignoreComments: true }] satisfies [
        PaddingLineBetweenTagsOptions,
      ],
      errors: ['expectedBlankLines' as const],
      output: null,
    })),
    {
      description: 'does not partially fix oversized padding across comments',
      code: template('<Item />\n<!-- keep -->\n<Item />'),
      options: [
        {
          ignoreComments: true,
          targets: [{ tag: 'Item', blankLine: Number.MAX_SAFE_INTEGER }],
        },
      ],
      errors: ['expectedBlankLines'],
      output: null,
    },
    {
      description: 'checks nested and successive sibling pairs across comments',
      code: template(
        '<section><Item />\n<!-- first -->\n<Item />\n<!-- second -->\n<Item /></section>\n<!-- third -->\n<footer />',
      ),
      options: [{ ignoreComments: true }],
      errors: [
        'expectedBlankLines',
        'expectedBlankLines',
        'expectedBlankLines',
      ],
      output: template(
        '<section><Item />\n\n<!-- first -->\n<Item />\n\n<!-- second -->\n<Item /></section>\n\n<!-- third -->\n<footer />',
      ),
    },
    ...['', ' lang="ts"'].map(language => ({
      description: 'checks comments in both JavaScript and TypeScript SFCs',
      code: `<script setup${language}>const value = 1</script>${template('<Header />\n<!-- keep -->\n<Content />')}`,
      languageOptions: language ? {} : { parserOptions: { parser: null } },
      options: [
        { ignoreComments: true, targets: [{ prev: 'Header', next: '*' }] },
      ] satisfies [PaddingLineBetweenTagsOptions],
      errors: ['expectedBlankLines' as const],
      output: `<script setup${language}>const value = 1</script>${template('<Header />\n\n<!-- keep -->\n<Content />')}`,
    })),
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
    ...(['condense', 'preserve'] as const).flatMap(whitespace =>
      ['<!-- keep -->', '<!-- multi\n\nline -->\n<!-- next -->'].flatMap(
        comment =>
          [0, 3].map(blankLine => ({
            description: `preserves rendered comment spacing in ${whitespace} mode for ${blankLine}`,
            code: template(
              `<span>first</span>\n\n${comment}\n\n<span>second</span>`,
            ),
            options: [
              {
                ignoreComments: true,
                targets: [{ prev: '*', next: '*', blankLine }],
              },
            ] satisfies [PaddingLineBetweenTagsOptions],
            errors: ['expectedBlankLines' as const],
            output: template(
              `<span>first</span>${'\n'.repeat(blankLine ? 3 : 1)}${comment}${'\n'.repeat(blankLine ? 2 : 1)}<span>second</span>`,
            ),
            async after(result: Linter.FixReport) {
              async function render(code: string) {
                return renderToString(
                  createSSRApp({
                    render: compile(
                      code.slice('<template>'.length, -'</template>'.length),
                      { whitespace },
                    ),
                  }),
                )
              }
              expect(await render(result.output)).toBe(
                await render(
                  template(
                    `<span>first</span>\n\n${comment}\n\n<span>second</span>`,
                  ),
                ),
              )
            },
          })),
      ),
    ),
    {
      description:
        'padding before generic comments remains valid after formatting',
      code: template(
        "  <ElTableColumn />\n  <!-- @vue-generic {import('#types').IExperimentReportTemplate} -->\n  <ElTableColumn />",
      ),
      options: [{ ignoreComments: true }],
      errors: ['expectedBlankLines'],
      output: template(
        "  <ElTableColumn />\n\n  <!-- @vue-generic {import('#types').IExperimentReportTemplate} -->\n  <ElTableColumn />",
      ),
      async after(result) {
        const formatted = await format('Test.vue', result.output, {})
        expect(formatted.errors).toEqual([])
        await tester.valid({
          code: formatted.code,
          options: [{ ignoreComments: true }],
        })
      },
    },
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
      ...[null, 0, 1, 'true', [], {}].map(ignoreComments => ({
        ignoreComments,
      })),
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
