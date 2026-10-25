import { runInNewContext } from 'node:vm'
import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import {
  createCompilerHost,
  createProgram,
  createSourceFile,
  ModuleKind,
  ScriptTarget,
  transpileModule,
} from 'typescript'
import { expect, it, vi } from 'vitest'
import * as Vue from 'vue'
import {
  compileScript as compileLegacyScript,
  parse as parseLegacy,
} from 'vue-compiler-sfc-legacy'
import * as LegacyVue from 'vue-runtime-legacy'
import {
  compileScript as compileLegacyRuntimeScript,
  parse as parseLegacyRuntime,
} from 'vue-runtime-legacy/compiler-sfc'
import { renderToString as renderLegacyToString } from 'vue-runtime-legacy/server-renderer'
import { compileScript, parse } from 'vue/compiler-sfc'
import { renderToString } from 'vue/server-renderer'
import { defineModelNameCasing } from '../../src/rules/define-model-name-casing.ts'
import { run, vueLanguageOptions } from '../helpers/rule-tester.ts'
import type { Linter } from 'eslint'
import type {
  DefineModelNameCasing,
  DefineModelNameCasingMessageId,
  DefineModelNameCasingOptions,
} from '../../src/types/index.ts'

const sfc = (script: string) => `<script setup lang="ts">${script}</script>`
const names: Record<DefineModelNameCasing, string> = {
  camelCase: 'fileList',
  PascalCase: 'FileList',
  'kebab-case': 'file-list',
  snake_case: 'file_list',
}
const casings: DefineModelNameCasing[] = [
  'camelCase',
  'PascalCase',
  'kebab-case',
  'snake_case',
]
const mismatch = "const model = defineModel('file-list')"

/**
 * Check name constraints with TypeScript semantics instead of erasing types.
 *
 * @param source - The complete SFC containing the name expression.
 * @returns Syntax and semantic diagnostics for its script setup block.
 */
function getNameTypeDiagnostics(source: string) {
  const { descriptor } = parse(source)
  const filename = 'model-name.ts'
  const script = createSourceFile(
    filename,
    `declare function defineModel(name: string): unknown;\n${descriptor.scriptSetup?.content ?? ''}`,
    ScriptTarget.Latest,
    true,
  )
  const options = { noLib: true, strict: true }
  const host = createCompilerHost(options)
  host.getSourceFile = file => (file === filename ? script : undefined)
  const program = createProgram([filename], options, host)
  return [
    ...program.getSyntacticDiagnostics(script),
    ...program.getSemanticDiagnostics(script),
  ]
}

/**
 * Evaluate compiler output using its matching Vue runtime.
 *
 * @param content - The compiled SFC script.
 * @param runtime - The Vue runtime used by generated imports.
 * @returns The component exported by the compiled script.
 */
function loadModelComponent<TComponent>(
  content: string,
  runtime: object,
): TComponent {
  const { outputText } = transpileModule(content, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ESNext,
    },
  })
  const exports: { default?: TComponent } = {}
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      if (name !== 'vue') {
        throw new Error(`Unexpected regression fixture import: ${name}`)
      }
      return runtime
    },
  })
  if (!exports.default) {
    throw new Error('Expected the compiled SFC to export a component.')
  }
  return exports.default
}

/**
 * Render the rule's output through the current Vue compiler and runtime.
 *
 * @param source - The complete SFC source to compile.
 * @param props - The parent-provided model values.
 * @returns Rendered model values and any Vue warnings.
 */
async function renderModelSfc(source: string, props: Record<string, unknown>) {
  const compiled = compileScript(parse(source).descriptor, {
    id: 'model-fix-regression',
    inlineTemplate: true,
  })
  const component = loadModelComponent<Vue.Component>(compiled.content, Vue)
  const warnings: string[] = []
  const app = Vue.createSSRApp(component, props)
  app.config.warnHandler = message => warnings.push(message)
  return {
    html: await renderToString(app),
    warnings,
  }
}

/**
 * Render with Vue 3.4.38, including warnings outside its SSR app handler.
 *
 * @param source - The complete SFC source to compile.
 * @param props - The parent-provided model values.
 * @returns Rendered model values and any Vue warnings.
 */
async function renderLegacyModelSfc(
  source: string,
  props: Record<string, unknown>,
) {
  const compiled = compileLegacyRuntimeScript(
    parseLegacyRuntime(source).descriptor,
    {
      id: 'legacy-runtime-model-fix',
      inlineTemplate: true,
    },
  )
  const component = loadModelComponent<LegacyVue.Component>(
    compiled.content,
    LegacyVue,
  )
  const warnings: string[] = []
  const app = LegacyVue.createSSRApp(component, props)
  app.config.warnHandler = message => warnings.push(message)
  const warn = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    })
  try {
    return {
      html: await renderLegacyToString(app),
      warnings,
    }
  } finally {
    warn.mockRestore()
  }
}

