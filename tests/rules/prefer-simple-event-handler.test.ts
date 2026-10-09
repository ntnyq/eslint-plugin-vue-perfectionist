import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { preferSimpleEventHandler } from '../../src/rules/prefer-simple-event-handler.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  PreferSimpleEventHandlerMessageId,
  PreferSimpleEventHandlerOptions,
} from '../../src/types/index.ts'

function template(expression: string, event = '@click') {
  return `<template><button ${event}="${expression}" /></template>`
}

const invalidExpressions: [string, PreferSimpleEventHandlerMessageId][] = [
  ['save(); close()', 'expectedSingleOperation'],
  ['save()\nclose()', 'expectedSingleOperation'],
  ['save();;', 'expectedSingleOperation'],
  ['() => { save(); close() }', 'expectedSingleOperation'],
  ['() => {}', 'expectedSingleOperation'],
  ['() => { return }', 'expectedSingleOperation'],
  ['() => { ; }', 'unexpectedStatement'],
  ['(save(), close())', 'unexpectedSequence'],
  ['save((prepare(), item))', 'unexpectedSequence'],
  ['run(() => { save(); close() })', 'expectedSingleOperation'],
  ['if (ok) save()', 'unexpectedStatement'],
  ['return save()', 'unexpectedStatement'],
  ['() => { if (ok) save() }', 'unexpectedStatement'],
  ['() => { while (ok) save() }', 'unexpectedStatement'],
  ['() => { do { save() } while (ok) }', 'unexpectedStatement'],
  ['() => { for (;;) save() }', 'unexpectedStatement'],
  ['() => { for (const item of items) save(item) }', 'unexpectedStatement'],
  ['() => { for (const key in items) save(key) }', 'unexpectedStatement'],
  ['() => { switch (value) { case 1: save() } }', 'unexpectedStatement'],
  ['() => { try { save() } catch (error) { close() } }', 'unexpectedStatement'],
  ['() => { throw error }', 'unexpectedStatement'],
  ['() => { debugger }', 'unexpectedStatement'],
  ['() => { label: save() }', 'unexpectedStatement'],
  ['() => { { save() } }', 'unexpectedStatement'],
  ['() => { const result = save() }', 'unexpectedStatement'],
  ['() => { function save() {} }', 'unexpectedStatement'],
  ['() => { class Handler {} }', 'unexpectedStatement'],
  ['save(class {})', 'unexpectedStatement'],
  ['(function* () { yield save() })', 'unexpectedStatement'],
  ['ok ? save() : close()', 'unexpectedConditional'],
  ['save(ok ? first : second)', 'unexpectedConditional'],
  ['actions[ok ? first : second]()', 'unexpectedConditional'],
  ['save({ value: ok ? first : second })', 'unexpectedConditional'],
  ['save([ok ? first : second])', 'unexpectedConditional'],
  ['(value = ok ? first : second) => save(value)', 'unexpectedConditional'],
  ['function () { return ok ? save() : close() }', 'unexpectedConditional'],
  ['ok && save()', 'unexpectedLogical'],
  ['save() || close()', 'unexpectedLogical'],
  ['save(value ?? fallback)', 'unexpectedLogical'],
  ['value &&= next', 'unexpectedLogical'],
  ['value ||= next', 'unexpectedLogical'],
  ['value ??= next', 'unexpectedLogical'],
  ['save({ run() { save(); close() } })', 'expectedSingleOperation'],
  [
    'save({ get value() { return ok ? first : second } })',
    'unexpectedConditional',
  ],
]

