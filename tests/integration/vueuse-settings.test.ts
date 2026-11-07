import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../../src/index.ts'
import { vueLanguageOptions } from '../helpers/rule-tester.ts'

const policies = [
  { shared: undefined, override: undefined, enabled: false },
  { shared: false, override: undefined, enabled: false },
  { shared: true, override: undefined, enabled: true },
  { shared: undefined, override: false, enabled: false },
  { shared: false, override: false, enabled: false },
  { shared: true, override: false, enabled: false },
  { shared: undefined, override: true, enabled: true },
  { shared: false, override: true, enabled: true },
  { shared: true, override: true, enabled: true },
]
const ruleNames = [
  'callback-style',
  'max-lines-per-callback',
  'prefer-function-result-pattern',
  'prefer-define-model',
]

function createSource(imported: boolean): string {
  return `<script setup lang="ts">
${imported ? "import { tryOnMounted, watchDebounced, useToggle, useVModel } from '@vueuse/core'" : ''}
const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
const model = useVModel(props, 'modelValue', emit, { passive: true })
tryOnMounted(handler)
watchDebounced(source, () => {
  first()
  second()
})
const [open] = useToggle()
</script>`
}

function createConfig(
  shared: boolean | undefined,
  autoImport: boolean,
  overrides: Partial<Record<string, boolean>> = {},
): Linter.Config {
  return {
    files: ['**/*.vue'],
    languageOptions: vueLanguageOptions,
    plugins: { vp: plugin },
    settings: { 'vue-perfectionist': { vueuse: shared, autoImport } },
    rules: Object.fromEntries(
      ruleNames.map(name => [
        `vp/${name}`,
        [
          'error',
          {
            ...(name === 'max-lines-per-callback' ? { max: 3 } : {}),
            ...(overrides[name] === undefined
              ? {}
              : { vueuse: overrides[name] }),
          },
        ],
      ]),
    ),
  }
}

function expectedRules(enabled: boolean): string[] {
  return enabled
    ? [
        'vp/callback-style',
        'vp/max-lines-per-callback',
        'vp/prefer-function-result-pattern',
      ]
    : ['vp/prefer-define-model']
}

describe('VueUse settings across public rules', () => {
  it.each(
    ruleNames.flatMap(name =>
      ['true', 1, null, [], {}].map(vueuse => ({
        name,
        vueuse,
      })),
    ),
  )(
    'validates shared vueuse for $name despite its override: $vueuse',
    ({ name, vueuse }) => {
      const configuration = createConfig(false, false)
      expect(() =>
        new Linter().verify(
          createSource(false),
          {
            ...configuration,
            settings: { 'vue-perfectionist': { vueuse } },
            rules: { [`vp/${name}`]: ['error', { vueuse: false }] },
          },
          'Test.vue',
        ),
      ).toThrow('vueuse must be a boolean')
    },
  )

  it.each(
    policies.flatMap(policy =>
      [false, true].flatMap(imported =>
        [false, true].map(autoImport => ({
          ...policy,
          imported,
          autoImport,
        })),
      ),
    ),
  )(
    'resolves shared $shared, override $override, imports $imported, autoImport $autoImport',
    ({ shared, override, enabled, imported, autoImport }) => {
      const source = createSource(imported)
      const result = new Linter().verifyAndFix(
        source,
        createConfig(
          shared,
          autoImport,
          Object.fromEntries(ruleNames.map(name => [name, override])),
        ),
        'Test.vue',
      )
      expect(result.messages.map(message => message.ruleId).toSorted()).toEqual(
        expectedRules(enabled && (imported || autoImport)).toSorted(),
      )
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
      for (const message of result.messages) {
        expect(message.fix).toBeUndefined()
        expect(message.suggestions).toBeUndefined()
      }
    },
  )

  it.each(
    ruleNames.flatMap(name =>
      [false, true].map(shared => ({
        name,
        shared,
      })),
    ),
  )('isolates the $name override from shared $shared', ({ name, shared }) => {
    const result = new Linter().verify(
      createSource(false),
      createConfig(shared, true, { [name]: !shared }),
      'Test.vue',
    )
    const baseline = new Set(expectedRules(shared))
    if (baseline.has(`vp/${name}`)) {
      baseline.delete(`vp/${name}`)
    } else {
      baseline.add(`vp/${name}`)
    }
    expect(result.map(message => message.ruleId).toSorted()).toEqual(
      [...baseline].toSorted(),
    )
  })

  it.each([undefined, false, true])(
    'preserves explicit callbacks and targets with shared vueuse %s',
    vueuse => {
      const source = `<script setup>
watchDebounced(source, handler)
watchDebounced(source, () => {
  first()
  second()
})
const [isOpen] = useToggle()
</script>`
      const customCallbacks = [
        {
          source: '@vueuse/core',
          name: 'watchDebounced',
          callbackIndices: [1],
        },
      ]
      const result = new Linter().verifyAndFix(
        source,
        {
          files: ['**/*.vue'],
          languageOptions: vueLanguageOptions,
          plugins: { vp: plugin },
          settings: { 'vue-perfectionist': { vueuse, autoImport: true } },
          rules: {
            'vp/callback-style': [
              'error',
              {
                vueuse: false,
                groups: [],
                exclude: ['watchDebounced'],
                vueGlobals: [],
                customCallbacks,
              },
            ],
            'vp/max-lines-per-callback': [
              'error',
              {
                vueuse: false,
                max: 3,
                groups: [],
                exclude: ['watchDebounced'],
                vueGlobals: [],
                customCallbacks,
              },
            ],
            'vp/prefer-function-result-pattern': [
              'error',
              {
                vueuse: false,
                targets: [
                  {
                    source: '@vueuse/core',
                    names: ['useToggle'],
                    pattern: '^has[A-Z]',
                    returnIndex: 0,
                  },
                ],
              },
            ],
          },
        },
        'Test.vue',
      )
      expect(
        result.messages.map(message => [message.ruleId, message.messageId]),
      ).toEqual([
        ['vp/callback-style', 'expectedInlineCallback'],
        ['vp/max-lines-per-callback', 'exceededMaxLines'],
        [
          'vp/prefer-function-result-pattern',
          'unexpectedFunctionResultPattern',
        ],
      ])
      expect(result.messages[2]?.message).toContain('^has[A-Z]')
      expect(result.fixed).toBe(false)
      expect(result.output).toBe(source)
    },
  )
})
