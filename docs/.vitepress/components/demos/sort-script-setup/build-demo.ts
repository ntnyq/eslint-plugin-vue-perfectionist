import { codeToKeyedTokens } from '@shikijs/magic-move/core'
import * as tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { createHighlighter } from 'shiki'
import * as vueParser from 'vue-eslint-parser'
import plugin from '../../../../../src/index.ts'
import { EXAMPLES, SORT_MODES, SORT_ORDERS } from './examples.ts'
import type { SortScriptSetupOptions } from '../../../../../src/index.ts'

const linter = new Linter()

export function createDemoConfig(
  options: SortScriptSetupOptions,
): Linter.Config {
  return {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: { 'vue-perfectionist': plugin },
    rules: { 'vue-perfectionist/sort-script-setup': ['error', options] },
  }
}

/**
 * Runs the actual rule and precompiles highlighting exclusively at build time.
 */
export async function buildDemo() {
  const highlighter = await createHighlighter({
    langs: ['vue'],
    themes: ['github-light', 'github-dark'],
  })

  function createResult(code: string, messages: Linter.LintMessage[]) {
    const fatal = messages.find(message => message.fatal)
    if (fatal) {
      throw new Error(`Invalid demo source: ${fatal.message}`)
    }

    return {
      code,
      messages: messages.map(({ line, column, message, messageId }) => ({
        line,
        column,
        message,
        messageId,
      })),
      tokens: codeToKeyedTokens(highlighter, code, {
        lang: 'vue',
        themes: { light: 'github-light', dark: 'github-dark' },
      }),
    }
  }

  try {
    return EXAMPLES.map(example => ({
      ...example,
      initial: createResult(
        example.code,
        linter.verify(example.code, createDemoConfig({}), 'Demo.vue'),
      ),
      variants: SORT_MODES.flatMap(({ type }) =>
        SORT_ORDERS.map(order => {
          const options = {
            type,
            order,
            newlinesBetween: 1,
            fix: 'safe',
          } as const satisfies SortScriptSetupOptions
          const result = linter.verifyAndFix(
            example.code,
            createDemoConfig(options),
            { filename: 'Demo.vue' },
          )

          return {
            type,
            order,
            options,
            ...createResult(result.output, result.messages),
          }
        }),
      ),
    }))
  } finally {
    highlighter.dispose()
  }
}

export type DemoData = Awaited<ReturnType<typeof buildDemo>>
export type DemoResult = DemoData[number]['initial']
