import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import { camelize } from 'vue'
import {
  compileScript as compileMinimumScript,
  parse as parseMinimum,
} from 'vue-minimum/compiler-sfc'
import { babelParse, compileScript, parse } from 'vue/compiler-sfc'
import plugin from '../../src'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

/**
 * Read generated prop declarations without discarding duplicate keys.
 *
 * @param content - The compiled TypeScript SFC script.
 * @returns Static value and modifiers prop names, in declaration order.
 */
function getCompiledPropNames(content: string): string[] {
  const program = babelParse(content, {
    sourceType: 'module',
    plugins: ['typescript'],
  }).program
  const declaration = program.body.find(
    node => node.type === 'ExportDefaultDeclaration',
  )?.declaration
  if (declaration?.type !== 'CallExpression') {
    throw new Error('Expected a compiled defineComponent call.')
  }
  const component = declaration.arguments[0]
  if (component?.type !== 'ObjectExpression') {
    throw new Error('Expected static compiled component options.')
  }
  const props = component.properties.find(
    property =>
      property.type === 'ObjectProperty' &&
      !property.computed &&
      property.key.type === 'Identifier' &&
      property.key.name === 'props',
  )
  if (
    props?.type !== 'ObjectProperty' ||
    props.value.type !== 'ObjectExpression'
  ) {
    throw new Error('Expected a static compiled props object.')
  }
  return props.value.properties.map(property => {
    if (property.type !== 'ObjectProperty' || property.computed) {
      throw new Error('Expected a static compiled prop declaration.')
    }
    if (property.key.type === 'StringLiteral') {
      return property.key.value
    }
    if (property.key.type === 'Identifier') {
      return property.key.name
    }
    throw new Error('Expected a string or identifier compiled prop key.')
  })
}

describe('compiled model props', () => {
  it.each(
    [
      {
        description: 'a model value colliding with another model modifier',
        script:
          "const a = defineModel('foo'); const b = defineModel('fooModifiers')",
        expectedProps: [
          'foo',
          'fooModifiers',
          'fooModifiers',
          'fooModifiersModifiers',
        ],
        rawCount: 3,
        normalizedCount: 3,
      },
      {
        description: 'distinct prop keys colliding after Vue camelization',
        script: "const a = defineModel('foo1'); const b = defineModel('foo-1')",
        expectedProps: ['foo1', 'foo1Modifiers', 'foo-1', 'foo-1Modifiers'],
        rawCount: 4,
        normalizedCount: 2,
      },
    ].flatMap(testcase =>
      ['minimum', 'current'].map(compiler => ({
        ...testcase,
        compiler,
      })),
    ),
  )(
    'preserves $description in $compiler compiler output',
    ({ script, expectedProps, rawCount, normalizedCount, compiler }) => {
      const source = `<script setup lang="ts">${script}</script>`
      const compiled =
        compiler === 'minimum'
          ? compileMinimumScript(parseMinimum(source).descriptor, {
              id: 'duplicate-model-props',
            })
          : compileScript(parse(source).descriptor, {
              id: 'duplicate-model-props',
            })
      const props = getCompiledPropNames(compiled.content)
      expect(props).toEqual(expectedProps)
      expect(new Set(props).size).toBe(rawCount)
      const normalizedSize = new Set(props.map(camelize)).size
      expect(normalizedSize).toBe(normalizedCount)
      expect(normalizedSize).toBeLessThan(props.length)
    },
  )

  it.each([
    {
      description: 'an identifier and a quoted key with the same name',
      content: 'export default defineComponent({props:{foo:{},"foo":{}}})',
      expectedProps: ['foo', 'foo'],
    },
    {
      description: 'an escaped string key with the same decoded name',
      content: String.raw`export default defineComponent({props:{foo1:{},"foo\u0031":{}}})`,
      expectedProps: ['foo1', 'foo1'],
    },
  ])('preserves $description', ({ content, expectedProps }) => {
    const props = getCompiledPropNames(content)
    expect(props).toEqual(expectedProps)
    expect(new Set(props).size).toBe(1)
    expect(new Set(props.map(camelize)).size).toBe(1)
  })
})

