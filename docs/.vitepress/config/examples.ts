import { fileURLToPath } from 'node:url'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import * as parserTypeScript from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import MarkdownItContainer from 'markdown-it-container'
import { createTwoslasher } from 'twoslash-eslint'
import ts from 'typescript'
import * as parserVue from 'vue-eslint-parser'
import plugin from '../../../src/index.ts'
import { EXAMPLE_RULES } from './example-rules.ts'
import type { MarkdownRenderer } from 'vitepress'

interface ExampleProfile {
  rule: string
  options: object
  settings?: Linter.Config['settings']
  typed?: boolean
}

const EXAMPLE_PROFILES: Record<string, ExampleProfile> = {
  'vueuse-function-results': {
    rule: 'prefer-function-result-pattern',
    options: {},
    settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
  },
  'vueuse-callback-style': {
    rule: 'callback-style',
    options: {},
    settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
  },
  'vueuse-callback-length': {
    rule: 'max-lines-per-callback',
    options: { max: 3 },
    settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
  },
  'passive-vueuse-model': {
    rule: 'prefer-define-model',
    options: { vueuse: true },
    settings: { 'vue-perfectionist': { autoImport: true } },
  },
  'custom-callbacks': {
    rule: 'callback-style',
    options: {
      vueuse: false,
      customCallbacks: [
        {
          source: '@vueuse/core',
          name: 'useResizeObserver',
          callbackIndices: [1],
        },
        { source: '@vueuse/core', name: 'tryOnMounted', callbackIndices: [0] },
        {
          source: '@vueuse/core',
          name: 'tryOnUnmounted',
          callbackIndices: [0],
        },
      ],
    },
    settings: { 'vue-perfectionist': { autoImport: true } },
  },
  'overridden-targets': {
    rule: 'prefer-function-result-pattern',
    options: {
      targets: [
        { source: 'vue', names: ['ref', 'shallowRef'], pattern: '^is[A-Z]' },
        { source: 'vue', names: ['ref'], pattern: '^has[A-Z]' },
      ],
    },
  },
  'custom-functions': {
    rule: 'prefer-function-result-pattern',
    options: {
      vueuse: false,
      targets: [
        {
          source: '@vueuse/core',
          names: ['useDark', 'useOnline'],
          pattern: '^is[A-Z]',
        },
        {
          source: './state',
          names: ['useFlag'],
          pattern: '^(is|has|should|can)[A-Z]',
          returnIndex: 1,
        },
        {
          source: './default',
          names: ['default'],
          pattern: '^(is|has|should|can)[A-Z]',
        },
      ],
    },
  },
  'ignore-comments': {
    rule: 'padding-line-between-tags',
    options: { ignoreComments: true, targets: [{ tag: 'ElTableColumn' }] },
  },
  'ignore-editor-ref': {
    rule: 'prefer-use-template-ref-inference',
    options: { ignoreRefs: ['editorRef'] },
  },
  'strict-injection-key': {
    rule: 'require-injection-key',
    options: { strict: true },
    typed: true,
  },
}

const linter = new Linter()
const typedFilename = fileURLToPath(new URL('../example.ts', import.meta.url))
const programs = new Map<string, ts.Program>()

function normalizeExample(code: string): string {
  return code.replace(/⏎(?=\r?\n)/gu, '').replace(/⏎$/gu, '\n')
}

function getExampleProgram(code: string): ts.Program {
  const cached = programs.get(code)
  if (cached) {
    return cached
  }

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
  }
  const host = ts.createCompilerHost(options)
  const readFile = host.readFile
  host.readFile = filename =>
    filename.replaceAll('\\', '/') === typedFilename.replaceAll('\\', '/')
      ? code
      : readFile(filename)
  const program = ts.createProgram([typedFilename], options, host)
  programs.set(code, program)
  return program
}

function getExampleConfig(
  ruleName: string,
  profileName: string,
  code: string,
): Linter.Config[] {
  const profile = profileName ? EXAMPLE_PROFILES[profileName] : undefined
  if (!Object.hasOwn(EXAMPLE_RULES, ruleName)) {
    throw new Error(`Unknown documentation rule: ${ruleName}`)
  }
  if (
    profileName &&
    profile?.rule !== ruleName.replace('vue-perfectionist/', '')
  ) {
    throw new Error(`Unknown example profile for ${ruleName}: ${profileName}`)
  }
  return [
    {
      files: ['**/*.{vue,js,ts}'],
      languageOptions: {
        parser: parserTypeScript,
        parserOptions: profile?.typed
          ? { programs: [getExampleProgram(code)] }
          : {},
      },
      plugins: { 'vue-perfectionist': plugin },
      settings: profile?.settings ?? {},
      rules: {
        [ruleName]: profile
          ? ['error', profile.options]
          : EXAMPLE_RULES[ruleName],
      },
    },
    {
      files: ['**/*.vue'],
      languageOptions: {
        parser: parserVue,
        parserOptions: { parser: parserTypeScript },
      },
    },
  ]
}

