import { runInNewContext } from 'node:vm'
import { expect } from 'vitest'
import { sortComposableBody } from '../../../src/rules/sort-composable-body.ts'
import { run } from '../../helpers/rule-tester.ts'
import type {
  SortComposableBodyMessageId,
  SortComposableBodyOptions,
} from '../../../src/types/index.ts'

const body = (source: string) =>
  `async function useCounter() {\n${source
    .split('\n')
    .map(line => (line ? `  ${line}` : ''))
    .join('\n')}\n}`
await run<SortComposableBodyOptions, SortComposableBodyMessageId>({
  name: 'sort-composable-body safety',
  rule: sortComposableBody,
  defaultFilenames: { js: 'test.ts' },
  valid: [
    {
      description: 'preserves a protected annotation in the function header',
      code: 'function useCounter() { /* #__PURE__ */\n  function reset() {}\n  const step = 1\n}',
    },
    ...[
      'return {}',
      'throw new Error()',
      'if (enabled) return {}',
      '{ record() }',
      'while (enabled) break',
      'for (;;) break',
      'try {} catch {}',
      'switch (value) {}',
      'value = 1',
      'value++',
      'const data = await load()',
      'await load()',
      'for await (const item of items) {}',
      'const x = 1, y = 2',
      'using resource = acquire()',
      'let ignored',
      '"use strict"',
    ].map(boundary => ({
      description: `partitions at ${boundary}`,
      code: body(`const z = 1\n${boundary}\nconst a = 2`),
      options: { type: 'natural' as const, groups: ['constant'] },
    })),
    {
      code: body(
        'interface Z {}\ninterface Z { value: number }\ninterface A {}',
      ),
      options: { type: 'natural' },
    },
    {
      code: body(
        'function z(x: number): number\nfunction z(x: unknown) { return x }\nfunction a() {}',
      ),
      options: { type: 'natural' },
    },
    {
      code: body('// @ts-expect-error intentional\nconst z = 1\nconst a = 2'),
      options: { type: 'natural' },
    },
    {
      code: body(
        '// eslint-disable no-unused-vars\nconst z = 1\nconst a = 2\n// eslint-enable no-unused-vars',
      ),
      options: { type: 'natural' },
    },
    {
      code: body('const z = 1\n// region\nconst a = 2'),
      options: { type: 'natural', partitionByComment: true },
    },
    {
      code: body('const z = 1\n\nconst a = 2'),
      options: { type: 'natural', partitionByNewLine: true },
    },
    {
      code: body('declare const z: number\nconst a = 2'),
      options: { type: 'natural' },
    },
  ],
  invalid: [
    ...[
      '// body explanation',
      '/* body explanation */',
      '/* body\n   explanation */',
    ].flatMap(comment =>
      ['\n', '\r\n'].map(eol => ({
        description: `keeps the body header comment fixed: ${JSON.stringify(comment)} / ${JSON.stringify(eol)}`,
        code: `function useCounter() { ${comment}\n  function reset() {}\n  const step = 1\n}`.replaceAll(
          '\n',
          () => eol,
        ),
        errors: ['unexpectedGroupOrder' as const],
        output:
          `function useCounter() { ${comment}\n  const step = 1\n  function reset() {}\n}`.replaceAll(
            '\n',
            () => eol,
          ),
      })),
    ),
    {
      description:
        'separates fixed header comments from movable declaration documentation',
      code: 'const useCounter = () => { /* body */\n  /** Reset */\n  function reset() {}\n  const step = 1\n}',
      errors: ['unexpectedGroupOrder'],
      output:
        'const useCounter = () => { /* body */\n  const step = 1\n  /** Reset */\n  function reset() {}\n}',
    },
    ...['return {}', 'throw new Error()', 'const data = await load()'].map(
      boundary => ({
        description: `sorts independent regions around ${boundary}`,
        code: body(
          `const z = 1\nconst a = 2\n${boundary}\nconst y = 3\nconst b = 4`,
        ),
        options: { type: 'natural' as const },
        errors: ['unexpectedOrder' as const, 'unexpectedOrder' as const],
        output: body(
          `const a = 2\nconst z = 1\n${boundary}\nconst b = 4\nconst y = 3`,
        ),
      }),
    ),
    ...['\n', '\r\n'].map(eol => ({
      description: `preserves indentation and comments with ${JSON.stringify(eol)}`,
      code: body(
        '/** Z */\nconst z = 1 // last\n/** A */\nconst a = 2 // first',
      ).replaceAll('\n', () => eol),
      options: { type: 'natural' as const },
      errors: ['unexpectedOrder' as const],
      output: body(
        '/** A */\nconst a = 2 // first\n/** Z */\nconst z = 1 // last',
      ).replaceAll('\n', () => eol),
    })),
    {
      description: 'nested await does not partition its parent',
      code: body('async function z() { await load() }\nconst a = 1'),
      errors: ['unexpectedGroupOrder'],
      output: body('const a = 1\nasync function z() { await load() }'),
    },
    ...[
      ['const z = obj.value', 'const a = obj.other'],
      ['const z = () => 1', 'const a = () => 2'],
      ['const { z } = get()', 'const { a } = get()'],
      ['class Z {}', 'class A {}'],
      ['enum Z { A }', 'enum A { A }'],
      ['const z = /z/', 'const a = /a/'],
      ['const z = 1', 'function a() {}\n(() => {})()'],
      ['// heading\n\nconst z = 1', 'const a = 2'],
    ].map(([left, right]) => ({
      description: `reports without moving ${left}`,
      code: body(`${left}\n${right}`),
      options: {
        type: 'natural' as const,
        groups: ['function', 'constant', 'variable', 'class', 'enum'],
      },
      errors: ['unsafeReorder' as const],
      output: null,
    })),
    {
      description:
        'does not grant movement permission to Vue registration calls',
      code: `import { ref, onMounted } from 'vue'\n${body('onMounted(() => {})\nconst count = ref(0)')}`,
      errors: [
        {
          messageId: 'unsafeReorder',
          data: { name: 'count', before: 'onMounted', group: 'ref / reactive' },
        },
      ],
      output: null,
    },
    {
      description: 'safe fixes preserve runtime results and return key order',
      filename: 'test.js',
      code: 'function useCounter(seed = 4) {\n  function reset() { return step + seed }\n  const step = 1\n  return { reset, step }\n}\nJSON.stringify([Object.keys(useCounter()), useCounter().reset()])',
      errors: ['unexpectedGroupOrder'],
      output:
        'function useCounter(seed = 4) {\n  const step = 1\n  function reset() { return step + seed }\n  return { reset, step }\n}\nJSON.stringify([Object.keys(useCounter()), useCounter().reset()])',
      after({ output }) {
        expect(runInNewContext(output)).toBe('[[' + '"reset","step"],5]')
      },
    },
    {
      description: 'spacing touches neither braces nor return boundaries',
      code: body('const a = 1\nfunction reset() {}\nreturn { reset, a }'),
      options: { newlinesBetween: 1 },
      errors: ['unexpectedNewlinesBetween'],
      output: body('const a = 1\n\nfunction reset() {}\nreturn { reset, a }'),
    },
    {
      description: 'whitespace fixes respect the allocation cap',
      code: body('const a = 1\nconst b = 2'),
      options: { newlinesInside: 65536 },
      errors: ['unexpectedNewlinesInside'],
      output: null,
    },
    {
      description: 'fix none preserves safe whitespace diagnostics',
      code: body('const a = 1\nconst b = 2'),
      options: { newlinesInside: 1, fix: 'none' },
      errors: ['unexpectedNewlinesInside'],
      output: null,
    },
  ],
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
      expect(result.fixed).toBe(false)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    }
  },
})
