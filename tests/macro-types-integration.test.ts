import { Linter } from 'eslint'
import { expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import plugin from '../src/index.ts'
import { vueLanguageOptions } from './internal.ts'
import { sfc } from './macro-types.ts'

it.each([
  {
    script: 'interface Props { title: string }; defineProps<Props>()',
    style: 'error',
    name: 'error',
    messages: [],
  },
  {
    script: 'interface Other { title: string }; defineProps<Other>()',
    style: 'error',
    name: 'off',
    messages: [],
  },
  { script: 'defineProps<Props>()', style: 'off', name: 'error', messages: [] },
  {
    script: 'defineProps<Props>()',
    style: 'error',
    name: 'error',
    messages: ['unknownTypeSource'],
  },
  {
    script: 'defineProps<{}>()',
    style: 'error',
    name: 'error',
    messages: ['unexpectedTypeStyle', 'expectedNamedType'],
  },
  {
    script: 'defineProps<{}>()',
    style: ['error', { macros: { defineProps: 'inline' } }],
    name: 'error',
    messages: ['expectedNamedType'],
  },
  {
    script: 'interface Props {}; defineProps<Props>()',
    style: ['error', { macros: { defineProps: 'inline' } }],
    name: 'error',
    messages: ['unexpectedTypeStyle'],
  },
  {
    script: 'defineProps<{}>()',
    style: ['error', { macros: { defineProps: 'inline' } }],
    name: ['error', { macros: { defineProps: false } }],
    messages: [],
  },
  {
    script:
      'import type { External as Props } from "types"; defineProps<Props>()',
    style: ['error', { macros: { defineProps: ['local', 'imported'] } }],
    name: 'error',
    messages: [],
  },
  {
    script: 'import type { Props as Other } from "types"; defineProps<Other>()',
    style: 'error',
    name: 'error',
    messages: ['unexpectedTypeStyle', 'unexpectedTypeName'],
  },
] satisfies {
  script: string
  style: Linter.RuleEntry
  name: Linter.RuleEntry
  messages: string[]
}[])(
  'composes independent policies: $script ($style / $name)',
  ({ script, style, name, messages }) => {
    const source = sfc(script)
    const linter = new Linter()
    const config: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/define-macros-type-style': style,
        'vp/require-macro-type-name': name,
      },
    }
    const result = linter.verifyAndFix(source, config, 'Test.vue')
    expect(result.messages.map(message => message.messageId)).toEqual(messages)
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
)

it.each([
  sfc('interface Props { title: string }; defineProps<Props>()'),
  sfc('type Emits = { save: [value: string] }; defineEmits<Emits>()'),
  sfc(
    'type Slots = { default(props: { title: string }): unknown }; defineSlots<Slots>()',
  ),
  sfc(
    'interface Props { title?: string }; withDefaults(defineProps<Props>(), { title: "Hello" })',
  ),
  `<script lang="ts">export interface Props { title: string }</script>${sfc('defineProps<Props>()')}`,
  `${sfc('defineProps<Props>()')}<script lang="ts">export interface Props { title: string }</script>`,
])('accepts contracts supported by the Vue compiler: %s', source => {
  const { descriptor } = parse(source)
  expect(() =>
    compileScript(descriptor, { id: 'macro-contract' }),
  ).not.toThrow()
  const linter = new Linter()
  expect(
    linter.verify(
      source,
      {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        plugins: { vp: plugin },
        rules: {
          'vp/define-macros-type-style': 'error',
          'vp/require-macro-type-name': 'error',
        },
      },
      'Test.vue',
    ),
  ).toEqual([])
})
