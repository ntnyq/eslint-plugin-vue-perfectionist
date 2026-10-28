import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { requireInjectionKey } from '../../src/rules/require-injection-key.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  RequireInjectionKeyMessageId,
  RequireInjectionKeyOptions,
} from '../../src/types/index.ts'

function sfc(code: string) {
  return `<script setup lang="ts">${code}</script>`
}

await run<RequireInjectionKeyOptions, RequireInjectionKeyMessageId>({
  name: 'require-injection-key',
  rule: requireInjectionKey,
  onResult(_, result) {
    expect(result.fixed).toBe(false)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      "import { inject } from 'vue'; inject(key)",
      "import { provide } from 'vue'; const key = Symbol('form'); provide(key, {})",
      "import { inject } from 'vue'; import { key } from './keys'; inject(key)",
      "import { inject } from 'vue'; const key: InjectionKey<string> = Symbol(); inject(key)",
      "import { inject } from 'vue'; let key = 'form'; key = Symbol(); inject(key)",
      "import { inject } from 'vue'; const a = b; const b = a; inject(a)",
      "import { inject } from 'vue'; const { key } = object; inject(key)",
      // eslint-disable-next-line no-template-curly-in-string -- Parser fixture.
      "import { inject } from 'vue'; inject(`form-${id}`)",
      "import { inject } from 'vue'; inject('form' + suffix)",
      "import { inject } from 'vue'; inject(...keys)",
      "import { inject } from 'vue'; inject()",
      "import { inject } from 'vue'; inject?.('form')",
      "import * as Vue from 'vue'; Vue['inject']('form')",
      "import Vue from 'vue'; Vue.inject('form')",
      "import inject from 'vue'; inject('form')",
      "import { inject } from 'other'; inject('form')",
      "import type { inject } from 'vue'; inject('form')",
      "import { type inject } from 'vue'; inject('form')",
      "function inject(key) {}; inject('form')",
      "import { inject } from 'vue'; function useForm(inject) { inject('form') }",
      "inject('form')",
    ].map(code => ({
      code: sfc(code),
    })),
    {
      code: sfc("import { inject } from 'vue'; inject('legacy')"),
      options: { allowStrings: ['legacy'] },
    },
    {
      code: sfc(
        "import { inject } from 'vue'; const key = 'legacy'; inject(key)",
      ),
      options: { allowStrings: ['legacy'] },
    },
    {
      code: sfc("inject('form')"),
      settings: { 'vue-perfectionist': { autoImport: true } },
      options: { vueGlobals: [] },
    },
    {
      code: sfc("function inject() {}; inject('form')"),
      options: { vueGlobals: ['inject'] },
    },
    {
      code: sfc("import type { inject } from 'vue'; inject('form')"),
      options: { vueGlobals: ['inject'] },
    },
    {
      code: sfc("import { inject } from 'vue'; inject('form')"),
      options: { vueImportSources: [] },
    },
    {
      code: '<template>{{ inject("form") }}</template>',
      options: { vueGlobals: ['inject'] },
    },
    {
      code: '<script>const key = "form"</script><script setup>import { inject } from "vue"; const key = Symbol(); inject(key)</script>',
    },
  ],
  invalid: [
    ...[
      "import { inject } from 'vue'; inject('form')",
      "import { provide } from 'vue'; provide('form', {})",
      "import { inject as read } from 'vue'; read('form')",
      "import * as Vue from 'vue'; Vue.inject('form')",
      "import { inject } from 'vue'; inject(`form`)",
      "import { inject } from 'vue'; inject('' as const)",
      "import { inject } from 'vue'; const a = 'form'; const b = a; inject(b)",
      "import { inject } from 'vue'; const a = 'form' satisfies string; inject(a!)",
      "import { inject } from 'vue'; const key = Symbol(); function useForm() { const key = 'form'; inject(key) }",
    ].map(code => ({
      code: sfc(code),
      errors: ['unexpectedStringKey' as const],
      output: null,
    })),
    {
      code: "import { inject } from 'vue'; inject('form')",
      filename: 'test.js',
      errors: ['unexpectedStringKey'],
      output: null,
    },
    {
      code: "import { inject } from 'vue'; inject('form' as const)",
      filename: 'test.ts',
      errors: ['unexpectedStringKey'],
      output: null,
    },
    {
      code: '<script>import { inject } from "vue"; inject("form")</script>',
      languageOptions: { parserOptions: { parser: null } },
      errors: ['unexpectedStringKey'],
      output: null,
    },
    {
      code: '<script>import { inject } from "vue"; const key = "form"; inject(key)</script><script setup>const key = Symbol()</script>',
      errors: ['unexpectedStringKey'],
      output: null,
    },
    {
      code: sfc("inject('form')"),
      settings: { 'vue-perfectionist': { autoImport: true } },
      errors: ['unexpectedStringKey'],
      output: null,
    },
    {
      code: sfc("provide('form', {})"),
      options: { vueGlobals: ['provide'] },
      errors: ['unexpectedStringKey'],
      output: null,
    },
    {
      code: sfc("import { inject } from '#vue'; inject('form')"),
      options: { vueImportSources: ['#vue'] },
      errors: ['unexpectedStringKey'],
      output: null,
    },
    {
      code: sfc("import { inject } from 'vue'; inject('form')"),
      options: { allowStrings: [] },
      errors: [
        {
          messageId: 'unexpectedStringKey',
          data: { name: 'inject', key: 'form' },
          column: 62,
          endColumn: 68,
        },
      ],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-injection-key',
  rule: requireInjectionKey,
  languageOptions: vueLanguageOptions,
})
it.each([
  { unknown: true },
  { allowStrings: true },
  { allowStrings: [1] },
  { allowStrings: ['a', 'a'] },
  { vueGlobals: null },
  { vueImportSources: 'vue' },
  null,
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})
