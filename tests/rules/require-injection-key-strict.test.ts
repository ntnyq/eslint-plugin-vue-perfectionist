import { fileURLToPath } from 'node:url'
import * as tsParser from '@typescript-eslint/parser'
import { createRuleTester } from 'eslint-vitest-rule-tester'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { requireInjectionKey } from '../../src/rules/require-injection-key.ts'
import { run } from '../helpers/rule-tester.ts'
import type {
  RequireInjectionKeyMessageId,
  RequireInjectionKeyOptions,
} from '../../src/types/index.ts'

const root = fileURLToPath(
  new URL('../fixtures/injection-key/', import.meta.url),
)
const parserOptions = {
  project: './tsconfig.json',
  tsconfigRootDir: root,
  extraFileExtensions: ['.vue'],
}
const imports =
  "import { inject, provide } from 'vue'; import type { InjectionKey } from 'vue'; "

/**
 * Exercise Vue 3.2/3.4's interface-based key without installing another Vue copy.
 * Only the canonical key declaration changes; normal module resolution remains.
 *
 * @param code - Source code for the parser's project file.
 * @param filename - Project filename, including platform-specific separators.
 * @returns A real compiler program using the earlier InjectionKey declaration.
 */
function createLegacyKeyProgram(code: string, filename: string): ts.Program {
  const normalizedFilename = filename.replaceAll('\\', '/')
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
  }
  const host = ts.createCompilerHost(options)
  const readFile = host.readFile
  host.readFile = path => {
    const normalizedPath = path.replaceAll('\\', '/')
    if (normalizedPath === normalizedFilename) {
      return code
    }
    const source = readFile(path)
    if (normalizedPath.endsWith('/@vue/runtime-core/dist/runtime-core.d.ts')) {
      const declaration =
        'type InjectionKey<T> = symbol & InjectionConstraint<T>;'
      if (!source?.includes(declaration)) {
        throw new Error(
          'The installed Vue key declaration changed; update the legacy fixture.',
        )
      }
      return source.replace(
        declaration,
        'interface InjectionKey<T> extends Symbol {}',
      )
    }
    return source
  }
  return ts.createProgram([normalizedFilename], options, host)
}

const legacyCode = `${imports}
const key: InjectionKey<string> = Symbol()
inject(key)
inject(Symbol())
const plainKey: Symbol = Symbol()
inject(plainKey)`

