import type { Modifier, Selector } from '../../types/index.ts'
import type { ResolvedOptions } from './types.ts'

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
 * Defaults shared by direct statement sorting containers.
 */
export const DEFAULT_SORT_OPTIONS: Omit<ResolvedOptions, 'groups'> = {
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
}
