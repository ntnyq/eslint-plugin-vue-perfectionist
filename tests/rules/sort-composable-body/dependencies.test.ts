import { runInNewContext } from 'node:vm'
import { expect } from 'vitest'
import { sortComposableBody } from '../../../src/rules/sort-composable-body.ts'
import { run } from '../../helpers/rule-tester.ts'
import type {
  SortComposableBodyMessageId,
  SortComposableBodyOptions,
} from '../../../src/types/index.ts'

const options: SortComposableBodyOptions = {
  groups: ['consumer', 'unknown'],
  customGroups: [{ groupName: 'consumer', elementNamePattern: '^consumer$' }],
}
const body = (source: string, parameters = '') =>
  `function useCounter(${parameters}) {\n  ${source.replaceAll('\n', '\n  ')}\n}`
await run<SortComposableBodyOptions, SortComposableBodyMessageId>({
  name: 'sort-composable-body dependencies',
  rule: sortComposableBody,
  defaultFilenames: { js: 'test.ts' },
  valid: [
    ...['input', 'input = 7', '{ input }', '[input]', '...input'].flatMap(
      parameters => [
        {
          description: `keeps the initial parameter value before var redeclaration: ${parameters}`,
          code: body(
            'const consumer = input\nvar input = 2\nreturn consumer',
            parameters,
          ),
        },
        {
          description: `does not move a consumer before a parameter overwrite: ${parameters}`,
          code: body(
            'var input = 2\nconst consumer = input\nreturn consumer',
            parameters,
          ),
          options,
        },
      ],
    ),
    {
      description: 'keeps a destructuring redeclaration of a parameter fixed',
      code: body(
        'const consumer = input\nvar { input } = value\nreturn consumer',
        'input',
      ),
    },
    {
      description: 'keeps function-valued parameter overwrites fixed',
      code: body(
        'var input = () => 2\nconst consumer = input\nreturn consumer',
        'input',
      ),
    },
    ...[
      [
        "import { watch as observe } from 'vue'",
        'observe(() => input, () => {})',
      ],
      ["import * as Vue from 'vue'", 'Vue.watch(() => input, () => {})'],
    ].map(([imports, call]) => ({
      code: `${imports}\n${body(`const input = 1\nconst consumer = ${call}`)}`,
      options,
    })),
    ...[
      'const input = 1\nconst consumer = input',
      'const input = 1\nconst consumer = (() => input)()',
      'const input = 1\nconst consumer = read()\nfunction read() { return input }',
      'const input = 1\nconst consumer = read()\nfunction read(value = input) { return value }',
      'const input = 1\nconst read = () => input\nconst consumer = read()',
      'const input = 1\nconst consumer = read()\nfunction read() { return next() }\nfunction next() { return input }',
      'const input = 1\nconst consumer = ref(input)',
    ].map(source => ({
      code: body(source),
      options,
    })),
    ...[
      'watch(() => input, () => {})',
      'watch([() => input], () => {})',
      'watch(() => 0, () => input, { immediate: true })',
      'watch(() => 0, () => input, unknownOptions)',
      'watchEffect(() => input)',
      'watchEffect(() => input, { flush: "sync" })',
      'watchEffect(() => input, unknownOptions)',
      'watchSyncEffect(() => input)',
      'customRef(() => { record(input); return {} })',
    ].map(call => ({
      description: `tracks immediate captures in ${call}`,
      code: `import { watch, watchEffect, watchSyncEffect, customRef } from 'vue'\n${body(`const input = 1\nconst consumer = ${call}`)}`,
      options,
    })),
    {
      description: 'keeps dependency cycles in source order',
      code: body('const input = consumer\nconst consumer = input'),
      options,
    },
    {
      description: 'does not move across a return to satisfy dependencies',
      code: body('const input = 1\nreturn input\nconst consumer = input'),
      options,
    },
  ],
  invalid: [
    {
      description:
        'sorts independent islands without changing the captured parameter value',
      filename: 'test.js',
      code: body(
        'const z = 1\nconst a = 2\nconst consumer = input\nvar input = 2\nconst y = 3\nconst b = 4\nreturn consumer + a + b',
        'input',
      ),
      options: { type: 'natural' },
      errors: ['unexpectedOrder', 'unexpectedOrder'],
      output: body(
        'const a = 2\nconst z = 1\nconst consumer = input\nvar input = 2\nconst b = 4\nconst y = 3\nreturn consumer + a + b',
        'input',
      ),
      after({ output }) {
        expect(runInNewContext(`${output}; useCounter(7)`)).toBe(13)
      },
    },
    {
      description:
        'does not treat outer parameters as bindings of a nested composable',
      code: `function useOuter(input) {\n${body('const z = 1\nvar input = 2')}\n}`,
      options: { groups: ['variable', 'constant'] },
      errors: ['unsafeReorder'],
      output: null,
    },
    ...[
      '() => input',
      'watch(() => 0, () => input)',
      'watch(() => 0, () => input, { immediate: false })',
      'watchEffect(() => input, { flush: "post" })',
      'watchPostEffect(() => input)',
    ].map(expression => ({
      description: `keeps deferred captures deferred in ${expression}`,
      code: `import { watch, watchEffect, watchPostEffect } from 'vue'\n${body(`const input = 1\nconst consumer = ${expression}`)}`,
      options,
      errors: ['unsafeReorder' as const],
      output: null,
    })),
    ...[
      ['input', 'const consumer = input'],
      ['{ input }', 'const consumer = input'],
      ['input = outerValue', 'const consumer = input'],
      ['', 'const consumer = outerValue'],
      ['', 'const consumer = useCounter'],
    ].map(([parameters, consumer]) => ({
      description: `treats parameters and external bindings as external: ${parameters}`,
      code: body(`const independent = 1\n${consumer}`, parameters),
      options,
      errors: ['unsafeReorder' as const],
      output: null,
    })),
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
