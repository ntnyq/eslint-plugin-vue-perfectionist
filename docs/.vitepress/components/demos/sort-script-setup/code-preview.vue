<script setup lang="ts">
import '@shikijs/magic-move/style.css'
import { ShikiMagicMovePrecompiled } from '@shikijs/magic-move/vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { useData } from 'vitepress'
import { computed, onMounted, shallowRef } from 'vue'
import type { DemoResult } from './build-demo'

const props = defineProps<{
  result: DemoResult
  isOriginal: boolean
}>()

const { lang } = useData()
const isChinese = computed(() => lang.value === 'zh-CN')
const isMounted = shallowRef(false)
const reducedMotion = usePreferredReducedMotion()
const steps = computed(() => [props.result.tokens])
const shouldAnimate = computed(
  () => isMounted.value && reducedMotion.value !== 'reduce',
)

onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-[var(--vp-c-divider)]">
    <div
      class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] px-4 py-3 text-xs text-[var(--vp-c-text-2)]"
    >
      <span class="font-mono">Demo.vue</span>
      <span>{{
        isOriginal
          ? isChinese
            ? '原始代码'
            : 'Original source'
          : isChinese
            ? 'ESLint --fix 修复后'
            : 'After ESLint --fix'
      }}</span>
    </div>
    <div
      :aria-label="
        isChinese ? 'Vue script setup 代码' : 'Vue script setup code'
      "
      class="demo-code max-h-128 overflow-auto bg-[var(--vp-code-block-bg)] p-4"
      role="region"
      tabindex="0"
    >
      <ShikiMagicMovePrecompiled
        :steps
        :animate="shouldAnimate"
        :options="{ duration: 600, stagger: 0.3, animateContainer: true }"
      />
    </div>
    <div
      class="border-t border-[var(--vp-c-divider)] px-4 py-3 text-sm text-[var(--vp-c-text-2)]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <template v-if="isOriginal">
        {{
          isChinese
            ? '选择排序方式，应用安全修复。'
            : 'Choose a sorting mode to apply safe fixes.'
        }}
      </template>
      <template v-else-if="result.messages.length">
        {{
          isChinese
            ? `仍有 ${result.messages.length} 项诊断，这些移动需要手动检查。`
            : `${result.messages.length} remaining diagnostic(s). These moves need manual review.`
        }}
      </template>
      <template v-else>{{
        isChinese
          ? '所有排序问题均已解决。'
          : 'All ordering diagnostics resolved.'
      }}</template>
    </div>
  </div>
  <ul
    v-if="!isOriginal && result.messages.length"
    :aria-label="
      isChinese ? '剩余 ESLint 诊断' : 'Remaining ESLint diagnostics'
    "
    class="mt-3! list-none! space-y-2 pl-0! text-sm text-[var(--vp-c-warning-1)]"
  >
    <li
      v-for="message in result.messages"
      :key="`${message.line}:${message.column}:${message.messageId}`"
      class="rounded-lg bg-[var(--vp-c-warning-soft)] px-3 py-2"
    >
      {{ isChinese ? `第 ${message.line} 行` : `Line ${message.line}` }}:
      {{ message.message }}
    </li>
  </ul>
</template>

<style scoped>
/* Override prose code styles and theme the tokens owned by Magic Move. */
.demo-code :deep(pre) {
  margin: 0;
  padding: 0;
  min-width: max-content;
  overflow: visible;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.8;
  background: transparent;
}

.dark .demo-code :deep(.shiki-magic-move-item) {
  color: var(--shiki-dark) !important;
}

@media (prefers-reduced-motion: reduce) {
  .demo-code :deep(*) {
    transition: none !important;
  }
}
</style>
