import type { DemoModeData } from './build-demo.ts'
import type { SortMode } from './examples.ts'

const MODE_LOADERS = {
  unsorted: () => import('./modes/unsorted.data'),
  alphabetical: () => import('./modes/alphabetical.data'),
  natural: () => import('./modes/natural.data'),
  'line-length': () => import('./modes/line-length.data'),
} satisfies Record<SortMode, () => Promise<{ data: DemoModeData }>>

const pending = new Map<SortMode, Promise<DemoModeData>>()

/**
 * Reuse in-flight and successful loads; failed imports remain retryable.
 */
export function loadDemoVariants(mode: SortMode): Promise<DemoModeData> {
  const cached = pending.get(mode)
  if (cached) {
    return cached
  }

  const promise = MODE_LOADERS[mode]()
    .then(module => module.data)
    .catch(error => {
      pending.delete(mode)
      throw error
    })
  pending.set(mode, promise)
  return promise
}
