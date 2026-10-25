import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import { preferDefineModel } from '../../src/rules/prefer-define-model.ts'
import { run } from '../helpers/rule-tester.ts'
import type { Linter } from 'eslint'
import type { PreferDefineModelMessageId } from '../../src/types/index.ts'

const pair =
  "defineProps({ modelValue: String }); defineEmits(['update:modelValue'])"
const sfc = (script: string) => `<script setup lang="ts">${script}</script>`

await run<never, PreferDefineModelMessageId>({
  name: 'prefer-define-model',
  rule: preferDefineModel,
  onResult(testcase, result) {
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(testcase.code)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      'const model = defineModel<string>()',
      'const props = defineProps({ modelValue: String })',
      "defineEmits(['update:modelValue'])",
      "defineProps({ value: String }); defineEmits(['change'])",
      "defineProps({ value: String }); defineEmits(['update:other'])",
      'defineProps<{ title(): string }>(); defineEmits<{ save(): void }>()',
      "defineProps({ fileList: Array }); defineEmits(['update:file-list'])",
      "defineProps({ '': String }); defineEmits(['update:'])",
      "defineProps({ [key]: String }); defineEmits(['update:modelValue'])",
      'defineProps({ modelValue: String }); defineEmits([event])',
      "defineProps(props); defineEmits(['update:modelValue'])",
      'defineProps({ modelValue: String }); defineEmits(events)',
      "defineProps<{ modelValue: string }>({}); defineEmits(['update:modelValue'])",
      "defineProps<{ modelValue: string }, {}>(); defineEmits(['update:modelValue'])",
      'defineProps<{ modelValue: string }>(); defineEmits<(event: string) => void>()',
      'defineProps<External>(); defineEmits<{ "update:modelValue": [string] }>()',
      'import type { Props } from "types"; defineProps<Props>(); defineEmits<{ "update:modelValue": [string] }>()',
      'type Props<T> = { modelValue: T }; defineProps<Props<string>>(); defineEmits<{ "update:modelValue": [string] }>()',
      'type Props = { modelValue: string } | { other: string }; defineProps<Props>(); defineEmits<{ "update:modelValue": [string] }>()',
      'type Props = Props; defineProps<Props>(); defineEmits<{ "update:modelValue": [string] }>()',
      'declare interface Props { modelValue: string }; defineProps<Props>(); defineEmits<{ "update:modelValue": [string] }>()',
      'defineProps<{ modelValue: string }>(); defineEmits<{ [key: string]: [string] }>()',
      `function defineProps() {}; ${pair}`,
      `const defineEmits = fn; ${pair}`,
      `import { defineProps } from 'vue'; ${pair}`,
      `import type { defineProps } from 'vue'; ${pair}`,
      `import { defineEmits } from 'other'; ${pair}`,
      "import { defineProps as props } from 'vue'; props({ modelValue: String }); defineEmits(['update:modelValue'])",
      "import * as Vue from 'vue'; Vue.defineProps({ modelValue: String }); defineEmits(['update:modelValue'])",
      "defineProps?.({ modelValue: String }); defineEmits(['update:modelValue'])",
      `function nested() { ${pair} }`,
      `{ ${pair} }`,
      `const props = wrap(defineProps({ modelValue: String })); defineEmits(['update:modelValue'])`,
      `const withDefaults = fn; withDefaults(defineProps<{ modelValue: string }>(), {}); defineEmits(['update:modelValue'])`,
      `defineProps({ modelValue: String }); defineProps({ other: String }); defineEmits(['update:modelValue'])`,
    ].map(script => ({
      code: sfc(script),
    })),
    { code: pair, filename: 'test.js' },
    { code: pair, filename: 'test.ts' },
    { code: pair, languageOptions: { parser: tsParser } },
    { code: `<script>${pair}</script>` },
    { code: `<script>${pair}</script><script setup>const x = 1</script>` },
    { code: '<template>{{ defineProps({ modelValue: String }) }}</template>' },
  ],
  invalid: [
    ...[
      "defineProps<{ modelValue: string }>(); defineEmits<{ 'update:modelValue'(value: string): void }>()",
      "interface Emits { 'update:modelValue'(value: string): void }; defineProps<{ modelValue: string }>(); defineEmits<Emits>()",
      "type Emits = { 'update:modelValue'(value: string): void }; defineProps<{ modelValue: string }>(); defineEmits<Emits>()",
      "interface Base { 'update:modelValue'(value: string): void }; interface Emits extends Base {}; defineProps<{ modelValue: string }>(); defineEmits<Emits>()",
      "defineProps<{ modelValue(): string }>(); defineEmits<{ 'update:modelValue': [value: () => string] }>()",
      "interface Props { modelValue(): string }; defineProps<Props>(); defineEmits<{ 'update:modelValue': [value: () => string] }>()",
    ].map(script => ({
      description: `recognizes method signature declarations: ${script}`,
      code: sfc(script),
      errors: [
        {
          messageId: 'preferDefineModel' as const,
          data: { name: 'modelValue' },
        },
      ],
      output: null,
      after(result: Linter.FixReport) {
        const { descriptor } = parse(result.output)
        expect(() =>
          compileScript(descriptor, { id: 'method-signature-model' }),
        ).not.toThrow()
      },
    })),
    ...[
      pair,
      "const { modelValue } = defineProps(['modelValue']); const emit = defineEmits({ 'update:modelValue': null })",
      "defineEmits(['update:modelValue']); defineProps({ modelValue: { type: String, required: true } })",
      "defineProps({ ['modelValue']: String }); defineEmits(['update:modelValue'])",
      "defineProps({ modelValue: String, ...other }); defineEmits(['save', 'update:modelValue', 'update:modelValue'])",
      "defineProps<{ modelValue?: string }>(); defineEmits<{ 'update:modelValue': [value: string] }>()",
      "defineProps<{ modelValue: string }>(); defineEmits<{ (event: 'update:modelValue', value: string): void }>()",
      "defineProps<{ modelValue: string }>(); defineEmits<(event: 'save' | 'update:modelValue', value: string) => void>()",
      "interface Props { modelValue: string }; interface Emits { 'update:modelValue': [string] }; defineProps<Props>(); defineEmits<Emits>()",
      "type Props = { modelValue: string }; type Alias = Props; type Emits = (event: 'update:modelValue', value: string) => void; defineProps<Alias>(); defineEmits<Emits>()",
      "interface Base { modelValue: string }; interface Props extends Base { title: string }; defineProps<Props>(); defineEmits(['update:modelValue'])",
      "interface Props {}; interface Props { modelValue: string }; defineProps<Props>(); defineEmits(['update:modelValue'])",
      "type Props = { modelValue: string } & External; defineProps<Props>(); defineEmits(['update:modelValue'])",
      "interface Props extends Other { modelValue: string }; defineProps<Props>(); defineEmits(['update:modelValue'])",
      "interface Props extends Props { modelValue: string }; defineProps<Props>(); defineEmits(['update:modelValue'])",
      "const Props = 1; type Props = { modelValue: string }; defineProps<Props>(); defineEmits(['update:modelValue'])",
      "withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: '' }); defineEmits(['update:modelValue'])",
      "const props = (withDefaults((defineProps<{ modelValue?: string }>() as unknown), {}))!; const emit = defineEmits(['update:modelValue'])",
      "const props = (defineProps({ modelValue: String })) satisfies unknown; const emit = defineEmits(['update:modelValue'])",
    ].map(script => ({
      description: `recognizes matching declarations: ${script}`,
      code: sfc(script),
      errors: [
        {
          messageId: 'preferDefineModel' as const,
          data: { name: 'modelValue' },
        },
      ],
      output: null,
    })),
    {
      description: 'reports each matching model once on its prop name',
      code: `<script setup lang="ts">
defineProps<{ title: string; count?: number; ignored: boolean }>()
defineEmits<{ 'update:title': [string]; 'update:count': [number]; save: [] }>()
</script>`,
      errors: [
        {
          messageId: 'preferDefineModel',
          data: { name: 'title' },
          line: 2,
          column: 15,
          endColumn: 20,
        },
        {
          messageId: 'preferDefineModel',
          data: { name: 'count' },
          line: 2,
          column: 30,
          endColumn: 35,
        },
      ],
      output: null,
    },
    {
      description: 'preserves complex update logic and other events',
      code: sfc(`
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'save'])
function update(value: string) { emit('save'); emit('update:modelValue', value.trim()) }
`),
      errors: ['preferDefineModel'],
      output: null,
    },
    {
      description: 'matches named models exactly',
      code: sfc(
        "defineProps({ 'file-list': Array }); defineEmits(['update:file-list'])",
      ),
      errors: [{ messageId: 'preferDefineModel', data: { name: 'file-list' } }],
      output: null,
    },
    {
      description: 'checks JavaScript with the default script parser',
      code: `<script setup>${pair}</script>`,
      languageOptions: { parserOptions: { parser: null } },
      errors: ['preferDefineModel'],
      output: null,
    },
    ...[false, true].map(reverse => ({
      description: `checks only setup calls in dual scripts, reverse: ${reverse}`,
      code: reverse
        ? `${sfc(pair)}<script lang="ts">${pair}</script>`
        : `<script lang="ts">${pair}</script>${sfc(pair)}`,
      errors: ['preferDefineModel' as const],
      output: null,
    })),
    {
      description: 'resolves contracts from the ordinary script',
      code: `<script lang="ts">export interface Props { modelValue: string }</script>${sfc("defineProps<Props>(); defineEmits(['update:modelValue'])")}`,
      errors: ['preferDefineModel'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-define-model',
  rule: preferDefineModel,
})
it.each([{}, { fix: true }, 'always', true])(
  'rejects options: %j',
  async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  },
)
