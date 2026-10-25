import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import { camelize } from 'vue'
import {
  compileScript as compileLegacyScript,
  parse as parseLegacy,
} from 'vue-compiler-sfc-legacy'
import { babelParse, compileScript, parse } from 'vue/compiler-sfc'
import plugin, * as pluginExports from '../src'
import { vueLanguageOptions } from './internal'

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
      ['legacy', 'current'].map(compiler => ({
        ...testcase,
        compiler,
      })),
    ),
  )(
    'preserves $description in $compiler compiler output',
    ({ script, expectedProps, rawCount, normalizedCount, compiler }) => {
      const source = `<script setup lang="ts">${script}</script>`
      const compiled =
        compiler === 'legacy'
          ? compileLegacyScript(parseLegacy(source).descriptor, {
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

  it.each([
    {
      description: 'an unsupported default export',
      content: 'export default {}',
      message: 'Expected a compiled defineComponent call.',
    },
    {
      description: 'missing props',
      content: 'export default defineComponent({})',
      message: 'Expected a static compiled props object.',
    },
    {
      description: 'a dynamic props object',
      content: 'export default defineComponent({props:props})',
      message: 'Expected a static compiled props object.',
    },
    {
      description: 'spread props',
      content: 'export default defineComponent({props:{...props}})',
      message: 'Expected a static compiled prop declaration.',
    },
    {
      description: 'computed props',
      content: 'export default defineComponent({props:{[key]:{}}})',
      message: 'Expected a static compiled prop declaration.',
    },
    {
      description: 'accessor props',
      content: 'export default defineComponent({props:{get foo(){return {}}}})',
      message: 'Expected a static compiled prop declaration.',
    },
    {
      description: 'numeric prop keys',
      content: 'export default defineComponent({props:{1:{}}})',
      message: 'Expected a string or identifier compiled prop key.',
    },
  ])('rejects $description', ({ content, message }) => {
    expect(() => getCompiledPropNames(content)).toThrow(new Error(message))
  })
})

describe('plugin contract', () => {
  it('renames model contracts through an aliased plugin only when opted in', () => {
    const linter = new Linter()
    const source =
      '<script setup>const files = defineModel("file-list")</script>'
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/define-model-name-casing': ['error', { fix: true }] },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result).toEqual({
      fixed: true,
      messages: [],
      output: '<script setup>const files = defineModel("fileList")</script>',
    })
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({ ...result, fixed: false })
  })

  it('checks model conventions together through an aliased plugin without renaming contracts', () => {
    const linter = new Linter()
    const source = `<script setup lang="ts">
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ 'update:title': [string] }>()
const files = defineModel('file-list')
</script>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/prefer-define-model': 'error',
        'vp/define-model-name-casing': 'error',
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/prefer-define-model', 'preferDefineModel'],
      ['vp/define-model-name-casing', 'unexpectedNameCasing'],
    ])
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

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
        legacyProps: ['foo', 'fooModifiers', 'FOO', 'FOOModifiers'],
        currentProps: ['foo', 'fooModifiers', 'FOO', 'FOOModifiers'],
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
        legacyProps: [
          'foo',
          'fooModifiers',
          'FOO',
          'FOOModifiers',
          'Bar',
          'BarModifiers',
        ],
        currentProps: [
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
        legacyProps: ['ß', 'ßModifiers', 'Ss', 'SsModifiers'],
        currentProps: ['ß', 'ßModifiers', 'Ss', 'SsModifiers'],
      },
      {
        description:
          'fixes an independent name beside a runtime-dependent target',
        casing: 'kebab-case',
        declarations: [
          "const a = defineModel('ModelModifiers')",
          "const b = defineModel('MODEL')",
        ],
        expectedDeclarations: [
          "const a = defineModel('ModelModifiers')",
          "const b = defineModel('model')",
        ],
        reportedNames: ['ModelModifiers', 'MODEL'],
        remainingDiagnostics: [{ name: 'ModelModifiers', line: 2 }],
        legacyProps: [
          'ModelModifiers',
          'ModelModifiersModifiers',
          'model',
          'modelModifiers',
        ],
        currentProps: [
          'ModelModifiers',
          'ModelModifiersModifiers',
          'model',
          'modelModifiers',
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
        legacyProps: [
          'modelValue',
          'modelModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
        currentProps: [
          'other',
          'otherModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
      },
      {
        description: 'fixes a template name beside a legacy default collision',
        casing: 'camelCase',
        declarations: [
          'const a = defineModel(`file-list`)',
          "const b = defineModel('ModelValue')",
        ],
        expectedDeclarations: [
          'const a = defineModel(`fileList`)',
          "const b = defineModel('ModelValue')",
        ],
        reportedNames: ['file-list', 'ModelValue'],
        remainingDiagnostics: [{ name: 'ModelValue', line: 3 }],
        legacyProps: [
          'modelValue',
          'modelModifiers',
          'ModelValue',
          'ModelValueModifiers',
        ],
        currentProps: [
          'fileList',
          'fileListModifiers',
          'ModelValue',
          'ModelValueModifiers',
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
        legacyProps: ['modelValue', 'modelModifiers', 'FOO', 'FOOModifiers'],
        currentProps: ['foo', 'fooModifiers', 'FOO', 'FOOModifiers'],
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
        legacyProps: ['modelValue', 'modelModifiers', 'Ss', 'SsModifiers'],
        currentProps: ['ß', 'ßModifiers', 'Ss', 'SsModifiers'],
      },
      {
        description: 'keeps two reports beside a satisfies-protected template',
        casing: 'camelCase',
        declarations: [
          "const a = defineModel(`foo-1` satisfies 'foo-1')",
          "const b = defineModel('ModelValue')",
          "const c = defineModel('ModelValueModifiers')",
        ],
        expectedDeclarations: [
          "const a = defineModel(`foo-1` satisfies 'foo-1')",
          "const b = defineModel('ModelValue')",
          "const c = defineModel('modelValueModifiers')",
        ],
        reportedNames: ['foo-1', 'ModelValue', 'ModelValueModifiers'],
        remainingDiagnostics: [
          { name: 'foo-1', line: 2 },
          { name: 'ModelValue', line: 3 },
        ],
        legacyProps: [
          'modelValue',
          'modelModifiers',
          'ModelValue',
          'ModelValueModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
        currentProps: [
          'foo-1',
          'foo-1Modifiers',
          'ModelValue',
          'ModelValueModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
      },
      {
        description: 'keeps two reports beside an unstable Unicode template',
        casing: 'camelCase',
        declarations: [
          'const a = defineModel(`İ`)',
          "const b = defineModel('ModelValue')",
          "const c = defineModel('ModelValueModifiers')",
        ],
        expectedDeclarations: [
          'const a = defineModel(`İ`)',
          "const b = defineModel('ModelValue')",
          "const c = defineModel('modelValueModifiers')",
        ],
        reportedNames: ['İ', 'ModelValue', 'ModelValueModifiers'],
        remainingDiagnostics: [
          { name: 'İ', line: 2 },
          { name: 'ModelValue', line: 3 },
        ],
        legacyProps: [
          'modelValue',
          'modelModifiers',
          'ModelValue',
          'ModelValueModifiers',
          'modelValueModifiers',
          'modelValueModifiersModifiers',
        ],
        currentProps: [
          'İ',
          'İModifiers',
          'ModelValue',
          'ModelValueModifiers',
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
      legacyProps,
      currentProps,
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
      const legacy = compileLegacyScript(
        parseLegacy(result.output).descriptor,
        {
          id: 'legacy-partial-model-fix',
        },
      ).content
      const current = compileScript(parse(result.output).descriptor, {
        id: 'current-partial-model-fix',
      }).content
      for (const [content, expectedProps] of [
        [legacy, legacyProps],
        [current, currentProps],
      ] satisfies [string, string[]][]) {
        const props = getCompiledPropNames(content)
        expect(props.toSorted()).toEqual(expectedProps.toSorted())
        expect(new Set(props.map(camelize)).size).toBe(props.length)
      }
    },
  )

  it('reports function expressions through an aliased plugin without fixes', () => {
    const linter = new Linter()
    const source = `<script setup>
const useForm = () => {
  const save = () => {}
  return { save }
}
</script>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/prefer-function-declaration': 'error' },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages).toHaveLength(2)
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.ruleId).toBe('vp/prefer-function-declaration')
      expect(message.messageId).toBe('expectedFunctionDeclaration')
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

  it('checks required component slots through an aliased plugin', () => {
    const linter = new Linter()
    const source = `<template>
<AppDialog><template #header /><template #[name] /></AppDialog>
<app-dialog />
</template>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/require-component-slots': [
          'error',
          {
            targets: [
              { components: ['AppDialog'], slots: ['header', 'footer'] },
            ],
          },
        ],
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages.map(message => message.messageId)).toEqual([
      'unverifiableRequiredSlot',
      'missingSlot',
      'missingSlot',
    ])
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.ruleId).toBe('vp/require-component-slots')
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

  it('fixes tag padding through an aliased plugin and replaces defaults', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/padding-line-between-tags': [
          'error',
          { targets: [{ tag: 'Item' }] },
        ],
      },
    }
    const source =
      '<template><Other />\n<Other />\n<Item />\n<Item /></template>'
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result).toEqual({
      fixed: true,
      messages: [],
      output: '<template><Other />\n<Other />\n<Item />\n\n<Item /></template>',
    })
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({
      ...result,
      fixed: false,
    })
    expect(
      linter.verifyAndFix(
        source,
        {
          ...configuration,
          rules: { 'vp/padding-line-between-tags': ['error', { targets: [] }] },
        },
        'Test.vue',
      ),
    ).toEqual({ fixed: false, messages: [], output: source })
  })

  it('checks generic comments and exemptions through an aliased plugin', () => {
    const linter = new Linter()
    const source = `<template>
<!-- @vue-generic {import('#types').IAiCourse} -->
<ElTableColumn />
<ElTableColumn type="index" />
<ElTableColumn :type="columnType" />
<ElTableColumn />
</template>`
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: {
        'vp/require-vue-generic': [
          'error',
          {
            targets: [
              {
                components: ['ElTableColumn'],
                ignoreWhen: [{ props: { type: { enum: ['index'] } } }],
              },
            ],
            unknownValues: 'ignore',
          },
        ],
      },
    }
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toMatchObject({
      ruleId: 'vp/require-vue-generic',
      messageId: 'missingVueGeneric',
      line: 6,
      column: 2,
    })
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages[0]?.fix).toBeUndefined()
    expect(result.messages[0]?.suggestions).toBeUndefined()
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

  it.each([false, true])(
    'checks template ref inference through an aliased plugin with autoImport: %s',
    autoImport => {
      const linter = new Linter()
      const source = `<script setup lang="ts">
const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')
</script>
<template><video ref="videoRef" /></template>`
      const configuration: Linter.Config = {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        plugins: { vp: plugin },
        settings: { 'vue-perfectionist': { autoImport } },
        rules: {
          'vp/consistent-template-ref-name': 'error',
          'vp/prefer-ref-pattern': 'error',
          'vp/prefer-use-template-ref-inference': 'error',
        },
      }
      const result = linter.verifyAndFix(source, configuration, 'Test.vue')
      expect(result.messages.map(message => message.messageId)).toEqual(
        autoImport ? ['unexpectedTypeArguments'] : [],
      )
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
      for (const message of result.messages) {
        expect(message.ruleId).toBe('vp/prefer-use-template-ref-inference')
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
      expect(
        linter.verifyAndFix(result.output, configuration, 'Test.vue'),
      ).toEqual(result)
    },
  )

  it('checks composable definitions through an aliased plugin without fixes', () => {
    const linter = new Linter()
    const source = 'function useComments(id, thread = "") {}'
    const result = linter.verifyAndFix(source, {
      plugins: { vp: plugin },
      rules: {
        'vp/prefer-composable-options': ['error', { maxPositionalParams: 2 }],
      },
    })
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toMatchObject({
      ruleId: 'vp/prefer-composable-options',
      messageId: 'expectedOptionsObject',
    })
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages[0]?.fix).toBeUndefined()
    expect(result.messages[0]?.suggestions).toBeUndefined()
  })

  it('combines callback style and length without replacing inline callbacks', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      plugins: { vp: plugin },
      settings: { 'vue-perfectionist': { autoImport: true } },
      rules: {
        'vp/callback-style': 'error',
        'vp/max-lines-per-callback': ['error', { max: 3 }],
      },
    }
    const source = `watch(source, (value, oldValue, onCleanup) => {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
})
watch(source, handleChange)`
    const result = linter.verifyAndFix(source, configuration)
    expect(
      result.messages.map(message => [message.ruleId, message.messageId]),
    ).toEqual([
      ['vp/max-lines-per-callback', 'exceededMaxLines'],
      ['vp/callback-style', 'expectedInlineCallback'],
    ])
    expect(result.messages[0]?.message).toContain(
      'Extract its logic into a separate function and call it from the inline callback.',
    )
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
    expect(
      linter.verify(
        `function handleChange(value, oldValue, onCleanup) {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
}
watch(source, (value, oldValue, onCleanup) => {
  return handleChange(value, oldValue, onCleanup)
})`,
        configuration,
      ),
    ).toEqual([])
  })

  it('fixes mixed template text through an aliased plugin and stabilizes', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/prefer-template-literal-in-interpolation': 'error' },
    }
    const result = linter.verifyAndFix(
      '<template><span>{{ ok ? 0 : null }}分</span></template>',
      configuration,
      'Test.vue',
    )
    expect(result.fixed).toBe(true)
    expect(result.messages).toEqual([])
    expect(result.output).toBe(
      // eslint-disable-next-line no-template-curly-in-string
      "<template><span>{{ `${(ok ? 0 : null) ?? ''}分` }}</span></template>",
    )
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({ ...result, fixed: false })
  })

  it.each([false, true])(
    'recognizes boolean state auto-imports with an aliased plugin: %s',
    autoImport => {
      const linter = new Linter()
      const source = `<script setup lang="ts">
const loading = ref(false)
const ready = shallowRef<boolean>()
const [open, toggle] = useToggle()
function local(ref: Function) { const state = ref(false) }
</script>`
      const result = linter.verifyAndFix(
        source,
        {
          files: ['**/*.vue'],
          languageOptions: {
            ...vueLanguageOptions,
            globals: {
              ref: 'readonly',
              shallowRef: 'readonly',
              useToggle: 'readonly',
            },
          },
          plugins: { vp: plugin },
          settings: { 'vue-perfectionist': { autoImport } },
          rules: { 'vp/prefer-function-result-pattern': 'error' },
        },
        'Test.vue',
      )
      expect(result.messages.map(message => message.messageId)).toEqual(
        autoImport
          ? Array.from({ length: 3 }, () => 'unexpectedFunctionResultPattern')
          : [],
      )
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
    },
  )

  it.each(['', ' lang="ts"'])(
    'shares auto-import settings across rules with an aliased plugin: %s',
    language => {
      const linter = new Linter()
      const source = `<script setup${language}>
const panel = useTemplateRef('field')
const z = computed(() => 1)
const a = ref(0)
onMounted(handler)
</script>`
      const configuration: Linter.Config = {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        plugins: { vp: plugin },
        settings: { 'vue-perfectionist': { autoImport: true } },
        rules: {
          'vp/callback-style': 'error',
          'vp/consistent-template-ref-name': 'error',
          'vp/prefer-ref-pattern': 'error',
          'vp/sort-script-setup': ['error', { groups: ['ref', 'computed'] }],
        },
      }
      const result = linter.verifyAndFix(source, configuration, 'Test.vue')
      expect(result.messages.map(message => message.messageId)).toEqual([
        'inconsistentTemplateRefName',
        'unexpectedRefPattern',
        'unsafeReorder',
        'expectedInlineCallback',
      ])
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
      expect(
        linter.verify(
          source,
          {
            ...configuration,
            settings: { 'vue-perfectionist': { autoImport: false } },
          },
          'Test.vue',
        ),
      ).toEqual([])
    },
  )

  it('reports watch effect aliases through an aliased plugin without fixes', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      plugins: { vp: plugin },
      settings: { 'vue-perfectionist': { autoImport: true } },
      rules: { 'vp/prefer-watch-effect-alias': 'error' },
    }
    const source = "watchEffect(update, { flush: 'sync', onTrack: debug })"
    const result = linter.verifyAndFix(source, configuration)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toMatchObject({
      ruleId: 'vp/prefer-watch-effect-alias',
      messageId: 'preferredAlias',
    })
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(result.messages[0]?.fix).toBeUndefined()
    expect(result.messages[0]?.suggestions).toBeUndefined()
    expect(linter.verifyAndFix(result.output, configuration)).toEqual(result)
  })

  it('fixes watch effect aliases through an aliased plugin and stabilizes', () => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { vp: plugin },
      rules: { 'vp/prefer-watch-effect-alias': 'error' },
    }
    const source = `<script setup lang="ts">
import { watchEffect } from 'vue'
watchEffect(update, { flush: 'post' })
watchEffect(update, { flush: 'sync', onTrack: debug })
</script>`
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result).toEqual({
      fixed: true,
      messages: [],
      output: `<script setup lang="ts">
import { watchEffect, watchPostEffect, watchSyncEffect } from 'vue'
watchPostEffect(update)
watchSyncEffect(update, {  onTrack: debug })
</script>`,
    })
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual({
      ...result,
      fixed: false,
    })
  })

  it('exports rules without built-in configs', () => {
    expect(plugin.meta.name).toBe('eslint-plugin-vue-perfectionist')
    expect(pluginExports.plugin).toBe(plugin)
    expect(pluginExports).not.toHaveProperty('configs')
    expect(plugin).not.toHaveProperty('configs')
    expect(Object.keys(plugin.rules ?? {})).toEqual([
      'callback-style',
      'component-prop-types',
      'component-prop-values',
      'consistent-template-ref-name',
      'define-macros-newline',
      'define-macros-type-style',
      'define-model-name-casing',
      'max-lines-per-callback',
      'no-complex-v-for-source',
      'padding-line-between-tags',
      'prefer-composable-options',
      'prefer-define-model',
      'prefer-function-declaration',
      'prefer-function-result-pattern',
      'prefer-ref-pattern',
      'prefer-simple-event-handler',
      'prefer-template-literal-in-interpolation',
      'prefer-use-template-ref-inference',
      'prefer-watch-effect-alias',
      'require-component-props',
      'require-component-slots',
      'require-macro-type-name',
      'require-vue-generic',
      'sort-script-setup',
    ])
  })

  it.each([
    {
      description: 'only checks consistency when enabled alone',
      code: 'const input = useTemplateRef("input")',
      pattern: false,
      messageIds: [],
    },
    {
      description: 'keeps the pattern rule independent',
      code: 'const inputRef = useTemplateRef("fieldRef")',
      pattern: true,
      messageIds: ['inconsistentTemplateRefName'],
    },
    {
      description: 'reports both conventions when both fail',
      code: 'const inputRef = useTemplateRef("field")',
      pattern: true,
      messageIds: ['inconsistentTemplateRefName', 'unexpectedRefPattern'],
    },
  ])('$description', ({ code, pattern, messageIds }) => {
    const linter = new Linter()
    const configuration: Linter.Config = {
      files: ['**/*.vue'],
      languageOptions: vueLanguageOptions,
      plugins: { 'vue-perfectionist': plugin },
      rules: {
        'vue-perfectionist/consistent-template-ref-name': 'error',
        'vue-perfectionist/prefer-ref-pattern': pattern ? 'error' : 'off',
      },
    }
    const source = `<script setup>import { useTemplateRef } from 'vue'; ${code}</script>`
    const result = linter.verifyAndFix(source, configuration, 'Test.vue')
    expect(result.messages.map(message => message.messageId)).toEqual(
      messageIds,
    )
    expect(result.fixed).toBe(false)
    expect(result.output).toBe(source)
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue'),
    ).toEqual(result)
  })

  it.each<{
    name: string
    rule: Linter.RuleEntry
    settings: NonNullable<Linter.Config['settings']>
  }>([
    {
      name: 'explicit rule options',
      rule: ['error', { type: 'natural' }],
      settings: {},
    },
    {
      name: 'explicit rule options with ignored settings',
      rule: ['error', { type: 'natural' }],
      settings: {
        perfectionist: { order: 'desc' },
        'vue-perfectionist': { order: 'desc' },
      },
    },
  ])('applies $name with user-composed configuration', ({ rule, settings }) => {
    const linter = new Linter()
    const configuration: Linter.Config[] = [
      {
        files: ['**/*.vue'],
        languageOptions: vueLanguageOptions,
        settings,
      },
      {
        files: ['**/*.vue'],
        plugins: { 'vue-perfectionist': plugin },
        rules: {
          'vue-perfectionist/sort-script-setup': rule,
        },
      },
    ]
    const result = linter.verifyAndFix(
      '<script setup lang="ts">\nconst z = 1\nconst a = 2\n</script>',
      configuration,
      'Test.vue',
    )
    expect(result.output).toBe(
      '<script setup lang="ts">\nconst a = 2\nconst z = 1\n</script>',
    )
    expect(result.messages).toEqual([])
    expect(
      linter.verifyAndFix(result.output, configuration, 'Test.vue').fixed,
    ).toBe(false)
  })
})
