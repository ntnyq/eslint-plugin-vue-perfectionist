import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { noTemplateTypeAssertion } from '../../src/rules/no-template-type-assertion.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type { NoTemplateTypeAssertionMessageId } from '../../src/types/index.ts'

await run<never, NoTemplateTypeAssertionMessageId>({
  name: 'no-template-type-assertion',
  rule: noTemplateTypeAssertion,
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
      '<template>{{ value }}</template>',
      '<template>{{ "value as string" }}</template>',
      '<template><div title="value as string">value as string</div></template>',
      '<template><!-- value as string --><div /></template>',
      '<template><div v-pre>{{ value as string }}</div></template>',
      '<template>{{ value satisfies string }}</template>',
      '<template>{{ value! }}</template>',
      '<template>{{ <string>value }}</template>',
      '<template><div :value="getValue<string>()" /></template>',
      '<template>{{ as }}</template>',
      '<template>{{ object.as }}</template>',
      '<template>{{ }}</template>',
      '<template>{{ value as }}</template>',
      '<script lang="ts">const value = source as string</script>',
      '<script setup lang="ts">const value = source as string</script><template>{{ value }}</template>',
      '<script setup lang="ts">import { computed } from "vue"; const props = defineProps<{ value: unknown }>(); const label = computed(() => props.value as string)</script><template><AppLabel :value="label" /><span>{{ label }}</span></template>',
      '<script lang="ts">export const value = source as string</script><script setup lang="ts">const other = value as unknown</script><template>{{ other }}</template>',
    ].map(code => ({
      code,
    })),
    {
      description:
        'accepts JavaScript templates with the default script parser',
      code: '<script setup>const value = "as"</script><template>{{ value }}</template>',
      languageOptions: { parserOptions: { parser: null } },
    },
    ...['test.ts', 'test.tsx'].map(filename => ({
      filename,
      code: 'const value = source as string',
    })),
    { filename: 'test.js', code: 'const value = "source as string"' },
  ],
  invalid: [
    {
      description: 'reports the complete assertion expression',
      code: '<template>{{ value as string }}</template>',
      errors: [
        {
          messageId: 'unexpectedTypeAssertion',
          message:
            'Move this type assertion into <script> instead of using "as" in the template.',
          line: 1,
          column: 14,
          endLine: 1,
          endColumn: 29,
        },
      ],
      output: null,
    },
    ...[
      'value as const',
      'value as any',
      'value as unknown',
      'value as string | undefined',
      '(value as User).name',
      '(value as User)?.name',
      'format(value as string)',
      'items.map(item => (item as User).name)',
      'ready ? (value as string) : fallback',
      '[value as string]',
      '({ value: source as string })',
      'value /* before */ as /* after */ string',
    ].map(expression => ({
      description: `reports an assertion in interpolation: ${expression}`,
      code: `<template>{{ ${expression} }}</template>`,
      errors: ['unexpectedTypeAssertion' as const],
      output: null,
    })),
    ...[
      ':value="value as string"',
      ':value="(value as string) satisfies string"',
      ':value="value as &#115;tring"',
      'v-bind="value as Record<string, unknown>"',
      'v-if="value as boolean"',
      'v-else-if="value as boolean"',
      'v-show="value as boolean"',
      'v-text="value as string"',
      'v-html="value as string"',
      'v-model="value as string"',
      'v-memo="value as unknown[]"',
      'v-custom="value as string"',
      '@click="handle($event as MouseEvent)"',
      '@click="const target = $event.target as HTMLInputElement; handle(target)"',
      'v-on="listeners as Record<string, Function>"',
      'v-for="item in items as User[]"',
      'v-for="item of items as User[]"',
      'v-slot="{ value = source as string }"',
      ':[(key)as(string)]="value"',
      '@[(event)as(string)]="handle"',
    ].map(attribute => ({
      description: `reports an assertion in a directive: ${attribute}`,
      code: `<template><AppItem ${attribute} /></template>`,
      errors: ['unexpectedTypeAssertion' as const],
      output: null,
    })),
    {
      description: 'reports each assertion in a chain',
      code: '<template>{{ value as unknown as string }}</template>',
      errors: ['unexpectedTypeAssertion', 'unexpectedTypeAssertion'],
      output: null,
    },
    {
      description: 'reports multiple independent assertions',
      code: '<template><div :title="first as string">{{ second as string }}</div></template>',
      errors: ['unexpectedTypeAssertion', 'unexpectedTypeAssertion'],
      output: null,
    },
    {
      description: 'checks template locals from loops and slots',
      code: '<template><AppList v-for="item in items"><template #default="{ row }">{{ item as User }}{{ row as Row }}</template></AppList></template>',
      errors: ['unexpectedTypeAssertion', 'unexpectedTypeAssertion'],
      output: null,
    },
    ...['lang="ts"', 'setup lang="ts"'].map(attributes => ({
      description: `ignores assertions in the ${attributes} script`,
      code: `<script ${attributes}>const value = source as string</script><template>{{ value as string }}</template>`,
      errors: ['unexpectedTypeAssertion' as const],
      output: null,
    })),
    {
      description: 'checks only the template in an SFC with dual scripts',
      code: '<script lang="ts">export const value = source as string</script><script setup lang="ts">const other = value as unknown</script><template>{{ other as string }}</template>',
      errors: ['unexpectedTypeAssertion'],
      output: null,
    },
    {
      description: 'preserves multiline assertion locations',
      code: '<template>\n  {{ (value as\n    string) }}\n</template>',
      errors: [
        {
          messageId: 'unexpectedTypeAssertion',
          line: 2,
          column: 7,
          endLine: 3,
          endColumn: 11,
        },
      ],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'no-template-type-assertion',
  rule: noTemplateTypeAssertion,
  languageOptions: vueLanguageOptions,
})

it.each([{}, { allowConst: true }, 'always', true])(
  'rejects options: %j',
  async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  },
)
