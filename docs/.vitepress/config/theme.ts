import { appTitle, appVersion, packageName, repositoryUrl } from '../meta.ts'
import { RULE_DOCS, RULE_GROUPS } from '../rules.ts'
import type { DefaultTheme } from 'vitepress'

export function getThemeConfig(
  locale: 'root' | 'zh' = 'root',
): DefaultTheme.Config {
  const isChinese = locale === 'zh'
  const base = isChinese ? '/zh' : ''
  const labels: Record<string, string> = {
    Home: '首页',
    Guide: '指南',
    Rules: '规则',
    Architecture: '架构设计',
    'Release Notes': '更新日志',
    'Getting Started': '快速开始',
    Configuration: '配置',
    'Rule Composition': '规则组合',
    Contributing: '贡献指南',
    Troubleshooting: '问题排查',
    Overview: '概览',
    'Callbacks and Composables': '回调函数与组合式函数',
    'Macros and Component Models': '宏声明与组件模型',
    'Refs and Result Names': 'ref 与返回值命名',
    'Component Usage Contracts': '组件使用约定',
    'Template Conventions': '模板规范',
    'Statement Ordering': '语句排序',

    'Architecture and Design': '架构与设计',
    'Source Structure': '源码结构',
    'Macro Type Rules': '宏类型规则',
    'Suggest changes to this page': '在 GitHub 上编辑此页',
  }
  const translate = (text: string) =>
    isChinese ? (labels[text] ?? text) : text

  return {
    editLink: {
      pattern: `${repositoryUrl}/edit/main/docs/:path`,
      text: translate('Suggest changes to this page'),
    },
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
      alt: appTitle,
    },
    nav: [
      { link: `${base}/`, text: translate('Home') },
      {
        link: `${base}/guide/`,
        text: translate('Guide'),
        activeMatch: `^${base}/guide/`,
      },
      {
        link: `${base}/rules/`,
        text: translate('Rules'),
        activeMatch: `^${base}/rules/`,
      },
      {
        link: `${base}/design/`,
        text: translate('Architecture'),
        activeMatch: `^${base}/design/`,
      },
      {
        text: `v${appVersion}`,
        items: [
          {
            link: `${base}/`,
            text: `v${appVersion} (${isChinese ? '当前版本' : 'current'})`,
          },
          {
            link: `${repositoryUrl}/releases`,
            text: translate('Release Notes'),
          },
        ],
      },
    ],
    outline: { level: 'deep', label: isChinese ? '本页内容' : 'On this page' },
    ...(isChinese
      ? {
          docFooter: { prev: '上一页', next: '下一页' },
          lastUpdated: { text: '最后更新于' },
          langMenuLabel: '切换语言',
          navMenuLabel: '主导航',
          mobileMenuLabel: '菜单',
          extraMenuLabel: '更多选项',
          sidebarMenuLabel: '目录',
          returnToTopLabel: '返回顶部',
          skipToContentLabel: '跳转到内容',
          darkModeSwitchLabel: '外观',
          lightModeSwitchTitle: '切换到浅色模式',
          darkModeSwitchTitle: '切换到深色模式',
          notFound: {
            title: '页面未找到',
            quote: '请检查链接，或返回首页继续浏览文档。',
            link: '/zh/',
            linkLabel: '返回首页',
            linkText: '返回首页',
          },
        }
      : {}),
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        locales: {
          zh: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                displayDetails: '显示详细列表',
                backButtonTitle: '返回',
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除搜索',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    sidebar: [
      {
        text: translate('Guide'),
        items: [
          { link: `${base}/`, text: translate('Home') },
          { link: `${base}/guide/`, text: translate('Getting Started') },
          {
            link: `${base}/guide/configuration`,
            text: translate('Configuration'),
          },
          {
            link: `${base}/guide/rule-composition`,
            text: translate('Rule Composition'),
          },
          {
            link: `${base}/guide/troubleshooting`,
            text: translate('Troubleshooting'),
          },
          {
            link: `${base}/guide/contributing`,
            text: translate('Contributing'),
          },
        ],
      },
      {
        text: translate('Rules'),
        link: `${base}/rules/`,
        items: [
          { link: `${base}/rules/`, text: translate('Overview') },
          ...RULE_GROUPS.map(group => ({
            text: isChinese ? group.zh : group.en,
            collapsed: true,
            items: RULE_DOCS.filter(rule => rule.group === group.id).map(
              rule => ({
                link: `${base}/rules/${rule.name}`,
                text: rule.name,
              }),
            ),
          })),
        ],
      },
      {
        text: translate('Architecture and Design'),
        link: `${base}/design/`,
        items: [
          { link: `${base}/design/`, text: translate('Overview') },
          {
            link: `${base}/design/source-structure`,
            text: translate('Source Structure'),
          },
          {
            link: `${base}/design/define-macros-types`,
            text: translate('Macro Type Rules'),
          },
          {
            link: `${base}/design/sort-script-setup`,
            text: 'sort-script-setup',
          },
          {
            link: `${base}/design/sort-composable-body`,
            text: 'sort-composable-body',
          },
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