await run<PreferSimpleEventHandlerOptions, PreferSimpleEventHandlerMessageId>({
  name: 'prefer-simple-event-handler',
  rule: preferSimpleEventHandler,
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
      'handleClick',
      'actions.save',
      'actions[key]',
      'save(item, $event)',
      'isVisible = !isVisible',
      'count++',
      'formRef?.submit()',
      'save(normalize(item))',
      '() => save(item)',
      '() => { save(item) }',
      '() => { return save(item) }',
      'function () { return save(item) }',
      'async () => await save()',
      'async () => { await save() }',
      'run(() => save(item))',
      'save(/* comment */ item);',
      '() => { /* comment */ save(); /* comment */ }',
      'save(\r\nitem\r\n)',
      '(save(item))',
      'count += 1',
      'save(a & b)',
    ].flatMap(expression => [
      {
        description: `accepts a simple expression: ${expression}`,
        code: template(expression),
      },
      {
        description: `accepts a simple JavaScript expression: ${expression}`,
        code: template(expression),
        languageOptions: { parserOptions: { parser: null } },
      },
    ]),
    ...['test.js', 'test.ts', 'test.tsx'].map(filename => ({
      description: `ignores standalone scripts: ${filename}`,
      filename,
      code: 'const handleClick = () => { if (ok) save(); close() }',
    })),
    {
      filename: 'test.tsx',
      code: 'const button = <button onClick={() => { save(); close() }} />',
    },
    {
      code: '<script setup>const handleClick = () => { save(); close() }</script>',
    },
    { code: '<template><button @click.stop /></template>' },
    { code: template('') },
    { code: template('save(') },
    {
      code: '<template><button v-on="{ click: () => { save(); close() } }" /></template>',
    },
    { code: '<template><button @[ok?first:second]="save()" /></template>' },
    {
      code: '<template><button :onClick="() => { save(); close() }" /></template>',
    },
    { code: '<template><button onclick="save(); close()" /></template>' },
    {
      code: '<template><div v-if="ok && ready">{{ ok ? first : second }}</div></template>',
    },
    { code: template('handleClick as Handler') },
    { code: template('save(item!)') },
    { code: template('save<Item>(item)') },
    { code: template('(<T>(item: T) => save(item))') },
    { code: template('handler satisfies Handler') },
    {
      code: template('ok ? save() : close()'),
      options: { allowConditional: true },
    },
    ...[
      'ok && save()',
      'save() || close()',
      'save(value ?? fallback)',
      'value &&= next',
      'value ||= next',
      'value ??= next',
    ].map(expression => ({
      code: template(expression),
      options: { allowLogical: true },
    })),
    {
      code: template('() => save(ok ? first : second ?? fallback)'),
      options: {
        allowConditional: true,
        allowLogical: true,
        allowInlineFunctions: true,
      },
    },
    { code: template('save(item)'), options: { allowInlineFunctions: false } },
  ],
  invalid: [
    {
      description: 'checks component event handlers',
      code: '<template><AppDialog @update:model-value="save(); close()" /></template>',
      errors: ['expectedSingleOperation'],
      output: null,
    },
    {
      description: 'ignores a complex event argument but checks its value',
      code: '<template><button v-on:[ok?first:second].stop="save(); close()" /></template>',
      errors: ['expectedSingleOperation'],
      output: null,
    },
    ...invalidExpressions.flatMap(([expression, messageId]) => [
      {
        description: `rejects complex syntax: ${expression}`,
        code: template(expression),
        errors: [messageId],
        output: null,
      },
      {
        description: `rejects complex JavaScript syntax: ${expression}`,
        code: template(expression),
        languageOptions: { parserOptions: { parser: null } },
        errors: [messageId],
        output: null,
      },
    ]),
    ...['@click.stop', 'v-on:click', '@[eventName]', '@update:model-value'].map(
      event => ({
        description: `checks named event values: ${event}`,
        code: template('save(); close()', event),
        errors: ['expectedSingleOperation' as const],
        output: null,
      }),
    ),
    ...['', ' setup', ' lang="ts"', ' setup lang="ts"'].map(script => ({
      description: `checks templates independently of script mode: ${script}`,
      code: `<script${script}>const handleClick = () => { save(); close() }</script>${template('save(); close()')}`,
      errors: ['expectedSingleOperation' as const],
      output: null,
    })),
    {
      code: `<script lang="ts">export default {}</script><script setup lang="ts">const handleClick = () => { save(); close() }</script>${template('save(); close()')}`,
      errors: ['expectedSingleOperation'],
      output: null,
    },
    ...[
      '() => save()',
      'function () { save() }',
      'run(() => save())',
      'run({ save() { return item } })',
    ].map(expression => ({
      code: template(expression),
      options: { allowInlineFunctions: false },
      errors: ['unexpectedInlineFunction' as const],
      output: null,
    })),
    ...[
      'save((ok ? first : second) as Item)',
      'save((ok && item)!)',
      'save(((prepare(), item)) satisfies Item)',
      '(<T>(item: T) => { save(); close() })',
    ].map(expression => ({
      code: template(expression),
      errors: [
        {
          messageId: expression.includes('?')
            ? ('unexpectedConditional' as const)
            : expression.includes('&&')
              ? ('unexpectedLogical' as const)
              : expression.includes('prepare')
                ? ('unexpectedSequence' as const)
                : ('expectedSingleOperation' as const),
        },
      ],
      output: null,
    })),
    {
      code: template('() => { if (ok) save() }'),
      options: { allowConditional: true, allowLogical: true },
      errors: ['unexpectedStatement'],
      output: null,
    },
    {
      code: template('() => (save(), close())'),
      options: { allowConditional: true, allowLogical: true },
      errors: ['unexpectedSequence'],
      output: null,
    },
    {
      code: template('() => { save(); close() }'),
      options: { allowConditional: true, allowLogical: true },
      errors: ['expectedSingleOperation'],
      output: null,
    },
    {
      code: template('ok ? save() : close()'),
      options: { allowLogical: true },
      errors: ['unexpectedConditional'],
      output: null,
    },
    {
      code: template('ok && save()'),
      options: { allowConditional: true },
      errors: ['unexpectedLogical'],
      output: null,
    },
    {
      description:
        'reports each handler once and pinpoints the first forbidden node',
      code: '<template>\n  <button @click="() => { if (ok) save() }" @focus="ok && save()" />\n</template>',
      errors: [
        {
          messageId: 'unexpectedStatement',
          data: { type: 'IfStatement' },
          line: 2,
          column: 27,
          endLine: 2,
          endColumn: 41,
        },
        {
          messageId: 'unexpectedLogical',
          line: 2,
          column: 53,
          endLine: 2,
          endColumn: 65,
        },
      ],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-simple-event-handler',
  rule: preferSimpleEventHandler,
  languageOptions: vueLanguageOptions,
})

it.each([
  { unknown: true },
  { allowInlineFunctions: 'true' },
  { allowConditional: 1 },
  { allowLogical: null },
  { allowInlineFunctions: [] },
  'always',
  null,
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})
