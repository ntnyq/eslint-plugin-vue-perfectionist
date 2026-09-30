/**
 * Shared scope fixtures for both macro type rules.
 */
export function sfc(script: string): string {
  return `<script setup lang="ts">\n${script}\n</script>`
}

export const skippedMacroTypes = [
  'defineProps()',
  'defineProps({ title: String })',
  'defineProps<{}, {}>()',
  'defineProps<{}>({})',
  'defineModel<{}>()',
  'defineExpose<{}>()',
  'defineOptions<{}>()',
  'other<{}>()',
  'obj.defineProps<{}>()',
  'obj["defineProps"]<{}>()',
  'defineProps?.<{}>()',
  'function defineProps() {}; defineProps<{}>()',
  'const defineProps = fn; defineProps<{}>()',
  'import { defineProps } from "vue"; defineProps<{}>()',
  'import { defineProps } from "other"; defineProps<{}>()',
  'import type { defineProps } from "vue"; defineProps<{}>()',
  'import { defineProps as props } from "vue"; props<{}>()',
  'import * as Vue from "vue"; Vue.defineProps<{}>()',
  'function nested() { defineProps<{}>() }',
  '{ defineProps<{}>() }',
  'if (ok) defineProps<{}>()',
  'const props = wrap(defineProps<{}>())',
  'const props = ok ? defineProps<{}>() : other',
  'const props = [defineProps<{}>()]',
  'const props = () => defineProps<{}>()',
  'const props = await defineProps<{}>()',
  'withDefaults(other, defineProps<{}>())',
  'withDefaults(defineEmits<{}>(), {})',
  'withDefaults(defineSlots<{}>(), {})',
  'withDefaults(wrap(defineProps<{}>()), {})',
  'const withDefaults = fn; withDefaults(defineProps<{}>(), {})',
  'import { withDefaults } from "vue"; withDefaults(defineProps<{}>(), {})',
  'withDefaults?.(defineProps<{}>(), {})',
  'const defineProps = fn; withDefaults(defineProps<{}>(), {})',
]

export const checkedMacroTypes = [
  'defineProps<{}>()',
  'const props = defineProps<{}>()',
  'const { title } = defineProps<{}>()',
  'const props = (defineProps<{}>())',
  'const props = defineProps<{}>() as unknown',
  'const props = defineProps<{}>() satisfies unknown',
  'const props = defineProps<{}>()!',
  'const props = <unknown>defineProps<{}>()',
  'const props = withDefaults(defineProps<{}>(), {})',
  'withDefaults((defineProps<{}>() as unknown), {})',
  'const props = (withDefaults(defineProps<{}>(), {}))!',
]
