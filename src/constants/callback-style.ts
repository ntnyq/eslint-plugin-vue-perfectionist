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
