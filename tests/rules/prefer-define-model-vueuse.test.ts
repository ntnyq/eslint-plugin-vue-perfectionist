import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import { preferDefineModel } from '../../src/rules/prefer-define-model.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type {
  PreferDefineModelMessageId,
  PreferDefineModelOptions,
} from '../../src/types/index.ts'

const imported = "import { useVModel } from '@vueuse/core'"
const declarations = `
const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
`
const passiveCall = "useVModel(props, 'modelValue', emit, { passive: true })"
const sfc = (script: string) => `<script setup lang="ts">${script}</script>`
const code = sfc(`${imported}; ${declarations}; const model = ${passiveCall}`)

await run<PreferDefineModelOptions[], PreferDefineModelMessageId>({
  name: 'prefer-define-model VueUse integration',
  rule: preferDefineModel,
  valid: [
    {
      code,
      options: [{}],
      settings: { 'vue-perfectionist': { vueuse: true } },
    },
    { code, options: [{ vueuse: true }] },
    {
      code,
      options: [{ vueuse: true }],
      settings: { 'vue-perfectionist': { vueuse: false } },
    },
    ...[
      `${imported}; ${declarations}; ${passiveCall}`,
      `${imported}; ${declarations}; const model = (${passiveCall} as unknown)!`,
      `import { useVModel as model } from '@vueuse/core'; ${declarations}; model(props, 'modelValue', emit, { passive: true })`,
      `import * as VueUse from '@vueuse/core'; ${declarations}; (VueUse as unknown).useVModel(props, 'modelValue', emit, { passive: true })`,
      `${imported}; type useVModel = string; ${declarations}; ${passiveCall}`,
      `${imported};
interface Props { modelValue?: string | number; defaultValue?: string | number }
const props = withDefaults(defineProps<Props>(), { defaultValue: '' })
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
const model = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: props.defaultValue,
})`,
      ...[
        "{ passive: true, eventName: 'update:modelValue' }",
        '{ __proto__: null, passive: true }',
        '{ ["__proto__"]: options, passive: true }',
        '{ passive: false, passive: true }',
        '{ ["passive"]: (true as const) }',
        '{ ...options, passive: true, eventName: `update:modelValue` }',
        '{ [key]: value, passive: true, eventName: "update:modelValue" }',
      ].map(
        options =>
          `${imported}; ${declarations}; useVModel(props, \`modelValue\`, emit, ${options})`,
      ),
    ].map(script => ({
      code: sfc(script),
      options: [{ vueuse: true }],
    })),
    {
      description: 'supports JavaScript setup',
      code: `<script setup>${imported}; ${declarations}; ${passiveCall}</script>`,
      languageOptions: { parserOptions: { parser: null } },
      options: [{ vueuse: true }],
    },
    ...[undefined, false, true].map(vueuse => ({
      description: `supports auto-import with rule vueuse override: ${vueuse}`,
      code: sfc(`${declarations}; ${passiveCall}`),
      options: [{ vueuse: true }],
      settings: { 'vue-perfectionist': { vueuse, autoImport: true } },
    })),
    {
      description: 'supports configured ESLint globals with both opt-ins',
      code: sfc(`${declarations}; ${passiveCall}`),
      languageOptions: { globals: { useVModel: 'readonly' } },
      settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
    },
    ...[false, true].map(reverse => ({
      description: `resolves an ordinary-script import, reverse: ${reverse}`,
      code: reverse
        ? `${sfc(`${declarations}; ${passiveCall}`)}<script lang="ts">${imported}</script>`
        : `<script lang="ts">${imported}</script>${sfc(`${declarations}; ${passiveCall}`)}`,
      options: [{ vueuse: true }],
    })),
    {
      description: 'accepts an unchanged let binding',
      code: sfc(
        `${imported}; ${declarations.replace('const props', 'let props')}; ${passiveCall}`,
      ),
      options: [{ vueuse: true }],
    },
    ...[
      'globalThis.useVModel',
      'window["useVModel"]',
      'const object = globalThis.useVModel',
      'function local(globalThis) { globalThis.useVModel = custom }',
      'function local(window) { window.useVModel = custom }',
      'function local(eval) { eval("useVModel = custom") }',
      'function local(eval) { (eval as Function)("useVModel = custom") }',
      'const globalThis = {}; globalThis.useVModel = custom',
      'globalThis.other = custom',
      'globalThis.state.useVModel = custom',
      'const { value = globalThis.useVModel } = replacement',
      'const { [globalThis.useVModel]: value } = replacement',
    ].map(script => ({
      description: `preserves auto-import recognition with unrelated access: ${script}`,
      code: sfc(`${declarations}; ${script}; ${passiveCall}`),
      settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
    })),
    ...[
      'globalThis.useVModel = custom',
      'eval("globalThis.useVModel = custom")',
    ].map(script => ({
      description: 'keeps explicit imports independent of uncertain globals',
      code: sfc(`${imported}; ${declarations}; ${script}; ${passiveCall}`),
      settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
    })),
  ],
  invalid: [
    ...[
      {},
      { settings: { 'vue-perfectionist': { vueuse: false } } },
      { settings: { 'vue-perfectionist': { autoImport: true } } },
      {
        options: [{ vueuse: false }],
        settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
      },
    ].map(config => ({
      description: 'keeps default reporting when VueUse is disabled',
      code,
      ...config,
      errors: ['preferDefineModel' as const],
      output: null,
    })),
    ...[{}, { autoImport: false }].map(settings => ({
      description: 'requires autoImport for unbound calls',
      code: sfc(`${declarations}; ${passiveCall}`),
      settings: { 'vue-perfectionist': { vueuse: true, ...settings } },
      languageOptions: { globals: { useVModel: 'readonly' as const } },
      errors: ['preferDefineModel' as const],
      output: null,
    })),
    ...[
      `import { useVModel } from 'other'; ${declarations}; ${passiveCall}`,
      `import type { useVModel } from '@vueuse/core'; ${declarations}; ${passiveCall}`,
      `import { type useVModel } from '@vueuse/core'; ${declarations}; ${passiveCall}`,
      `import useVModel from '@vueuse/core'; ${declarations}; ${passiveCall}`,
      `const useVModel = custom; ${declarations}; ${passiveCall}`,
      `function useVModel() {}; ${declarations}; ${passiveCall}`,
      `${declarations}; useVModel = custom; ${passiveCall}`,
      ...[
        'globalThis.useVModel = custom',
        'window.useVModel = custom',
        'self.useVModel = custom',
        'global.useVModel = custom',
        'globalThis["useVModel"] = custom',
        'globalThis[`useVModel`] = custom',
        'globalThis[key] = custom',
        '(globalThis as any).useVModel = custom',
        'globalThis.useVModel ||= custom',
        'globalThis.useVModel++',
        'delete globalThis.useVModel',
        '({ value: globalThis.useVModel } = replacement)',
        '[globalThis.useVModel] = replacement',
        '[globalThis.useVModel = custom] = replacement',
        '[...globalThis.useVModel] = replacement',
        'for (globalThis.useVModel of replacements) {}',
        'for (globalThis.useVModel in replacements) {}',
        'eval("useVModel = custom")',
        '(eval as Function)("useVModel = custom")',
        'function later() { globalThis.useVModel = custom }',
      ].map(script => `${declarations}; ${script}; ${passiveCall}`),
      `${imported}; ${declarations}; useVModel?.(props, 'modelValue', emit, { passive: true })`,
      `${imported}; ${declarations}; function nested() { ${passiveCall} }`,
      `${imported}; ${declarations}; { ${passiveCall} }`,
      `${imported}; ${declarations}; if (enabled) ${passiveCall}`,
      `${imported}; ${declarations}; const model = enabled && ${passiveCall}`,
      `${imported}; ${declarations}; wrap(${passiveCall})`,
      `${imported}; ${declarations}; useVModel(props, key, emit, { passive: true })`,
      `${imported}; ${declarations}; useVModel(other, 'modelValue', emit, { passive: true })`,
      `${imported}; ${declarations}; useVModel(props, 'modelValue', other, { passive: true })`,
      `${imported}; ${declarations}; useVModel(props, 'modelValue', undefined, { passive: true })`,
      `${imported}; ${declarations}; const alias = props; useVModel(alias, 'modelValue', emit, { passive: true })`,
      `${imported}; ${declarations}; const alias = emit; useVModel(props, 'modelValue', alias, { passive: true })`,
      `${imported}; ${declarations.replace('const props', 'let props')}; props = other; ${passiveCall}`,
      `${imported}; ${declarations.replace('const emit', 'let emit')}; emit = other; ${passiveCall}`,
      `${imported}; ${passiveCall}; ${declarations}`,
      `${imported}; const { modelValue } = defineProps({ modelValue: String }); const emit = defineEmits(['update:modelValue']); useVModel(modelValue, 'modelValue', emit, { passive: true })`,
      ...[
        '{}',
        '{ passive: false }',
        '{ passive }',
        '{ passive: enabled }',
        '{ passive: true, passive: false }',
        '{ passive: true, ...options }',
        '{ ...options, passive: true }',
        '{ passive: true, [key]: value }',
        '{ passive: true, eventName: "change" }',
        '{ passive: true, eventName }',
        '{ get passive() { return true } }',
        '{ passive: true, get eventName() { return "update:modelValue" } }',
        '{ __proto__: options, passive: true }',
        '{ get clone() { this.passive = false; return false }, passive: true }',
        '{ get clone() { this.eventName = "change"; return false }, passive: true, eventName: "update:modelValue" }',
        '{ get [key]() { return false }, passive: true, eventName: "update:modelValue" }',
        '{ set clone(value) {}, passive: true }',
        '{ __proto__: options, passive: true, eventName: "update:modelValue" }',
        '{ __proto__: { get clone() { this.passive = false; return false } }, passive: true, eventName: "update:modelValue" }',
        'options',
      ].map(
        options =>
          `${imported}; ${declarations}; useVModel(props, 'modelValue', emit, ${options})`,
      ),
    ].map(script => ({
      code: sfc(script),
      settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
      errors: ['preferDefineModel' as const],
      output: null,
    })),
    {
      description: 'only exempts the matching passive model',
      code: sfc(`${imported};
const props = defineProps<{ modelValue: string; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [string]; 'update:title': [string] }>()
${passiveCall}
useVModel(props, 'title', emit, { passive: false })`),
      options: [{ vueuse: true }],
      errors: [{ messageId: 'preferDefineModel', data: { name: 'title' } }],
      output: null,
    },
    {
      description: 'does not associate ordinary-script macro bindings',
      code: `<script lang="ts">${imported}; ${declarations}; ${passiveCall}</script>${sfc(declarations)}`,
      options: [{ vueuse: true }],
      errors: ['preferDefineModel'],
      output: null,
    },
    {
      description: 'setup-local functions shadow ordinary-script imports',
      code: `<script lang="ts">${imported}</script>${sfc(`const useVModel = custom; ${declarations}; ${passiveCall}`)}`,
      settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
      errors: ['preferDefineModel'],
      output: null,
    },
    {
      description: 'global object writes invalidate configured ESLint globals',
      code: sfc(
        `${declarations}; globalThis.useVModel = custom; ${passiveCall}`,
      ),
      languageOptions: {
        globals: { useVModel: 'writable', globalThis: 'readonly' },
      },
      settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
      errors: ['preferDefineModel'],
      output: null,
    },
    {
      description: 'ordinary-script writes also invalidate unbound setup calls',
      code: `<script lang="ts">globalThis.useVModel = custom</script>${sfc(`${declarations}; ${passiveCall}`)}`,
      settings: { 'vue-perfectionist': { vueuse: true, autoImport: true } },
      errors: ['preferDefineModel'],
      output: null,
    },
  ],
})

const tester = createRuleTester<PreferDefineModelOptions[]>({
  name: 'prefer-define-model settings validation',
  rule: preferDefineModel,
  languageOptions: vueLanguageOptions,
})

it.each(['true', null, 1, [], {}])(
  'rejects invalid shared vueuse: %j',
  async vueuse => {
    await expect(
      tester.valid({ code, settings: { 'vue-perfectionist': { vueuse } } }),
    ).rejects.toThrow('vueuse must be a boolean')
  },
)
