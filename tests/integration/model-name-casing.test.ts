import { runInNewContext } from 'node:vm'
import {
  createCompilerHost,
  createProgram,
  createSourceFile,
  ModuleKind,
  ScriptTarget,
  transpileModule,
} from 'typescript'
import { describe, expect, it } from 'vitest'
import * as CurrentVue from 'vue'
import * as MinimumVue from 'vue-minimum'
import {
  compileScript as compileMinimumScript,
  version as minimumCompilerVersion,
  parse as parseMinimum,
} from 'vue-minimum/compiler-sfc'
import { renderToString as renderMinimumToString } from 'vue-minimum/server-renderer'
import {
  compileScript,
  version as currentCompilerVersion,
  parse,
} from 'vue/compiler-sfc'
import { renderToString } from 'vue/server-renderer'
import { defineModelNameCasing } from '../../src/rules/define-model-name-casing.ts'
import { run } from '../helpers/rule-tester.ts'
import type { Linter } from 'eslint'
import type { SFCScriptCompileOptions } from 'vue/compiler-sfc'
import type {
  DefineModelNameCasing,
  DefineModelNameCasingMessageId,
  DefineModelNameCasingOptions,
} from '../../src/types/index.ts'

const sfc = (script: string) => `<script setup lang="ts">${script}</script>`

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

