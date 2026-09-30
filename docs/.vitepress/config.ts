import { transformerRenderWhitespace } from '@shikijs/transformers'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import * as parserTypeScript from '@typescript-eslint/parser'
import MarkdownItContainer from 'markdown-it-container'
import { createTwoslasher } from 'twoslash-eslint'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin } from 'vitepress-plugin-group-icons'
import * as parserVue from 'vue-eslint-parser'
import pluginVuePerfectionist from '../../src/index.ts'
import { head } from './config/head.ts'
import { getThemeConfig } from './config/theme.ts'
import { appDescription, appTitle } from './meta.ts'
import type { Linter } from 'eslint'

const exampleRules = {
  'vue-perfectionist/callback-style': 'error',
  'vue-perfectionist/component-prop-values': [
    'error',
    {
      targets: [
        {
          components: ['AppStepCounter'],
          props: { count: { multipleOf: 10 } },
        },
      ],
      unknownValues: 'report',
    },
  ],
  'vue-perfectionist/component-prop-types': [
    'error',
    {
      targets: [
        {
          components: ['AppStepper'],
          props: { count: 'number' },
        },
        {
          components: ['AppButton'],
          props: {
            disabled: { type: 'boolean', booleanCasting: true },
          },
        },
      ],
    },
  ],
  'vue-perfectionist/consistent-template-ref-name': 'error',
  'vue-perfectionist/define-macros-newline': 'error',
  'vue-perfectionist/define-macros-type-style': 'error',
  'vue-perfectionist/prefer-ref-pattern': 'error',
  'vue-perfectionist/require-component-props': [
    'error',
    {
      targets: [{ components: ['AppCounter'], props: ['count'] }],
    },
  ],
  'vue-perfectionist/require-macro-type-name': 'error',
  'vue-perfectionist/sort-script-setup': 'error',
} satisfies Record<string, Linter.RuleEntry>

export default defineConfig({
  cleanUrls: true,
  description: appDescription,
  head,
  lang: 'en-US',
  lastUpdated: true,
  themeConfig: getThemeConfig(),
  title: appTitle,
  markdown: {
    codeTransformers: [
      transformerRenderWhitespace({
        position: 'all',
      }),
      transformerTwoslash({
        explicitTrigger: /\btwoslash\b/,
      }),
      ...Object.entries(exampleRules).map(([ruleName, ruleConfig]) =>
        transformerTwoslash({
          errorRendering: 'hover',
          explicitTrigger: new RegExp(`\\beslint-check=${ruleName}(?=\\s|$)`),
          langs: ['vue', 'js', 'ts'],
          twoslasher: createTwoslasher({
            eslintConfig: [
              {
                files: ['**/*.{vue,js,ts}'],
                languageOptions: {
                  parser: parserTypeScript,
                  ecmaVersion: 'latest',
                  sourceType: 'module',
                },
                plugins: {
                  'vue-perfectionist': pluginVuePerfectionist,
                },
                rules: { [ruleName]: ruleConfig },
              },
              {
                files: ['**/*.vue'],
                languageOptions: {
                  parser: parserVue,
                  parserOptions: { parser: parserTypeScript },
                },
              },
            ],
            eslintCodePreprocess(code) {
              // Remove presentational newline markers before parsing the SFC.
              return code.replace(/⏎(?=\r?\n)/gu, '').replace(/⏎$/gu, '\n')
            },
          }),
        }),
      ),
    ],
    config(md) {
      md.use(groupIconMdPlugin)

      type MarkdownIt = Parameters<typeof MarkdownItContainer>[0]

      for (const type of ['correct', 'incorrect']) {
        // VitePress and the container plugin resolve different markdown-it types.
        MarkdownItContainer(md as unknown as MarkdownIt, type, {
          render(
            tokens,
            index,
            _options,
            env: { frontmatter?: { title?: string } },
          ) {
            if (tokens[index]?.nesting !== 1) {
              return '</CustomWrapper>\n'
            }

            // Each page checks only its own rule, so unrelated rules cannot
            // turn a correct example into an error.
            const ruleName = env.frontmatter?.title
            const next = tokens[index + 1]
            if (
              ruleName &&
              Object.hasOwn(exampleRules, ruleName) &&
              next?.type === 'fence' &&
              !/\beslint-check\b/u.test(next.info)
            ) {
              next.info = `${next.info} eslint-check=${ruleName}`
            }

            return `<CustomWrapper type="${type}">`
          },
        })
      }
    },
  },
})
