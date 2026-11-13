---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-define-model
description: 优先使用 defineModel 替代配套的 prop 和更新事件声明。
---

# vue-perfectionist/prefer-define-model

> 优先使用 defineModel 替代配套的 prop 和更新事件声明。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                     |
| -------- | ---------------------------------------- |
| 适用范围 | Setup                                    |
| 默认行为 | 报告相互匹配的模型 prop 与更新事件声明。 |
| 必需选项 | 无；启用后即使用默认选项。               |
| 自动修复 | —                                        |
| 类型信息 | 不需要 TypeScript 类型服务。             |

:::

<!-- summary:end -->

## 用法 {#usage}

适用于 Vue `>=3.5.42 <4` 组件，在现有 `vue-eslint-parser` 配置中启用。TypeScript 脚本还需以 `@typescript-eslint/parser` 作为脚本解析器。

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

### `vueuse`

布尔值。覆盖 `settings['vue-perfectionist'].vueuse`；省略时继承共享设置，共享设置默认为 `false`。显式规则选项始终优先：

| 共享 `vueuse`  | 规则 `vueuse` | 是否启用 |
| -------------- | ------------- | -------- |
| 省略 / `false` | 省略          | 否       |
| `true`         | 省略          | 是       |
| 任意           | `true`        | 是       |
| 任意           | `false`       | 否       |

```js
{
  settings: {
    'vue-perfectionist': {
      vueuse: true,
      autoImport: true,
    },
  },
  rules: {
    'vue-perfectionist/prefer-define-model': ['error', { vueuse: true }],
  },
}
```

启用后，若识别到 [`useVModel`](https://vueuse.org/core/useVModel/) 调用配置了 `passive: true`，则跳过对应模型。passive 模型保留本地状态并通过 watcher 同步，直接替换成 `defineModel` 不一定保持行为一致。此豁免不要求同时配置 `defaultValue`。

支持来自 `@vueuse/core` 的具名导入（含别名）及非计算属性的命名空间调用。未绑定的 `useVModel` 还需要共享设置 `autoImport: true`。仅声明 ESLint 全局变量不够；局部值、其他导入及仅类型绑定不会被识别为自动导入。

对于未绑定调用，写入 `useVModel`，或写入未被局部遮蔽的 `globalThis`、`window`、`self`、`global` 上的同名属性，均会阻止豁免。检查覆盖整个文件中的赋值、更新、删除、解构目标和循环赋值目标，包括普通脚本及嵌套函数；属性名未知的计算属性写入也会保守处理。未绑定的直接 `eval` 调用可能改变运行时绑定，因此也会阻止自动导入识别。单纯读取、被遮蔽的局部对象及局部 `eval` 不影响识别。这些全局检查不影响显式 VueUse 导入。不分析全局对象的二次别名及 `Object.assign` 等修改 API。

即使两个开关都已启用，下面的全局写入仍会保留声明报告：

::: incorrect passive-vueuse-model

```vue
<script setup>
const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
globalThis.useVModel = customModel
const inputValue = useVModel(props, 'modelValue', emit, { passive: true })
</script>
```

:::

启用 VueUse 支持后，接受下面显式导入的 passive 模型：

::: correct passive-vueuse-model

```vue
<script setup lang="ts">
import { useVModel } from '@vueuse/core'

const props = defineProps<{
  modelValue?: string
  defaultValue?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const inputValue = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input v-model="inputValue" />
</template>
```

:::

同时启用 VueUse 支持和共享 `autoImport` 后，也接受自动导入调用：

::: correct passive-vueuse-model

```vue
<script setup>
const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
const inputValue = useVModel(props, 'modelValue', emit, { passive: true })
</script>

<template>
  <input v-model="inputValue" />
</template>
```

:::

仅豁免对应的 passive 模型。这里的 `title` 仍会报告：

::: incorrect passive-vueuse-model

```vue
<script setup>
import { useVModel } from '@vueuse/core'

const props = defineProps({ modelValue: String, title: String })
const emit = defineEmits(['update:modelValue', 'update:title'])
const inputValue = useVModel(props, 'modelValue', emit, { passive: true })
</script>
```

:::

豁免要求调用直接位于 setup 顶层初始化器或表达式语句中，且有四个参数：当前 `defineProps` 的未重新赋值绑定（支持 `withDefaults` 包装）、模型名的静态字符串或无插值模板、当前 `defineEmits` 的未重新赋值绑定，以及内联选项对象。接受括号及透明 TypeScript 包装。不追踪绑定的二次别名、解构 props、嵌套或条件调用、可选调用及外部选项变量。

最终 `passive` 值必须是字面量 `true`；`eventName` 必须未设置，或静态等于 `update:模型名`。展开属性及未知计算键会使两个值均变为未知，直到被显式覆盖。例如 `{ ...options, passive: true }` 仍不足以豁免，因为 `eventName` 未知；再添加 `eventName: 'update:modelValue'` 才能确认此模型的事件。

任何内联 getter 或 setter 都会阻止豁免，即使位于其他选项上或后面有显式值覆盖。VueUse 先读取 `clone`，再读取 `passive`，getter 可以在读取时修改其他选项。非计算属性的 `__proto__` 原型设置器也会被拒绝，除非其值是字面量 `null`，因为继承的 accessor 存在相同风险。计算属性 `['__proto__']` 的数据属性不会改变原型。动态 `passive` 和 `eventName` 值不能确立豁免。无法识别的调用仍按通常方式报告声明对。

内联 accessor 会保留声明报告，即使同时存在 `passive: true`：

::: incorrect passive-vueuse-model

```vue
<script setup>
import { useVModel } from '@vueuse/core'

const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
const inputValue = useVModel(props, 'modelValue', emit, {
  get clone() {
    return false
  },
  passive: true,
})
</script>
```

:::

## 适用范围 {#scope}

仅检查 `.vue` setup 脚本顶层变量初始化器或表达式语句中的、未被遮蔽且未导入的 `defineProps` 和 `defineEmits`。接受括号及透明 TypeScript 包装。支持 JavaScript、TypeScript 及双脚本 SFC。必须恰有一个符合条件的 props 调用和一个 emits 调用。

跳过导入宏（含别名及命名空间）、遮蔽名称、可选调用、嵌套调用和函数、普通脚本、模板及独立 JS/TS。需要 Vue 解析器服务，不需要 TypeScript 项目或类型检查器。宏识别不依赖自动导入设置；可选的 VueUse 豁免遵循上述设置。

不解析导入、未解析、泛型、ambient、映射、条件和联合 prop 类型。不解析运行时声明变量、展开及动态名称，但仍检查其旁边的显式成员。追踪本地非泛型别名及接口，并防止循环。支持调用签名中的事件名联合，但跳过宽泛 `string` 事件类型。名称精确匹配，不规范化大小写。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

不提供自动修复或建议。迁移会改变绑定，可能影响默认值、required 选项、事件验证器、修饰符、转换 setter 及副作用。请手动检查这些语义及全部脚本和模板用法。报告仅识别声明对，不保证改写等价。示例展示手动替代方式。

Vue 从 3.4 起推荐 `defineModel`，见[组件 v-model](https://vuejs.org/guide/components/v-model.html)。使用方模板绑定请使用 `eslint-plugin-vue` 的 [`prefer-v-model`](https://eslint.vuejs.org/rules/prefer-v-model.html)。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-define-model.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-define-model.test.ts)
