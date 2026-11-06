import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createMarkdownRenderer } from 'vitepress'
import { describe, expect, it } from 'vitest'
import plugin from '../../../src/index.ts'
import { RULE_DOCS, RULE_GROUPS } from '../rules.ts'
import { configureExamples, createExampleTransformers } from './examples.ts'
import { getGeneratedSections, replaceGeneratedSection } from './rule-docs.ts'
import { getThemeConfig } from './theme.ts'

const registeredRules = plugin.rules
if (!registeredRules) {
  throw new Error('Plugin rules are missing')
}

const root = new URL('../../../', import.meta.url)
const docsRoot = fileURLToPath(new URL('docs/', root))
const markdown = await createMarkdownRenderer(docsRoot, {
  config: configureExamples,
  codeTransformers: createExampleTransformers(),
})

describe('documentation contracts', () => {
  it('covers every registered rule exactly once with accurate fix capabilities', () => {
    expect(RULE_DOCS.map(rule => rule.name).toSorted()).toEqual(
      Object.keys(registeredRules).toSorted(),
    )
    for (const rule of RULE_DOCS) {
      const implementation = registeredRules[rule.name]
      expect(Boolean(implementation?.meta?.fixable)).toBe(rule.fix !== '—')
      expect(RULE_GROUPS.some(group => group.id === rule.group)).toBe(true)
    }
    for (const group of RULE_GROUPS) {
      const names = RULE_DOCS.filter(rule => rule.group === group.id).map(
        rule => rule.name,
      )
      expect(names).toEqual(names.toSorted())
    }
  })

  it.each(RULE_DOCS.filter(rule => rule.fix === 'Whitespace only'))(
    'only advertises whitespace fixes for $name',
    ({ name }) => {
      expect(registeredRules[name]?.meta?.fixable).toBe('whitespace')
    },
  )

  it.each(
    ['README.md', 'README.zh-CN.md'].flatMap(file =>
      ['LF', 'CRLF'].map(lineEnding => ({
        file,
        lineEnding,
      })),
    ),
  )(
    'checks the introductory examples in $file with $lineEnding line endings',
    async ({ file, lineEnding }) => {
      const source = (await readFile(new URL(file, root), 'utf8')).replace(
        /\r?\n/gu,
        () => (lineEnding === 'CRLF' ? '\r\n' : '\n'),
      )
      const examples = [...source.matchAll(/```ts\r?\n([\s\S]*?)\r?\n```/gu)]
      expect(examples).toHaveLength(2)
      for (const [index, example] of examples.entries()) {
        const kind = index === 0 ? 'incorrect' : 'correct'
        expect(() =>
          markdown.parse(
            `::: ${kind}\n\n\`\`\`ts\n${example[1]}\n\`\`\`\n\n:::`,
            {
              frontmatter: { title: 'vue-perfectionist/callback-style' },
            },
          ),
        ).not.toThrow()
      }
    },
  )

  it('keeps both locale page inventories synchronized', async () => {
    for (const directory of ['', 'guide/', 'rules/', 'design/']) {
      const english = await readdir(new URL(`docs/${directory}`, root))
      const chinese = await readdir(new URL(`docs/zh/${directory}`, root))
      expect(english.filter(file => file.endsWith('.md')).toSorted()).toEqual(
        chinese.filter(file => file.endsWith('.md')).toSorted(),
      )
    }
  })

  it.each(getGeneratedSections())(
    'keeps $file ($marker) synchronized with the catalog',
    async ({ file, marker, content }) => {
      const source = await readFile(new URL(file, root), 'utf8')
      expect(
        replaceGeneratedSection(source, marker, content),
        'Run pnpm docs:sync, then format changed files.',
      ).toBe(source)
    },
  )

  it.each(['en', 'zh'] as const)(
    'lists every fixable rule in the %s composition guide',
    async locale => {
      const source = await readFile(
        new URL(
          `docs/${locale === 'zh' ? 'zh/' : ''}guide/rule-composition.md`,
          root,
        ),
        'utf8',
      )
      const section = source.slice(source.lastIndexOf('\n## '))
      const names = [...section.matchAll(/\| \[`([^`]+)`\]/gu)]
        .map(match => match[1])
        .toSorted()
      expect(names).toEqual(
        RULE_DOCS.filter(rule => rule.fix !== '—')
          .map(rule => rule.name)
          .toSorted(),
      )
      const theme = getThemeConfig(locale === 'zh' ? 'zh' : 'root')
      const sidebar = JSON.stringify(theme.sidebar)
      for (const rule of RULE_DOCS) {
        expect(sidebar).toContain(`/rules/${rule.name}`)
      }
    },
  )

  it.each(
    RULE_DOCS.flatMap(rule =>
      ['rules', 'zh/rules'].map(directory => ({
        name: rule.name,
        file: `${directory}/${rule.name}.md`,
      })),
    ),
  )('validates all examples in $file', async ({ name, file }) => {
    const source = await readFile(new URL(`docs/${file}`, root), 'utf8')
    expect(source).toContain(`title: vue-perfectionist/${name}`)
    expect(() =>
      markdown.parse(source, {
        relativePath: file,
        frontmatter: { title: `vue-perfectionist/${name}` },
      }),
    ).not.toThrow()
  })
})

describe('generated section tables', () => {
  const header = '| Name | Scope |'
  const separator = '| --- | --- |'
  const row = '| callback-style | Scripts |'
  const content = [header, separator, row].join('\n')
  const wrap = (table: string) =>
    `Authored introduction.\n\n<!-- rules:start -->\n\n${table}\n\n<!-- rules:end -->\n\nAuthored conclusion.\n`

  it.each([
    { name: 'missing', separator: '' },
    { name: 'wrong column count', separator: '| --- |' },
    { name: 'changed alignment', separator: '| :--- | --- |' },
    { name: 'malformed', separator: '| ---:--- | --- |' },
  ])('repairs a $name table separator', ({ separator }) => {
    const table = [header, separator, row].filter(Boolean).join('\n')
    expect(replaceGeneratedSection(wrap(table), 'rules', content)).toBe(
      wrap(content),
    )
  })

  it('preserves formatter-owned padding and separator lengths', () => {
    const source = wrap(
      '| Name           | Scope   |\n| -------------- | ------- |\n| callback-style | Scripts |',
    )
    expect(replaceGeneratedSection(source, 'rules', content)).toBe(source)
  })
})

describe('example validation and rendering', () => {
  const env = { frontmatter: { title: 'vue-perfectionist/callback-style' } }
  const invalidCallback = "import { onMounted } from 'vue'\nonMounted(run)"

  it('rejects incorrect examples that report nothing, including missing SFC context', () => {
    const source =
      '::: incorrect\n\n```ts\ndefineProps<{ name: string }>()\n```\n\n:::'
    expect(() =>
      markdown.parse(source, {
        frontmatter: { title: 'vue-perfectionist/define-macros-newline' },
      }),
    ).toThrow('unexpected diagnostics: none')
  })

  it('checks examples after formatter comments and prose', () => {
    const source = `::: correct\n\nAn example.\n\n<!-- prettier-ignore -->\n\n\`\`\`ts\n${invalidCallback}\n\`\`\`\n\n:::`
    expect(() => markdown.parse(source, env)).toThrow('unexpected diagnostics')
  })

  it('rejects parser failures instead of accepting them as rule diagnostics', () => {
    expect(() =>
      markdown.parse('::: incorrect\n\n```ts\nconst =\n```\n\n:::', env),
    ).toThrow('unexpected diagnostics')
  })

  it('rejects unknown profiles and empty example containers', () => {
    expect(() =>
      markdown.parse(
        `::: incorrect missing\n\n\`\`\`ts\n${invalidCallback}\n\`\`\`\n\n:::`,
        env,
      ),
    ).toThrow('Unknown example profile')
    expect(() =>
      markdown.parse('::: incorrect\n\nNo code.\n\n:::', env),
    ).toThrow('no code fence')
  })

  it('renders custom-option diagnostics using the same profile that was validated', async () => {
    const renderer = await createMarkdownRenderer(docsRoot, {
      config: configureExamples,
      codeTransformers: createExampleTransformers(),
    })
    const source =
      '::: incorrect custom-callbacks\n\n```ts\ntryOnMounted(mount)\n```\n\n:::'
    const html = await renderer.renderAsync(source, env)
    expect(html).toContain('twoslash-error')
    expect(html).toContain('Expected an inline callback')
    expect(html).toContain('<CustomWrapper type="incorrect">')
  })
})
