<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import CodePreview from './code-preview.vue'
import { data } from './demo.data'
import { SORT_MODES } from './examples'
import type { SortMode } from './examples'

const id = useId()
const exampleId = shallowRef('all-groups')
const selectedMode = shallowRef<SortMode>()
const order = shallowRef<'asc' | 'desc'>('asc')

const example = computed(() => {
  const selected = data.find(item => item.id === exampleId.value) ?? data[0]
  if (!selected) {
    throw new Error('The sort-script-setup demo requires at least one example.')
  }
  return selected
})
const variant = computed(() =>
  example.value.variants.find(
    item => item.type === selectedMode.value && item.order === order.value,
  ),
)
const result = computed(() => variant.value ?? example.value.initial)
const configuration = computed(() =>
  variant.value ? JSON.stringify(variant.value.options, null, 2) : '',
)

function reset() {
  selectedMode.value = undefined
  order.value = 'asc'
}
</script>

<template>
  <section
    class="my-6 min-w-0"
    aria-label="Interactive sort-script-setup demo"
  >
    <div class="mb-4 flex flex-wrap items-end gap-4">
      <label
        :for="`${id}-example`"
        class="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium"
      >
        Example
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
            {{ item.label }}
          </option>
        </select>
      </label>
      <label
        :for="`${id}-order`"
        class="flex flex-col gap-1.5 text-sm font-medium"
      >
        Within groups
        <select
          v-model="order"
          :id="`${id}-order`"
          class="min-h-10 rounded-lg border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] px-3 text-[var(--vp-c-text-1)]"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
    </div>
    <p class="my-3! text-sm text-[var(--vp-c-text-2)]">
      {{ example.description }}
    </p>
    <div
      class="mb-4 flex flex-wrap gap-2"
      role="group"
      aria-label="Sorting modes"
    >
      <button
        @click="selectedMode = mode.type"
        v-for="mode in SORT_MODES"
        :key="mode.type"
        :aria-pressed="selectedMode === mode.type"
        :class="
          selectedMode === mode.type
            ? 'bg-[var(--vp-c-brand-soft)] text-[var(--vp-c-brand-1)]'
            : 'bg-[var(--vp-c-bg-soft)] text-[var(--vp-c-text-1)]'
        "
        type="button"
        class="min-h-10 rounded-lg border border-[var(--vp-c-divider)] px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--vp-c-brand-1)] focus-visible:outline-2 focus-visible:outline-[var(--vp-c-brand-1)]"
      >
        {{ mode.label }}
      </button>
      <button
        @click="reset"
        type="button"
        class="min-h-10 rounded-lg border border-[var(--vp-c-divider)] px-3 py-2 text-sm hover:bg-[var(--vp-c-bg-soft)] focus-visible:outline-2 focus-visible:outline-[var(--vp-c-brand-1)]"
      >
        Reset
      </button>
    </div>
    <CodePreview
      :result
      :is-original="!variant"
    />
    <details
      v-if="variant"
      class="mt-4 text-sm"
    >
      <summary class="cursor-pointer text-[var(--vp-c-text-2)]">
        Rule options
      </summary>
      <pre
        class="mt-2! overflow-x-auto rounded-lg bg-[var(--vp-c-bg-soft)] p-4"
        >{{ configuration }}</pre>
    </details>
  </section>
</template>
