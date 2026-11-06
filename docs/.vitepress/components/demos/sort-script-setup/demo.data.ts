import { defineLoader } from 'vitepress'
import { buildDemo } from './build-demo.ts'
import { DEMO_WATCH_FILES } from './demo-loader.ts'
import type { DemoData } from './build-demo.ts'

export declare const data: DemoData

export default defineLoader({
  watch: DEMO_WATCH_FILES,
  load: () => buildDemo([]),
})
