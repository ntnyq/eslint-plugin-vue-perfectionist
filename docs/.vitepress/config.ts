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
      transformerTwoslash({
        errorRendering: 'hover',
        explicitTrigger: /\beslint-check\b/,
        langs: ['vue'],
        twoslasher: createTwoslasher({
          eslintConfig: [
            {
              files: ['**/*.vue'],
              languageOptions: {
                parser: parserVue,
                parserOptions: {
                  parser: parserTypeScript,
                  ecmaVersion: 'latest',
                  sourceType: 'module',
                },
              },
              plugins: {
                'vue-perfectionist': pluginVuePerfectionist,
              },
              rules: {
                'vue-perfectionist/callback-style': 'error',
                'vue-perfectionist/define-macros-newline': 'error',
                'vue-perfectionist/prefer-ref-pattern': 'error',
                'vue-perfectionist/sort-script-setup': 'error',
              },
            },
          ],
          eslintCodePreprocess(code) {
            // Remove presentational newline markers before parsing the SFC.
            return code.replace(/⏎(?=\r?\n)/gu, '').replace(/⏎$/gu, '\n')
          },
        }),
      }),
    ],
    config(md) {
      md.use(groupIconMdPlugin)

      type MarkdownIt = Parameters<typeof MarkdownItContainer>[0]

      for (const type of ['correct', 'incorrect']) {
        // VitePress and the container plugin resolve different markdown-it types.
        MarkdownItContainer(md as unknown as MarkdownIt, type, {
          render(tokens, index) {
            if (tokens[index]?.nesting !== 1) {
              return '</CustomWrapper>\n'
            }

            const next = tokens[index + 1]
            if (
              next?.type === 'fence' &&
              !/\beslint-check\b/u.test(next.info)
            ) {
              next.info = `${next.info} eslint-check`
            }

            return `<CustomWrapper type="${type}">`
          },
        })
      }
    },
  },
})
