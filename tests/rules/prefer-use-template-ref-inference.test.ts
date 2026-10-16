import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { preferUseTemplateRefInference } from '../../src/rules/prefer-use-template-ref-inference.ts'
import { run, vueLanguageOptions } from '../internal.ts'
import type {
  PreferUseTemplateRefInferenceMessageId,
  PreferUseTemplateRefInferenceOptions,
} from '../../src/types/index.ts'

const call = "const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')"
const imported = "import { useTemplateRef } from 'vue'"
const autoImportSettings = { 'vue-perfectionist': { autoImport: true } }

function sfc(script = call, template = '<video ref="videoRef" />'): string {
  return `<script setup lang="ts">\n${script}\n</script>\n<template>${template}</template>`
}

function withImport(script = call, template?: string): string {
  return sfc(`${imported}\n${script}`, template)
}

await run<
  PreferUseTemplateRefInferenceOptions,
  PreferUseTemplateRefInferenceMessageId
>({
  name: 'prefer-use-template-ref-inference',
  rule: preferUseTemplateRefInference,
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
    { code: withImport("const videoRef = useTemplateRef('videoRef')") },
    { description: 'auto-imports default to disabled', code: sfc() },
    { code: sfc(), settings: { 'vue-perfectionist': { autoImport: false } } },
    {
      code: sfc(),
      languageOptions: { globals: { useTemplateRef: 'readonly' } },
    },
    { code: withImport(), options: { ignoreRefs: ['videoRef'] } },
    ...[
      "import { useTemplateRef } from 'other'",
      "import useTemplateRef from 'vue'",
      "import * as useTemplateRef from 'vue'",
      "import type { useTemplateRef } from 'vue'",
      "import { type useTemplateRef } from 'vue'",
      'function useTemplateRef<T>(key: string) {}',
      'const useTemplateRef = <T>(key: string) => null',
      'declare function useTemplateRef<T>(key: string): T',
    ].map(binding => ({
      description: `preserves binding identity: ${binding}`,
      code: sfc(`${binding}\n${call}`),
      settings: autoImportSettings,
    })),
    ...[
      "import { useTemplateRef as useTplRef } from 'vue'; const videoRef = useTplRef<HTMLVideoElement>('videoRef')",
      `import { ref as useTemplateRef } from 'vue'; ${call}`,
      "import * as Vue from 'vue'; const videoRef = Vue.useTemplateRef<HTMLVideoElement>('videoRef')",
      "import * as Vue from 'vue'; const videoRef = Vue['useTemplateRef']<HTMLVideoElement>('videoRef')",
      "const videoRef = useTemplateRef?.<HTMLVideoElement>('videoRef')",
      "const videoRef = (useTemplateRef as Function)<HTMLVideoElement>('videoRef')",
      `function createRef() { ${call} }`,
      `const createRef = () => { ${call} }`,
      `function createRef(useTemplateRef: Function) { ${call} }`,
      `class View { createRef() { ${call} } }`,
      `if (enabled) { ${call} }`,
      "const videoRef = wrap(useTemplateRef<HTMLVideoElement>('videoRef'))",
      "const videoRef = useTemplateRef<HTMLVideoElement, 'videoRef'>('videoRef')",
      'const videoRef = useTemplateRef<HTMLVideoElement>()',
      'const videoRef = useTemplateRef<HTMLVideoElement>(key)',
      'const videoRef = useTemplateRef<HTMLVideoElement>(...keys)',
      "const videoRef = useTemplateRef<HTMLVideoElement>('videoRef', other)",
      // eslint-disable-next-line no-template-curly-in-string
      'const videoRef = useTemplateRef<HTMLVideoElement>(`video${index}`)',
      'const videoRef = useTemplateRef<HTMLVideoElement>(42)',
      "const videoRef = useTemplateRef<HTMLVideoElement>('videoRef' as const)",
      "const videoRef = (useTemplateRef)<HTMLVideoElement>('videoRef')",
    ].map(script => ({
      description: `skips unsupported calls: ${script}`,
      code: sfc(script),
      settings: autoImportSettings,
    })),
    ...[
      '',
      '<video ref="otherRef" />',
      '<video :ref="key" />',
      '<video :ref="\'videoRef\'" />',
      '<video :ref="`videoRef`" />',
      '<video :ref="el => capture(el)" />',
      '<component :is="current" ref="videoRef" />',
      '<component is="VideoPlayer" ref="videoRef" />',
      '<VideoPlayer :is="current" ref="videoRef" />',
      '<video v-bind="props" ref="videoRef" />',
      '<video ref="videoRef" :ref="other" />',
      '<video ref="videoRef" :[name]="value" />',
      '<video ref="videoRef" /><video ref="videoRef" />',
      '<video ref="videoRef" v-if="ok" /><video ref="videoRef" v-else />',
      '<video ref="videoRef" /><component :is="current" ref="videoRef" />',
      '<video ref="videoRef" /><video :ref="\'videoRef\'" />',
      '<video :ref="\'videoRef\'" /><video ref="videoRef" />',
      '<template ref="videoRef"><video /></template>',
      '<slot ref="videoRef" />',
      '<div v-pre><video ref="videoRef" /></div>',
      '<video v-pre ref="videoRef" />',
    ].map(template => ({
      description: `requires a unique static ref: ${template}`,
      code: withImport(call, template),
    })),
    ...[
      '<!-- @vue-skip --><video ref="videoRef" />',
      '<!-- @vue-skip -->\n<video ref="videoRef" />',
      '<!-- @vue-skip --><!-- another comment --><video ref="videoRef" />',
      '<!-- another comment --><!-- @vue-skip --><video ref="videoRef" />',
      '<!-- @vue-skip: unsupported template --><video ref="videoRef" />',
      '<!-- @vue-skip --><div><video ref="videoRef" /></div>',
      '<section><!-- @vue-skip --><div><video ref="videoRef" /></div></section>',
      '<pre><!-- @vue-skip --><video ref="videoRef" /></pre>',
      '<Pre><!-- @vue-skip --> <video ref="videoRef" /></Pre>',
      '<!-- @vue-skip --><video ref="videoRef" /><video ref="videoRef" />',
      '<video ref="videoRef" /><!-- @vue-skip --><video ref="videoRef" />',
      '<!-- @vue-skip --><div v-if="ok" /><video v-else ref="videoRef" />',
      '<!-- @vue-skip --><div v-if="ok" /><div v-else-if="other" /><video v-else ref="videoRef" />',
      '<!-- @vue-skip --><div v-if="ok" /><section v-else><video ref="videoRef" /></section>',
      '<div v-if="ok" /><!-- @vue-skip --><video v-else ref="videoRef" />',
    ].map(template => ({
      description: `preserves explicit types in skipped subtrees: ${template}`,
      code: withImport(call, template),
    })),
    ...[
      '<video ref="video&#82;ef" />',
      "<video ref='video&#x52;ef' />",
      '<video ref=video&#82;ef />',
      '<video ref="video&#82;ef" /><video ref="videoRef" />',
      '<video ref="videoRef" /><video ref="video&#82;ef" />',
    ].map(template => ({
      description: `preserves types for entity-encoded ref keys: ${template}`,
      code: withImport(call, template),
    })),
    {
      description: 'preserves types for named entities in ref keys',
      code: withImport(
        "const videoRef = useTemplateRef<HTMLVideoElement>('video&Ref')",
        '<video ref="video&amp;Ref" />',
      ),
    },
    ...['ts', 'tsx', 'js'].map(extension => ({
      description: `skips standalone ${extension}`,
      filename: `test.${extension}`,
      code:
        extension === 'js'
          ? `${imported}; useTemplateRef('videoRef')`
          : `${imported}; ${call}`,
    })),
    { code: '<template><video ref="videoRef" /></template>' },
    {
      code: withImport().replace('script setup lang="ts"', 'script lang="ts"'),
    },
    { code: withImport().replace('lang="ts"', 'lang="tsx"') },
    { code: withImport().replace(' lang="ts"', '') },
    {
      description: 'accepts real JavaScript SFCs',
      code: "<script setup>import { useTemplateRef } from 'vue'; const videoRef = useTemplateRef('videoRef')</script><template><video ref=\"videoRef\" /></template>",
      languageOptions: { parserOptions: { parser: null } },
    },
    {
      description: 'skips ordinary script calls in dual-script SFCs',
      code: `<script lang="ts">${imported}; ${call}</script>${sfc('const value = 1')}`,
    },
    {
      description: 'setup locals shadow ordinary script imports',
      code: `<script lang="ts">${imported}</script>${sfc(`const useTemplateRef = <T>(key: string) => null; ${call}`)}`,
      settings: autoImportSettings,
    },
    {
      description: 'does not visit template expression calls',
      code: withImport(
        '',
        '<video ref="videoRef" @click="useTemplateRef<HTMLVideoElement>(\'videoRef\')" />',
      ),
    },
  ],
  invalid: [
    {
      description: 'reports the complete type argument range',
      code: withImport(),
      errors: [
        {
          messageId: 'unexpectedTypeArguments',
          line: 3,
          column: 32,
          endLine: 3,
          endColumn: 50,
        },
      ],
      output: null,
    },
    {
      description: 'recognizes shared auto-import settings',
      code: sfc(),
      settings: autoImportSettings,
      errors: ['unexpectedTypeArguments'],
      output: null,
    },
    {
      description: 'recognizes configured globals when opted in',
      code: sfc(),
      settings: autoImportSettings,
      languageOptions: { globals: { useTemplateRef: 'readonly' } },
      errors: ['unexpectedTypeArguments'],
      output: null,
    },
    ...[
      '<VideoPlayer ref="videoRef" />',
      '<video-player ref="videoRef" />',
      '<UI.Player ref="videoRef" />',
      '<video v-if="visible" ref="videoRef" />',
      '<video v-for="video in videos" :key="video.id" ref="videoRef" />',
      '<div><video ref="videoRef" /></div>',
      '<!-- @vue-ignore --><video ref="videoRef" />',
      '<!-- @vue-expect-error --><video ref="videoRef" />',
      '<!-- mentions @vue-skip --><video ref="videoRef" />',
      '<!-- @vue-skip-extra --><video ref="videoRef" />',
      '<!-- @vue-skip --><div /><video ref="videoRef" />',
      '<!-- @vue-skip -->text<video ref="videoRef" />',
      '<!-- @vue-skip -->{{ value }}<video ref="videoRef" />',
      '<div><!-- @vue-skip --></div><video ref="videoRef" />',
      '<div><!-- @vue-skip --><span /></div><video ref="videoRef" />',
      '<pre><!-- @vue-skip --> <video ref="videoRef" /></pre>',
      '<!-- @vue-skip --><div v-if="ok" /><video ref="videoRef" />',
      '<div v-if="ok" /><!-- @vue-skip --><div v-else-if="other" /><video v-else ref="videoRef" />',
      "<video ref='videoRef' />",
      '<video ref=videoRef />',
      '<video title="&amp;" ref="videoRef" />',
    ].map(template => ({
      description: `checks static elements and components: ${template}`,
      code: withImport(call, template),
      errors: ['unexpectedTypeArguments' as const],
      output: null,
    })),
    ...[
      "const element = useTemplateRef<HTMLVideoElement>('videoRef')",
      'const videoRef = useTemplateRef<HTMLVideoElement>(`videoRef`)',
      "const videoRef = (useTemplateRef<HTMLVideoElement>('videoRef'))",
      "const videoRef = useTemplateRef<HTMLVideoElement>('videoRef') satisfies unknown",
      "useTemplateRef<HTMLVideoElement>('videoRef')",
      "const videoRef = useTemplateRef<\n HTMLVideoElement // keep the comment\n>('videoRef')",
      "const videoRef = useTemplateRef<HTMLVideoElement[]>('videoRef')",
    ].map(script => ({
      description: `checks a direct top-level call: ${script}`,
      code: withImport(script),
      errors: ['unexpectedTypeArguments' as const],
      output: null,
    })),
    ...[[], ['VideoRef'], ['video.*'], ['otherRef']].map(ignoreRefs => ({
      description: `matches ignored keys exactly: ${ignoreRefs.join(',')}`,
      code: withImport(),
      options: { ignoreRefs },
      errors: ['unexpectedTypeArguments' as const],
      output: null,
    })),
    {
      description: 'ignoreRefs applies to the key rather than the variable',
      code: withImport(
        "const ignored = useTemplateRef<HTMLVideoElement>('videoRef')",
      ),
      options: { ignoreRefs: ['ignored'] },
      errors: ['unexpectedTypeArguments'],
      output: null,
    },
    {
      description: 'uses imports from the ordinary script in setup',
      code: `<script lang="ts">${imported}</script>${sfc()}`,
      errors: ['unexpectedTypeArguments'],
      output: null,
    },
    {
      description: 'handles templates before scripts and CRLF',
      code: `<template><video ref="videoRef" /></template>\r\n<script setup lang="ts">\r\n${imported}\r\n${call}\r\n</script>`,
      errors: ['unexpectedTypeArguments'],
      output: null,
    },
    {
      description: 'reports each eligible call and leaves ignored keys alone',
      code: withImport(
        `${call}; const panelRef = useTemplateRef<Panel>('panelRef'); const other = useTemplateRef<Other>('other')`,
        '<video ref="videoRef" /><Panel ref="panelRef" /><Other ref="other" />',
      ),
      options: { ignoreRefs: ['other'] },
      errors: ['unexpectedTypeArguments', 'unexpectedTypeArguments'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-use-template-ref-inference',
  rule: preferUseTemplateRefInference,
  languageOptions: vueLanguageOptions,
  defaultFilenames: { js: 'Test.vue' },
})

describe('prefer-use-template-ref-inference configuration', () => {
  it.each([
    { ignoreRefs: 'videoRef' },
    { ignoreRefs: [42] },
    { ignoreRefs: ['videoRef', 'videoRef'] },
    { ignoreRefs: null },
    { autoImport: true },
    { vueImportSources: ['vue'] },
    { fix: true },
  ])('rejects invalid options: %j', async options => {
    await expect(
      tester.valid({ code: '<template />', options }),
    ).rejects.toThrow()
  })

  it.each(['true', 1, null, []])(
    'rejects invalid autoImport: %j',
    async autoImport => {
      await expect(
        tester.valid({
          code: sfc(),
          settings: { 'vue-perfectionist': { autoImport } },
        }),
      ).rejects.toThrow('autoImport must be a boolean')
    },
  )
})
