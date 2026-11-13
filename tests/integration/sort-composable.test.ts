import { runInNewContext } from 'node:vm'
import * as tsParser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { format } from 'oxfmt'
import { describe, expect, it } from 'vitest'
import plugin from '../../src/index.ts'

describe('composable sorting composition and formatter stability', () => {
  it.each([10, 100, 1000])(
    'indexes local returns once when consuming %s members across calls',
    memberCount => {
      let blockVisits = 0
      let propertyKeyReads = 0
      const parser = {
        ...tsParser,
        parseForESLint(...args: Parameters<typeof tsParser.parseForESLint>) {
          const parsed = tsParser.parseForESLint(...args)
          const fn = parsed.ast.body[0]
          const statement =
            fn?.type === 'FunctionDeclaration' ? fn.body.body[0] : undefined
          if (
            statement?.type !== 'ReturnStatement' ||
            statement.argument?.type !== 'ObjectExpression'
          ) {
            throw new Error('Expected a local composable return object.')
          }
          for (const property of statement.argument.properties) {
            if (property.type === 'Property') {
              const key = property.key
              Object.defineProperty(property, 'key', {
                get() {
                  propertyKeyReads++
                  return key
                },
                enumerable: true,
                configurable: true,
              })
            }
          }
          return {
            ...parsed,
            visitorKeys: new Proxy(parsed.visitorKeys, {
              get(target, key) {
                if (key === 'BlockStatement') {
                  blockVisits++
                }
                return Reflect.get(target, key)
              },
            }),
          }
        },
      }
      const names = Array.from(
        { length: memberCount },
        (_, index) => `state${index}`,
      )
      const source = [
        `function usePage() { return { ${names.map(name => `${name}: 0`).join(', ')} } }`,
        ...['first', 'second', 'third'].map(
          prefix =>
            `const { ${names.map(name => `${name}: ${prefix}${name}`).join(', ')} } = usePage()`,
        ),
      ].join('\n')
      const messages = new Linter().verify(
        source,
        {
          files: ['**/*.ts'],
          languageOptions: { parser },
          plugins: { vp: plugin },
          rules: { 'vp/sort-composable-destructure': 'error' },
        },
        'test.ts',
      )
      expect(messages).toEqual([])
      // Count AST work rather than elapsed time. Repeated return scans grow
      // with members or calls; indexed property reads remain linear.
      expect(blockVisits).toBeLessThan(10)
      expect(propertyKeyReads).toBeLessThan(memberCount * 100)
    },
  )

  it('keeps comma-adjacent composable whitespace fixes stable through formatting', async () => {
    const linter = new Linter()
    const config: Linter.Config = {
      files: ['**/*.js'],
      plugins: { vp: plugin },
      rules: {
        'vp/sort-composable-return': 'error',
        'vp/sort-composable-destructure': 'error',
      },
    }
    const source = `function usePage() {
  return {
    state: 1

    ,
    submit() {},
  }
}
const {
  state

  ,
  submit,
} = usePage()`
    const fixed = linter.verifyAndFix(source, config, 'test.js')
    expect(fixed.fixed).toBe(true)
    expect(fixed.messages).toEqual([])
    const formatted = await format('test.js', fixed.output, { semi: false })
    expect(formatted.errors).toEqual([])
    expect(linter.verifyAndFix(formatted.code, config, 'test.js')).toEqual({
      fixed: false,
      messages: [],
      output: formatted.code,
    })
  })

  it('allows report-only spacing when Oxfmt collapses multiple blank lines', async () => {
    const linter = new Linter()
    const source =
      'function usePage() { return { state: 1, submit() {} } }\nconst { state, submit } = usePage()'
    const config: Linter.Config = {
      files: ['**/*.js'],
      plugins: { vp: plugin },
      rules: {
        'vp/sort-composable-return': ['error', { newlinesBetween: 2 }],
        'vp/sort-composable-destructure': ['error', { newlinesBetween: 2 }],
      },
    }
    const fixed = linter.verifyAndFix(source, config, 'test.js')
    expect(fixed.fixed).toBe(true)
    expect(fixed.messages).toEqual([])
    const formatted = await format('test.js', fixed.output, { semi: false })
    expect(formatted.errors).toEqual([])
    const reportOnly = linter.verifyAndFix(
      formatted.code,
      {
        ...config,
        rules: {
          'vp/sort-composable-return': [
            'error',
            { newlinesBetween: 2, fix: 'none' },
          ],
          'vp/sort-composable-destructure': [
            'error',
            { newlinesBetween: 2, fix: 'none' },
          ],
        },
      },
      'test.js',
    )
    expect(reportOnly.fixed).toBe(false)
    expect(reportOnly.output).toBe(formatted.code)
    expect(reportOnly.messages.map(message => message.messageId)).toEqual([
      'unexpectedNewlinesBetween',
      'unexpectedNewlinesBetween',
    ])
    for (const message of reportOnly.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  })

  it('composes composable grouping fixes without changing evaluation or formatter stability', async () => {
    const linter = new Linter()
    const config: Linter.Config = {
      files: ['**/*.js'],
      plugins: { vp: plugin },
      rules: {
        'vp/sort-composable-return': 'error',
        'vp/sort-composable-destructure': 'error',
      },
    }
    const source = `const events = []
function usePage() {
  return {
    state: (events.push('state'), 1),
    value: 2,
    submit() { events.push('submit') },
  }
}
const {
  value,
  submit,
} = usePage()
submit()
JSON.stringify([events, Object.keys(usePage()), value])`
    const result = linter.verifyAndFix(source, config, 'test.js')
    expect(result.fixed).toBe(true)
    expect(result.messages).toEqual([])
    expect(runInNewContext(result.output)).toBe(runInNewContext(source))
    expect(linter.verifyAndFix(result.output, config, 'test.js')).toEqual({
      ...result,
      fixed: false,
    })
    const formatted = await format('test.js', result.output, {
      semi: false,
      singleQuote: true,
    })
    expect(formatted.errors).toEqual([])
    expect(linter.verifyAndFix(formatted.code, config, 'test.js')).toEqual({
      fixed: false,
      messages: [],
      output: formatted.code,
    })
  })

  it('never reorders getters, defaults, or object keys for composable grouping', () => {
    const linter = new Linter()
    const config: Linter.Config = {
      files: ['**/*.js'],
      plugins: { vp: plugin },
      rules: {
        'vp/sort-composable-return': 'error',
        'vp/sort-composable-destructure': [
          'error',
          {
            memberKinds: [
              {
                functionPattern: '^usePage$',
                elementNamePattern: '^submit$',
                kind: 'method',
              },
              {
                functionPattern: '^usePage$',
                elementNamePattern: '^state$',
                kind: 'state',
              },
            ],
          },
        ],
      },
    }
    const source = `const events = []
function usePage() {
  return { get submit() { events.push('get'); return undefined }, state: 1 }
}
function useOther() { return { submit() {}, state: 1 } }
const { submit = events.push('default'), state } = usePage()
JSON.stringify([events, Object.keys(useOther())])`
    const result = linter.verifyAndFix(source, config, 'test.js')
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages.map(message => message.messageId)).toEqual([
      'unexpectedGroupOrder',
      'unexpectedGroupOrder',
    ])
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(runInNewContext(result.output)).toBe(
      '[["get","default"],["submit","state"]]',
    )
  })
})
