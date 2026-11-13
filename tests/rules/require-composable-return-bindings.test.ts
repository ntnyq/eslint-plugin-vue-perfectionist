import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { requireComposableReturnBindings } from '../../src/rules/require-composable-return-bindings.ts'
import { run } from '../helpers/rule-tester.ts'
import type {
  RequireComposableReturnBindingsMessageId,
  RequireComposableReturnBindingsOptions,
} from '../../src/types/index.ts'

const nestedComposableCode = `(() => {
  function usePage() {
    return { count: 0 }
  }
  return usePage()
})()`

await run<
  RequireComposableReturnBindingsOptions,
  RequireComposableReturnBindingsMessageId
>({
  name: 'require-composable-return-bindings',
  rule: requireComposableReturnBindings,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    if (testcase.type === 'invalid') {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
  valid: [
    ...[
      'function usePage() { const count = ref(0); let size = 0; var enabled = true; function reset() {}; return { count, size, enabled, reset } }',
      'function usePage() { const { count: total, nested: { size }, ...rest } = state; const [first, ...remaining] = items; return { total, size, rest, first, remaining } }',
      'function usePage() { const count = state.count; const reset = () => {}; return { total: count, reset } }',
      'const count = 0; function usePage() { const count = 1; return { count } }',
      'function usePage(count) { { const count = 1; return { count } } }',
      'const usePage = () => { const count = 0; return { count } }',
      'const usePage = function internal() { const count = 0; return { count } }',
      'function usePage() { if (ready) { const count = 1; return { count } }; const other = 2; return { other } }',
      'function usePage() { if (ready) { var count = 1 }; return { count } }',
      'function usePage() { try {} catch (error) { return { error } } }',
      'function usePage() { class Page {}; enum Mode { Ready }; return { Page, Mode } }',
      'function usePage() { return { reset }; function reset() {} }',
      'function usePage() { const count = 1; return { count: (count as number)!, total: count satisfies number } satisfies Api }',
      'function usePage() { const count = 1; return <Api>{ count: <number>count } }',
      'function usePage() { const count = 1; return { "count": count, ["total"]: count, [`size`]: count, [1]: count, [-1]: count, [true]: count, [null]: count, [1n]: count } }',
      'function usePage() { const __proto__ = null; return { __proto__, ["__proto__"]: __proto__ } }',
      'function ordinary() { return { count: 0 } }',
      'function usepage() { return { count: 0 } }',
      'function usePage() { const result = { count: 0 }; return result }',
      'function usePage() { return reactive({ count: 0 }) }',
      'function usePage() { return ready ? { count: 0 } : {} }',
      'function usePage() { return; }',
      'const usePage = () => 0',
      'export default () => ({ count: 0 })',
      'export default function () { return { count: 0 } }',
      'const page = { usePage() { return { count: 0 } } }',
      'class Page { usePage() { return { count: 0 } } }',
      'const usePage = wrap(() => ({ count: 0 }))',
      'function* usePage() { return { count: 0 } }',
      'async function* usePage() { return { count: 0 } }',
      'function usePage() { list.map(() => { return { count: 0 } }); return {} }',
      'const usePage = function internal() { return {} }',
      'const regular = function usePage() { return { count: 0 } }',
      'function usePage() { const count = 1; function ordinary() { return { count } }; return {} }',
      'import { reset } from "./actions"; function usePage() { const localReset = reset; return { reset: localReset } }',
    ].map(code => ({
      code,
    })),
    {
      code: 'function usePage(target, { disabled }, [first], rest = 0, ...args) { return { target, disabled, first, rest, args } }',
      options: { allowParameters: true },
    },
    {
      code: 'function usePage({ count: total }) { return { total } }',
      options: { allowParameters: true, allowAliases: false },
    },
    {
      code: 'function usePage() { const count = 0; return { count, count: count, "count": count, ["count"]: count, [`count`]: count } }',
      options: { allowAliases: false },
    },
    {
      code: 'function usePage() { return { count: 0 } }',
      options: { ignoreNames: ['usePage'] },
    },
    {
      code: 'function createPage() { return { count: 0 } }; function usePage() { return { count: 0 } }',
      options: { functionPattern: '^create[A-Z]', ignoreNames: ['createPage'] },
    },
    {
      description:
        'does not inspect matching composables in template expressions',
      filename: 'Test.vue',
      code: `<template>{{ ${nestedComposableCode} }}</template>`,
    },
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: 'function usePage() { const count = 0; return { count } }',
    })),
    ...['', ' lang="ts"'].flatMap(lang =>
      ['script', 'script setup'].map(tag => ({
        filename: 'Test.vue',
        languageOptions: lang ? {} : { parserOptions: { parser: null } },
        code: `<${tag}${lang}>function usePage() { const count = 0; return { count } }</script>`,
      })),
    ),
  ],
  invalid: [
    ...[
      'true',
      'null',
      '0',
      '"text"',
      '`text`',
      'state.count',
      'state?.count',
      'width.value * height.value',
      'computed(() => state.count)',
      '() => start()',
      'function () {}',
      '{}',
      '[]',
      'new Map()',
      'await load()',
      '(count, count)',
      '(count = 1)',
      'count++',
      'ready ? count : count',
      '(1 as const)',
    ].map(expression => ({
      description: `requires a binding instead of ${expression}`,
      code: `async function usePage() { let count = 0; return { value: ${expression} } }`,
      errors: [
        { messageId: 'expectedBinding' as const, data: { key: 'value' } },
      ],
      output: null,
    })),
    ...[
      'reset() {}',
      'get count() { return 0 }',
      'set count(value) {}',
      'reset: function () {}',
    ].map(member => ({
      code: `function usePage() { return { ${member} } }`,
      errors: ['expectedBinding' as const],
      output: null,
    })),
    ...[
      'const count = 0; function usePage() { return { count } }',
      'import { count } from "./state"; function usePage() { return { count } }',
      'import type { count } from "./state"; function usePage() { return { count } }',
      'function outer() { const count = 0; function usePage() { return { count } } }',
      'function outer(count) { function usePage() { return { count } } }',
      'function usePage() { return { count } }',
      'function usePage() { const count = 0; function useNested() { return { count } }; return {} }',
      'function usePage() { { const count = 0 }; return { count } }',
      'function usePage() { function nested() { var count = 0 }; return { count } }',
      'function usePage() { type count = number; return { count } }',
      'function usePage() { interface count {}; return { count } }',
      'function usePage() { return { value: undefined } }',
      'function usePage() { return { value: NaN } }',
      'function usePage() { return { value: arguments } }',
      'function usePage() { return { usePage } }',
      'const usePage = function internal() { return { internal } }',
    ].map(code => ({
      code,
      errors: ['nonLocalBinding' as const],
      output: null,
    })),
    {
      description: 'reports a binding reference with its exact location',
      code: 'function usePage() {\n  return { count }\n}',
      errors: [
        {
          messageId: 'nonLocalBinding',
          data: { name: 'count', functionName: 'usePage' },
          line: 2,
          column: 12,
          endLine: 2,
          endColumn: 17,
        },
      ],
      output: null,
    },
    {
      description:
        'never resolves a same-named outer binding through a parameter',
      code: 'const count = 0; function usePage(count) { return { count } }',
      errors: ['unexpectedParameter'],
      output: null,
    },
    {
      code: 'function usePage(target, { disabled }, [first], rest = 0, ...args) { return { target, disabled, first, rest, args } }',
      errors: Array.from({ length: 5 }, () => ({
        messageId: 'unexpectedParameter' as const,
      })),
      output: null,
    },
    {
      description: 'parameter and locality checks precede alias checks',
      code: 'const external = 0; function usePage(target) { return { renamed: target, renamedExternal: external } }',
      options: { allowAliases: false },
      errors: ['unexpectedParameter', 'nonLocalBinding'],
      output: null,
    },
    {
      description: 'a concise arrow cannot bypass the parameter policy',
      code: 'const usePage = count => ({ count })',
      errors: ['unexpectedParameter'],
      output: null,
    },
    {
      code: 'function usePage({ count: total }) { return { count: total } }',
      options: { allowParameters: true, allowAliases: false },
      errors: [
        { messageId: 'unexpectedAlias', data: { key: 'count', name: 'total' } },
      ],
      output: null,
    },
    {
      code: 'function usePage() { const count = 0; return { total: count, ["size"]: count, [1]: count } }',
      options: { allowAliases: false },
      errors: ['unexpectedAlias', 'unexpectedAlias', 'unexpectedAlias'],
      output: null,
    },
    {
      code: 'function outer(count) { function usePage() { return { count } } }',
      options: { allowParameters: true },
      errors: ['nonLocalBinding'],
      output: null,
    },
    {
      code: 'function usePage() { const state = {}; return { ...state, ...useOther() } }',
      errors: ['unexpectedSpread', 'unexpectedSpread'],
      output: null,
    },
    {
      code: 'function usePage() { const count = 0, key = "count"; return { [key]: count, ["co" + "unt"]: count, [getKey()]: () => {} } }',
      errors: ['dynamicKey', 'dynamicKey', 'dynamicKey'],
      output: null,
    },
    ...['__proto__', '"__proto__"'].map(key => ({
      code: `function usePage() { const proto = null; return { ${key}: proto } }`,
      errors: ['prototypeSetter' as const],
      output: null,
    })),
    {
      description: 'does not recurse into inline nested objects',
      code: 'function usePage() { return { nested: { value: 1 } } }',
      errors: ['expectedBinding'],
      output: null,
    },
    {
      description:
        'checks each returned object and independently named nested functions',
      code: 'function usePage() { function useNested() { return { value: 0 } }; if (ready) return { value: 1 }; return { value: 2 } }',
      errors: ['expectedBinding', 'expectedBinding', 'expectedBinding'],
      output: null,
    },
    ...[
      'export default function usePage() { return { count: 0 } }',
      'async function usePage() { return { count: 0 } }',
      'const usePage = () => ({ count: 0 })',
      'const usePage = function internal() { return { count: 0 } }',
      'const usePage = (() => ({ count: 0 })) satisfies Callable',
      'const usePage = (function internal() { return { count: 0 } }) as Callable',
      'function usePage() { return ({ count: 0 } as const) }',
      'function usePage() { return { count: 0 } satisfies Api }',
    ].map(code => ({
      code,
      errors: ['expectedBinding' as const],
      output: null,
    })),
    {
      code: 'function createPage() { return { count: 0 } }; function usePage() { return { count: 0 } }',
      options: { functionPattern: 'create', ignoreNames: [] },
      errors: ['expectedBinding'],
      output: null,
    },
    {
      code: 'function regular() { return { count: 0 } }',
      options: { functionPattern: '' },
      errors: ['expectedBinding'],
      output: null,
    },
    {
      code: 'const usePage = function ignored() { return { count: 0 } }',
      options: { ignoreNames: ['usePag', 'ignored'] },
      errors: ['expectedBinding'],
      output: null,
    },
    {
      description:
        'reports the same matching composable in standalone JavaScript',
      filename: 'test.js',
      code: nestedComposableCode,
      errors: [{ messageId: 'expectedBinding', data: { key: 'count' } }],
      output: null,
    },
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: 'function usePage() { return { count: 0 } }',
      errors: ['expectedBinding' as const],
      output: null,
    })),
    ...['', ' lang="ts"'].flatMap(lang =>
      ['script', 'script setup'].map(tag => ({
        filename: 'Test.vue',
        languageOptions: lang ? {} : { parserOptions: { parser: null } },
        code: `<${tag}${lang}>function usePage() { return { count: 0 } }</script>`,
        errors: ['expectedBinding' as const],
        output: null,
      })),
    ),
    {
      description:
        'keeps local binding ownership distinct across both script blocks',
      filename: 'Test.vue',
      code: '<script lang="ts">const count = 0; function usePage() { return { count } }</script><script setup lang="ts">function useOther() { const count = 1; return { count, value: 0 } }</script>',
      errors: ['nonLocalBinding', 'expectedBinding'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-composable-return-bindings',
  rule: requireComposableReturnBindings,
  languageOptions: { parser: tsParser },
})

describe('require-composable-return-bindings configuration', () => {
  it.each([
    { functionPattern: '[' },
    { functionPattern: null },
    { functionPattern: 1 },
    { ignoreNames: 'usePage' },
    { ignoreNames: [''] },
    { ignoreNames: [1] },
    { ignoreNames: ['usePage', 'usePage'] },
    { allowAliases: 'true' },
    { allowAliases: null },
    { allowParameters: 1 },
    { allowParameters: null },
    { unknown: true },
  ])('rejects invalid options: %j', async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  })
})
