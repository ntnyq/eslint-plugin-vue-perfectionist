import { appDescription, appTitle } from '../meta.ts'
import type { HeadConfig } from 'vitepress'

export const head: HeadConfig[] = [
  ['link', { href: '/logo.svg', rel: 'icon', type: 'image/svg+xml' }],
  ['meta', { content: '#4b32c3', name: 'theme-color' }],
  ['meta', { content: 'website', property: 'og:type' }],
  ['meta', { content: appTitle, property: 'og:title' }],
  ['meta', { content: appDescription, property: 'og:description' }],
]