/**
 * Use the same rule options and parser context for rendering and validation.
 */
export function createExampleTransformers(): ReturnType<
  typeof transformerTwoslash
>[] {
  const entries = [
    ...Object.keys(EXAMPLE_RULES).map(ruleName => ({
      ruleName,
      profileName: '',
    })),
    ...Object.entries(EXAMPLE_PROFILES).map(([profileName, profile]) => ({
      ruleName: `vue-perfectionist/${profile.rule}`,
      profileName,
    })),
  ]
  return entries.map(({ ruleName, profileName }) => {
    const key = profileName ? `${ruleName}/${profileName}` : ruleName
    return transformerTwoslash({
      errorRendering: 'hover',
      explicitTrigger: new RegExp(`\\beslint-check=${key}(?=\\s|$)`),
      langs: ['vue', 'js', 'ts'],
      twoslasher(
        code: string,
        language?: string,
        options?: Parameters<ReturnType<typeof createTwoslasher>>[2],
      ) {
        return createTwoslasher({
          eslintConfig: getExampleConfig(
            ruleName,
            profileName,
            normalizeExample(code),
          ),
          eslintCodePreprocess: normalizeExample,
        })(
          code,
          EXAMPLE_PROFILES[profileName]?.typed ? typedFilename : language,
          options,
        )
      },
    })
  })
}

/**
 * Check every example, including fences preceded by prose or formatter comments.
 * Profiles are explicit container metadata, never inferred from nearby prose.
 */
export function configureExamples(md: MarkdownRenderer) {
  for (const kind of ['correct', 'incorrect']) {
    // The container package and VitePress resolve separate markdown-it types.
    MarkdownItContainer(
      md as unknown as Parameters<typeof MarkdownItContainer>[0],
      kind,
      {
        render(tokens, index) {
          return tokens[index]?.nesting === 1
            ? `<CustomWrapper type="${kind}">`
            : '</CustomWrapper>\n'
        },
      },
    )
  }

  md.core.ruler.push('check-rule-examples', state => {
    const ruleName: unknown = state.env.frontmatter?.title
    if (
      typeof ruleName !== 'string' ||
      !ruleName.startsWith('vue-perfectionist/')
    ) {
      return
    }
    const containers: { kind: string; profile: string; count: number }[] = []
    for (const token of state.tokens) {
      if (/^container_(?:correct|incorrect)_open$/u.test(token.type)) {
        const [kind = '', profile = '', ...extra] = token.info
          .trim()
          .split(/\s+/u)
        if (extra.length) {
          throw new Error(`Unexpected example metadata: ${token.info}`)
        }
        containers.push({ kind, profile, count: 0 })
      } else if (/^container_(?:correct|incorrect)_close$/u.test(token.type)) {
        if (!containers.pop()?.count) {
          throw new Error('Rule example has no code fence')
        }
      } else if (token.type === 'fence' && containers.length) {
        const container = containers.at(-1)
        if (!container || typeof ruleName !== 'string') {
          throw new Error('Rule example needs a page title')
        }
        const language = token.info.split(/\s+/u)[0]
        if (!language || !['vue', 'js', 'ts'].includes(language)) {
          throw new Error(`Unsupported rule example language: ${language}`)
        }
        const code = normalizeExample(token.content)
        const config = getExampleConfig(ruleName, container.profile, code)
        const filename = EXAMPLE_PROFILES[container.profile]?.typed
          ? typedFilename
          : `example.${language}`
        const messages = linter.verify(code, config, { filename })
        const isValid =
          container.kind === 'correct'
            ? messages.length === 0
            : messages.length > 0
        if (
          !isValid ||
          messages.some(message => message.fatal || message.ruleId !== ruleName)
        ) {
          const location = `${state.env.relativePath ?? ruleName}:${(token.map?.[0] ?? 0) + 1}`
          throw new Error(
            `${location}: ${container.kind} example has unexpected diagnostics: ${messages.map(message => message.message).join('; ') || 'none'}`,
          )
        }
        const key = container.profile
          ? `${ruleName}/${container.profile}`
          : ruleName
        token.info = `${token.info.replace(/\s+eslint-check=\S+/gu, '')} eslint-check=${key}`
        container.count++
      }
    }
  })
}
