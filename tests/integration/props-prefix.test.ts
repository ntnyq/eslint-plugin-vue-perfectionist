import { runInNewContext } from 'node:vm'
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript'
import { expect } from 'vitest'
import * as Vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import { renderToString } from 'vue/server-renderer'
import { requirePropsPrefix } from '../../src/rules/require-props-prefix.ts'
import { run } from '../helpers/rule-tester.ts'
import type { Linter } from 'eslint'
import type {
  RequirePropsPrefixMessageId,
  RequirePropsPrefixOptions,
} from '../../src/types/index.ts'

/**
 * Compile the complete SFC and render it to verify template fix semantics.
 */
async function renderSfc(source: string) {
  const compiled = compileScript(parse(source).descriptor, {
    id: 'props-prefix-regression',
    inlineTemplate: true,
  })
  const { outputText } = transpileModule(compiled.content, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ESNext,
    },
  })
  const exports: { default?: Vue.Component } = {}
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      if (name !== 'vue') {
        throw new Error(`Unexpected regression fixture import: ${name}`)
      }
      return Vue
    },
  })
  if (!exports.default) {
    throw new Error('Expected the compiled SFC to export a component.')
  }
  const warnings: string[] = []
  const app = Vue.createSSRApp(exports.default, {
    title: 'hello',
    items: ['a', 'b'],
  })
  app.config.warnHandler = message => warnings.push(message)
  return {
    html: await renderToString(app),
    warnings,
  }
}

await run<RequirePropsPrefixOptions, RequirePropsPrefixMessageId>({
  name: 'require-props-prefix compiler and runtime semantics',
  rule: requirePropsPrefix,
  valid: [],
  invalid: [
    ...[
      {
        template: '<div :title>{{ ({ title }).title }}</div>',
        fixed:
          '<div :title="props.title">{{ ({ title: props.title }).title }}</div>',
        count: 2,
      },
      {
        template: '<div :[title]="title">{{ title.toUpperCase() }}</div>',
        fixed:
          '<div :[props.title]="props.title">{{ props.title.toUpperCase() }}</div>',
        count: 3,
      },
      {
        template: '<div v-for="items in items" :key="items">{{ items }}</div>',
        fixed:
          '<div v-for="items in props.items" :key="items">{{ items }}</div>',
        count: 1,
      },
    ].map(({ template, fixed, count }) => {
      const script =
        '<script setup lang="ts">const props = withDefaults(defineProps<{ title: string; items: string[] }>(), { title: "default" })</script>'
      const code = `${script}<template>${template}</template>`
      return {
        description: `preserves rendered output: ${template}`,
        code,
        options: { autofix: true },
        errors: Array.from(
          { length: count },
          () => 'requirePropsPrefix' as const,
        ),
        output: `${script}<template>${fixed}</template>`,
        async after(result: Linter.FixReport) {
          const original = await renderSfc(code)
          expect(original.warnings).toEqual([])
          expect(await renderSfc(result.output)).toEqual(original)
          expect(result.fixed).toBe(true)
        },
      }
    }),
  ],
})

interface EventFixture {
  setup(
    props: Record<string, unknown>,
    context: { expose: (bindings: { values: unknown[] }) => void },
  ): (context: object, cache: unknown[]) => Vue.VNode
}

/**
 * Execute a compiled template event so lexical capture regressions are visible.
 */
function getEventValues(source: string): unknown[] {
  const compiled = compileScript(parse(source).descriptor, {
    id: 'props-prefix-event-regression',
    inlineTemplate: true,
  })
  const { outputText } = transpileModule(compiled.content, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ESNext,
    },
  })
  const exports: { default?: EventFixture } = {}
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      if (name !== 'vue') {
        throw new Error(`Unexpected regression fixture import: ${name}`)
      }
      return Vue
    },
  })
  if (!exports.default) {
    throw new Error('Expected the compiled SFC to export a component.')
  }
  let values: unknown[] = []
  const render = exports.default.setup(
    { title: 'hello' },
    {
      expose(bindings) {
        values = bindings.values
      },
    },
  )
  const handler: unknown = Reflect.get(render({}, []).props ?? {}, 'onClick')
  if (typeof handler !== 'function') {
    throw new TypeError('Expected a click handler in the compiled template.')
  }
  handler()
  return values
}

await run<RequirePropsPrefixOptions, RequirePropsPrefixMessageId>({
  name: 'require-props-prefix event semantics',
  rule: requirePropsPrefix,
  valid: [],
  invalid: [
    ...['enum props { title = 1 }', 'const enum props { title = 1 }'].map(
      declaration => {
        const code = `<script setup lang="ts">const props = defineProps(['title']); const values: unknown[] = []; function use(value: unknown) { values.push(value) }; defineExpose({ values })</script><template><button @click="${declaration}; use(title)" /></template>`
        return {
          description: `preserves prop reads beside a runtime declaration: ${declaration}`,
          code,
          options: { autofix: true },
          errors: ['requirePropsPrefix' as const],
          output: null,
          after(result: Linter.FixReport) {
            expect(result.fixed).toBe(false)
            expect(result.messages[0]?.fix).toBeUndefined()
            expect(getEventValues(code)).toEqual(['hello'])
            expect(getEventValues(result.output)).toEqual(['hello'])
          },
        }
      },
    ),
  ],
})
