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
          {
            link: '/rules/define-macros-newline',
            text: 'define-macros-newline',
          },
          { link: '/rules/prefer-ref-pattern', text: 'prefer-ref-pattern' },
          { link: '/rules/sort-script-setup', text: 'sort-script-setup' },
        ],
      },
      {
        text: 'Design',
        items: [
          { link: '/design/sort-script-setup', text: 'sort-script-setup' },
          { link: '/design/logo', text: 'Logo' },
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
