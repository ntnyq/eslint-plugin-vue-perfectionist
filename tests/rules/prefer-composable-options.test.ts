import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { preferComposableOptions } from '../../src/rules/prefer-composable-options.ts'
import { run } from '../internal.ts'
import type {
  PreferComposableOptionsMessageId,
  PreferComposableOptionsOptions,
} from '../../src/types/index.ts'

function diagnostic(
  messageId: PreferComposableOptionsMessageId,
  name = 'useComments',
  max = 0,
) {
  return {
    messageId,
    data: { name, max },
  }
}

await run<PreferComposableOptionsOptions, PreferComposableOptionsMessageId>({
  name: 'prefer-composable-options',
  rule: preferComposableOptions,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(testcase.code)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    {
      description: 'the documented API supports destructured and named options',
      code: `interface UseCommentsOptions {
  id: string
  canReply: () => boolean
  thread?: string
}
export function useComments({ id, canReply, thread = '' }: UseCommentsOptions) {}
const useCommentList = (options: UseCommentsOptions) => options
function useCurrentUser() {}`,
    },
    {
      description: 'an imported type is allowed on a destructured container',
      code: 'import type { Options } from "./options"; function useComments({ id }: Options) {}',
    },
    {
      description: 'field types do not need to be resolved',
      code: 'function useComments<T>(options: { id: T; callback: Imported; next?: Options }) {}',
    },
    {
      code: 'function useComments(options: { ["id"]: string }) {}',
    },
    {
      description: 'an ordinary-script type is available inside setup',
      filename: 'Test.vue',
      code: '<script lang="ts">interface Options { id: string }</script>\n<script setup lang="ts">function useComments(options: Options) {}</script>',
    },
    ...[
      'function useComments() {}',
      'function useComments({ id, canReply, thread = "" }) {}',
      'function useComments({ id, ...rest } = {}) {}',
      'function useComments({}) {}',
      'function useComments(options = {}) {}',
      'function useComments(config = { thread: "" }) {}',
      'function useComments(options: { id: string; canReply(): boolean }) {}',
      'function useComments(options?: { thread?: string }) {}',
      'function useComments(options: { thread?: string } = {}) {}',
      'function useComments(options: { id: string } | undefined) {}',
      'function useComments(options: { id: string } | { thread: string }) {}',
      'function useComments(options: { id: string } & { thread: string }) {}',
      'function useComments(options: { "thread": string; [key: string]: unknown }) {}',
      'function useComments(this: Service, { id }) {}',
      'async function useComments<T>({ id }: { id: T }) {}',
      'const useComments = ({ id }) => id',
      'const useComments = function internal({ id }) {}',
      'export default function useComments({ id }) {}',
      'interface Options { id: string }; function useComments(options: Options) {}',
      'type Options = { id: string }; type Alias = Options; function useComments(options: Alias) {}',
      'function useComments(options: Options) {}; interface Options { id: string }',
      'type Options = { id: string } | undefined; function useComments(options: Options) {}',
      'type Absent = undefined; function useComments(options: { id: string } | Absent) {}',
      'interface Options { id: string }; interface Options { thread: string }; function useComments(options: Options) {}',
      'type Options = { id: string }; function outer(Options: string) { function useComments(options: Options) {} }',
      'function outer() { type Options = { id: string }; function useComments(options: Options) {} }',
      'interface Options { child?: Options }; function useComments(options: Options) {}',
      'function useComments(options: { id: string }): void; function useComments(...args: unknown[]) {}',
      'export function useComments(options: { id: string }): void; export function useComments(...args: unknown[]) {}',
      'export default function useComments(options: { id: string }): void; export default function useComments(...args: unknown[]) {}',
      'function outer() { function useComments(options: { id: string }): void; function useComments(...args: unknown[]) {} }',
    ].map(code => ({
      code,
    })),
    ...[
      'function regular(id, callback) {}',
      'function useful(id) {}',
      'const regular = function useComments(id) {}',
      'export default function (id) {}',
      'export default (id) => id',
      'const methods = { useComments(id) {}, useOther: function useOther(id) {} }',
      'class Service { useComments(id) {} }',
      'const useComments = createComposable((id) => id)',
      'const useComments = createComposable(function useComments(id) {})',
      'let useComments; useComments = (id) => id',
      'const useComments = condition ? (id) => id : (thread) => thread',
      'useComments(id, canReply, thread)',
      'type useComments = (id: string) => void',
      'interface Service { useComments(id: string): void }',
      'declare function useComments(id: string): void',
      'function useComments(id: string): void;',
      'declare namespace API { function useComments(id: string): void }',
    ].map(code => ({
      description: 'skips definitions outside the supported scope',
      code,
    })),
    {
      code: 'function useComments(id: string) {}',
      options: { maxPositionalParams: 1 },
    },
    {
      code: 'const useComments = (id) => id',
      options: { maxPositionalParams: 1 },
    },
    {
      code: 'function useComments(id: string, { canReply, thread = "" }) {}',
      options: { maxPositionalParams: 1 },
    },
    {
      code: 'function useComments(id: string, thread: string, options: { canReply(): boolean }) {}',
      options: { maxPositionalParams: 2 },
    },
    {
      code: 'function useComments({ id }, { thread }) {}',
      options: { maxPositionalParams: 1 },
    },
    {
      code: 'function useComments(id = "", { thread } = {}) {}',
      options: { maxPositionalParams: 1 },
    },
    {
      code: 'function useComments(id?: string, options?: { thread: string }) {}',
      options: { maxPositionalParams: 1 },
    },
    {
      code: 'function useComments(this: Service, id: string, options?: { thread: string }) {}',
      options: { maxPositionalParams: 1 },
    },
    {
      description: 'no callback-specific restriction in the first version',
      code: 'function useComments(canReply: () => boolean) {}',
      options: { maxPositionalParams: 1 },
    },
    {
      code: 'function useComments(id, callback) {}; function createComments({ id }) {}',
      options: { functionPattern: '^create[A-Z]' },
    },
    {
      code: 'function useComments(id, callback) {}',
      options: { ignoreNames: ['useComments'] },
    },
    ...['test.d.ts', 'test.d.mts', 'test.d.cts'].map(filename => ({
      filename,
      languageOptions: { parser: tsParser },
      code: 'export function useComments(id: string): void;',
    })),
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: 'export const useComments = ({ id, canReply, thread = "" }) => id',
    })),
    ...['', ' lang="ts"'].flatMap(language =>
      ['script', 'script setup'].map(tag => ({
        filename: 'Test.vue',
        languageOptions: language ? {} : { parserOptions: { parser: null } },
        code: `<${tag}${language}>function useComments({ id, ...rest } = {}) {}</script>`,
      })),
    ),
    {
      filename: 'Test.vue',
      code: '<template><button @click="function useComments(id) {}" /></template>',
    },
  ],
  invalid: [
    {
      description: 'computed keys alone do not establish named fields',
      code: 'declare const key: unique symbol; function useComments(options: { [key]: string }) {}',
      errors: [diagnostic('unknownOptionsObject')],
      output: null,
    },
    {
      description: 'merging a call signature makes an interface callable',
      code: 'interface Options { id: string }; interface Options { (): void }; function useComments(options: Options) {}',
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    },
    {
      description:
        'an unconfirmed last parameter cannot use another positional slot',
      code: 'function useComments(id, options) {}',
      options: { maxPositionalParams: 2 },
      errors: [diagnostic('unknownOptionsObject', 'useComments', 2)],
      output: null,
    },
    {
      description: 'an unanchored custom pattern matches within a binding name',
      code: 'function createComments(id: string) {}',
      options: { functionPattern: 'Comments' },
      errors: [diagnostic('expectedOptionsObject', 'createComments')],
      output: null,
    },
    {
      description: 'an empty pattern matches every named definition',
      code: 'function regular(id: string) {}',
      options: { functionPattern: '' },
      errors: [diagnostic('expectedOptionsObject', 'regular')],
      output: null,
    },
    {
      description: 'overloads in ordinary script do not hide setup definitions',
      filename: 'Test.vue',
      code: '<script lang="ts">function useComments(options: { id: string }): void; function useComments(...args: unknown[]) {}</script>\n<script setup lang="ts">function useComments(id: string) {}</script>',
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    },
    {
      description: 'setup overloads do not hide ordinary-script definitions',
      filename: 'Test.vue',
      code: '<script lang="ts">function useComments(id: string) {}</script>\n<script setup lang="ts">function useComments(options: { id: string }): void; function useComments(...args: unknown[]) {}</script>',
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    },
    {
      description: 'reports the final parameter and the default limit',
      code: 'function useComments(id: string) {}',
      errors: [
        {
          ...diagnostic('expectedOptionsObject'),
          line: 1,
          column: 22,
          endLine: 1,
          endColumn: 32,
        },
      ],
      output: null,
    },
    {
      description:
        'reports the original proposal once without changing defaults or callbacks',
      code: 'export function useComments(id: string, canReply: () => boolean, thread = "") {}',
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    },
    ...[
      'function useComments(id: string, thread: string) {}',
      'function useComments({ id }, thread: string) {}',
      'function useComments(id = "", thread = "") {}',
      'function useComments(id?: string, thread?: string) {}',
    ].map(code => ({
      description:
        'multiple parameters require options even within the positional allowance',
      code,
      options: { maxPositionalParams: 2 },
      errors: [diagnostic('expectedOptionsObject', 'useComments', 2)],
      output: null,
    })),
    ...[
      'string',
      'number',
      'boolean',
      'bigint',
      'symbol',
      'null',
      'undefined',
      'void',
      'never',
      '"thread"',
      'string[]',
      '[string, boolean]',
      '() => boolean',
      'new () => Service',
      '{ (): void; id: string }',
      '{ new (): Service; id: string }',
      '{ id: string } | string',
      '{ id: string } | null',
      '{ id: string } & (() => void)',
    ].map(type => ({
      description: `rejects a non-options shape: ${type}`,
      code: `function useComments(options: ${type}) {}`,
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    })),
    ...[
      'function useComments(options) {}',
      'function useComments(options: any = {}) {}',
      'function useComments(options: unknown) {}',
      'function useComments(options: object) {}',
      'function useComments(options: {}) {}',
      'function useComments(options: { [key: string]: string }) {}',
      'function useComments(options = defaults) {}',
      'function useComments(options = {} as unknown) {}',
      'function useComments(options: Missing) {}',
      'import type { Options } from "./options"; function useComments(options: Options) {}',
      'import type * as Types from "./options"; function useComments(options: Types.Options) {}',
      'function useComments(options: import("./options").Options) {}',
      'function useComments<T extends { id: string }>(options: T) {}',
      'type Options<T> = { id: T }; function useComments(options: Options<string>) {}',
      'type Options<T = string> = { id: T }; function useComments(options: Options) {}',
      'interface Options<T = string> { id: T }; function useComments(options: Options) {}',
      'interface Base { id: string }; interface Options extends Base { thread: string }; function useComments(options: Options) {}',
      'type Options = Options; function useComments(options: Options) {}',
      'type First = Second; type Second = First; function useComments(options: First) {}',
      'type Options = { id: string }; function outer<Options>() { function useComments(options: Options) {} }',
      'type Options = unknown extends string ? { id: string } : { thread: string }; function useComments(options: Options) {}',
      'function useComments(options: { [Key in "id"]: string }) {}',
      'function useComments(options: { id: string } & Unknown) {}',
      'function useComments(options: { id: string } | Unknown) {}',
      'interface Options {}; function useComments(options: Options) {}',
      'class Options { id = "" }; function useComments(options: Options) {}',
    ].map(code => ({
      description: 'reports unconfirmed syntax instead of guessing from names',
      code,
      errors: [diagnostic('unknownOptionsObject')],
      output: null,
    })),
    ...[
      'type Options = string; function useComments(options: Options) {}',
      'type Options = { id: string }; function outer() { type Options = string; function useComments(options: Options) {} }',
      'function useComments(options: string | { id: string } = { id: "" }) {}',
      'function useComments([id]) {}',
      'function useComments(options = []) {}',
      'function useComments(canReply = () => true) {}',
    ].map(code => ({
      code,
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    })),
    ...[
      'function useComments(id, { thread }) {}',
      'function useComments({ id }, { thread }) {}',
      'function useComments([id], { thread }) {}',
    ].map(code => ({
      code,
      errors: [
        {
          messageId: 'exceededMaxPositionalParams' as const,
          data: { name: 'useComments', max: 0, count: 1 },
        },
      ],
      output: null,
    })),
    {
      code: 'function useComments(id: string, canReply: () => boolean, { thread }) {}',
      options: { maxPositionalParams: 1 },
      errors: [
        {
          messageId: 'exceededMaxPositionalParams',
          data: { name: 'useComments', max: 1, count: 2 },
          line: 1,
          column: 34,
          endLine: 1,
          endColumn: 57,
        },
      ],
      output: null,
    },
    ...[
      'function useComments(...args: unknown[]) {}',
      'function useComments(id, ...args) {}',
      'function useComments(...args: [options: { id: string }]) {}',
    ].map(code => ({
      code,
      options: { maxPositionalParams: 10 },
      errors: [
        {
          messageId: 'unexpectedRestParameter' as const,
          data: { name: 'useComments' },
        },
      ],
      output: null,
    })),
    ...[
      'function useComments(id: string): void; function useComments(options: { id: string }): void; function useComments(...args: unknown[]) {}',
      'export function useComments(id: string): void; export function useComments(...args: unknown[]) {}',
      'export default function useComments(id: string): void; export default function useComments(...args: unknown[]) {}',
      'function outer() { function useComments(id: string): void; function useComments(...args: unknown[]) {} }',
    ].map(code => ({
      description:
        'checks public overloads without also reporting the implementation',
      code,
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    })),
    {
      code: 'function useComments(id: string): void; function useComments(id: number): void; function useComments(id: unknown) {}',
      errors: [
        diagnostic('expectedOptionsObject'),
        diagnostic('expectedOptionsObject'),
      ],
      output: null,
    },
    {
      description:
        'an overload in another scope does not hide an implementation',
      code: 'function useComments(options: { id: string }): void; function useComments(options: unknown) {} function outer() { function useComments(id: string) {} }',
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    },
    ...[
      'export default function useComments(id: string) {}',
      'const useComments = (id: string) => id',
      'const useComments = function internal(id: string) {}',
      'const useComments = ((id: string) => id) satisfies Callable',
      'const useComments = ((id: string) => id) as Callable',
      'async function useComments<T>(id: T, thread: string) {}',
    ].map(code => ({
      code,
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    })),
    {
      code: 'function createComments(id: string) {}; function useComments(id: string) {}',
      options: { functionPattern: '^create[A-Z]', ignoreNames: [] },
      errors: [diagnostic('expectedOptionsObject', 'createComments')],
      output: null,
    },
    {
      description: 'ignoreNames matches exact binding names',
      code: 'const useComments = function ignored(id: string) {}',
      options: { ignoreNames: ['useComment', 'ignored'] },
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    },
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: 'function useComments(id, thread = "") {}',
      errors: [diagnostic('expectedOptionsObject')],
      output: null,
    })),
    ...['', ' lang="ts"'].flatMap(language =>
      ['script', 'script setup'].map(tag => ({
        filename: 'Test.vue',
        languageOptions: language ? {} : { parserOptions: { parser: null } },
        code: `<${tag}${language}>function useComments(id, thread = "") {}</script>`,
        errors: [diagnostic('expectedOptionsObject')],
        output: null,
      })),
    ),
    {
      description: 'checks both scripts without visiting template expressions',
      filename: 'Test.vue',
      code: '<script lang="ts">function useComments(id: string) {}</script>\n<script setup lang="ts">const useOther = (id: number) => id</script>\n<template><button @click="function useComments(id) {}" /></template>',
      errors: [
        diagnostic('expectedOptionsObject'),
        diagnostic('expectedOptionsObject', 'useOther'),
      ],
      output: null,
    },
    {
      description:
        'resolves same-name local types independently in dual scripts',
      filename: 'Test.vue',
      code: '<script lang="ts">interface Options { id: string }; function useComments(options: Options) {}</script>\n<script setup lang="ts">type Options = string; function useOther(options: Options) {}</script>',
      errors: [diagnostic('expectedOptionsObject', 'useOther')],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-composable-options',
  rule: preferComposableOptions,
  languageOptions: { parser: tsParser },
})

describe('prefer-composable-options configuration', () => {
  it.each([
    ...[-1, 0.5, '1', null, true].map(maxPositionalParams => ({
      maxPositionalParams,
    })),
    { functionPattern: '[' },
    { functionPattern: 1 },
    { functionPattern: null },
    { ignoreNames: 'useComments' },
    { ignoreNames: [''] },
    { ignoreNames: [1] },
    { ignoreNames: ['useComments', 'useComments'] },
    { requireOptions: 'always' },
    { positionalFunctionParams: 'forbid' },
    { unknown: true },
  ])('rejects invalid options: %j', async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  })
})
