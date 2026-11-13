import type { CallbackGroup } from '../types/index.ts'

/**
 * Explicit Vue callback positions; watch sources are deliberately excluded.
 */
export const CALLBACK_APIS: Record<CallbackGroup, Record<string, number>> = {
  cleanup: {
    onScopeDispose: 0,
    onWatcherCleanup: 0,
  },
  lifecycle: {
    onActivated: 0,
    onBeforeMount: 0,
    onBeforeUnmount: 0,
    onBeforeUpdate: 0,
    onDeactivated: 0,
    onErrorCaptured: 0,
    onMounted: 0,
    onRenderTracked: 0,
    onRenderTriggered: 0,
    onServerPrefetch: 0,
    onUnmounted: 0,
    onUpdated: 0,
  },
  scheduler: {
    nextTick: 0,
  },
  watch: {
    watch: 1,
    watchEffect: 0,
    watchPostEffect: 0,
    watchSyncEffect: 0,
  },
}

/**
 * VueUse callback positions shared by `@vueuse/core` and `@vueuse/shared`.
 * Watch sources and deprecated aliases are deliberately excluded.
 */
export const VUEUSE_CALLBACK_APIS: Record<
  CallbackGroup,
  Record<string, number>
> = {
  cleanup: {
    tryOnScopeDispose: 0,
  },
  lifecycle: {
    tryOnBeforeMount: 0,
    tryOnBeforeUnmount: 0,
    tryOnMounted: 0,
    tryOnUnmounted: 0,
  },
  scheduler: {
    useIntervalFn: 0,
    useTimeoutFn: 0,
  },
  watch: {
    watchArray: 1,
    watchAtMost: 1,
    watchDebounced: 1,
    watchDeep: 1,
    watchIgnorable: 1,
    watchImmediate: 1,
    watchOnce: 1,
    watchThrottled: 1,
    watchTriggerable: 1,
    watchWithFilter: 1,
    whenever: 1,
  },
}
