import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { describe, expect, it } from 'vitest'
import { preferFunctionDeclaration } from '../../src/rules/prefer-function-declaration.ts'
import { run } from '../helpers/rule-tester.ts'
import type {
  PreferFunctionDeclarationMessageId,
  PreferFunctionDeclarationOptions,
} from '../../src/types/index.ts'

function diagnostic(name = 'save') {
  return {
    messageId: 'expectedFunctionDeclaration' as const,
    data: { name },
  }
}

function sfc(code: string) {
  return `<script lang="ts">\n${code}\n</script>`
}

const namespaceExpressions = [
  '(Vue as typeof Vue)',
  '(Vue satisfies typeof Vue)',
  '(<typeof Vue>Vue)',
  'Vue!',
  '((Vue as typeof Vue)!)',
]

await run<PreferFunctionDeclarationOptions, PreferFunctionDeclarationMessageId>(
  {
    name: 'prefer-function-declaration',
    rule: preferFunctionDeclaration,
    defaultFilenames: { js: 'test.ts' },
    onResult(testcase, result) {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    },
    valid: [
      ...namespaceExpressions.flatMap(expression =>
        [
          `import type * as Vue from 'vue'; ${expression}.defineComponent(() => { const save = () => {} })`,
          `import Vue from 'vue'; ${expression}.defineComponent(() => { const save = () => {} })`,
          `import * as Vue from 'other'; ${expression}.defineComponent(() => { const save = () => {} })`,
          `import * as Vue from 'vue'; function ordinary(Vue: unknown) { ${expression}.defineComponent(() => { const save = () => {} }) }`,
          `${expression}.defineComponent(() => { const save = () => {} })`,
          `import * as Vue from 'vue'; ${expression}?.defineComponent(() => { const save = () => {} })`,
          `import * as Vue from 'vue'; ${expression}.defineComponent?.(() => { const save = () => {} })`,
          `import * as Vue from 'vue'; ${expression}['defineComponent'](() => { const save = () => {} })`,
        ].map(code => ({
          description: `preserves binding and call boundaries through ${expression}`,
          code: sfc(code),
          filename: 'Test.vue',
          settings: { 'vue-perfectionist': { autoImport: true } },
        })),
      ),
      {
        description: 'does not resolve nested member receivers as imports',
        filename: 'Test.vue',
        code: sfc(
          "import * as Vue from 'vue'; (service.Vue as typeof Vue).defineComponent(() => { const save = () => {} })",
        ),
      },
      {
        description: 'sfc scope alone skips files without Vue parser services',
        filename: 'test.js',
        code: 'const save = () => {}; function useForm() { const reset = () => {} }',
        options: { scopes: ['sfc'] },
      },
      ...[
        'function defineComponent(value) { return value }; defineComponent(() => { const save = () => {} })',
        'import type { defineComponent } from "vue"; defineComponent(() => { const save = () => {} })',
        'import { defineComponent } from "other"; defineComponent(() => { const save = () => {} })',
      ].map(code => ({
        description: 'auto-import recognition respects existing bindings',
        filename: 'Test.vue',
        code: sfc(code),
        settings: { 'vue-perfectionist': { autoImport: true } },
      })),
      ...[
        'function save() {}',
        'async function load() {}',
        'function* iterate() {}',
        'const { save } = useForm()',
        'const { save: submit } = actions',
        'const [value, toggle] = useToggle()',
        'const { save = () => {} } = actions',
        'const [save = function () {}] = actions',
        'const save = actions.save',
        'const save = importedSave',
        'const save = debounce(handler, 300)',
        'const save = handler.bind(context)',
        'const save = enabled ? primarySave : fallbackSave',
        'const save = enabled ? () => {} : function () {}',
        'const doubled = computed(() => count.value * 2)',
        'watch(source, () => {})',
        'onMounted(() => {})',
        'const actions = { save: () => {} }',
        'let save; save = () => {}',
        'if (enabled) { var save = () => {} }',
        'for (;;) { const save = () => {}; break }',
        'for (const save = () => {}; false;) {}',
        'try { const save = () => {} } catch { const save = () => {} }',
        '{ const save = () => {} }',
        'function ordinary() { const save = () => {} }',
        'watch(source, () => { const save = () => {} })',
      ].flatMap(code => [
        { code: sfc(code), filename: 'Test.vue' },
        { code: `function useForm() { ${code} }` },
      ]),
      ...[
        'const save = () => {}',
        'export const save = function () {}',
        'export const useForm = () => { function save() {} }',
        'const useForm = function internal() { function save() {} }',
        'function ordinary() { const save = () => {} }',
        'function useful() { const save = () => {} }',
        'export default function () { const save = () => {} }',
        'export default () => { const save = () => {} }',
        'const regular = function useForm() { const save = () => {} }',
        'const methods = { useForm() { const save = () => {} } }',
        'class Service { useForm() { const save = () => {} } }',
        'const useForm = wrap(() => { const save = () => {} })',
        'let useForm; useForm = () => { const save = () => {} }',
        'function useForm() { return () => renderContent() }',
        'function useForm() { function reset() { const save = () => {} } }',
        'const Component = { setup() { const save = () => {} } }',
        'export default { setup() { const save = () => {} } }',
        'import { defineComponent } from "vue"; defineComponent(() => { const save = () => {} })',
      ].map(code => ({
        code,
      })),
      ...[
        'const service = { setup() { const save = () => {} } }',
        'export default { methods: { save() { const nested = () => {} } }, mounted() { const save = () => {} } }',
        'function defineComponent(value) { return value }; defineComponent({ setup() { const save = () => {} } })',
        'import { defineComponent } from "other"; defineComponent({ setup() { const save = () => {} } })',
        'import type { defineComponent } from "vue"; defineComponent(() => { const save = () => {} })',
        'import { type defineComponent } from "vue"; defineComponent(() => { const save = () => {} })',
        'import defineComponent from "vue"; defineComponent(() => { const save = () => {} })',
        'import * as Vue from "other"; Vue.defineComponent(() => { const save = () => {} })',
        'import { defineComponent } from "vue"; function ordinary(defineComponent) { defineComponent(() => { const save = () => {} }) }',
        'import * as Vue from "vue"; function ordinary(Vue) { Vue.defineComponent(() => { const save = () => {} }) }',
        'import { defineComponent } from "vue"; defineComponent?.(() => { const save = () => {} })',
        'import * as Vue from "vue"; Vue["defineComponent"](() => { const save = () => {} })',
        'defineComponent(() => { const save = () => {} })',
        'export default { get setup() { const save = () => {} } }',
      ].map(code => ({
        code: sfc(code),
        filename: 'Test.vue',
      })),
      {
        description: 'disabled scopes replace all defaults',
        filename: 'Test.vue',
        code: sfc('const useForm = () => { const save = () => {} }'),
        options: { scopes: [] },
      },
      {
        description: 'sfc-only scope does not inspect composable bodies',
        filename: 'Test.vue',
        code: sfc('function useForm() { const save = () => {} }'),
        options: { scopes: ['sfc'] },
      },
      {
        description: 'composables-only scope skips sfc and component setup',
        filename: 'Test.vue',
        code: sfc(
          'const save = () => {}; export default { setup() { const reset = () => {} } }',
        ),
        options: { scopes: ['composables'] },
      },
      {
        code: 'function useForm() { const save = () => {} }',
        options: { functionPattern: '^create[A-Z]' },
      },
      {
        code: 'function useForm() { const save = () => {} }',
        options: { ignoreNames: ['useForm'] },
      },
      {
        code: 'function useForm() { const save: Handler = () => {} }',
        options: { allowTypeAnnotation: true },
      },
      {
        filename: 'Test.vue',
        code: sfc('const save: Handler = function () {}'),
        options: { allowTypeAnnotation: true },
      },
      {
        filename: 'Test.vue',
        code: '<template><button @click="() => { const save = () => {} }" /></template>',
      },
    ],
    invalid: [
      ...namespaceExpressions.flatMap(expression =>
        [
          `${expression}.defineComponent(() => { const save = () => {} })`,
          `export default ${expression}.defineComponent({ setup() { const save = () => {} } })`,
        ].map(code => ({
          description: `recognizes component setup through ${expression}`,
          filename: 'Test.vue',
          code: sfc(`import * as Vue from 'vue'; ${code}`),
          errors: [diagnostic()],
          output: null,
        })),
      ),
      ...['const', 'let', 'var'].flatMap(kind =>
        [
          '() => {}',
          'async () => {}',
          'function () {}',
          'function internal() {}',
          'async function () {}',
          'function* () {}',
          'async function* () {}',
        ].flatMap(value => [
          {
            filename: 'Test.vue',
            code: sfc(`${kind} save = ${value}`),
            errors: [diagnostic()],
            output: null,
          },
          {
            code: `function useForm() { ${kind} save = ${value} }`,
            errors: [diagnostic()],
            output: null,
          },
        ]),
      ),
      ...[
        'function useForm() { const save = () => {} }',
        'export async function useForm() { const save = () => {} }',
        'export default function useForm() { const save = () => {} }',
        'function* useForm() { const save = () => {} }',
        'const useForm = () => { const save = () => {} }',
        'const useForm = function internal() { const save = () => {} }',
        'const useForm = (() => { const save = () => {} }) satisfies Composable',
        'const useForm = (function internal() { const save = () => {} }) as Composable',
        'function ordinary() { function useForm() { const save = () => {} } }',
        'function useForm() { if (enabled) { function useNested() { const save = () => {} } } }',
        'const useForm: Composable = () => { const save = () => {} }',
        'function useForm() { const save = () => this.value }',
        'function useForm() { const save = () => arguments[0] }',
        'function useForm() { const save = function internal() { return internal } }',
      ].map(code => ({
        code,
        errors: [diagnostic()],
        output: null,
      })),
      ...[
        '(() => {})',
        '((() => {}) as Handler)',
        '((() => {}) satisfies Handler)',
        '(<Handler>(() => {}))',
        '((() => {})!)',
        '((<T>() => {})<string>)',
      ].map(value => ({
        code: `function useForm() { const save = ${value} }`,
        errors: [diagnostic()],
        output: null,
      })),
      ...[
        'export default { setup() { const save = () => {} } }',
        'export default ({ setup: () => { const save = () => {} } } satisfies Component)',
        'export default { "setup": function () { const save = () => {} } }',
        'export default { ["setup"]() { const save = () => {} } }',
        'export default { [`setup`]() { const save = () => {} } }',
        'import { defineComponent } from "vue"; export default defineComponent({ setup() { const save = () => {} } })',
        'import { defineComponent as component } from "vue"; component(() => { const save = () => {} })',
        'import * as Vue from "vue"; Vue.defineComponent(() => { const save = () => {} })',
        'import { defineComponent } from "vue"; defineComponent((() => { const save = () => {} }) satisfies Setup)',
        'import { defineComponent } from "vue"; defineComponent({ setup: (() => { const save = () => {} }) as Setup })',
        'import { defineComponent } from "vue"; defineComponent({ setup() { const save = () => {}; function nested() { const ignored = () => {} } } })',
      ].map(code => ({
        filename: 'Test.vue',
        code: sfc(code),
        errors: [diagnostic()],
        output: null,
      })),
      ...['', ' lang="ts"'].flatMap(language =>
        ['script', 'script setup'].map(tag => ({
          filename: 'Test.vue',
          languageOptions: language ? {} : { parserOptions: { parser: null } },
          code: `<${tag}${language}>\nconst save = () => {}\n</script>`,
          errors: [
            { ...diagnostic(), line: 2, column: 7, endLine: 2, endColumn: 11 },
          ],
          output: null,
        })),
      ),
      ...['test.js', 'test.ts'].map(filename => ({
        filename,
        code: 'function useForm() { const save = () => {} }',
        errors: [diagnostic()],
        output: null,
      })),
      {
        filename: 'Test.vue',
        code: sfc('export const save = () => {}'),
        errors: [diagnostic()],
        output: null,
      },
      {
        description: 'checks dual scripts and overlapping containers once each',
        filename: 'Test.vue',
        code: '<script lang="ts">const save = () => {}; export default { setup: function useForm() { const reset = () => {} } }</script>\n<script setup lang="ts">const useOther = () => { const close = () => {} }</script>',
        errors: [
          diagnostic(),
          diagnostic('reset'),
          diagnostic('useOther'),
          diagnostic('close'),
        ],
        output: null,
      },
      {
        description:
          'ordinary-script Vue imports remain visible in script setup',
        filename: 'Test.vue',
        code: '<script lang="ts">import { defineComponent as component } from "vue"</script>\n<script setup lang="ts">component(() => { const save = () => {} })</script>',
        errors: [diagnostic()],
        output: null,
      },
      {
        description:
          'setup shadowing does not hide ordinary-script Vue imports',
        filename: 'Test.vue',
        code: '<script lang="ts">import { defineComponent } from "vue"; defineComponent(() => { const save = () => {} })</script>\n<script setup lang="ts">function defineComponent(value) { return value }; defineComponent(() => { const ignored = () => {} })</script>',
        errors: [diagnostic()],
        output: null,
      },
      {
        description: 'shared autoImport recognizes unbound defineComponent',
        filename: 'Test.vue',
        code: sfc('defineComponent(() => { const save = () => {} })'),
        settings: { 'vue-perfectionist': { autoImport: true } },
        errors: [diagnostic()],
        output: null,
      },
      {
        code: 'function createForm() { const save = () => {} }',
        options: { functionPattern: '^create[A-Z]', ignoreNames: [] },
        errors: [diagnostic()],
        output: null,
      },
      {
        description: 'patterns have no implicit anchors',
        code: 'function prefixFormSuffix() { const save = () => {} }',
        options: { functionPattern: 'Form' },
        errors: [diagnostic()],
        output: null,
      },
      {
        description: 'binding name takes precedence and ignoreNames is exact',
        code: 'const useForm = function internal() { const save = () => {} }',
        options: { ignoreNames: ['useFor', 'internal'] },
        errors: [diagnostic()],
        output: null,
      },
      {
        description: 'ignoring a container does not hide nested composables',
        code: 'function useForm() { const ignored = () => {}; function useNested() { const save = () => {} } }',
        options: { ignoreNames: ['useForm'] },
        errors: [diagnostic()],
        output: null,
      },
      {
        description: 'composables-only scope still checks inside Vue scripts',
        filename: 'Test.vue',
        code: sfc('const useForm = () => { const save = () => {} }'),
        options: { scopes: ['composables'] },
        errors: [diagnostic()],
        output: null,
      },
      {
        description: 'ignoring a container does not exempt its SFC binding',
        filename: 'Test.vue',
        code: sfc('const useForm = () => { const save = () => {} }'),
        options: { ignoreNames: ['useForm'] },
        errors: [diagnostic('useForm')],
        output: null,
      },
      {
        description: 'typed exceptions do not stop checking a container body',
        filename: 'Test.vue',
        code: sfc(
          'const useForm: Composable = () => { const save = () => {} }',
        ),
        options: { allowTypeAnnotation: true },
        errors: [diagnostic()],
        output: null,
      },
      ...[
        'const save: Handler = () => {}',
        'const save: Handler = function () {}',
      ].map(code => ({
        code: `function useForm() { ${code} }`,
        options: { allowTypeAnnotation: false },
        errors: [diagnostic()],
        output: null,
      })),
      ...[
        'const save = (value: string): void => {}',
        'const save = (() => {}) satisfies Handler',
        'const save = (() => {}) as Handler',
      ].map(code => ({
        code: `function useForm() { ${code} }`,
        options: { allowTypeAnnotation: true },
        errors: [diagnostic()],
        output: null,
      })),
      {
        code: 'function useForm() { const save = () => {}, load = function () {} }',
        errors: [diagnostic(), diagnostic('load')],
        output: null,
      },
      {
        filename: 'Test.vue',
        code: '<script setup>\r\n// Preserve lexical this and comments.\r\nconst save = () => this.value\r\n</script>',
        errors: [diagnostic()],
        output: null,
      },
    ],
  },
)

const tester = createRuleTester<unknown>({
  name: 'prefer-function-declaration',
  rule: preferFunctionDeclaration,
  languageOptions: { parser: tsParser },
})

describe('prefer-function-declaration configuration', () => {
  it.each([
    { scopes: 'sfc' },
    { scopes: ['unknown'] },
    { scopes: ['sfc', 'sfc'] },
    { scopes: [1] },
    { scopes: null },
    { functionPattern: '[' },
    { functionPattern: 1 },
    { functionPattern: null },
    { ignoreNames: 'useForm' },
    { ignoreNames: [''] },
    { ignoreNames: [1] },
    { ignoreNames: ['useForm', 'useForm'] },
    { ignoreNames: null },
    { allowTypeAnnotation: 'true' },
    { allowTypeAnnotation: null },
    { unknown: true },
  ])('rejects invalid options: %j', async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  })
})
