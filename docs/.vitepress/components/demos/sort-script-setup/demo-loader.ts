import { fileURLToPath } from 'node:url'
import { defineLoader } from 'vitepress'
import { buildDemo } from './build-demo.ts'
import type { SortMode } from './examples.ts'

export const DEMO_WATCH_FILES = [
  fileURLToPath(new URL('./examples.ts', import.meta.url)),
  fileURLToPath(new URL('./build-demo.ts', import.meta.url)),
  fileURLToPath(new URL('./demo-loader.ts', import.meta.url)),
  fileURLToPath(new URL('../../../../../src/**/*.ts', import.meta.url)),
]

/**
 * Each lazy module contains one mode's results for both sorting orders.
 */
export function createDemoModeLoader(mode: SortMode) {
  return defineLoader({
    watch: DEMO_WATCH_FILES,
    async load() {
      const examples = await buildDemo([mode])
      return examples.map(({ id, variants }) => ({
        id,
        variants,
      }))
    },
  })
}
