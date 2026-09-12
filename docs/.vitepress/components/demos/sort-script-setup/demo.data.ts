import { fileURLToPath } from 'node:url'
import { defineLoader } from 'vitepress'
import { buildDemo } from './build-demo.ts'
import type { DemoData } from './build-demo.ts'

export declare const data: DemoData

export default defineLoader({
  watch: [
    fileURLToPath(new URL('./examples.ts', import.meta.url)),
    fileURLToPath(new URL('./build-demo.ts', import.meta.url)),
    fileURLToPath(new URL('../../../../../src/**/*.ts', import.meta.url)),
  ],
  load: buildDemo,
})
