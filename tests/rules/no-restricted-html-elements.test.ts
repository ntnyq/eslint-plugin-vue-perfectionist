import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { noRestrictedHtmlElements } from '../../src/rules/no-restricted-html-elements.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  NoRestrictedHtmlElementsMessageId,
  NoRestrictedHtmlElementsOptions,
} from '../../src/types/index.ts'

await run<NoRestrictedHtmlElementsOptions, NoRestrictedHtmlElementsMessageId>({
  name: 'no-restricted-html-elements',
  rule: noRestrictedHtmlElements,
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
    { code: '<template><button /><input /></template>' },
    { code: '<template><button /></template>', options: {} },
    {
      code: '<template><button /></template>',
      options: { elements: [] },
    },
    ...[
      'Button',
      'BUTTON',
      'bUtton',
      'my-button',
      'button-group',
      'button2',
      'appbutton',
      'button:group',
      'input',
    ].map(name => ({
      description: `requires an exact raw name: ${name}`,
      code: `<template><${name} /></template>`,
      options: { elements: ['button'] },
    })),
    {
      description: 'does not inspect dynamic components or HTML strings',
      code: `<template>
        <component is="button" />
        <component :is="'button'" />
        <component :is="tag" />
        <div v-html="'<button></button>'" />
        {{ '<button />' }}
        <!-- <button /> -->
      </template>`,
      options: { elements: ['button'] },
    },
    {
      description: 'ignores Vue structures and built-in components',
      code: '<template><template v-if="ok"><slot /><component is="button" /><Transition><KeepAlive><AppButton /></KeepAlive></Transition></template></template>',
      options: { elements: ['button'] },
    },
    {
      description: 'skips HTML-like names in SVG and MathML namespaces',
      code: '<template><svg><a /><title /><style /></svg><math><title /></math></template>',
      options: { elements: ['a', 'title', 'style'] },
    },
    {
      description: 'does not inspect SFC script, style, or custom blocks',
      code: `<script setup>const html = '<button />'</script>
        <style>button { color: red }</style>
        <docs><button /></docs>`,
      options: { elements: ['button', 'script', 'style'] },
    },
    ...['test.js', 'test.ts'].map(filename => ({
      filename,
      code: 'import { h } from "vue"; h("button"); const html = "<button />"',
      options: { elements: ['button'] },
    })),
    {
      filename: 'test.tsx',
      code: 'const node = <button />',
      options: { elements: ['button'] },
    },
  ],
  invalid: [
    ...['button', { name: 'button' }].map(element => ({
      description: 'accepts string and object restrictions',
      code: '<template>\n  <button disabled>Save</button>\n</template>',
      options: { elements: [element] },
      errors: [
        {
          messageId: 'restrictedHtmlElement' as const,
          data: { name: 'button', message: '' },
          line: 2,
          column: 4,
          endLine: 2,
          endColumn: 10,
        },
      ],
      output: null,
    })),
    {
      description: 'appends a custom hint to the default diagnostic',
      code: '<template><input /></template>',
      options: {
        elements: [{ name: 'input', message: 'Use <AppInput> instead.' }],
      },
      errors: [
        {
          messageId: 'restrictedHtmlElement',
          data: { name: 'input', message: ' Use <AppInput> instead.' },
        },
      ],
      output: null,
    },
    ...['', ' setup', ' lang="ts"', ' setup lang="ts"'].map(script => ({
      description: `checks templates regardless of script mode: ${script}`,
      code: `<script${script}>const value = 1</script><template><button /></template>`,
      options: { elements: ['button'] },
      errors: ['restrictedHtmlElement' as const],
      output: null,
    })),
    {
      description: 'checks JavaScript SFCs without the TypeScript parser',
      code: '<script>export default {}</script><script setup>const value = 1</script><template><button /></template>',
      languageOptions: { parserOptions: { parser: null } },
      options: { elements: ['button'] },
      errors: ['restrictedHtmlElement'],
      output: null,
    },
    {
      description: 'checks SFCs with both TypeScript script blocks',
      code: '<script lang="ts">export default {}</script><script setup lang="ts">const value: number = 1</script><template><button /></template>',
      options: { elements: ['button'] },
      errors: ['restrictedHtmlElement'],
      output: null,
    },
    {
      description: 'reports each element once, including nested and void tags',
      code: '<template><button><span /><input /></button><button /></template>',
      options: { elements: ['button', 'span', 'input'] },
      errors: [
        {
          messageId: 'restrictedHtmlElement',
          data: { name: 'button', message: '' },
        },
        {
          messageId: 'restrictedHtmlElement',
          data: { name: 'span', message: '' },
        },
        {
          messageId: 'restrictedHtmlElement',
          data: { name: 'input', message: '' },
        },
        {
          messageId: 'restrictedHtmlElement',
          data: { name: 'button', message: '' },
        },
      ],
      output: null,
    },
    {
      description: 'checks direct HTML names inside v-pre',
      code: '<template><div v-pre><button /><Button /><div><input /></div></div><button v-pre /></template>',
      options: { elements: ['button', 'input'] },
      errors: [
        'restrictedHtmlElement',
        'restrictedHtmlElement',
        'restrictedHtmlElement',
      ],
      output: null,
    },
    {
      description: 'resumes checks where foreign content integrates HTML',
      code: '<template><svg><title /><foreignObject><a /></foreignObject></svg><math><annotation-xml encoding="text/html"><a /></annotation-xml></math></template>',
      options: { elements: ['a', 'title'] },
      errors: ['restrictedHtmlElement', 'restrictedHtmlElement'],
      output: null,
    },
    {
      description:
        'attributes and directives do not change the direct tag check',
      code: '<template><button is="vue:AppButton" /><button :is="tag" v-if="ok" /><button v-for="item in items" /></template>',
      options: { elements: ['button'] },
      errors: [
        'restrictedHtmlElement',
        'restrictedHtmlElement',
        'restrictedHtmlElement',
      ],
      output: null,
    },
    ...[
      ['button', { name: 'button', message: 'Last hint.' }],
      [
        { name: 'button', message: 'First hint.' },
        { name: 'button', message: 'Last hint.' },
      ],
    ].map(elements => ({
      description: 'uses the last hint for repeated element names',
      code: '<template><button /></template>',
      options: { elements },
      errors: [
        {
          messageId: 'restrictedHtmlElement' as const,
          data: { name: 'button', message: ' Last hint.' },
        },
      ],
      output: null,
    })),
    ...[
      ['button', 'button'],
      [{ name: 'button', message: 'First hint.' }, 'button'],
      [{ name: 'button', message: '' }],
    ].map(elements => ({
      description: 'reports once with no hint for an empty final message',
      code: '<template><button /></template>',
      options: { elements },
      errors: [
        {
          messageId: 'restrictedHtmlElement' as const,
          data: { name: 'button', message: '' },
        },
      ],
      output: null,
    })),
    ...['a', 'div', 'h1', 'dialog', 'search', 'selectedcontent', 'param'].map(
      name => ({
        description: `recognizes a native HTML name: ${name}`,
        code: `<template><${name} /></template>`,
        options: { elements: [name] },
        errors: [
          {
            messageId: 'restrictedHtmlElement' as const,
            data: { name, message: '' },
          },
        ],
        output: null,
      }),
    ),
    {
      description: 'locates the name with CRLF and multiline attributes',
      code: '<template>\r\n  <button\r\n    disabled\r\n  />\r\n</template>',
      options: { elements: ['button'] },
      errors: [
        {
          messageId: 'restrictedHtmlElement',
          line: 2,
          column: 4,
          endLine: 2,
          endColumn: 10,
        },
      ],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'no-restricted-html-elements',
  rule: noRestrictedHtmlElements,
  languageOptions: vueLanguageOptions,
})

it.each([
  ...[
    'Button',
    'BUTTON',
    'app-button',
    'appbutton',
    'button*',
    '^button$',
    ' button',
    'button ',
    '',
    'svg',
    'math',
    'circle',
    'template',
    'slot',
    'component',
  ].flatMap(name => [{ elements: [name] }, { elements: [{ name }] }]),
  { unknown: true },
  { elements: 'button' },
  { elements: null },
  { elements: [null] },
  { elements: [42] },
  { elements: [{}] },
  { elements: [{ name: 1 }] },
  { elements: [{ name: 'button', unknown: true }] },
  { elements: [{ name: 'button', message: null }] },
  { elements: [{ name: 'button', message: 42 }] },
  'button',
  null,
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})
