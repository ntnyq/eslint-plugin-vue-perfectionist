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
          { link: '/rules/prefer-ref-pattern', text: 'prefer-ref-pattern' },
          {
            link: '/rules/require-component-props',
            text: 'require-component-props',
          },
          {
            link: '/rules/require-macro-type-name',
            text: 'require-macro-type-name',
          },
          { link: '/rules/sort-script-setup', text: 'sort-script-setup' },
        ],
      },
      {
        text: 'Design',
        items: [
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
