import type { SortScriptSetupOptions } from '../../../../../src/index.ts'

export const SORT_MODES = [
  { type: 'unsorted', label: 'Group only', labelZh: '仅分组' },
  { type: 'alphabetical', label: 'Alphabetical', labelZh: '字母顺序' },
  { type: 'natural', label: 'Natural', labelZh: '自然排序' },
  { type: 'line-length', label: 'Line length', labelZh: '语句长度' },
] as const satisfies {
  type: SortScriptSetupOptions['type']
  label: string
  labelZh: string
}[]

export type SortMode = (typeof SORT_MODES)[number]['type']

export const SORT_ORDERS = ['asc', 'desc'] as const

export const EXAMPLES = [
  {
    id: 'all-groups',
    label: 'All default groups',
    labelZh: '全部默认分组',
    descriptionZh:
      '示例包含全部 19 个默认分组及其 22 种语句类型，注释标明所属分组。可对字面量常量和函数排序，并查看 computed/ref 运行时调用为何保留原位。',
    description:
      'A component covering all 19 default groups and their 22 statement types. Comments identify each group. Sort the literal constants and functions, and inspect why computed/ref runtime calls stay in place.',
    code: `<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import {
  computed,
  inject,
  onMounted,
  provide,
  reactive,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import type { VNode } from 'vue'

// interface
interface Props {
  title: string
  initialCount?: number
}
// type (shares a group with interface)
type Status = 'idle' | 'editing' | 'saved'

// define-options
defineOptions({ name: 'CounterPanel' })

// define-props
const props = withDefaults(defineProps<Props>(), { initialCount: 0 })

// define-emits
const emit = defineEmits<{ save: [value: number] }>()

// define-slots
defineSlots<{ default: (props: { count: number }) => VNode[] }>()

// define-model
const title = defineModel<string>('title', { default: '' })

// constant: try natural sorting to compare item2 and item10
const item10 = 'A longer label'
const item2 = 'OK'
const active = true

// inject
const locale = inject<string>('locale', 'en-US')

// composable: recognized through its imported useXxx name
const { width } = useWindowSize()

// template-ref
const input = useTemplateRef<HTMLInputElement>('input')

// computed: intentionally before ref/reactive; runtime moves need review
const isWide = computed(() => width.value >= 768)

// ref
const count = ref(props.initialCount)
// reactive (shares a group with ref)
const state = reactive<{ status: Status }>({ status: 'idle' })

// variable: mutable bindings and nonliteral initializers
let saveCount = 0

// enum
enum Action {
  Save = 'save',
  Reset = 'reset',
}
// class (shares a group with enum)
class SaveRecord {
  constructor(readonly value: number) {}
}

// function: compare alphabetical and line-length sorting
function submit() {
  const record = new SaveRecord(count.value)
  saveCount += 1
  state.status = 'saved'
  emit(Action.Save, record.value)
}
function reset() {
  count.value = props.initialCount
  state.status = 'idle'
}

// watch
watch(title, () => {
  state.status = 'editing'
})

// lifecycle-hook
onMounted(() => {
  input.value?.focus()
})

// provide
provide('counter', { count, locale })

// define-expose
defineExpose({ reset, submit })
</script>

<template>
  <section :aria-label="props.title">
    <input ref="input" v-model="title" />
    <slot :count="count" />
    <button @click="submit">Save</button>
    <button @click="reset">Reset</button>
  </section>
</template>`,
  },
  {
    id: 'grouping',
    label: 'Groups & sorting',
    labelZh: '分组与排序',
    descriptionZh:
      '类型、字面量常量、函数依次排列。自然排序将 item2 放在 item10 之前，仅分组则保留原顺序。',
    description:
      'Types, literal constants, then functions. Natural sorting places item2 before item10; group-only sorting preserves their original order.',
    code: `<script setup lang="ts">
function reset() { return 0 }
const item10 = 'A longer label'
type Status = 'idle' | 'ready'
const item2 = 'OK'
interface Props { title: string }
function submit() { return 'submitted' }
const active = true
</script>`,
  },
  {
    id: 'runtime',
    label: 'Runtime safety',
    labelZh: '运行时安全性',
    descriptionZh:
      'ref 分组应位于 computed 之前，但移动这些运行时调用可能改变行为。规则报告问题，并保留执行顺序。',
    description:
      'The ref group belongs before computed, but moving these runtime calls could change behavior. Sorting reports the issue and preserves their execution order.',
    code: `<script setup lang="ts">
import { computed, ref } from 'vue'

const doubled = computed(() => 2)
const count = ref(0)
</script>`,
  },
  {
    id: 'dependencies',
    label: 'Dependencies',
    labelZh: '依赖关系',
    descriptionZh:
      '初始化依赖优先于排序。即使分组偏好常量在前，函数也必须保留在使用它的调用之前。',
    description:
      'Initialization dependencies take precedence over sorting. The function must stay before the call that uses it, even when groups prefer constants first.',
    code: `<script setup>
function getLabel() { return label }
const label = 'Ready'
const value = getLabel()
function reset() { return 0 }
const item10 = 'A longer label'
const item2 = 'OK'
</script>`,
  },
] as const