describe('model fix compilation compatibility', () => {
  it.each(
    [
      {
        description:
          'blocks a modifier fallback beside a protected string name',
        casing: 'PascalCase',
        declarations: [
          "const a = defineModel('foo' satisfies 'foo')",
          "const b = defineModel('FOO')",
        ],
        expectedDeclarations: [
          "const a = defineModel('foo' satisfies 'foo')",
          "const b = defineModel('FOO')",
        ],
        reportedNames: ['foo', 'FOO'],
        remainingDiagnostics: [
          { name: 'foo', line: 2 },
          { name: 'FOO', line: 3 },
        ],
        expectedProps: ['foo', 'fooModifiers', 'FOO', 'FOOModifiers'],
      },
      {
        description:
          'fixes an independent name beside a modifier fallback collision',
        casing: 'PascalCase',
        declarations: [
          "const a = defineModel('foo' satisfies 'foo')",
          "const b = defineModel('FOO')",
          "const c = defineModel('BAR')",
        ],
        expectedDeclarations: [
          "const a = defineModel('foo' satisfies 'foo')",
          "const b = defineModel('FOO')",
          "const c = defineModel('Bar')",
        ],
        reportedNames: ['foo', 'FOO', 'BAR'],
        remainingDiagnostics: [
          { name: 'foo', line: 2 },
          { name: 'FOO', line: 3 },
        ],
        expectedProps: [
          'foo',
          'fooModifiers',
          'FOO',
          'FOOModifiers',
          'Bar',
          'BarModifiers',
        ],
      },
      {
        description: 'preserves a string name with unstable Unicode casing',
        casing: 'PascalCase',
        declarations: [
          "const a = defineModel('ß')",
          "const b = defineModel('SS')",
        ],
        expectedDeclarations: [
          "const a = defineModel('ß')",
          "const b = defineModel('Ss')",
        ],
        reportedNames: ['ß', 'SS'],
        remainingDiagnostics: [{ name: 'ß', line: 2 }],
        expectedProps: ['ß', 'ßModifiers', 'Ss', 'SsModifiers'],
      },
      {
        description:
          'fixes an independent name beside the model-value modifiers special case',
        casing: 'kebab-case',
        declarations: [
          "const a = defineModel('ModelValue')",
          "const b = defineModel('FILE')",
        ],
        expectedDeclarations: [
          "const a = defineModel('ModelValue')",
          "const b = defineModel('file')",
        ],
        reportedNames: ['ModelValue', 'FILE'],
        remainingDiagnostics: [{ name: 'ModelValue', line: 2 }],
        expectedProps: [
          'ModelValue',
          'ModelValueModifiers',
          'file',
          'fileModifiers',
        ],
      },
      {
        description:
          'keeps modelValueModifiers independent of default modifiers',
        casing: 'camelCase',
        declarations: [
          'const a = defineModel(`other`)',
          "const b = defineModel('ModelValueModifiers')",
        ],
        expectedDeclarations: [
          'const a = defineModel(`other`)',
          "const b = defineModel('modelValueModifiers')",
        ],
        reportedNames: [undefined, 'ModelValueModifiers'],
        remainingDiagnostics: [],
        expectedProps: [
          'other',
          'otherModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
      },
      {
        description:
          'fixes a template name and an independent default model name',
        casing: 'camelCase',
        declarations: [
          'const a = defineModel(`file-list`)',
          "const b = defineModel('ModelValue')",
        ],
        expectedDeclarations: [
          'const a = defineModel(`fileList`)',
          "const b = defineModel('modelValue')",
        ],
        reportedNames: ['file-list', 'ModelValue'],
        remainingDiagnostics: [],
        expectedProps: [
          'fileList',
          'fileListModifiers',
          'modelValue',
          'modelModifiers',
        ],
      },
      {
        description:
          'blocks a modifier fallback beside a protected template name',
        casing: 'PascalCase',
        declarations: [
          "const a = defineModel(`foo` satisfies 'foo')",
          "const b = defineModel('FOO')",
        ],
        expectedDeclarations: [
          "const a = defineModel(`foo` satisfies 'foo')",
          "const b = defineModel('FOO')",
        ],
        reportedNames: ['foo', 'FOO'],
        remainingDiagnostics: [
          { name: 'foo', line: 2 },
          { name: 'FOO', line: 3 },
        ],
        expectedProps: ['foo', 'fooModifiers', 'FOO', 'FOOModifiers'],
      },
      {
        description: 'preserves a template name with unstable Unicode casing',
        casing: 'PascalCase',
        declarations: [
          'const a = defineModel(`ß`)',
          "const b = defineModel('SS')",
        ],
        expectedDeclarations: [
          'const a = defineModel(`ß`)',
          "const b = defineModel('Ss')",
        ],
        reportedNames: ['ß', 'SS'],
        remainingDiagnostics: [{ name: 'ß', line: 2 }],
        expectedProps: ['ß', 'ßModifiers', 'Ss', 'SsModifiers'],
      },
      {
        description:
          'fixes independent names beside a satisfies-protected template',
        casing: 'camelCase',
        declarations: [
          "const a = defineModel(`foo-1` satisfies 'foo-1')",
          "const b = defineModel('ModelValue')",
          "const c = defineModel('ModelValueModifiers')",
        ],
        expectedDeclarations: [
          "const a = defineModel(`foo-1` satisfies 'foo-1')",
          "const b = defineModel('modelValue')",
          "const c = defineModel('modelValueModifiers')",
        ],
        reportedNames: ['foo-1', 'ModelValue', 'ModelValueModifiers'],
        remainingDiagnostics: [{ name: 'foo-1', line: 2 }],
        expectedProps: [
          'foo-1',
          'foo-1Modifiers',
          'modelValue',
          'modelModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
      },
      {
        description:
          'fixes independent names beside an unstable Unicode template',
        casing: 'camelCase',
        declarations: [
          'const a = defineModel(`İ`)',
          "const b = defineModel('ModelValue')",
          "const c = defineModel('ModelValueModifiers')",
        ],
        expectedDeclarations: [
          'const a = defineModel(`İ`)',
          "const b = defineModel('modelValue')",
          "const c = defineModel('modelValueModifiers')",
        ],
        reportedNames: ['İ', 'ModelValue', 'ModelValueModifiers'],
        remainingDiagnostics: [{ name: 'İ', line: 2 }],
        expectedProps: [
          'İ',
          'İModifiers',
          'modelValue',
          'modelModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
      },
    ].flatMap(testcase => {
      const orders =
        testcase.declarations.length === 3
          ? [
              [0, 1, 2],
              [0, 2, 1],
              [1, 0, 2],
              [1, 2, 0],
              [2, 0, 1],
              [2, 1, 0],
            ]
          : [
              [0, 1],
              [1, 0],
            ]
      return orders.map(order => ({
        ...testcase,
        order,
      }))
    }),
  )(
    '$description through an aliased plugin, order: $order',
    ({
      casing,
      declarations,
      expectedDeclarations,
      reportedNames,
      remainingDiagnostics,
      expectedProps,
      order,
    }) => {
      const linter = new Linter()
      const configuration: Linter.Config = {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        plugins: { vp: plugin },
        rules: {
          'vp/define-model-name-casing': ['error', { casing, fix: true }],
        },
      }
      const source = `<script setup lang="ts">\n${order.map(index => declarations[index]).join('\n')}\n</script>`
      const output = `<script setup lang="ts">\n${order.map(index => expectedDeclarations[index]).join('\n')}\n</script>`
      const messages = linter.verify(source, configuration, 'Test.vue')
      expect(messages.map(message => message.message)).toEqual(
        order.flatMap(index => {
          const name = reportedNames[index]
          return name === undefined
            ? []
            : [`Expected model name "${name}" to use ${casing}.`]
        }),
      )
      const fixCount = declarations.filter(
        (declaration, index) => declaration !== expectedDeclarations[index],
      ).length
      expect(messages.filter(message => message.fix)).toHaveLength(fixCount)
      const result = linter.verifyAndFix(source, configuration, 'Test.vue')
      expect(result.fixed).toBe(fixCount > 0)
      expect(result.output).toBe(output)
      const expectedDiagnostics = remainingDiagnostics
        .map(({ name, line }) => {
          const reorderedLine = order.indexOf(line - 2) + 2
          return {
            ruleId: 'vp/define-model-name-casing',
            messageId: 'unexpectedNameCasing',
            message: `Expected model name "${name}" to use ${casing}.`,
            line: reorderedLine,
            column: 23,
            endLine: reorderedLine,
            endColumn: 25 + name.length,
          }
        })
        .toSorted((first, second) => first.line - second.line)
      expect(result.messages).toEqual(
        expectedDiagnostics.map(diagnostic =>
          expect.objectContaining(diagnostic),
        ),
      )
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
      expect(
        linter.verifyAndFix(result.output, configuration, 'Test.vue'),
      ).toEqual({ ...result, fixed: false })
      const minimum = compileMinimumScript(
        parseMinimum(result.output).descriptor,
        {
          id: 'minimum-partial-model-fix',
        },
      ).content
      const current = compileScript(parse(result.output).descriptor, {
        id: 'current-partial-model-fix',
      }).content
      for (const content of [minimum, current]) {
        const props = getCompiledPropNames(content)
        expect(props.toSorted()).toEqual(expectedProps.toSorted())
        expect(new Set(props.map(camelize)).size).toBe(props.length)
      }
    },
  )
})
