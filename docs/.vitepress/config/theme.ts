import { appTitle, appVersion, packageName, repositoryUrl } from '../meta.ts'
import type { DefaultTheme } from 'vitepress'

export function getThemeConfig(): DefaultTheme.Config {
  return {
    editLink: {
      pattern: `${repositoryUrl}/edit/main/docs/:path`,
      text: 'Suggest changes to this page',
    },
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
      alt: appTitle,
    },
    nav: [
      { link: '/', text: 'Home' },
      { link: '/guide/', text: 'Guide', activeMatch: '^/guide/' },
      {
        link: '/rules/',
        text: 'Rules',
        activeMatch: '^/rules/',
      },
      {
        link: '/design/',
        text: 'Architecture',
        activeMatch: '^/design/',
      },
      {
        text: `v${appVersion}`,
        items: [
          { link: '/', text: `v${appVersion} (current)` },
          { link: `${repositoryUrl}/releases`, text: 'Release Notes' },
        ],
      },
    ],
    outline: 'deep',
    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },
    sidebar: [
      {
        text: 'Guide',
        items: [
          { link: '/', text: 'Home' },
          { link: '/guide/', text: 'Getting Started' },
          { link: '/guide/configuration', text: 'Configuration' },
          { link: '/guide/rule-composition', text: 'Rule Composition' },
          { link: '/guide/contributing', text: 'Contributing' },
        ],
      },
      {
        text: 'Rules',
        link: '/rules/',
        items: [
          { link: '/rules/', text: 'Overview' },
          { link: '/rules/callback-style', text: 'callback-style' },
          { link: '/rules/component-prop-types', text: 'component-prop-types' },
          {
            link: '/rules/component-prop-values',
            text: 'component-prop-values',
          },
          {
            link: '/rules/consistent-template-ref-name',
            text: 'consistent-template-ref-name',
          },
          {
            link: '/rules/define-macros-newline',
            text: 'define-macros-newline',
          },
          {
            link: '/rules/define-macros-type-style',
            text: 'define-macros-type-style',
          },
          {
            link: '/rules/define-model-name-casing',
            text: 'define-model-name-casing',
          },
          {
            link: '/rules/max-lines-per-callback',
            text: 'max-lines-per-callback',
          },
          {
            link: '/rules/no-complex-template-expression',
            text: 'no-complex-template-expression',
          },
          {
            link: '/rules/no-complex-v-for-source',
            text: 'no-complex-v-for-source',
          },
          {
            link: '/rules/padding-line-between-tags',
            text: 'padding-line-between-tags',
          },
          {
            link: '/rules/prefer-composable-options',
            text: 'prefer-composable-options',
          },
          {
            link: '/rules/prefer-define-model',
            text: 'prefer-define-model',
          },
          {
            link: '/rules/prefer-function-declaration',
            text: 'prefer-function-declaration',
          },
          {
            link: '/rules/prefer-function-result-pattern',
            text: 'prefer-function-result-pattern',
          },
          { link: '/rules/prefer-ref-pattern', text: 'prefer-ref-pattern' },
          {
            link: '/rules/prefer-simple-event-handler',
            text: 'prefer-simple-event-handler',
          },
          {
            link: '/rules/prefer-template-literal-in-interpolation',
            text: 'prefer-template-literal-in-interpolation',
          },
          {
            link: '/rules/prefer-use-template-ref-inference',
            text: 'prefer-use-template-ref-inference',
          },
          {
            link: '/rules/prefer-watch-effect-alias',
            text: 'prefer-watch-effect-alias',
          },
          {
            link: '/rules/require-component-props',
            text: 'require-component-props',
          },
          {
            link: '/rules/require-component-slots',
            text: 'require-component-slots',
          },
          {
            link: '/rules/require-injection-key',
            text: 'require-injection-key',
          },
          {
            link: '/rules/require-macro-type-name',
            text: 'require-macro-type-name',
          },
          { link: '/rules/require-vue-generic', text: 'require-vue-generic' },
          { link: '/rules/sort-script-setup', text: 'sort-script-setup' },
        ],
      },
      {
        text: 'Architecture and Design',
        link: '/design/',
        items: [
          { link: '/design/', text: 'Overview' },
          { link: '/design/source-structure', text: 'Source Structure' },
          { link: '/design/define-macros-types', text: 'Macro Type Rules' },
          { link: '/design/sort-script-setup', text: 'sort-script-setup' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'x', link: 'https://x.com/ntnyq' },
      { icon: 'npm', link: `https://www.npmjs.com/package/${packageName}` },
      { icon: 'github', link: repositoryUrl },
    ],
  }
}