await run<DefineModelNameCasingOptions, DefineModelNameCasingMessageId>({
  name: 'define-model-name-casing',
  rule: defineModelNameCasing,
  onResult(testcase, result) {
    if (testcase.type === 'invalid' && testcase.output === null) {
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
      'defineModel()',
      'defineModel({ required: true })',
      "defineModel('fileList')",
      "defineModel('fileList' satisfies 'fileList')",
      'defineModel(name)',
      `function defineModel() {}; ${mismatch}`,
      `import { defineModel } from 'vue'; ${mismatch}`,
    ].map(script => ({
      code: sfc(script),
      options: { fix: true },
    })),
    ...[
      'defineModel()',
      'defineModel<string>()',
      'defineModel({ type: String, required: true })',
      "defineModel('fileList')",
      'const [model, modifiers] = defineModel<string, "trim">("fileList")',
      'defineModel(`fileList`)',
      "defineModel('file\\u004cist')",
      "defineModel('élèveNom')",
      "defineModel('文件列表')",
      "defineModel('file2D')",
      "defineModel('')",
      "defineModel('123')",
      'defineModel(name)',
      "const name = 'file-list'; defineModel(name)",
      // eslint-disable-next-line no-template-curly-in-string
      'defineModel(`file-${suffix}`)',
      "defineModel('file' + '-list')",
      "defineModel(...['file-list'])",
      'defineModel(null)',
      'defineModel(42)',
      `function defineModel() {}; ${mismatch}`,
      `const defineModel = fn; ${mismatch}`,
      `import { defineModel } from 'vue'; ${mismatch}`,
      `import { defineModel } from 'other'; ${mismatch}`,
      `import type { defineModel } from 'vue'; ${mismatch}`,
      `import { type defineModel } from 'vue'; ${mismatch}`,
      "import { defineModel as model } from 'vue'; model('file-list')",
      "import * as Vue from 'vue'; Vue.defineModel('file-list')",
      "obj.defineModel('file-list')",
      "defineModel?.('file-list')",
      "const model = wrap(defineModel('file-list'))",
      "const model = condition ? defineModel('file-list') : null",
      "const model = () => defineModel('file-list')",
      `function nested() { ${mismatch} }`,
      `{ ${mismatch} }`,
      "withDefaults(defineModel('file-list'), {})",
      "defineModel('file-list', {}, extra)",
    ].map(script => ({
      code: sfc(script),
    })),
    ...casings.flatMap(casing => [
      { code: sfc(`defineModel('${names[casing]}')`), options: { casing } },
      { code: sfc('defineModel()'), options: { casing } },
    ]),
    { code: mismatch, filename: 'test.ts' },
    { code: mismatch, filename: 'test.js' },
    { code: mismatch, languageOptions: { parser: tsParser } },
    { code: `<script>${mismatch}</script>` },
    { code: `<script>${mismatch}</script><script setup>const x = 1</script>` },
    { code: '<template>{{ defineModel("file-list") }}</template>' },
    {
      description: 'keeps template model arguments independent',
      code: `${sfc("const fileList = defineModel('fileList')")}<template><Child v-model:file-list="fileList" /></template>`,
    },
  ],
  invalid: [
    ...[false, true].map(reverse => {
      const declarations = [
        "const other = defineModel('fooBar', {}, undefined)",
        "const [model, modifiers] = defineModel('FOO_BAR')",
      ]
      const expectedDeclarations = [
        declarations[0],
        "const [model, modifiers] = defineModel('FooBar')",
      ]
      if (reverse) {
        declarations.reverse()
        expectedDeclarations.reverse()
      }
      const template = '<template>{{ model }} / {{ modifiers.trim }}</template>'
      return {
        description: `does not camelize a literal hyphenated modifier lookup, reverse: ${reverse}`,
        code: `${sfc(`${declarations.join('; ')}; model.value = '  changed  '`)}${template}`,
        options: { casing: 'PascalCase' as const, fix: true },
        errors: [
          {
            messageId: 'unexpectedNameCasing' as const,
            data: { name: 'FOO_BAR', casing: 'PascalCase' },
          },
        ],
        output: `${sfc(`${expectedDeclarations.join('; ')}; model.value = '  changed  '`)}${template}`,
        async after(result: Linter.FixReport) {
          for (const render of [renderModelSfc, renderLegacyModelSfc]) {
            const updates: unknown[] = []
            expect(
              await render(result.output, {
                fooBar: 'first',
                FooBar: 'second',
                fooBarModifiers: { trim: true },
                'onUpdate:FooBar': (value: unknown) => updates.push(value),
              }),
            ).toEqual({ html: 'second / ', warnings: [] })
            expect(updates).toEqual(['  changed  '])
          }
        },
      }
    }),
    ...[false, true].map(reverse => {
      const declarations = [
        "const other = defineModel('foo', {}, undefined)",
        "const model = defineModel('FOO')",
      ]
      if (reverse) {
        declarations.reverse()
      }
      return {
        description: `reserves modifier fallback props of a skipped JavaScript model, reverse: ${reverse}`,
        code: `<script setup>${declarations.join('; ')}</script>`,
        languageOptions: { parserOptions: { parser: null } },
        options: { casing: 'PascalCase' as const, fix: true },
        errors: [
          {
            messageId: 'unexpectedNameCasing' as const,
            data: { name: 'FOO', casing: 'PascalCase' },
          },
        ],
        output: null,
      }
    }),
    ...['foo', 'fooModifiers'].flatMap(other =>
      [false, true].map(reverse => {
        const declarations = [
          `const other = defineModel('${other}' satisfies '${other}')`,
          "const [model, modifiers] = defineModel('FOO')",
        ]
        if (reverse) {
          declarations.reverse()
        }
        return {
          description: `blocks a target's modifier fallback collision with ${other}, reverse: ${reverse}`,
          code: `${sfc(`${declarations.join('; ')}; model.value = '  changed  '`)}<template>{{ model }} / {{ modifiers.trim }}</template>`,
          options: { casing: 'PascalCase' as const, fix: true },
          errors: (reverse ? ['FOO', other] : [other, 'FOO']).map(name => ({
            messageId: 'unexpectedNameCasing' as const,
            data: { name, casing: 'PascalCase' },
          })),
          output: null,
          async after(result: Linter.FixReport) {
            for (const render of [renderModelSfc, renderLegacyModelSfc]) {
              const updates: unknown[] = []
              const props = {
                [other]: other === 'foo' ? 'first' : { trim: true },
                ...(other === 'foo' ? { fooModifiers: { trim: true } } : {}),
                FOO: 'second',
                'onUpdate:FOO': (value: unknown) => updates.push(value),
              }
              expect(await render(result.output, props)).toEqual({
                html: 'second / ',
                warnings: [],
              })
              expect(updates).toEqual(['  changed  '])
            }
          },
        }
      }),
    ),
    ...[false, true].map(reverse => {
      const declarations = [
        "const [model, modifiers] = defineModel('Foo' satisfies 'Foo')",
        "const other = defineModel('FOO_MODIFIERS')",
      ]
      if (reverse) {
        declarations.reverse()
      }
      return {
        description: `blocks a target value from populating another model's modifier fallback, reverse: ${reverse}`,
        code: `${sfc(`${declarations.join('; ')}; model.value = '  changed  '`)}<template>{{ model }} / {{ modifiers.trim }}</template>`,
        options: { fix: true },
        errors: (reverse
          ? ['FOO_MODIFIERS', 'Foo']
          : ['Foo', 'FOO_MODIFIERS']
        ).map(name => ({
          messageId: 'unexpectedNameCasing' as const,
          data: { name, casing: 'camelCase' },
        })),
        output: null,
        async after(result: Linter.FixReport) {
          for (const render of [renderModelSfc, renderLegacyModelSfc]) {
            const updates: unknown[] = []
            expect(
              await render(result.output, {
                Foo: 'first',
                FOO_MODIFIERS: { trim: true },
                'onUpdate:Foo': (value: unknown) => updates.push(value),
              }),
            ).toEqual({ html: 'first / ', warnings: [] })
            expect(updates).toEqual(['  changed  '])
          }
        },
      }
    }),
    ...['fileList', 'file_list', 'modelValue', 'ModelValue'].map(name => ({
      description: `preserves ${name} when the kebab-case target needs runtime camelization`,
      code: `${sfc(`const [model, modifiers] = defineModel('${name}')`)}<template>{{ model }} / {{ modifiers.trim }}</template>`,
      options: { casing: 'kebab-case' as const, fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: null,
      async after(result: Linter.FixReport) {
        const props = {
          [name]: 'hello',
          [name === 'modelValue' ? 'modelModifiers' : `${name}Modifiers`]: {
            trim: true,
          },
        }
        expect(await renderModelSfc(result.output, props)).toEqual({
          html: 'hello / true',
          warnings: [],
        })
        expect(await renderLegacyModelSfc(result.output, props)).toEqual({
          html: 'hello / true',
          warnings: [],
        })
      },
    })),
    ...(
      [
        ['FILE', 'file'],
        ['Foo1', 'foo1'],
      ] satisfies [string, string][]
    ).map(([name, expected]) => ({
      description: `still fixes canonical kebab-case target ${expected} on old and current runtimes`,
      code: `${sfc(`const [model, modifiers] = defineModel('${name}')`)}<template>{{ model }} / {{ modifiers.trim }}</template>`,
      options: { casing: 'kebab-case' as const, fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: `${sfc(`const [model, modifiers] = defineModel('${expected}')`)}<template>{{ model }} / {{ modifiers.trim }}</template>`,
      async after(result: Linter.FixReport) {
        const props = {
          [expected]: 'hello',
          [`${expected}Modifiers`]: { trim: true },
        }
        expect(await renderModelSfc(result.output, props)).toEqual({
          html: 'hello / true',
          warnings: [],
        })
        expect(await renderLegacyModelSfc(result.output, props)).toEqual({
          html: 'hello / true',
          warnings: [],
        })
      },
    })),
    {
      description:
        'reserves the runtime default-modifiers lookup of an existing model-value alias',
      code: sfc("defineModel('model-value'); defineModel('MODEL')"),
      options: { casing: 'kebab-case', fix: true },
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    ...(
      [
        ['SS', 'Ss'],
        ['élèveNom', 'ÉlèveNom'],
      ] satisfies [string, string][]
    ).map(([name, expected]) => ({
      description: `still fixes stable Unicode normalization from ${name} to ${expected}`,
      code: sfc(`defineModel('${name}')`),
      options: { casing: 'PascalCase' as const, fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: sfc(`defineModel('${expected}')`),
    })),
    ...[
      "defineModel('file-list' satisfies 'file-list')",
      "type Name = 'file-list'; defineModel('file-list' satisfies Name)",
      "type Name = 'file-list' | 'other'; defineModel('file-list' satisfies Name)",
      "const name = 'file-list'; defineModel('file-list' satisfies typeof name)",
      "type Name = 'file-list'; defineModel(('file-list' as const) satisfies Name)",
      "type Name = 'file-list'; defineModel(('file-list' satisfies Name) as string)",
      "type Name = 'file-list'; defineModel((('file-list' satisfies Name)!) as string)",
      "type Name = 'file-list'; defineModel(<string>('file-list' satisfies Name))",
      "type Name = 'file-list'; defineModel(`file-list` satisfies Name)",
      "defineModel('file-list' satisfies string)",
      "defineModel('file-list' satisfies unknown)",
    ].map(script => ({
      description: `preserves the name's satisfies constraint: ${script}`,
      code: sfc(script),
      options: { fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: null,
      after(result: Linter.FixReport) {
        expect(getNameTypeDiagnostics(sfc(script))).toEqual([])
        expect(getNameTypeDiagnostics(result.output)).toEqual([])
      },
    })),
    ...[
      { call: 'defineModel(`other`)', javascript: true },
      { call: 'defineModel(`other`)', javascript: false },
      { call: 'defineModel((`other` as const))', javascript: false },
      { call: 'defineModel(`other` satisfies string)', javascript: false },
      { call: 'defineModel(`other`, {}, undefined)', javascript: false },
    ].flatMap(({ call, javascript }) =>
      ['ModelValue', 'ModelModifiers', 'Model'].flatMap(name =>
        [false, true].map(reverse => {
          const declarations = [
            `const a = ${call}`,
            `const b = defineModel('${name}')`,
          ]
          if (reverse) {
            declarations.reverse()
          }
          const script = declarations.join('; ')
          return {
            description: `reserves legacy default props for ${call} beside ${name}, JavaScript: ${javascript}, reverse: ${reverse}`,
            code: javascript ? `<script setup>${script}</script>` : sfc(script),
            languageOptions: javascript
              ? { parserOptions: { parser: null } }
              : {},
            options: { fix: true },
            errors: [
              {
                messageId: 'unexpectedNameCasing' as const,
                data: { name, casing: 'camelCase' },
              },
            ],
            output: null,
            after(result: Linter.FixReport) {
              const legacy = compileLegacyScript(
                parseLegacy(result.output).descriptor,
                { id: 'legacy-template-name-collision' },
              ).content
              expect(legacy.match(/"modelValue":/gu)).toHaveLength(1)
              expect(legacy.match(/"modelModifiers":/gu)).toHaveLength(1)
              expect(legacy).toContain(`"${name}":`)
              const current = compileScript(parse(result.output).descriptor, {
                id: 'current-template-name-collision',
              }).content
              expect(current).toContain('"other":')
              expect(current).toContain('"otherModifiers":')
              expect(current).toContain(`"${name}":`)
            },
          }
        }),
      ),
    ),
    ...['Foo1', 'Foo1Modifiers'].map(name => ({
      description: `also reserves a template name's modern props beside ${name}`,
      code: sfc(`defineModel(\`foo1\`); defineModel('${name}')`),
      options: { fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: null,
    })),
    ...[
      ['defineModel(`other`)', 'FileList', 'fileList'],
      ["defineModel('other')", 'ModelValue', 'modelValue'],
      ["defineModel('other')", 'ModelModifiers', 'modelModifiers'],
    ].map(([other, name, renamed]) => ({
      description: `preserves independent fixes beside ${other}: ${name}`,
      code: sfc(`const a = ${other}; const b = defineModel('${name}')`),
      options: { fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: sfc(`const a = ${other}; const b = defineModel('${renamed}')`),
      after(result: Linter.FixReport) {
        expect(
          compileLegacyScript(parseLegacy(result.output).descriptor, {
            id: 'legacy-independent-model',
          }).content,
        ).toContain(`"${renamed}":`)
        expect(
          compileScript(parse(result.output).descriptor, {
            id: 'current-independent-model',
          }).content,
        ).toContain(`"${renamed}":`)
      },
    })),
    ...(
      [
        { casing: 'PascalCase', name: 'ß' },
        { casing: 'PascalCase', name: 'ßKey' },
        { casing: 'camelCase', name: 'İ' },
        { casing: 'camelCase', name: 'İKey' },
        { casing: 'kebab-case', name: 'İ' },
        { casing: 'kebab-case', name: 'İKey' },
        { casing: 'snake_case', name: 'İ' },
        { casing: 'snake_case', name: 'İKey' },
      ] satisfies { casing: DefineModelNameCasing; name: string }[]
    ).map(({ casing, name }) => ({
      description: `does not partially rename non-idempotent Unicode ${name} in ${casing}`,
      code: sfc(`defineModel('${name}')`),
      options: { casing, fix: true },
      errors: [
        { messageId: 'unexpectedNameCasing' as const, data: { name, casing } },
      ],
      output: null,
    })),
    ...(
      [
        { casing: 'PascalCase', name: 'ß', other: 'Ss' },
        { casing: 'camelCase', name: 'İ', other: 'i' },
      ] satisfies {
        casing: DefineModelNameCasing
        name: string
        other: string
      }[]
    ).map(({ casing, name, other }) => ({
      description: `does not partially rename ${name} toward the occupied stable name ${other}`,
      code: `<script setup>const a = defineModel('${name}'); const b = defineModel('${other}')</script><template>{{ a }} / {{ b }}</template>`,
      options: { casing, fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: null,
      async after(result: Linter.FixReport) {
        expect(
          await renderModelSfc(result.output, {
            [name]: 'first',
            [other]: 'second',
          }),
        ).toEqual({ html: 'first / second', warnings: [] })
      },
    })),
    {
      description:
        'keeps reserved target names report-only and preserves the model value',
      code: `<script setup>const model = defineModel('Key')</script><template>{{ model }}</template>`,
      options: { fix: true },
      errors: ['unexpectedNameCasing'],
      output: null,
      async after(result) {
        expect(await renderModelSfc(result.output, { Key: 'hello' })).toEqual({
          html: 'hello',
          warnings: [],
        })
      },
    },
    ...[
      { name: 'foo-1', other: 'Foo1' },
      { name: 'foo-1-modifiers', other: 'Foo1' },
      { name: 'foo-1', other: 'Foo1Modifiers' },
    ].flatMap(({ name, other }) =>
      [false, true].map(reverse => {
        const declarations = [
          `const a = defineModel('${name}' satisfies '${name}')`,
          `const b = defineModel('${other}')`,
        ]
        const reportedNames = reverse ? [other, name] : [name, other]
        if (reverse) {
          declarations.reverse()
        }
        return {
          description: `preserves satisfies-protected ${name} and blocks conflicting ${other}, reverse: ${reverse}`,
          code: `${sfc(declarations.join('; '))}<template>{{ a }} / {{ b }}</template>`,
          options: { fix: true },
          errors: reportedNames.map(name => ({
            messageId: 'unexpectedNameCasing' as const,
            data: { name, casing: 'camelCase' },
          })),
          output: null,
          async after(result: Linter.FixReport) {
            expect(getNameTypeDiagnostics(result.output)).toEqual([])
            expect(
              await renderModelSfc(result.output, {
                [name]: 'first',
                [other]: 'second',
              }),
            ).toEqual({ html: 'first / second', warnings: [] })
          },
        }
      }),
    ),
    ...[
      'Ref',
      'OnVnodeBeforeMount',
      'OnVnodeMounted',
      'OnVnodeBeforeUpdate',
      'OnVnodeUpdated',
      'OnVnodeBeforeUnmount',
      'OnVnodeUnmounted',
    ].map(name => ({
      description: `does not rename a model to Vue's reserved ${name} prop`,
      code: sfc(`defineModel('${name}')`),
      options: { fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: null,
    })),
    ...['RefFor', 'RefKey'].map(name => ({
      description: `does not produce a reserved snake_case prop from ${name}`,
      code: sfc(`defineModel('${name}')`),
      options: { casing: 'snake_case' as const, fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: null,
    })),
    {
      description: 'checks reserved targets after Vue camelization',
      code: sfc("defineModel('OnVnodeMounted')"),
      options: { casing: 'kebab-case', fix: true },
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    {
      description:
        'preserves independent model values when Vue-normalized names would collide',
      code: `<script setup>const a = defineModel('Foo1'); const b = defineModel('foo-1')</script><template>{{ a }} / {{ b }}</template>`,
      options: { casing: 'kebab-case', fix: true },
      errors: ['unexpectedNameCasing'],
      output: null,
      async after(result: Linter.FixReport) {
        expect(
          await renderModelSfc(result.output, {
            Foo1: 'first',
            'foo-1': 'second',
          }),
        ).toEqual({ html: 'first / second', warnings: [] })
      },
    },
    {
      description: 'checks Vue-normalized modifiers props for collisions',
      code: sfc("defineModel('Foo1'); defineModel('foo-1-modifiers')"),
      options: { casing: 'kebab-case', fix: true },
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    ...['undefined', '...[]'].map(extra => ({
      description: `includes skipped model calls with ${extra} as a third argument in collision checks`,
      code: `<script setup>const a = defineModel('file-list'); const b = defineModel('fileList', {}, ${extra})</script>`,
      languageOptions: { parserOptions: { parser: null } },
      options: { fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: null,
      after(result: Linter.FixReport) {
        const { descriptor } = parse(result.output)
        expect(() =>
          compileScript(descriptor, { id: 'skipped-model-collision' }),
        ).not.toThrow()
      },
    })),
    {
      description:
        'does not mistake a skipped named model for an implicit default model',
      code: `<script setup>const a = defineModel('model-value'); const b = defineModel('otherValue', {}, undefined)</script>`,
      options: { fix: true },
      errors: ['unexpectedNameCasing'],
      output: `<script setup>const a = defineModel('modelValue'); const b = defineModel('otherValue', {}, undefined)</script>`,
      after(result) {
        const { descriptor } = parse(result.output)
        expect(() =>
          compileScript(descriptor, { id: 'skipped-named-model' }),
        ).not.toThrow()
      },
    },
    ...casings.flatMap(casing =>
      casings
        .filter(other => other !== casing)
        .map(other => ({
          description:
            casing === 'kebab-case'
              ? `reports ${other} without generating a runtime-dependent kebab-case name`
              : `renames ${other} to ${casing} only when opted in`,
          code: sfc(`defineModel('${names[other]}')`),
          options: { casing, fix: true },
          errors: [
            {
              messageId: 'unexpectedNameCasing' as const,
              data: { name: names[other], casing },
            },
          ],
          output:
            casing === 'kebab-case'
              ? null
              : sfc(`defineModel('${names[casing]}')`),
        })),
    ),
    ...(
      [
        [
          "const model = defineModel('file-list')",
          "const model = defineModel('fileList')",
        ],
        [
          'const model = defineModel("file-list")',
          'const model = defineModel("fileList")',
        ],
        [
          'const model = defineModel(`file-list`)',
          'const model = defineModel(`fileList`)',
        ],
        [
          "const model = defineModel('file\\u002dlist')",
          "const model = defineModel('fileList')",
        ],
        [
          "const model = defineModel((/* name */ 'file-list' as const), { required: true })",
          "const model = defineModel((/* name */ 'fileList' as const), { required: true })",
        ],
        [
          "const [files, modifiers] = defineModel<string[], 'trim'>('file-list')",
          "const [files, modifiers] = defineModel<string[], 'trim'>('fileList')",
        ],
        [
          "const files = (defineModel('file-list') satisfies unknown)!",
          "const files = (defineModel('fileList') satisfies unknown)!",
        ],
        [
          "const files = defineModel('élève-nom')",
          "const files = defineModel('élèveNom')",
        ],
        [
          "const model = defineModel('KeyValue')",
          "const model = defineModel('keyValue')",
        ],
        [
          "const model = defineModel('RefValue')",
          "const model = defineModel('refValue')",
        ],
      ] satisfies [string, string][]
    ).map(([before, after]) => ({
      description: `preserves surrounding syntax when fixing: ${before}`,
      code: sfc(before),
      options: { fix: true },
      errors: ['unexpectedNameCasing' as const],
      output: sfc(after),
    })),
    {
      description:
        'preserves JavaScript comments, CRLF, and parent template bindings',
      code: `<script setup>\r\nconst files = defineModel(/* key */ 'file-list')\r\n</script><template><Child v-model:file-list="files" /></template>`,
      languageOptions: { parserOptions: { parser: null } },
      options: { fix: true },
      errors: ['unexpectedNameCasing'],
      output: `<script setup>\r\nconst files = defineModel(/* key */ 'fileList')\r\n</script><template><Child v-model:file-list="files" /></template>`,
    },
    {
      description: 'fixes every independent model in one pass',
      code: sfc("defineModel('file-list'); defineModel('user-name')"),
      options: { fix: true },
      errors: ['unexpectedNameCasing', 'unexpectedNameCasing'],
      output: sfc("defineModel('fileList'); defineModel('userName')"),
    },
    ...[
      { script: "defineModel('file-list'); defineModel('fileList')", count: 1 },
      { script: "defineModel('file-list'); defineModel('FileList')", count: 2 },
      { script: "defineModel('model-value'); defineModel()", count: 1 },
      {
        script: "defineModel('model-value'); defineModel({ required: true })",
        count: 1,
      },
      { script: "defineModel('!!!')", count: 1 },
      {
        script: "defineModel('file-list'); defineModel('fileListModifiers')",
        count: 1,
      },
      {
        script: "defineModel('model-value'); defineModel('modelModifiers')",
        count: 1,
      },
      {
        script: "defineModel('file-list'); defineModel('file-list-modifiers')",
        count: 2,
      },
    ].map(({ script, count }) => ({
      description: `keeps empty or conflicting names report-only even with fixes enabled: ${script}`,
      code: sfc(script),
      options: { fix: true },
      errors: Array.from(
        { length: count },
        () => 'unexpectedNameCasing' as const,
      ),
      output: null,
    })),
    {
      description: 'preserves potential name collisions and CRLF comments',
      code: `<script setup>\r\nconst files = defineModel(/* key */ 'file-list')\r\nconst other = defineModel('fileList')\r\n</script>`,
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    {
      description:
        'checks an explicit default model name under non-default casing',
      code: sfc("defineModel('modelValue')"),
      options: { casing: 'snake_case' },
      errors: [
        {
          messageId: 'unexpectedNameCasing',
          data: { name: 'modelValue', casing: 'snake_case' },
        },
      ],
      output: null,
    },
    ...[undefined, {}, { casing: 'camelCase' as const }, { fix: false }].map(
      options => ({
        description: 'uses camelCase by default',
        code: sfc(mismatch),
        options,
        errors: [
          {
            messageId: 'unexpectedNameCasing' as const,
            data: { name: 'file-list', casing: 'camelCase' },
          },
        ],
        output: null,
      }),
    ),
    ...casings.flatMap(casing =>
      casings
        .filter(other => other !== casing)
        .map(other => ({
          description: `reports ${other} when ${casing} is required`,
          code: sfc(`defineModel('${names[other]}')`),
          options: { casing },
          errors: [
            {
              messageId: 'unexpectedNameCasing' as const,
              data: { name: names[other], casing },
            },
          ],
          output: null,
        })),
    ),
    ...[
      "defineModel<string>('file-list', { required: true })",
      "const [files, modifiers] = defineModel<string, 'trim'>('file-list')",
      "const files = (defineModel('file-list'))",
      "const files = defineModel('file-list') as unknown",
      "const files = defineModel('file-list') satisfies unknown",
      "const files = <unknown>defineModel('file-list')",
      "const files = defineModel('file-list')!",
      "const files = defineModel(('file-list' as const))",
      "const files = defineModel('file-list' satisfies string)",
      "const files = defineModel(('file-list')!)",
      'const files = defineModel(`file-list`)',
      "const files = defineModel('file\\u002dlist')",
      "const files = defineModel(/* name */ 'file-list' /* options */, { default: () => [] })",
      "const files = defineModel('file-list'), count = defineModel('count')",
    ].map(script => ({
      code: sfc(script),
      errors: [
        {
          messageId: 'unexpectedNameCasing' as const,
          data: { name: 'file-list', casing: 'camelCase' },
        },
      ],
      output: null,
    })),
    {
      description:
        'reports only the name literal, without its TypeScript wrapper',
      code: `<script setup lang="ts">\ndefineModel('file-list' as const)\n</script>`,
      errors: [
        {
          messageId: 'unexpectedNameCasing',
          data: { name: 'file-list', casing: 'camelCase' },
          line: 2,
          column: 13,
          endLine: 2,
          endColumn: 24,
        },
      ],
      output: null,
    },
    ...[
      'FileList',
      'file_list',
      'URLValue',
      'file list',
      '!!!',
      'file.list',
      '_fileList',
    ].map(name => ({
      description: `uses uncase normalization for ${name}`,
      code: sfc(`defineModel('${name}')`),
      errors: [
        {
          messageId: 'unexpectedNameCasing' as const,
          data: { name, casing: 'camelCase' },
        },
      ],
      output: null,
    })),
    {
      description: 'reports every explicit mismatching name',
      code: sfc("defineModel('file-list'); defineModel('user-name')"),
      errors: ['unexpectedNameCasing', 'unexpectedNameCasing'],
      output: null,
    },
    {
      description:
        'accepts ESLint globals without treating them as local bindings',
      code: sfc(mismatch),
      languageOptions: { globals: { defineModel: 'readonly' } },
      settings: { 'vue-perfectionist': { autoImport: false } },
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    {
      description: 'checks JavaScript SFCs with the default script parser',
      code: `<script setup>${mismatch}</script>`,
      languageOptions: { parserOptions: { parser: null } },
      errors: ['unexpectedNameCasing'],
      output: null,
    },
    ...[false, true].map(reverse => ({
      description: `checks setup names in dual scripts, reverse: ${reverse}`,
      code: reverse
        ? `${sfc(mismatch)}<script lang="ts">${mismatch}</script>`
        : `<script lang="ts">${mismatch}</script>${sfc(mismatch)}`,
      errors: ['unexpectedNameCasing' as const],
      output: null,
    })),
  ],
})

const tester = createRuleTester<unknown>({
  name: 'define-model-name-casing',
  rule: defineModelNameCasing,
  languageOptions: vueLanguageOptions,
})

it('demonstrates model-value losing default modifiers even on the current runtime', async () => {
  const template = '<template>{{ model }} / {{ modifiers.trim }}</template>'
  const original = `${sfc("const [model, modifiers] = defineModel('modelValue')")}${template}`
  const renamed = `${sfc("const [model, modifiers] = defineModel('model-value')")}${template}`
  expect(
    await renderModelSfc(original, {
      modelValue: 'hello',
      modelModifiers: { trim: true },
    }),
  ).toEqual({ html: 'hello / true', warnings: [] })
  expect(
    await renderModelSfc(renamed, {
      'model-value': 'hello',
      'model-valueModifiers': { trim: true },
    }),
  ).toEqual({ html: 'hello / ', warnings: [] })
})

it('demonstrates kebab-case model values failing on the Vue 3.4.38 runtime', async () => {
  expect(LegacyVue.version).toBe('3.4.38')
  const template = '<template>{{ model }}</template>'
  const original = `${sfc("const model = defineModel('fileList')")}${template}`
  const renamed = `${sfc("const model = defineModel('file-list')")}${template}`
  expect(await renderLegacyModelSfc(original, { fileList: 'hello' })).toEqual({
    html: 'hello',
    warnings: [],
  })
  expect(await renderLegacyModelSfc(renamed, { 'file-list': 'hello' })).toEqual(
    {
      html: '',
      warnings: [
        expect.stringContaining(
          'useModel() called with prop "file-list" which is not declared.',
        ),
      ],
    },
  )
  expect(await renderModelSfc(renamed, { 'file-list': 'hello' })).toEqual({
    html: 'hello',
    warnings: [],
  })
})

it('detects the satisfies type error that transpilation would erase', () => {
  const original = sfc("defineModel('file-list' satisfies 'file-list')")
  const renamed = sfc("defineModel('fileList' satisfies 'file-list')")
  expect(getNameTypeDiagnostics(original)).toEqual([])
  expect(
    getNameTypeDiagnostics(renamed).map(diagnostic => diagnostic.code),
  ).toEqual([1360])
})

it.each([
  { casing: 'invalid' },
  { casing: 'pascalCase' },
  { casing: '' },
  { casing: null },
  { casing: true },
  { casing: ['camelCase'] },
  { unknown: true },
  { fix: 'true' },
  { fix: null },
  { fix: 1 },
  { fix: [] },
  'camelCase',
])('rejects invalid options: %j', async options => {
  await expect(
    tester.valid({ code: sfc(''), filename: 'Test.vue', options }),
  ).rejects.toThrow()
})

it('documents how opted-in renames change public prop, event, and modifier contracts', () => {
  const compile = (name: string) => {
    const { descriptor } = parse(sfc(`const files = defineModel('${name}')`))
    return compileScript(descriptor, { id: 'model-casing' }).content
  }
  const original = compile('file-list')
  const renamed = compile('fileList')
  expect(original).toContain('"file-list":')
  expect(original).toContain('"file-listModifiers":')
  expect(original).toContain('"update:file-list"')
  expect(renamed).toContain('"fileList":')
  expect(renamed).toContain('"fileListModifiers":')
  expect(renamed).toContain('"update:fileList"')
})
