import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { requirePropsPrefix } from '../../src/rules/require-props-prefix.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  RequirePropsPrefixMessageId,
  RequirePropsPrefixOptions,
} from '../../src/types/index.ts'

function sfc(
  template: string,
  script = "const props = defineProps(['title', 'items', 'myTitle'])",
) {
  return `<script setup lang="ts">${script}</script><template>${template}</template>`
}

await run<RequirePropsPrefixOptions, RequirePropsPrefixMessageId>({
  name: 'require-props-prefix',
  rule: requirePropsPrefix,
  onResult(testcase, result) {
    if (!testcase.options?.autofix || testcase.output === null) {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
      }
    }
    for (const message of result.messages) {
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      '{{ props.title }}',
      '{{ props["title"] }}',
      '{{ other }}',
      '<div title="title">title</div>',
      '<div v-pre>{{ title }}</div>',
      '<div :title="props.title" />',
      '<div v-for="title in props.items">{{ title }}</div>',
      '<Card #default="{ title }">{{ title }}</Card>',
      '{{ props.items.map(title => title) }}',
      '<Card @click="(title) => title()" />',
      '<Card @click="const title = 1; use(title)" />',
      '{{ ({ title: 1, object: obj.title }) }}',
      '{{ value as title }}',
      '<Card v-for="title in props.items"><Card v-for="title in title">{{ title }}</Card></Card>',
      '<Card v-for="title in [{ title: 1 }]">{{ title }}</Card>',
      '<Card v-for="title in class { title = 1; titleMethod() {} }">{{ title }}</Card>',
      '<Card v-for="item in class { title = 1 }">{{ item }}</Card>',
      '<Card v-for="title in (() => { enum title { A }; return [] })()">{{ title }}</Card>',
      '<Card v-for="title in (() => { namespace title { export const A = 1 }; return [] })()">{{ title }}</Card>',
      '<Card v-for="title in (() => { enum title { A }; return title })()">{{ title }}</Card>',
      '<Card v-for="title in (() => { namespace title { export const A = 1 }; return title })()">{{ title }}</Card>',
    ].map(template => ({
      code: sfc(template),
      options: { autofix: true },
    })),
    ...[
      "const props = defineProps(['title']); const title = 'local'",
      "import { title } from './local'; const props = defineProps(['title'])",
      "import title from './local'; const props = defineProps(['title'])",
      "const { title } = defineProps(['title'])",
      "const props = defineProps(['title']); const title = computed(() => props.title)",
      "function defineProps() { return {} }; const props = defineProps(['title'])",
      "import { defineProps } from 'vue'; const props = defineProps(['title'])",
      "import { defineProps as makeProps } from 'vue'; const props = makeProps(['title'])",
      "import * as Vue from 'vue'; const props = Vue.defineProps(['title'])",
      "const props = defineProps?.(['title'])",
      "function setup() { const props = defineProps(['title']) }",
      "{ const props = defineProps(['title']) }",
      "const props = wrap(defineProps(['title']))",
      "const withDefaults = (x) => x; const props = withDefaults(defineProps(['title']), {})",
      "const props = defineProps(['title']); defineProps(['title'])",
      "import type { Props } from './props'; const props = defineProps<Props>()",
      'type Props<T> = { title: T }; const props = defineProps<Props<string>>()',
      'const props = defineProps(dynamic)',
      'const props = defineProps({ [dynamic]: String })',
      'const props = defineProps({ ...dynamic })',
    ].map(script => ({
      code: sfc('{{ title }}', script),
    })),
    {
      description: 'analyzes JavaScript function and class scopes with Espree',
      code: sfc(
        '<Card v-for="title in class { method(title) { return title } }">{{ title }}</Card>',
      ).replace(' lang="ts"', ''),
      languageOptions: { parserOptions: { parser: null } },
      options: { autofix: true },
    },
    { code: '<template>{{ title }}</template>' },
    {
      code: '<script>const props = defineProps(["title"])</script><template>{{ title }}</template>',
    },
    ...['test.js', 'test.ts', 'test.tsx'].map(filename => ({
      filename,
      code: "const props = defineProps(['title']); use(title)",
    })),
  ],
  invalid: [
    {
      description: 'reports the bare identifier with no fix by default',
      code: '<script setup>const props = defineProps(["title"])</script>\n<template>{{ title }}</template>',
      errors: [
        {
          messageId: 'requirePropsPrefix',
          data: { name: 'title' },
          line: 2,
          column: 14,
          endLine: 2,
          endColumn: 19,
        },
      ],
      output: null,
    },
    ...[
      '{{ title }}',
      '<Card :title="title" />',
      '<Card :title />',
      '<Card :my-title />',
      '<Card :title.camel />',
      '<Card v-bind:title />',
      '<Card v-bind="{ title }" />',
      '<Card v-on="title" />',
      '<Card @click="title" />',
      '<Card @click="handle(title)" />',
      '<Card v-if="title" />',
      '<Card v-else-if="title" />',
      '<Card v-show="title" />',
      '<Card v-text="title" />',
      '<Card v-html="title" />',
      '<Card v-custom="title" />',
      '<Card v-memo="[title]" />',
      '<Card :[title]="value" />',
      '<Card @[title]="handle" />',
      '<Card v-for="item in items">{{ item }}</Card>',
      '<Card v-for="title in title">{{ title }}</Card>',
      '<Card #default="{ value = title }">{{ value }}</Card>',
      '{{ items.map(title => title) }}',
      '{{ (title as string)! }}',
      '{{ title satisfies string }}',
      '<Card :title="&#116;itle" />',
    ].map(template => ({
      description: `reports a template reference: ${template}`,
      code: sfc(template),
      errors: ['requirePropsPrefix' as const],
      output: null,
    })),
    ...[
      "defineProps(['title'])",
      'withDefaults(defineProps<{ title: string }>(), {})',
      "const props = withDefaults(defineProps<{ title: string }>(), { title: 'hello' })",
      'const props = defineProps({ title: String })',
      'const props = defineProps({ ["title"]: String })',
      'const props = defineProps({ [`title`]: String })',
      'const props = defineProps([`title`])',
      'const props = defineProps<{ title: string }>()',
      'interface Props { title: string }; const props = defineProps<Props>()',
      'type Base = { title: string }; interface Props extends Base {}; const props = defineProps<Props>()',
      'type Props = { title: string } & { other: number }; const props = defineProps<Props>()',
      'type Props = Base; type Base = { title: string }; const props = defineProps<Props>()',
      "const props = defineProps(['title']); type title = string",
      "import type { title } from './types'; const props = defineProps(['title'])",
      "import { type title } from './types'; const props = defineProps(['title'])",
    ].map(script => ({
      code: sfc('{{ title }}', script),
      errors: ['requirePropsPrefix' as const],
      output: null,
    })),
    {
      description:
        'ignores ordinary script bindings when resolving template values',
      code: `<script>const title = "module"</script>${sfc('{{ title }}')}`,
      errors: ['requirePropsPrefix'],
      output: null,
    },
    {
      description: 'supports the JavaScript script parser',
      code: '<script setup>const props = defineProps(["title"])</script><template>{{ title }}</template>',
      languageOptions: { parserOptions: { parser: null } },
      errors: ['requirePropsPrefix'],
      output: null,
    },
    ...[
      ['{{ title }}', '{{ props.title }}'],
      [
        '<Card v-for="item in title" #default="{ title }">{{ title }}</Card>',
        '<Card v-for="item in props.title" #default="{ title }">{{ title }}</Card>',
      ],
      [
        '<Card v-for="(, index) in title">{{ index }}</Card>',
        '<Card v-for="(, index) in props.title">{{ index }}</Card>',
      ],
      [
        '<Card v-for="title in (() => { const f = title => title; return title })()">{{ title }}</Card>',
        '<Card v-for="title in (() => { const f = title => title; return props.title })()">{{ title }}</Card>',
      ],
      [
        '<Card v-for="title in (() => { if (false) { const title = [] } return title })()">{{ title }}</Card>',
        '<Card v-for="title in (() => { if (false) { const title = [] } return props.title })()">{{ title }}</Card>',
      ],
      [
        '<Card v-for="title in (() => { for (const title of []) {} return title })()">{{ title }}</Card>',
        '<Card v-for="title in (() => { for (const title of []) {} return props.title })()">{{ title }}</Card>',
      ],
      [
        '<Card v-for="title in (function f(value = title) { var title; return value })()">{{ title }}</Card>',
        '<Card v-for="title in (function f(value = props.title) { var title; return value })()">{{ title }}</Card>',
      ],
      [
        '<Card v-for="title in (() => { switch (title) { case 1: const title = 2 } return [] })()">{{ title }}</Card>',
        '<Card v-for="title in (() => { switch (props.title) { case 1: const title = 2 } return [] })()">{{ title }}</Card>',
      ],
      [
        '<Card v-for="title in title.filter(title => title)">{{ title }}</Card>',
        '<Card v-for="title in props.title.filter(title => title)">{{ title }}</Card>',
      ],
      [
        '<Card v-for="title in { title }">{{ title }}</Card>',
        '<Card v-for="title in { title: props.title }">{{ title }}</Card>',
      ],
      [
        '<Card @click="title.method()" />',
        '<Card @click="props.title.method()" />',
      ],
      ['{{ title + title }}', '{{ props.title + props.title }}'],
      ['{{ ({ title }) }}', '{{ ({ title: props.title }) }}'],
      [
        '{{ ({ /* key */ title /* end */ }) }}',
        '{{ ({ /* key */ title: props.title /* end */ }) }}',
      ],
      ['<Card :title />', '<Card :title="props.title" />'],
      ['<Card :my-title />', '<Card :my-title="props.myTitle" />'],
      ['<Card :title.camel />', '<Card :title.camel="props.title" />'],
      ['<Card v-bind:title />', '<Card v-bind:title="props.title" />'],
      ['<Card :title="title" />', '<Card :title="props.title" />'],
      ['<Card :title="&#116;itle" />', '<Card :title="props.title" />'],
      ['<Card :[title]="value" />', '<Card :[props.title]="value" />'],
      ['<Card @[title]="handle" />', '<Card @[props.title]="handle" />'],
      [
        '<Card @click="handle(title)" />',
        '<Card @click="handle(props.title)" />',
      ],
      [
        '<Card v-for="title in title">{{ title }}</Card>',
        '<Card v-for="title in props.title">{{ title }}</Card>',
      ],
      [
        '<Card #default="{ value = title }">{{ value }}</Card>',
        '<Card #default="{ value = props.title }">{{ value }}</Card>',
      ],
      [
        '{{ items.map(item => title) }}',
        '{{ props.items.map(item => props.title) }}',
      ],
      ['{{ (title as string)! }}', '{{ (props.title as string)! }}'],
      ['{{ title satisfies string }}', '{{ props.title satisfies string }}'],
      ['\r\n{{ title }}\r\n', '\r\n{{ props.title }}\r\n'],
    ].map(([template = '', output = '']) => ({
      description: `fixes a safe reference: ${template}`,
      code: sfc(template),
      options: { autofix: true },
      errors: Array.from(
        {
          length: [
            '{{ title + title }}',
            '{{ items.map(item => title) }}',
          ].includes(template)
            ? 2
            : 1,
        },
        () => 'requirePropsPrefix' as const,
      ),
      output: sfc(output),
    })),
    {
      description:
        'recovers same-name JavaScript sources without mutating parser nodes',
      code: sfc(
        '<Card v-for="title in title.filter(title => title)">{{ title }}</Card>',
      ).replace(' lang="ts"', ''),
      languageOptions: { parserOptions: { parser: null } },
      options: { autofix: true },
      errors: ['requirePropsPrefix'],
      output: sfc(
        '<Card v-for="title in props.title.filter(title => title)">{{ title }}</Card>',
      ).replace(' lang="ts"', ''),
    },
    {
      description: 'normalizes runtime kebab-case prop names like Vue',
      code: sfc(
        '<Card :my-title />{{ myTitle }}',
        "const props = defineProps(['my-title'])",
      ),
      options: { autofix: true },
      errors: ['requirePropsPrefix', 'requirePropsPrefix'],
      output: sfc(
        '<Card :my-title="props.myTitle" />{{ props.myTitle }}',
        "const props = defineProps(['my-title'])",
      ),
    },
    {
      description: 'explicitly disables fixes',
      code: sfc('{{ title }}'),
      options: { autofix: false },
      errors: ['requirePropsPrefix'],
      output: null,
    },
    ...[
      "const componentProps = defineProps(['title'])",
      'const componentProps = (defineProps<{ title: string }>() as Readonly<{ title: string }>)',
      "const componentProps = withDefaults(defineProps<{ title: string }>(), { title: 'hello' })",
    ].map(script => ({
      description: 'infers the prefix from the actual macro binding',
      code: sfc('{{ title }}', script),
      options: { autofix: true },
      errors: ['requirePropsPrefix' as const],
      output: sfc('{{ componentProps.title }}', script),
    })),
    ...[
      '<Card v-for="props in []">{{ title }}</Card>',
      '<Card #default="{ props }">{{ title }}</Card>',
      '{{ [1].map(props => title) }}',
      '{{ [1].map(({ props }) => title) }}',
      '{{ [1].map(([props]) => title) }}',
      '{{ [1].map((props = {}) => title) }}',
      '<Card @click="const props = {}; use(title)" />',
      '<Card @click="function f(props) { use(title) }" />',
      '<Card @click="enum props { title = 1 }; use(title)" />',
      '<Card @click="namespace props { export const title = 1 }; use(title)" />',
      '<Card @click="try {} catch (props) { use(title) }" />',
      '<Card @click="title = next" />',
      '<Card @click="title++" />',
      '<Card @click="title.value = next" />',
      '<Card @click="delete title.value" />',
      '<Card @click="({ x: title.value } = next)" />',
      '<Card @click="[title.value] = next" />',
      '<Card @click="for (title.value of next) {}" />',
      '<Card @click="({ title } = next)" />',
      '<Card @click="title()" />',
      '<Card v-model="title" />',
      '<Card v-model="title.value" />',
      '<Card @click="props = next">{{ title }}</Card>',
    ].map(template => ({
      description: `keeps an unsafe reference report-only: ${template}`,
      code: sfc(template),
      options: { autofix: true },
      errors: ['requirePropsPrefix' as const],
      output: null,
    })),
    ...[
      "defineProps(['title'])",
      "const { other } = defineProps(['title', 'other'])",
      "let props = defineProps(['title'])",
      "const props = defineProps(['title']); props = other",
      "const $event = defineProps(['title'])",
      ...[
        'Infinity',
        'undefined',
        'NaN',
        'isFinite',
        'isNaN',
        'parseFloat',
        'parseInt',
        'decodeURI',
        'decodeURIComponent',
        'encodeURI',
        'encodeURIComponent',
        'Math',
        'Number',
        'Date',
        'Array',
        'Object',
        'Boolean',
        'String',
        'RegExp',
        'Map',
        'Set',
        'JSON',
        'Intl',
        'BigInt',
        'console',
        'Error',
        'Symbol',
      ].map(name => `const ${name} = defineProps(['title'])`),
    ].map(script => ({
      description:
        'requires a stable, accessible props object binding for fixes',
      code: sfc('{{ title }}', script),
      options: { autofix: true },
      errors: ['requirePropsPrefix' as const],
      output: null,
    })),
    {
      description:
        'does not turn a data property into an object prototype setter',
      code: sfc(
        '{{ ({ __proto__ }) }}',
        "const props = defineProps(['__proto__'])",
      ),
      options: { autofix: true },
      errors: ['requirePropsPrefix'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-props-prefix',
  rule: requirePropsPrefix,
  languageOptions: vueLanguageOptions,
})

it.each([
  { autofix: 'true' },
  { autofix: null },
  { autofix: 1 },
  { propsName: 'props' },
  { unknown: true },
  true,
  'always',
])('rejects invalid options: %j', async options => {
  await expect(
    tester.valid({ code: sfc('{{ props.title }}'), options }),
  ).rejects.toThrow()
})
