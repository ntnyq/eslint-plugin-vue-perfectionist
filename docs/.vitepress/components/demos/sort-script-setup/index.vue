<script setup lang="ts">
import { useData } from 'vitepress'
import { computed, onScopeDispose, shallowRef, useId } from 'vue'
import CodePreview from './code-preview.vue'
import { data } from './demo.data'
import { SORT_MODES } from './examples'
import { loadDemoVariants } from './load-variants'
import type { DemoModeData } from './build-demo'
import type { SortMode } from './examples'

const { lang } = useData()
const isChinese = computed(() => lang.value === 'zh-CN')
const id = useId()
const exampleId = shallowRef('all-groups')
const selectedMode = shallowRef<SortMode>()
const order = shallowRef<'asc' | 'desc'>('asc')
const modeData = shallowRef<DemoModeData>([])
const pendingMode = shallowRef<SortMode>()
const hasLoadError = shallowRef(false)
let requestId = 0

const example = computed(() => {
  const selected = data.find(item => item.id === exampleId.value) ?? data[0]
  if (!selected) {
    throw new Error('The sort-script-setup demo requires at least one example.')
  }
  return selected
})
const variant = computed(() =>
  modeData.value
    .find(item => item.id === exampleId.value)
    ?.variants.find(
      item => item.type === selectedMode.value && item.order === order.value,
    ),
)
const result = computed(() => variant.value ?? example.value.initial)
const configuration = computed(() =>
  variant.value ? JSON.stringify(variant.value.options, null, 2) : '',
)

function reset() {
  requestId++
  pendingMode.value = undefined
  hasLoadError.value = false
  selectedMode.value = undefined
  order.value = 'asc'
}

async function selectMode(mode: SortMode) {
  const currentRequest = ++requestId
  pendingMode.value = mode
  hasLoadError.value = false

  try {
    const loaded = await loadDemoVariants(mode)
    if (currentRequest !== requestId) {
      return
    }
    modeData.value = loaded
    selectedMode.value = mode
  } catch {
    if (currentRequest === requestId) {
      hasLoadError.value = true
    }
  } finally {
    if (currentRequest === requestId) {
      pendingMode.value = undefined
    }
  }
}

onScopeDispose(() => {
  requestId++
})
</script>

<template>
  <section
    :aria-label="
      isChinese
        ? 'sort-script-setup 交互演示'
        : 'Interactive sort-script-setup demo'
    "
    class="my-6 min-w-0"
  >
    <div class="mb-4 flex flex-wrap items-end gap-4">
      <label
        :for="`${id}-example`"
        class="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium"
      >
        {{ isChinese ? '示例' : 'Example' }}
        <select
          @change="reset"
          v-model="exampleId"
          :id="`${id}-example`"
          class="min-h-10 rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-3 text-[var(--vp-c-text-1)]"
        >
          <option
            v-for="item in data"
            :key="item.id"
            :value="item.id"
          >
            {{ isChinese ? item.labelZh : item.label }}
          </option>
        </select>
      </label>
      <label
        :for="`${id}-order`"
        class="flex flex-col gap-1.5 text-sm font-medium"
      >
        {{ isChinese ? '组内顺序' : 'Within groups' }}
        <select
          v-model="order"
          :id="`${id}-order`"
          class="min-h-10 rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-3 text-[var(--vp-c-text-1)]"
        >
          <option value="asc">{{ isChinese ? '升序' : 'Ascending' }}</option>
          <option value="desc">{{ isChinese ? '降序' : 'Descending' }}</option>
        </select>
      </label>
    </div>
    <p class="my-3! text-sm text-[var(--vp-c-text-2)]">
      {{ isChinese ? example.descriptionZh : example.description }}
    </p>
    <div
      :aria-label="isChinese ? '排序方式' : 'Sorting modes'"
      class="mb-4 flex flex-wrap gap-2"
      role="group"
    >
      <button
        @click="selectMode(mode.type)"
        v-for="mode in SORT_MODES"
        :key="mode.type"
        :aria-pressed="selectedMode === mode.type"
        :aria-busy="pendingMode === mode.type"
        :class="
          selectedMode === mode.type
            ? 'bg-[var(--vp-c-brand-soft)] text-[var(--vp-c-brand-1)]'
            : 'bg-[var(--vp-c-bg-soft)] text-[var(--vp-c-text-1)]'
        "
        type="button"
        class="min-h-10 rounded-lg border border-[var(--vp-c-divider)] px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--vp-c-brand-1)] focus-visible:outline-2 focus-visible:outline-[var(--vp-c-brand-1)]"
      >
        {{ isChinese ? mode.labelZh : mode.label }}
      </button>
      <button
        @click="reset"
        type="button"
        class="min-h-10 rounded-lg border border-[var(--vp-c-divider)] px-3 py-2 text-sm hover:bg-[var(--vp-c-bg-soft)] focus-visible:outline-2 focus-visible:outline-[var(--vp-c-brand-1)]"
      >
        {{ isChinese ? '重置' : 'Reset' }}
      </button>
    </div>
    <p
      v-if="pendingMode"
      role="status"
    >
      {{ isChinese ? '正在加载排序预览…' : 'Loading sorting preview…' }}
    </p>
    <p
      v-else-if="hasLoadError"
      role="alert"
    >
      {{
        isChinese
          ? '预览加载失败，请再次选择排序方式重试。'
          : 'The preview could not load. Choose a sorting mode again to retry.'
      }}
    </p>
    <CodePreview
      :result
      :is-original="!variant"
    />
    <details
      v-if="variant"
      class="mt-4 text-sm"
    >
      <summary class="cursor-pointer text-[var(--vp-c-text-2)]">
        {{ isChinese ? '规则选项' : 'Rule options' }}
      </summary>
      <pre
        class="mt-2! overflow-x-auto rounded-lg bg-[var(--vp-c-bg-soft)] p-4"
        >{{ configuration }}</pre>
    </details>
  </section>
</template>
