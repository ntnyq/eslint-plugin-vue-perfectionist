import { runInNewContext } from 'node:vm'
import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import { expect, it } from 'vitest'
import * as Vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import { preferWatchEffectAlias } from '../../src/rules/prefer-watch-effect-alias.ts'
import { run } from '../helpers/rule-tester.ts'
import type {
  PreferWatchEffectAliasMessageId,
  PreferWatchEffectAliasOptions,
} from '../../src/types/index.ts'

const sfc = (script: string) => `<script setup lang="ts">${script}</script>`
const withVue = (code: string) => `import { watchEffect } from 'vue'; ${code}`
const post = "watchEffect(update, { flush: 'post' })"
const autoSettings = { 'vue-perfectionist': { autoImport: true } }

function diagnostic(flush: 'post' | 'sync' = 'post') {
  return {
    messageId: 'preferredAlias' as const,
    data: {
      flush,
      alias: flush === 'post' ? 'watchPostEffect' : 'watchSyncEffect',
    },
  }
}

await run<PreferWatchEffectAliasOptions, PreferWatchEffectAliasMessageId>({
  name: 'prefer-watch-effect-alias',
  rule: preferWatchEffectAlias,
  defaultFilenames: { js: 'test.ts' },
  onResult(testcase, result) {
    if (testcase.output === null) {
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(testcase.code)
    }
    for (const message of result.messages) {
      if (testcase.output === null) {
        expect(message.fix).toBeUndefined()
      }
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      'watchEffect(update)',
      'watchEffect(update, {})',
      "watchEffect(update, { flush: 'pre' })",
      'watchEffect(update, { flush: timing })',
      'watchEffect(update, { flush })',
      'watchEffect(update, options)',
      "const options = { flush: 'post' }; watchEffect(update, options)",
      'watchEffect(update, getOptions())',
      "watchEffect(update, { flush: 'post', ...options })",
      "watchEffect(update, { ...options, flush: 'post' })",
      "watchEffect(update, { flush: 'post', [key]: value })",
      "watchEffect(update, { [key]: value, flush: 'post' })",
      "watchEffect(update, { get flush() { return 'post' } })",
      "watchEffect(update, { flush() { return 'post' } })",
      "watchEffect(update, { flush: 'post', flush: 'pre' })",
      "watchEffect(update, { flush: 'post', flush: timing })",
      "watchEffect(update, { flush: 'post', get flush() { return 'post' } })",
      // eslint-disable-next-line no-template-curly-in-string
      'watchEffect(update, { flush: `po${suffix}` })',
      "watchEffect(update, { flush: 'po' + 'st' })",
      "watchEffect(update, { flush: 'POST' })",
      'watchEffect(update, null)',
      'watchEffect(update, ...options)',
      "watchEffect(...effects, { flush: 'post' })",
      "watchEffect(update, { flush: 'post' }, extra)",
      "watchEffect?.(update, { flush: 'post' })",
      "const { watchEffect: effect } = Vue; effect(update, { flush: 'post' })",
      "function run(watchEffect: Function) { watchEffect(update, { flush: 'post' }) }",
      "{ const watchEffect = custom; watchEffect(update, { flush: 'post' }) }",
    ].map(code => ({
      code: withVue(code),
    })),
    ...[
      post,
      `const watchEffect = custom; ${post}`,
      `function watchEffect() {}; ${post}`,
      `import { watchEffect } from 'other'; ${post}`,
      `import watchEffect from 'vue'; ${post}`,
      `import type { watchEffect } from 'vue'; ${post}`,
      `import { type watchEffect } from 'vue'; ${post}`,
      "import * as Vue from 'other'; Vue.watchEffect(update, { flush: 'post' })",
      "import Vue from 'vue'; Vue.watchEffect(update, { flush: 'post' })",
      "import * as Vue from 'vue'; Vue['watchEffect'](update, { flush: 'post' })",
      "import * as Vue from 'vue'; Vue?.watchEffect(update, { flush: 'post' })",
      "import * as Vue from 'vue'; Vue.watchEffect?.(update, { flush: 'post' })",
      "import * as Vue from 'vue'; function run(Vue: object) { Vue.watchEffect(update, { flush: 'post' }) }",
      "import { watch, watchPostEffect, watchSyncEffect } from 'vue'; watch(source, update, { flush: 'post' }); watchPostEffect(update); watchSyncEffect(update)",
    ].map(code => ({
      code,
    })),
    {
      description: 'explicit globals disable shared auto-import recognition',
      code: post,
      settings: autoSettings,
      options: { vueGlobals: [] },
    },
    {
      description: 'globals do not override local bindings',
      code: `const watchEffect = custom; ${post}`,
      settings: autoSettings,
      options: { vueGlobals: ['watchEffect'] },
    },
    {
      code: withVue(post),
      options: { vueImportSources: [] },
    },
    {
      code: withVue(post),
      options: { vueImportSources: ['#imports'] },
    },
    {
      description: 'type-only imports do not become auto-imported APIs',
      code: `import type { watchEffect } from 'vue'; ${post}`,
      settings: autoSettings,
    },
    {
      description: 'setup locals shadow ordinary script imports',
      filename: 'Test.vue',
      code: `<script lang="ts">import { watchEffect } from 'vue'</script>${sfc(`const watchEffect = custom; ${post}`)}`,
    },
    {
      description: 'template expressions are outside the rule scope',
      code: `${sfc("import { watchEffect } from 'vue'")}<template>{{ watchEffect(update, { flush: 'post' }) }}</template>`,
      filename: 'Test.vue',
    },
  ],
  invalid: [
    ...[
      "(watchEffect as (effect: () => void, options: { flush: 'post' }) => void)(() => {}, { flush: 'post' })",
      "(watchEffect satisfies typeof watchEffect)(() => {}, { flush: 'post' })",
      "(<typeof watchEffect>watchEffect)(() => {}, { flush: 'post' })",
    ].map(code => ({
      description: 'does not invalidate an explicit callee type contract',
      code: withVue(code),
      errors: [diagnostic()],
      output: null,
    })),
    {
      description: 'does not access a property excluded by a receiver type',
      code: "import * as Vue from 'vue'; (Vue as Pick<typeof Vue, 'watchEffect'>).watchEffect(() => {}, { flush: 'post' })",
      errors: [diagnostic()],
      output: null,
    },
    ...[
      'watch\\u0050ostEffect',
      'watch\\u{50}ostEffect',
      'watch\\u{00000050}ostEffect',
    ].map(name => ({
      description: 'preserves escaped CSS variable bindings in compiled SFCs',
      code: `${sfc(withVue(post))}<style>div { color: v-bind('${name}') }</style>`,
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: null,
      after({ output }: { output: string }) {
        const { descriptor } = parse(output)
        const compiled = compileScript(descriptor, { id: 'review' })
        expect(compiled.content).toContain('(_ctx.watchPostEffect)')
      },
    })),
    ...[
      'watchEffect = custom;',
      'watchPostEffect = custom;',
      '({ effect: watchPostEffect } = source);',
      "eval('watchEffect = custom');",
      "eval('watchPostEffect = custom');",
    ].map(prefix => ({
      description: 'does not fix reassigned auto-imported globals',
      code: `${prefix} ${post}`,
      options: { vueGlobals: ['watchEffect', 'watchPostEffect'] },
      errors: [diagnostic()],
      output: null,
    })),
    {
      description: 'also detects writes to ESLint-configured globals',
      code: `watchPostEffect = custom; ${post}`,
      languageOptions: {
        globals: { watchEffect: 'readonly', watchPostEffect: 'writable' },
      },
      options: { vueGlobals: ['watchEffect', 'watchPostEffect'] },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'a reassigned source global cannot reuse an alias import',
      code: `import { watchPostEffect } from 'vue'; watchEffect = custom; ${post}`,
      options: { vueGlobals: ['watchEffect'] },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'writes to local shadows do not invalidate target globals',
      code: `function assign(watchPostEffect: Function) { watchPostEffect = custom }; ${post}`,
      options: { vueGlobals: ['watchEffect', 'watchPostEffect'] },
      errors: [diagnostic()],
      output:
        'function assign(watchPostEffect: Function) { watchPostEffect = custom }; watchPostEffect(update)',
    },
    ...['watchEffect', 'watchPostEffect'].map(name => ({
      description: 'setup bindings cannot hide ordinary-script global writes',
      code: `<script lang="ts">${name} = custom; ${post}</script>${sfc(`const ${name} = custom`)}`,
      filename: 'Test.vue',
      options: { vueGlobals: ['watchEffect', 'watchPostEffect'] },
      errors: [diagnostic()],
      output: null,
    })),
    {
      description:
        'setup-local writes do not invalidate ordinary-script globals',
      code: `<script lang="ts">${post}</script>${sfc('let watchPostEffect; watchPostEffect = custom')}`,
      filename: 'Test.vue',
      options: { vueGlobals: ['watchEffect', 'watchPostEffect'] },
      errors: [diagnostic()],
      output: `<script lang="ts">watchPostEffect(update)</script>${sfc('let watchPostEffect; watchPostEffect = custom')}`,
    },
    {
      description: 'does not capture names that can be read by direct eval',
      code: withVue(`${post}; eval('typeof watchPostEffect')`),
      errors: [diagnostic()],
      output: null,
      after({ output }) {
        expect(
          runInNewContext(
            output.replace(
              "import { watchEffect } from 'vue'",
              'const { watchEffect } = Vue',
            ),
            {
              Vue: { watchEffect() {} },
              update() {},
            },
          ),
        ).toBe('undefined')
      },
    },
    {
      description:
        'cannot assume a custom source exports the target namespace member',
      code: "import * as Vue from './effects'; Vue.watchEffect(update, { flush: 'post' })",
      options: { vueImportSources: ['./effects'] },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'a runtime target import establishes a custom source export',
      code: "import * as Vue from './effects'; import { watchPostEffect as post } from './effects'; Vue.watchEffect(update, { flush: 'post' })",
      options: { vueImportSources: ['./effects'] },
      errors: [diagnostic()],
      output:
        "import * as Vue from './effects'; import { watchPostEffect as post } from './effects'; Vue.watchPostEffect(update)",
    },
    ...[
      "import { type watchPostEffect } from './effects';",
      "import type { watchPostEffect } from './effects';",
      "import { watchPostEffect } from 'vue';",
    ].map(prefix => ({
      description: 'requires runtime export evidence from the same source',
      code: `import * as Vue from './effects'; ${prefix} Vue.watchEffect(update, { flush: 'post' })`,
      options: { vueImportSources: ['./effects', 'vue'] },
      errors: [diagnostic()],
      output: null,
    })),
    {
      description: 'does not change explicit call type arguments',
      code: "import { watchEffect, watchPostEffect } from './effects'; watchEffect<Options>(update, { flush: 'post' })",
      options: { vueImportSources: ['./effects'] },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'reuses an explicitly imported alias from a custom source',
      code: "import { watchEffect, watchPostEffect as post } from './effects'; watchEffect(update, { flush: 'post' })",
      options: { vueImportSources: ['./effects'] },
      errors: [diagnostic()],
      output:
        "import { watchEffect, watchPostEffect as post } from './effects'; post(update)",
    },
    ...[
      '<template>{{ watchPostEffect }}</template>',
      '<template>{{ watch\\u0050ostEffect }}</template>',
      '<template><div :[watch\\u0050ostEffect]="value" /></template>',
      '<template><WatchPostEffect /></template>',
      '<template><watch-post-effect /></template>',
      '<style>div { color: v-bind(watchPostEffect) }</style>',
    ].map(template => ({
      description:
        'does not capture template or style bindings with a new import',
      code: sfc(withVue(post)) + template,
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: null,
    })),
    {
      description: 'can add an import alongside unrelated template content',
      code: `${sfc(withVue(post))}<template>{{ message }}</template>`,
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: `${sfc("import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update)")}<template>{{ message }}</template>`,
    },
    {
      description:
        'reuses hoisted imports from the setup script in the ordinary script',
      code: `<script lang="ts">${withVue(post)}</script>${sfc("import { watchPostEffect as post } from 'vue'")}`,
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: `<script lang="ts">import { watchEffect } from 'vue'; post(update)</script>${sfc("import { watchPostEffect as post } from 'vue'")}`,
    },
    {
      description: 'does not reuse an import shadowed by a setup binding',
      code: `<script lang="ts">import { watchEffect, watchPostEffect } from 'vue'</script>${sfc(`const watchPostEffect = custom; ${post}`)}`,
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: null,
    },
    ...(
      [
        [
          "import { watchEffect, watchPostEffect as post } from 'vue'; watchEffect(update, { flush: 'post' })",
          "import { watchEffect, watchPostEffect as post } from 'vue'; post(update)",
        ],
        [
          "import { watchEffect } from 'vue'; import { watchPostEffect as post } from 'vue'; watchEffect(update, { flush: 'post' })",
          "import { watchEffect } from 'vue'; import { watchPostEffect as post } from 'vue'; post(update)",
        ],
        [
          "import { watchEffect, type WatchEffectOptions, } from 'vue'; watchEffect(update, { flush: 'post' },)",
          "import { watchEffect, type WatchEffectOptions, watchPostEffect, } from 'vue'; watchPostEffect(update,)",
        ],
        [
          "import { watchEffect /* keep import */ } from 'vue'; watchEffect(update, { flush: 'post' })",
          "import { watchEffect, watchPostEffect /* keep import */ } from 'vue'; watchPostEffect(update)",
        ],
        [
          "import { watchEffect, watchPostEffect as post } from 'vue'; function useLayout(post: Function) { watchEffect(update, { flush: 'post' }) }",
          "import { watchEffect, watchPostEffect as post, watchPostEffect } from 'vue'; function useLayout(post: Function) { watchPostEffect(update) }",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, { onTrack: createDebug(), flush: 'post', onTrigger: debug })",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, { onTrack: createDebug(),  onTrigger: debug })",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, { onTrack: debug, flush: 'post' })",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, { onTrack: debug  })",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, { onTrack: debug, flush: 'post', })",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, { onTrack: debug,  })",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, /* options */ { flush: 'post' })",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, /* options */ {  })",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, { /* timing */ flush: 'post', /* keep */ })",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, { /* timing */  /* keep */ })",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, { onTrack: debug, /* timing */ flush: 'post' /* keep */ })",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, { onTrack: debug /* timing */  /* keep */ })",
        ],
        [
          "import * as Vue from 'vue';\r\nVue.watchEffect(update, {\r\n  flush: 'post', // timing\r\n  onTrack: debug,\r\n})",
          "import * as Vue from 'vue';\r\nVue.watchPostEffect(update, {\r\n   // timing\r\n  onTrack: debug,\r\n})",
        ],
        [
          "import * as Vue from 'vue'; (Vue.watchEffect as Function)(update, { flush: 'post' })",
          null,
        ],
        [
          "import * as Vue from 'vue'; Vue!.watchEffect!(update, { flush: 'post' })",
          "import * as Vue from 'vue'; Vue!.watchPostEffect!(update)",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, ({ flush: 'post' }))",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, ({  }))",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, (({ flush: 'post', onTrack: debug })))",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, (({  onTrack: debug })))",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, (/* options */ { flush: 'post', /* keep */ }),)",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update, (/* options */ {  /* keep */ }),)",
        ],
        [
          "import { watchEffect, watchPostEffect } from 'vue'; watchEffect(update, { flush: 'post' }); eval('watchPostEffect')",
          "import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update); eval('watchPostEffect')",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, { flush: 'post' }); eval('typeof watchPostEffect')",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update); eval('typeof watchPostEffect')",
        ],
      ] satisfies [string, string | null][]
    ).map(([code, output]) => ({
      code,
      errors: [diagnostic()],
      output,
    })),
    ...[
      'const watchPostEffect = custom;',
      "import { watchPostEffect } from 'other';",
      "import type { watchPostEffect } from 'vue';",
      'type watchPostEffect = Function;',
      'watchPostEffect(other);',
      'function run(watchPostEffect: Function) {}',
      'const watch\\u0050ostEffect = custom;',
    ].map(prefix => ({
      description: 'does not introduce a binding that captures another name',
      code: withVue(`${prefix} ${post}`),
      errors: [diagnostic()],
      output: null,
    })),
    ...[
      "{ flush: sideEffect(), flush: 'post' }",
      "{ get flush() { return sideEffect() }, flush: 'post' }",
      "{ flush: /* preserve inside property */ 'post' }",
      "{ flush: 'post', get onTrack() { return debug } }",
      "{ flush: 'post', onTrack() {} }",
      "{ flush: 'post', __proto__: options }",
      "{ flush: 'post', once: true }",
      "{ flush: 'post', deep: true }",
      "({ flush: 'post' } as Options)",
    ].map(options => ({
      description:
        'reports options whose safe removal or alias semantics are uncertain',
      code: `import * as Vue from 'vue'; Vue.watchEffect(update, ${options})`,
      errors: [diagnostic()],
      output: null,
    })),
    {
      description:
        'an explicit target global authorizes replacing an auto-import',
      code: post,
      options: { vueGlobals: ['watchEffect', 'watchPostEffect'] },
      errors: [diagnostic()],
      output: 'watchPostEffect(update)',
    },
    {
      description: 'a shadowed target global remains report-only',
      code: `function run(watchPostEffect: Function) { ${post} }`,
      options: { vueGlobals: ['watchEffect', 'watchPostEffect'] },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'auto-imported calls can reuse a visible Vue alias import',
      code: `import { watchPostEffect as post } from 'vue'; ${post}`,
      settings: autoSettings,
      errors: [diagnostic()],
      output: "import { watchPostEffect as post } from 'vue'; post(update)",
    },
    {
      description:
        'recursive fixes share imports across multiple calls and modes',
      code: withVue(`${post}; watchEffect(other, { flush: 'sync' }); ${post}`),
      errors: [diagnostic(), diagnostic('sync'), diagnostic()],
      output:
        "import { watchEffect, watchPostEffect, watchSyncEffect } from 'vue'; watchPostEffect(update); watchSyncEffect(other); watchPostEffect(update)",
    },
    ...(['post', 'sync'] as const).map(flush => ({
      description:
        'preserves actual Vue scheduling, cleanup, debug hooks, and option evaluation',
      code: `import * as Vue from 'vue';\nconst stop = Vue.watchEffect(onCleanup => { log.push(state.value); onCleanup(() => log.push('cleanup')) }, { onTrack: createDebug(), flush: '${flush}', onTrigger: createDebug() }); stop`,
      errors: [diagnostic(flush)],
      async output(output: string, input: string) {
        async function evaluate(code: string) {
          const log: unknown[] = []
          const state = Vue.ref(0)
          const stop: Vue.WatchHandle = runInNewContext(
            code.slice(code.indexOf('\n') + 1),
            {
              Vue,
              state,
              log,
              createDebug() {
                log.push('createDebug')
                return () => log.push('debug')
              },
            },
          )
          state.value = 1
          log.push('beforeTick')
          await Vue.nextTick()
          state.value = 2
          await Vue.nextTick()
          stop()
          state.value = 3
          await Vue.nextTick()
          return log
        }
        expect(await evaluate(output)).toEqual(await evaluate(input))
      },
    })),
    ...(['post', 'sync'] as const).flatMap(flush => {
      const alias = flush === 'post' ? 'watchPostEffect' : 'watchSyncEffect'
      const cases: [string, string][] = [
        [`watchEffect(update, { flush: '${flush}' })`, `${alias}(update)`],
        [
          `watchEffect(() => { update() }, { 'flush': '${flush}', onTrack: debug })`,
          `${alias}(() => { update() }, {  onTrack: debug })`,
        ],
        [
          `watchEffect(function () {}, { [\`flush\`]: \`${flush}\` })`,
          `${alias}(function () {})`,
        ],
        [
          `watchEffect(update, { ['flush']: '${flush}' as const })`,
          `${alias}(update)`,
        ],
        [`watchEffect!(update, { flush: '${flush}' })`, `${alias}!(update)`],
      ]
      return cases.map(([code, output]) => ({
        code: withVue(code),
        errors: [diagnostic(flush)],
        output: `import { watchEffect, ${alias} } from 'vue'; ${output}`,
      }))
    }),
    ...(['post', 'sync'] as const).flatMap(flush => [
      {
        description:
          'reports type-wrapped options without changing their constraints',
        code: withVue(
          `(watchEffect as Function)(update, ({ flush: '${flush}' } satisfies Options))`,
        ),
        errors: [diagnostic(flush)],
        output: null,
      },
      {
        description:
          'reports duplicate flush keys without deleting evaluations',
        code: withVue(
          `watchEffect(update, { flush: 'pre', flush: '${flush}' })`,
        ),
        errors: [diagnostic(flush)],
        output: null,
      },
    ]),
    ...(
      [
        [
          "import { watchEffect as effect } from 'vue'; effect(update, { flush: 'post' })",
          "import { watchEffect as effect, watchPostEffect } from 'vue'; watchPostEffect(update)",
        ],
        [
          "import { 'watchEffect' as effect } from 'vue'; effect(update, { flush: 'post' })",
          "import { 'watchEffect' as effect, watchPostEffect } from 'vue'; watchPostEffect(update)",
        ],
        [
          "import * as Vue from 'vue'; Vue.watchEffect(update, { flush: 'post' })",
          "import * as Vue from 'vue'; Vue.watchPostEffect(update)",
        ],
        [
          "import * as Vue from 'vue'; (Vue as object).watchEffect(update, { flush: 'post' })",
          null,
        ],
        [
          `${withVue('')} function useLayout() { ${post} }`,
          "import { watchEffect, watchPostEffect } from 'vue';  function useLayout() { watchPostEffect(update) }",
        ],
        [
          "import { watchEffect } from 'vue'; watchEffect(update, { fl\\u0075sh: 'po\\u0073t' })",
          "import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update)",
        ],
      ] satisfies [string, string | null][]
    ).map(([code, output]) => ({
      code,
      errors: [diagnostic()],
      output,
    })),
    {
      description: 'reports the callee with the intended alias',
      code: `import { watchEffect } from 'vue'\n${post}`,
      filename: 'test.js',
      errors: [
        {
          ...diagnostic(),
          line: 2,
          column: 1,
          endLine: 2,
          endColumn: 12,
        },
      ],
      output: `import { watchEffect, watchPostEffect } from 'vue'\nwatchPostEffect(update)`,
    },
    ...['<script>', '<script setup>'].map(tag => ({
      description: 'supports JavaScript SFC scripts with the JS parser',
      code: `${tag}${withVue(post)}</script>`,
      filename: 'Test.vue',
      languageOptions: { parserOptions: { parser: null } },
      errors: [diagnostic()],
      output: `${tag}import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update)</script>`,
    })),
    {
      code: sfc(withVue(post)),
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: sfc(
        "import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update)",
      ),
    },
    {
      description: 'ordinary scripts cannot see setup-local shadows',
      code: `<script lang="ts">${withVue(post)}</script>${sfc('const watchEffect = custom')}`,
      filename: 'Test.vue',
      errors: [diagnostic()],
      output: `<script lang="ts">import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update)</script>${sfc('const watchEffect = custom')}`,
    },
    {
      description: 'both scripts can use a hoisted Vue import',
      code: `<script lang="ts">${withVue(post)}</script>${sfc(post)}`,
      filename: 'Test.vue',
      errors: [diagnostic(), diagnostic()],
      output: `<script lang="ts">import { watchEffect, watchPostEffect } from 'vue'; watchPostEffect(update)</script>${sfc('watchPostEffect(update)')}`,
    },
    {
      description: 'keeps comments, debug options, and CRLF untouched',
      code: `import { watchEffect } from 'vue'\r\nwatchEffect(/* effect */ update, {\r\n  onTrack: createDebugger(),\r\n  flush: /* timing */ 'post',\r\n})`,
      errors: [diagnostic()],
      output: null,
    },
    {
      code: post,
      settings: autoSettings,
      languageOptions: { globals: { watchEffect: 'readonly' } },
      errors: [diagnostic()],
      output: null,
    },
    {
      description: 'rule-level globals override disabled shared auto-imports',
      code: post,
      settings: { 'vue-perfectionist': { autoImport: false } },
      options: { vueGlobals: ['watchEffect'] },
      errors: [diagnostic()],
      output: null,
    },
    {
      code: `import { watchEffect as effect } from '#imports'; effect(update, { flush: 'sync' })`,
      options: { vueImportSources: ['#imports'] },
      errors: [diagnostic('sync')],
      output: null,
    },
    {
      code: `import * as Vue from '@vue/runtime-core'; Vue.watchEffect(update, { flush: 'post' })`,
      options: { vueImportSources: ['@vue/runtime-core'], vueGlobals: [] },
      errors: [diagnostic()],
      output:
        "import * as Vue from '@vue/runtime-core'; Vue.watchPostEffect(update)",
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'prefer-watch-effect-alias',
  rule: preferWatchEffectAlias,
  languageOptions: { parser: tsParser },
})

it.each([
  { unknown: true },
  { vueGlobals: true },
  { vueGlobals: ['watchEffect', 'watchEffect'] },
  { vueGlobals: [1] },
  { vueImportSources: 'vue' },
  { vueImportSources: ['vue', 'vue'] },
  { vueImportSources: [null] },
])('rejects invalid options: %j', async options => {
  await expect(tester.valid({ code: '', options })).rejects.toThrow()
})

it('rejects invalid shared auto-import settings', async () => {
  await expect(
    tester.valid({
      code: post,
      settings: { 'vue-perfectionist': { autoImport: 'yes' } },
    }),
  ).rejects.toThrow('autoImport must be a boolean')
})
