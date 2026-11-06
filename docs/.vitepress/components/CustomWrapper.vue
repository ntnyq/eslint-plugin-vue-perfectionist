<script setup lang="ts">
import { useData } from 'vitepress'

defineProps<{
  type: 'correct' | 'incorrect'
}>()

const { lang } = useData()
</script>

<template>
  <div class="relative p-2">
    <slot />
    <div
      v-if="type === 'incorrect'"
      class="absolute top-1 flex items-center gap-1 rounded-lg bg-red:20 px-2 py-0.5 text-red -left-2"
    >
      <div class="i-ri:close-line" />
      <span>{{ lang === 'zh-CN' ? '错误' : 'incorrect' }}</span>
    </div>
    <div
      v-if="type === 'correct'"
      class="absolute top-1 flex items-center gap-1 rounded-lg bg-green:20 px-2 py-0.5 text-green -left-2"
    >
      <div class="i-ri:check-line" />
      <span>{{ lang === 'zh-CN' ? '正确' : 'correct' }}</span>
    </div>
  </div>
</template>