describe.each([
  {
    runtime: 'minimum',
    version: '3.5.42',
    runtimeVersion: MinimumVue.version,
    compilerVersion: minimumCompilerVersion,
    compile(
      source: string,
      options: Pick<SFCScriptCompileOptions, 'id' | 'inlineTemplate'>,
    ) {
      return compileMinimumScript(parseMinimum(source).descriptor, options)
    },
  },
  {
    runtime: 'current',
    version: CurrentVue.version,
    runtimeVersion: CurrentVue.version,
    compilerVersion: currentCompilerVersion,
    compile(
      source: string,
      options: Pick<SFCScriptCompileOptions, 'id' | 'inlineTemplate'>,
    ) {
      return compileScript(parse(source).descriptor, options)
    },
  },
])(
  'Vue $version',
  async ({ runtime, version, runtimeVersion, compilerVersion, compile }) => {
    it('uses the selected compiler and runtime version', () => {
      expect(runtimeVersion).toBe(version)
      expect(compilerVersion).toBe(version)
    })

    /**
     * Render with the selected compiler and its matching Vue runtime.
     *
     * @param source - The complete SFC source to compile.
     * @param props - The parent-provided model values.
     * @returns Rendered model values and any Vue warnings.
     */
    async function renderModelSfc(
      source: string,
      props: Record<string, unknown>,
    ) {
      const compiled = compile(source, {
        id: 'model-fix-regression',
        inlineTemplate: true,
      })
      const warnings: string[] = []
      if (runtime === 'minimum') {
        const component = loadModelComponent<MinimumVue.Component>(
          compiled.content,
          MinimumVue,
        )
        const app = MinimumVue.createSSRApp(component, props)
        app.config.warnHandler = message => warnings.push(message)
        return {
          html: await renderMinimumToString(app),
          warnings,
        }
      }
      const component = loadModelComponent<CurrentVue.Component>(
        compiled.content,
        CurrentVue,
      )
      const app = CurrentVue.createSSRApp(component, props)
      app.config.warnHandler = message => warnings.push(message)
      return {
        html: await renderToString(app),
        warnings,
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
      valid: [],
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
          const template =
            '<template>{{ model }} / {{ modifiers.trim }}</template>'
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
              const updates: unknown[] = []
              expect(
                await renderModelSfc(result.output, {
                  fooBar: 'first',
                  FooBar: 'second',
                  fooBarModifiers: { trim: true },
                  'onUpdate:FooBar': (value: unknown) => updates.push(value),
                }),
              ).toEqual({ html: 'second / ', warnings: [] })
              expect(updates).toEqual(['  changed  '])
            },
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
                const updates: unknown[] = []
                const props = {
                  [other]: other === 'foo' ? 'first' : { trim: true },
                  ...(other === 'foo' ? { fooModifiers: { trim: true } } : {}),
                  FOO: 'second',
                  'onUpdate:FOO': (value: unknown) => updates.push(value),
                }
                expect(await renderModelSfc(result.output, props)).toEqual({
                  html: 'second / ',
                  warnings: [],
                })
                expect(updates).toEqual(['  changed  '])
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
              const updates: unknown[] = []
              expect(
                await renderModelSfc(result.output, {
                  Foo: 'first',
                  FOO_MODIFIERS: { trim: true },
                  'onUpdate:Foo': (value: unknown) => updates.push(value),
                }),
              ).toEqual({ html: 'first / ', warnings: [] })
              expect(updates).toEqual(['  changed  '])
            },
          }
        }),
        ...['modelValue', 'ModelValue'].map(name => ({
          description: `preserves ${name} when model-value would lose default modifiers`,
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
          },
        })),
        ...(
          [
            ['fileList', 'file-list'],
            ['file_list', 'file-list'],
            ['FILE', 'file'],
            ['Foo1', 'foo1'],
          ] satisfies [string, string][]
        ).map(([name, expected]) => ({
          description: `fixes kebab-case target ${expected} with values and modifiers intact`,
          code: `${sfc(`const [model, modifiers] = defineModel('${name}'); model.value = '  changed  '`)}<template>{{ model }} / {{ modifiers.trim }}</template>`,
          options: { casing: 'kebab-case' as const, fix: true },
          errors: ['unexpectedNameCasing' as const],
          output: `${sfc(`const [model, modifiers] = defineModel('${expected}'); model.value = '  changed  '`)}<template>{{ model }} / {{ modifiers.trim }}</template>`,
          async after(result: Linter.FixReport) {
            const updates: unknown[] = []
            const props = {
              [expected]: 'hello',
              [`onUpdate:${expected}`]: (value: unknown) => updates.push(value),
              [`${expected}Modifiers`]: { trim: true },
            }
            expect(await renderModelSfc(result.output, props)).toEqual({
              html: 'hello / true',
              warnings: [],
            })
            expect(updates).toEqual(['changed'])
          },
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
                description: `fixes independent model names for ${call} beside ${name}, JavaScript: ${javascript}, reverse: ${reverse}`,
                code: javascript
                  ? `<script setup>${script}</script>`
                  : sfc(script),
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
                output: (javascript
                  ? `<script setup>${script}</script>`
                  : sfc(script)
                ).replace(
                  `'${name}'`,
                  () => `'${name[0]?.toLowerCase()}${name.slice(1)}'`,
                ),
                after(result: Linter.FixReport) {
                  const compiled = compile(result.output, {
                    id: 'template-name-independent-model',
                  }).content
                  expect(compiled).toContain('"other":')
                  expect(compiled).toContain('"otherModifiers":')
                  expect(compiled).toContain(
                    `"${name[0]?.toLowerCase()}${name.slice(1)}":`,
                  )
                },
              }
            }),
          ),
        ),
        ...[
          ['defineModel(`other`)', 'FileList', 'fileList'],
          ["defineModel('other')", 'ModelValue', 'modelValue'],
          ["defineModel('other')", 'ModelModifiers', 'modelModifiers'],
        ].map(([other, name, renamed]) => ({
          description: `preserves independent fixes beside ${other}: ${name}`,
          code: sfc(`const a = ${other}; const b = defineModel('${name}')`),
          options: { fix: true },
          errors: ['unexpectedNameCasing' as const],
          output: sfc(
            `const a = ${other}; const b = defineModel('${renamed}')`,
          ),
          after(result: Linter.FixReport) {
            expect(
              compile(result.output, {
                id: 'independent-model',
              }).content,
            ).toContain(`"${renamed}":`)
          },
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
            expect(
              await renderModelSfc(result.output, { Key: 'hello' }),
            ).toEqual({
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
        ...['undefined', '...[]'].map(extra => ({
          description: `includes skipped model calls with ${extra} as a third argument in collision checks`,
          code: `<script setup>const a = defineModel('file-list'); const b = defineModel('fileList', {}, ${extra})</script>`,
          languageOptions: { parserOptions: { parser: null } },
          options: { fix: true },
          errors: ['unexpectedNameCasing' as const],
          output: null,
          after(result: Linter.FixReport) {
            expect(() =>
              compile(result.output, { id: 'skipped-model-collision' }),
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
            expect(() =>
              compile(result.output, { id: 'skipped-named-model' }),
            ).not.toThrow()
          },
        },
      ],
    })

    it('demonstrates model-value losing default modifiers on supported runtimes', async () => {
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

    it('detects the satisfies type error that transpilation would erase', () => {
      const original = sfc("defineModel('file-list' satisfies 'file-list')")
      const renamed = sfc("defineModel('fileList' satisfies 'file-list')")
      expect(getNameTypeDiagnostics(original)).toEqual([])
      expect(
        getNameTypeDiagnostics(renamed).map(diagnostic => diagnostic.code),
      ).toEqual([1360])
    })

    it('documents how opted-in renames change public prop, event, and modifier contracts', () => {
      const compileName = (name: string) =>
        compile(sfc(`const files = defineModel('${name}')`), {
          id: 'model-casing',
        }).content
      const original = compileName('file-list')
      const renamed = compileName('fileList')
      expect(original).toContain('"file-list":')
      expect(original).toContain('"file-listModifiers":')
      expect(original).toContain('"update:file-list"')
      expect(renamed).toContain('"fileList":')
      expect(renamed).toContain('"fileListModifiers":')
      expect(renamed).toContain('"update:fileList"')
    })
  },
)
