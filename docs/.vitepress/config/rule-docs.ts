import { RULE_DOCS, RULE_GROUPS } from '../rules.ts'
import type { RuleDocumentation } from '../rules.ts'

interface GeneratedSection {
  file: string
  marker: string
  content: string
}

const SCOPE_LABELS = {
  Scripts: '脚本',
  Setup: 'Setup',
  'TS setup': 'TS setup',
  Template: '模板',
  'Template + scripts': '模板 + 脚本',
  'TS setup + template': 'TS setup + 模板',
}

const FIX_LABELS = {
  'Supported cases': '支持部分情况',
  'Whitespace only': '仅空白',
  'Opt-in': '需显式启用',
  '—': '—',
}

function renderTable(rows: string[][]): string {
  const [header = [], ...body] = rows
  return [header, header.map(() => '---'), ...body]
    .map(row => `| ${row.join(' | ')} |`)
    .join('\n')
}

function renderRuleList(locale: 'en' | 'zh', isReadme: boolean): string {
  const isChinese = locale === 'zh'
  return RULE_GROUPS.map(group => {
    const rows = RULE_DOCS.filter(rule => rule.group === group.id).map(rule => {
      const link = isReadme
        ? `https://vue-perfectionist.vercel.app/${isChinese ? 'zh/' : ''}rules/${rule.name}`
        : `./${rule.name}.md`
      const cells = [`[${rule.name}](${link})`, rule.description[locale]]
      return isReadme
        ? cells
        : [
            ...cells,
            isChinese ? SCOPE_LABELS[rule.scope] : rule.scope,
            isChinese ? FIX_LABELS[rule.fix] : rule.fix,
          ]
    })
    const header = isChinese ? ['规则', '描述'] : ['Rule', 'Description']
    if (!isReadme) {
      header.push(
        ...(isChinese ? ['范围', '自动修复'] : ['Scope', 'Automatic fix']),
      )
    }
    const anchor = isChinese && !isReadme ? ` {#${group.id}}` : ''
    return `### ${group[locale]}${anchor}\n\n${renderTable([header, ...rows])}`
  }).join('\n\n')
}

function renderSummary(rule: RuleDocumentation, locale: 'en' | 'zh'): string {
  const isChinese = locale === 'zh'
  const scope =
    rule.scope === 'Scripts'
      ? isChinese
        ? 'Vue 脚本及独立 JS/TS 文件'
        : 'Vue scripts and standalone JS/TS files'
      : isChinese
        ? SCOPE_LABELS[rule.scope]
        : rule.scope
  let typeInformation = isChinese
    ? '不需要 TypeScript 类型服务。'
    : 'No TypeScript type services required.'
  if (rule.typeInformation) {
    const option =
      rule.name === 'require-injection-key' ? 'strict' : 'typeInformation'
    typeInformation = isChinese
      ? `仅在 \`${option}: true\` 时需要。`
      : `Required only with \`${option}: true\`.`
  } else if (rule.name === 'prefer-use-template-ref-inference') {
    typeInformation = isChinese
      ? '无需类型服务；类型推断依赖 Vue 3.5+ 及 Vue language tools 2.1+。'
      : 'No type services; inference requires Vue 3.5+ and Vue language tools 2.1+.'
  }
  const required = rule.requiresOptions
    ? `\`${rule.name === 'no-restricted-html-elements' ? 'elements' : 'targets'}\``
    : isChinese
      ? '无；启用后即使用默认选项。'
      : 'None; enabling the rule uses its defaults.'
  return `::: info ${isChinese ? '规则速览' : 'At a glance'}\n\n${renderTable([
    isChinese ? ['项目', '说明'] : ['Concern', 'Behavior'],
    [isChinese ? '适用范围' : 'Scope', scope],
    [isChinese ? '默认行为' : 'Defaults', rule.defaults[locale]],
    [isChinese ? '必需选项' : 'Required options', required],
    [
      isChinese ? '自动修复' : 'Automatic fixes',
      isChinese ? FIX_LABELS[rule.fix] : rule.fix,
    ],
    [isChinese ? '类型信息' : 'Type information', typeInformation],
  ])}\n\n:::`
}

/**
 * Authored prose stays outside these bounded, reproducible sections.
 */
export function getGeneratedSections(): GeneratedSection[] {
  return (['en', 'zh'] as const).flatMap(locale => {
    const base = locale === 'zh' ? 'docs/zh' : 'docs'
    return [
      {
        file: locale === 'zh' ? 'README.zh-CN.md' : 'README.md',
        marker: 'rules',
        content: renderRuleList(locale, true),
      },
      {
        file: `${base}/rules/index.md`,
        marker: 'rules',
        content: renderRuleList(locale, false),
      },
      {
        file: `${base}/guide/configuration.md`,
        marker: 'standalone',
        content: RULE_DOCS.filter(
          rule =>
            rule.scope === 'Scripts' || rule.scope === 'Template + scripts',
        )
          .map(
            rule =>
              `- [\`${rule.name}\`](${locale === 'zh' ? '/zh' : ''}/rules/${rule.name})`,
          )
          .join('\n'),
      },
      ...RULE_DOCS.map(rule => ({
        file: `${base}/rules/${rule.name}.md`,
        marker: 'summary',
        content: renderSummary(rule, locale),
      })),
    ]
  })
}

/**
 * Ignore table padding and delimiter widths while retaining table structure.
 */
export function normalizeGeneratedContent(content: string): string {
  return content
    .trim()
    .split('\n')
    .map(line => {
      if (!line.startsWith('|')) {
        return line.trimEnd()
      }
      const isSeparator = /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/u.test(line)
      return line
        .split('|')
        .map(cell => {
          const value = cell.trim()
          return isSeparator ? value.replace(/-{3,}/u, '---') : value
        })
        .join('|')
    })
    .join('\n')
}

export function replaceGeneratedSection(
  source: string,
  marker: string,
  content: string,
): string {
  const startMarker = `<!-- ${marker}:start -->`
  const endMarker = `<!-- ${marker}:end -->`
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  if (start === -1 || end <= start) {
    throw new Error(`Missing generated section: ${marker}`)
  }
  const contentStart = start + startMarker.length
  if (
    normalizeGeneratedContent(source.slice(contentStart, end)) ===
    normalizeGeneratedContent(content)
  ) {
    return source
  }
  return `${source.slice(0, contentStart)}\n\n${content}\n\n${source.slice(end)}`
}
