import { transformerRenderWhitespace } from '@shikijs/transformers'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin } from 'vitepress-plugin-group-icons'
import {
  configureExamples,
  createExampleTransformers,
} from './config/examples.ts'
import { head } from './config/head.ts'
import { getThemeConfig } from './config/theme.ts'
import { appDescription, appTitle } from './meta.ts'

export default defineConfig({
  cleanUrls: true,
  description: appDescription,
  head,
  locales: {
    root: { label: 'English', lang: 'en-US' },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      description:
        'ESLint 规则，帮助你编写风格一致、易读且易于维护的 Vue 3 代码。',
      head: [
        [
          'meta',
          {
            property: 'og:description',
            content:
              'ESLint 规则，帮助你编写风格一致、易读且易于维护的 Vue 3 代码。',
          },
        ],
      ],
      themeConfig: getThemeConfig('zh'),
      markdown: {
        container: {
          tipLabel: '提示',
          noteLabel: '说明',
          infoLabel: '信息',
          warningLabel: '警告',
          dangerLabel: '危险',
          cautionLabel: '注意',
          importantLabel: '重要',
          detailsLabel: '详细信息',
        },
        codeCopyButton: { tooltipText: '复制代码', copiedText: '已复制' },
      },
    },
  },
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
      ...createExampleTransformers(),
    ],
    config(md) {
      md.use(groupIconMdPlugin)

      configureExamples(md)
    },
  },
})