await run<RequireInjectionKeyOptions, RequireInjectionKeyMessageId>({
  name: 'require-injection-key',
  rule: requireInjectionKey,
  defaultFilenames: { js: `${root}case.ts` },
  languageOptions: { parserOptions },
  onResult(_, result) {
    expect(result.fixed).toBe(false)
    for (const message of result.messages) {
      expect(message.fix).toBeUndefined()
      expect(message.suggestions).toBeUndefined()
    }
  },
  valid: [
    ...[
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: symbol & Marker; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; function read<T extends symbol>(key: T & Marker) { inject(key) }',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; interface Derived extends Marker {} declare const key: symbol & Derived; inject(key)',
    ].map(code => ({
      description: 'preserves symbol refinements carrying the Vue marker',
      code: imports + code,
      options: { strict: true },
    })),
    {
      description:
        'resolves a whitelist literal through a generic indexed-access constraint',
      code: `${
        imports
      }function read<T extends { key: 'legacy' }>(key: T['key']) { inject(key) }`,
      options: { strict: true, allowStrings: ['legacy'] },
    },

    ...[
      "function read<T extends { key: InjectionKey<string> }>(key: T['key']) { inject(key) }",
      'function read<T extends Record<string, InjectionKey<string>>, K extends keyof T>(keys: T, key: K) { inject(keys[key]) }',
      'type Key<T> = T extends true ? InjectionKey<string> : InjectionKey<number>; function read<T>(key: Key<T>) { inject(key) }',
    ].map(code => ({
      description: 'accepts a deferred type constrained to Vue keys',
      code: imports + code,
      options: { strict: true },
    })),

    {
      description: 'supports project service with Vue SFCs',
      code: `<script setup lang="ts">${imports}const key: InjectionKey<string> = Symbol(); inject(key)</script>`,
      filename: `${root}case.vue`,
      languageOptions: {
        parserOptions: { project: false, projectService: true },
      },
      options: { strict: true },
    },
    {
      description:
        'supports JSDoc contracts in JavaScript parsed with TypeScript',
      code: `import { inject } from 'vue'
/** @type {import('vue').InjectionKey<string>} */
const key = Symbol()
inject(key)`,
      filename: `${root}script.js`,
      languageOptions: { parser: tsParser },
      options: { strict: true },
    },
    {
      description: 'supports key references shared between both SFC scripts',
      code: `<script lang="ts">${imports}const key: InjectionKey<string> = Symbol()</script><script setup lang="ts">inject(key)</script>`,
      filename: `${root}case.vue`,
      options: { strict: true },
    },

    ...[
      'const key: InjectionKey<string> = Symbol(); inject(key)',
      "const key: InjectionKey<string> = Symbol(); provide(key, 'value')",
      "import { stringKey } from './keys'; inject(stringKey)",
      "import { stringKey as key } from './keys'; provide(key, 'value')",
      "import * as keys from './keys'; inject(keys.stringKey)",
      "import type { ReexportedKey } from './keys'; declare const key: ReexportedKey<string>; inject(key)",
      "import type { ContextKey } from './keys'; declare const key: ContextKey<string>; inject(key)",
      "import type { InjectionKey as Key } from 'vue'; declare const key: Key<number>; inject(key)",
      "import type * as Vue from 'vue'; declare const key: Vue.InjectionKey<string>; inject(key)",
      'type LocalKey = InjectionKey<string>; declare const key: LocalKey; inject(key)',
      "declare const key: InjectionKey<string> & { tag: 'form' }; inject(key)",
      'declare const key: InjectionKey<string> | InjectionKey<number>; inject(key)',
      'function read<K extends InjectionKey<string>>(key: K) { inject(key) }',
      'function read<K extends InjectionKey<string> | undefined>(key: K) { if (key) inject(key) }',
      'function read<K extends InjectionKey<string>, T extends K>(key: T) { inject(key) }',
      'declare function getKey(): InjectionKey<string>; inject(getKey())',
      'declare const key: InjectionKey<string> | undefined; if (key) inject(key)',
      'declare const key: InjectionKey<string> | undefined; inject(key!)',
      'inject(Symbol() as InjectionKey<string>)',
      'const key: InjectionKey<any> = Symbol(); inject(key)',
      "import { inject as read } from 'vue'; declare const key: InjectionKey<string>; read(key)",
      "import * as Vue from 'vue'; declare const key: InjectionKey<string>; Vue.inject(key)",
      'function useLocal(inject: Function) { inject(Symbol()) }',
    ].map(code => ({
      code: imports + code,
      options: { strict: true },
    })),
    {
      code: `${imports}inject('legacy')`,
      options: { strict: true, allowStrings: ['legacy'] },
    },
    {
      code: `${imports}import { legacyKey } from './keys'; inject(legacyKey)`,
      options: { strict: true, allowStrings: ['legacy'] },
    },
    {
      code: `${
        imports
      }declare const key: 'legacy' | InjectionKey<string>; inject(key)`,
      options: { strict: true, allowStrings: ['legacy'] },
    },
    {
      code: "import type { InjectionKey } from 'vue'; declare const key: InjectionKey<string>; inject(key)",
      options: { strict: true, vueGlobals: ['inject'] },
    },
    {
      code: "import { inject, stringKey } from './keys'; inject(stringKey)",
      options: { strict: true, vueImportSources: ['./keys'] },
    },
    { code: `${imports}inject(Symbol())`, options: { strict: false } },
    { code: `${imports}inject(Symbol())` },
    {
      code: `<script setup lang="ts">${imports}const key: InjectionKey<string> = Symbol(); inject(key)</script>`,
      filename: `${root}case.vue`,
      options: { strict: true },
    },
  ],
  invalid: [
    ...[
      `${root}case.ts`.replaceAll('\\', '/'),
      `${root}case.ts`.replaceAll('/', '\\'),
    ].map(filename => ({
      description:
        'preserves legacy Vue key interfaces while rejecting untyped symbols',
      code: legacyCode,
      languageOptions: {
        parserOptions: {
          project: false,
          programs: [createLegacyKeyProgram(legacyCode, filename)],
        },
      },
      options: { strict: true },
      errors: [
        { messageId: 'expectedInjectionKey' as const, line: 4 },
        { messageId: 'expectedInjectionKey' as const, line: 6 },
      ],
      output: null,
    })),

    ...[
      "function read<T extends { key: InjectionKey<string> | undefined }>(key: T['key']) { inject(key) }",
      "function read<T extends { key: InjectionKey<string> | symbol }>(key: T['key']) { inject(key) }",
      "function read<T extends { key: any }>(key: T['key']) { inject(key) }",
      "function read<T extends { key: unknown }>(key: T['key']) { inject(key) }",
      'type Key<T> = T extends true ? InjectionKey<string> : symbol; function read<T>(key: Key<T>) { inject(key) }',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; function read<T extends Marker>(key: T) { inject(key) }',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: InjectionKey<string> | Marker; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: symbol | Marker; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: Symbol & Marker; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: any & Marker; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: never & Marker; inject(key)',
    ].map(code => ({
      description: 'does not accept partial or unsafe deferred constraints',
      code: imports + code,
      options: { strict: true },
      errors: ['expectedInjectionKey' as const],
      output: null,
    })),
    {
      description:
        'a partially whitelisted indexed-access union is still rejected',
      code: `${
        imports
      }function read<T extends { key: 'legacy' | 'other' }>(key: T['key']) { inject(key) }`,
      options: { strict: true, allowStrings: ['legacy'] },
      errors: ['expectedInjectionKey'],
      output: null,
    },

    ...[
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; const key: Marker = {}; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; interface Fake extends Marker {} declare const key: Fake; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: number & Marker; inject(key)',
      'type Marker = InjectionKey<string> extends symbol & infer Brand ? Brand : never; declare const key: string & Marker; inject(key)',
    ].map(code => ({
      description: 'rejects an extracted Vue marker without a symbol key',
      code: imports + code,
      options: { strict: true },
      errors: ['expectedInjectionKey' as const],
      output: null,
    })),

    ...[
      "inject('form')",
      "inject('form' as unknown as InjectionKey<string>)",
    ].map(code => ({
      code: imports + code,
      options: { strict: true },
      errors: ['unexpectedStringKey' as const],
      output: null,
    })),

    {
      description: 'does not trust a same-named type from another module',
      code: "import { inject } from 'vue'; import type { InjectionKey } from './fake-keys'; declare const key: InjectionKey<string>; inject(key)",
      options: { strict: true },
      errors: ['expectedInjectionKey'],
      output: null,
    },
    {
      description:
        'checks imported calls through a configured re-export module',
      code: "import { inject, plainKey } from './keys'; inject(plainKey)",
      options: { strict: true, vueImportSources: ['./keys'] },
      errors: ['expectedInjectionKey'],
      output: null,
    },
    {
      description: 'checks auto-imported calls using the key type',
      code: "import { plainKey } from './keys'; inject(plainKey)",
      settings: { 'vue-perfectionist': { autoImport: true } },
      options: { strict: true },
      errors: ['expectedInjectionKey'],
      output: null,
    },

    ...[
      'inject(Symbol())',
      'const key = Symbol(); inject(key)',
      'declare const key: symbol; inject(key)',
      'declare const key: unique symbol; inject(key)',
      "import { plainKey } from './keys'; inject(plainKey)",
      'declare const key: any; inject(key)',
      'declare const key: unknown; inject(key)',
      'declare const key: never; inject(key)',
      'declare const key: string; inject(key)',
      'inject(123)',
      'inject(null)',
      'inject(undefined)',
      'declare const key: InjectionKey<string> | string; inject(key)',
      'declare const key: InjectionKey<string> | symbol; inject(key)',
      'declare const key: InjectionKey<string> | undefined; inject(key)',
      'function read<K>(key: K) { inject(key) }',
      'function read<K extends symbol>(key: K) { inject(key) }',
      'const key = Symbol() satisfies InjectionKey<string>; inject(key)',
      'declare const key: InjectionKey<string>; inject(key as symbol)',
      'declare const key: InjectionKey<string>; inject(key as any)',
      'declare const key: InjectionKey<string>; inject(key as unknown)',
      'declare const key: InjectionKey<string>; inject(key as never)',
      'declare const key: { readonly __key: string }; inject(key)',
      'type FakeKey<T> = symbol & { readonly __key?: T }; declare const key: FakeKey<string>; inject(key)',
    ].map(code => ({
      code: imports + code,
      options: { strict: true },
      errors: ['expectedInjectionKey' as const],
      output: null,
    })),
    {
      code: "import { inject } from 'vue'; type InjectionKey<T> = symbol & { value?: T }; declare const key: InjectionKey<string>; inject(key)",
      options: { strict: true },
      errors: ['expectedInjectionKey'],
      output: null,
    },
    {
      code: `${imports}declare const key: 'legacy' | 'other'; inject(key)`,
      options: { strict: true, allowStrings: ['legacy'] },
      errors: ['expectedInjectionKey'],
      output: null,
    },
    {
      code: `${imports}inject(Symbol())`,
      options: { strict: true },
      errors: [
        {
          messageId: 'expectedInjectionKey',
          data: { name: 'inject', type: 'symbol' },
        },
      ],
      output: null,
    },
    {
      code: `<script setup lang="ts">${imports}inject(Symbol())</script>`,
      filename: `${root}case.vue`,
      options: { strict: true },
      errors: ['expectedInjectionKey'],
      output: null,
    },
  ],
})

const tester = createRuleTester<unknown>({
  name: 'require-injection-key',
  rule: requireInjectionKey,
  languageOptions: { parser: tsParser },
})
it('requires complete parser services when strict mode is enabled', async () => {
  await expect(
    tester.valid({ code: '', options: { strict: true } }),
  ).rejects.toThrow('requires type information')
})
it.each([{ strict: 'true' }, { strict: null }, { strict: 1 }])(
  'rejects invalid strict options: %j',
  async options => {
    await expect(tester.valid({ code: '', options })).rejects.toThrow()
  },
)
