import type { Modifier, ResolvedOptions, Selector } from '../types/index.ts'

/**
 * Ordered modifier precedence used when multiple configured groups match.
 */
export const MODIFIERS: Modifier[] = [
  'declare',
  'async',
  'destructured',
  'const',
  'let',
  'var',
]

/**
 * Supported semantic selectors, independent of user-defined group names.
 */
export const SELECTORS: Selector[] = [
  'interface',
  'type',
  'enum',
  'class',
  'define-options',
  'define-props',
  'define-emits',
  'define-slots',
  'define-model',
  'define-expose',
  'constant',
  'inject',
  'template-ref',
  'ref',
  'reactive',
  'computed',
  'composable',
  'variable',
  'function',
  'watch',
  'lifecycle-hook',
  'provide',
  'call',
]

/**
 * Compiler macro names and their statement categories.
 */
export const MACROS = new Map<string, Selector>([
  ['defineEmits', 'define-emits'],
  ['defineExpose', 'define-expose'],
  ['defineModel', 'define-model'],
  ['defineOptions', 'define-options'],
  ['defineProps', 'define-props'],
  ['defineSlots', 'define-slots'],
])

/**
 * Runtime API identity table; classification never implies purity.
 */
export const VUE_APIS = new Map<string, Selector>([
  ['computed', 'computed'],
  ['customRef', 'ref'],
  ['inject', 'inject'],
  ['provide', 'provide'],
  ['reactive', 'reactive'],
  ['readonly', 'reactive'],
  ['ref', 'ref'],
  ['shallowReactive', 'reactive'],
  ['shallowReadonly', 'reactive'],
  ['shallowRef', 'ref'],
  ['toRef', 'ref'],
  ['toRefs', 'ref'],
  ['useTemplateRef', 'template-ref'],
  ['watch', 'watch'],
  ['watchEffect', 'watch'],
  ['watchPostEffect', 'watch'],
  ['watchSyncEffect', 'watch'],
  ...[
    'onBeforeMount',
    'onMounted',
    'onBeforeUpdate',
    'onUpdated',
    'onBeforeUnmount',
    'onUnmounted',
    'onActivated',
    'onDeactivated',
    'onErrorCaptured',
    'onRenderTracked',
    'onRenderTriggered',
    'onServerPrefetch',
  ].map((name): [string, Selector] => [name, 'lifecycle-hook']),
])

/**
 * Defaults preserve intra-group order and whitespace until explicitly configured.
 */
export const DEFAULT_OPTIONS: ResolvedOptions = {
  alphabet: '',
  customGroups: [],
  fallbackSort: { type: 'unsorted' },
  fix: 'safe',
  ignoreCase: true,
  locales: 'en-US',
  newlinesBetween: 'ignore',
  newlinesInside: 'ignore',
  order: 'asc',
  partitionByComment: false,
  partitionByNewLine: false,
  specialCharacters: 'keep',
  type: 'unsorted',
  vueGlobals: [],
  vueImportSources: ['vue'],
  groups: [
    ['interface', 'type'],
    'define-options',
    'define-props',
    'define-emits',
    'define-slots',
    'define-model',
    'constant',
    'inject',
    'composable',
    'template-ref',
    ['ref', 'reactive'],
    'computed',
    'variable',
    ['enum', 'class'],
    'function',
    'watch',
    'lifecycle-hook',
    'provide',
    'define-expose',
  ],
}
