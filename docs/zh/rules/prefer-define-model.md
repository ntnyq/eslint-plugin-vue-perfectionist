---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-define-model
description: 优先使用 defineModel 替代配套的 prop 和更新事件声明。
---

# vue-perfectionist/prefer-define-model

> 优先使用 defineModel 替代配套的 prop 和更新事件声明。

## 用法 {#usage}

适用于 Vue 3.4+ 组件，在现有 `vue-eslint-parser` 配置中启用。TypeScript 脚本还需以 `@typescript-eslint/parser` 作为脚本解析器。

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-define-model': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

显式 prop 声明与精确匹配的 `update:propName` 事件构成可迁移到 `defineModel` 的候选。检查默认 `modelValue` 约定及具名模型，无论事件是否使用。每个匹配 prop 在其声明键处报告一次。

::: correct

```vue
<script setup lang="ts">
const modelValue = defineModel<boolean>({ required: true })
const title = defineModel<string>('title')
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:title': [value: string]
}>()
</script>

<template>
  <button
    @click="emit('update:modelValue', !props.modelValue)"
    type="button"
  >
    Toggle
  </button>
  <button
    @click="emit('update:title', 'New title')"
    type="button"
  >
    Rename
  </button>
</template>
```

:::

支持运行时数组和对象、内联类型、本地别名和接口、交叉类型、继承接口成员、emits 调用签名及字面量事件联合。props 和 emits 均支持方法签名，包括 `'update:modelValue'(value: string): void`。支持 `withDefaults(defineProps(), defaults)`。允许无关 prop 和事件，迁移时必须保留它们。

::: incorrect

```vue
<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue', 'save'])
</script>

<template>
  <button
    @click="emit('update:modelValue', 'New value')"
    type="button"
  >
    Update
  </button>
  <button
    @click="emit('save')"
    type="button"
  >
    Save
  </button>
</template>
```

:::

没有匹配更新事件的 prop 被接受：

::: correct

```vue
<script setup>
const props = defineProps({ title: String })
const emit = defineEmits(['save'])
</script>

<template>
  <button
    @click="emit('save')"
    type="button"
  >
    Save
  </button>
</template>
```

:::

## :wrench: 选项 {#options}

此规则没有选项。

## 适用范围 {#scope}

仅检查 `.vue` setup 脚本顶层变量初始化器或表达式语句中的、未被遮蔽且未导入的 `defineProps` 和 `defineEmits`。接受括号及透明 TypeScript 包装。支持 JavaScript、TypeScript 及双脚本 SFC。必须恰有一个符合条件的 props 调用和一个 emits 调用。

跳过导入宏（含别名及命名空间）、遮蔽名称、可选调用、嵌套调用和函数、普通脚本、模板及独立 JS/TS。需要 Vue 解析器服务，不需要 TypeScript 项目或类型检查器，也不依赖自动导入设置。

不解析导入、未解析、泛型、ambient、映射、条件和联合 prop 类型。不解析运行时声明变量、展开及动态名称，但仍检查其旁边的显式成员。追踪本地非泛型别名及接口，并防止循环。支持调用签名中的事件名联合，但跳过宽泛 `string` 事件类型。名称精确匹配，不规范化大小写。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

不提供自动修复或建议。迁移会改变绑定，可能影响默认值、required 选项、事件验证器、修饰符、转换 setter 及副作用。请手动检查这些语义及全部脚本和模板用法。报告仅识别声明对，不保证改写等价。示例展示手动替代方式。

Vue 从 3.4 起推荐 `defineModel`，见[组件 v-model](https://vuejs.org/guide/components/v-model.html)。使用方模板绑定请使用 `eslint-plugin-vue` 的 [`prefer-v-model`](https://eslint.vuejs.org/rules/prefer-v-model.html)。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-define-model.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-define-model.test.ts)
