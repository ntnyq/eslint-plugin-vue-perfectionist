---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/define-macros-newline
description: 要求在内联 Vue 编译器宏声明的花括号内及顶层成员之间换行。
---

# vue-perfectionist/define-macros-newline

> 要求在内联 Vue 编译器宏声明的花括号内及顶层成员之间换行。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                                  |
| -------- | ----------------------------------------------------- |
| 适用范围 | Setup                                                 |
| 默认行为 | 内联 props、emits、slots 和 expose 声明使用多行布局。 |
| 必需选项 | 无；启用后即使用默认选项。                            |
| 自动修复 | 支持部分情况                                          |
| 类型信息 | 不需要 TypeScript 类型服务。                          |

:::

<!-- summary:end -->

- :wrench: ESLint 的 `--fix` 选项可以自动修复该规则报告的问题。

这是适用于含 `<script setup>` 的 `.vue` 文件、可自动修复的 `layout` 规则。请在 ESLint 配置中显式启用。

## 用法 {#usage}

在现有 Vue 解析器配置中启用：

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/define-macros-newline': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

即使只有一个成员，也必须使用多行声明：

::: correct

<!-- eslint-skip -->

```vue
<script setup lang="ts">
defineProps<{
  name: string
}>()
defineEmits<{
  change: [value: string]
}>()
defineSlots<{
  default(props: { name: string }): unknown
}>()
defineExpose({
  open,
  close,
})
</script>
```

:::

::: incorrect

<!-- eslint-skip -->

```vue
<script setup lang="ts">
defineProps<{ name: string }>()
defineEmits<{ change: [value: string] }>()
defineSlots<{ default(props: { name: string }): unknown }>()
defineExpose({ open, close })
</script>
```

:::

每个成员的起始行必须晚于前一个成员的结束行。成员自身可以跨行，仅在花括号内侧换行并不够：

::: correct

<!-- eslint-skip -->

```vue
<script setup lang="ts">
defineProps<{
  name: string
  age: number
}>()
</script>
```

:::

::: incorrect

<!-- eslint-skip -->

<!-- prettier-ignore -->
```vue
<script setup lang="ts">
defineProps<{
  name: string; age: number
}>()
</script>
```

:::

## :wrench: 选项 {#options}

```json
{
  "vue-perfectionist/define-macros-newline": [
    "error",
    {
      "macros": ["defineProps", "defineEmits", "defineSlots", "defineExpose"]
    }
  ]
}
```

`macros` 替换默认列表，空数组禁用规则。仅接受以下五个宏名称，不允许重复。

| 宏              | 检查的声明                       | 默认启用 |
| --------------- | -------------------------------- | -------- |
| `defineProps`   | 首个内联类型字面量或首个对象参数 | 是       |
| `defineEmits`   | 首个内联类型字面量或首个对象参数 | 是       |
| `defineSlots`   | 首个内联类型字面量               | 是       |
| `defineExpose`  | 首个对象参数                     | 是       |
| `defineOptions` | 首个对象参数                     | 否       |

例如，仅检查公开 API 和组件选项：

```json
{
  "macros": ["defineExpose", "defineOptions"]
}
```

## 适用范围 {#scope}

检查 `<script setup>` 内直接、非可选的标识符调用。跳过局部声明或导入的绑定、别名和 `Vue.defineProps()` 等成员调用。编译器宏通常无需导入；支持 ESLint 配置提供的全局声明。

跳过普通 `<script>`、模板表达式及独立 JavaScript 或 TypeScript 文件。双脚本 SFC 中仅检查 setup 块。

仅检查直接、非空的类型字面量和对象参数：

::: correct

<!-- eslint-skip -->

```vue
<script setup lang="ts">
// The props type is checked; the defaults object is not.
withDefaults(
  defineProps<{
    name?: string
  }>(),
  { name: 'test' },
)

// Nested types, objects, tuples, and callback parameters stay unchanged.
defineProps<{
  options: { immediate: boolean; once: boolean }
}>()
defineProps({
  name: { type: String, required: true },
})
defineEmits<{
  (event: 'change', value: { name: string }): void
  (event: 'close'): void
}>()

// Skipped: references, empty declarations, and arrays.
defineProps<Props>()
defineExpose(exposed)
defineProps<{}>()
defineExpose({})
defineExpose()
defineProps(['name'])
defineEmits(['change'])

// Skipped: composed or wrapped types and expressions.
defineProps<Props & { name: string }>()
defineProps<Partial<{ name: string }>>()
defineExpose({ open } satisfies Exposed)
</script>
```

:::

不追踪变量或类型声明，不递归展开嵌套成员，也不验证宏签名。`defineModel` 的类型与选项参数职责不同，因此不支持。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

每个受影响的声明报告一次 `expectedNewlines`。修复仅改变空白，保留成员顺序、注释、逗号、分号及现有换行。CRLF 文件中插入的换行仍为 CRLF。紧贴花括号内侧的注释也会与花括号换行分隔。

缩进、分号、尾逗号及空行数量由格式化工具处理。应用 ESLint 修复后再运行格式化工具补全缩进。Oxfmt 使用 `objectWrap: 'preserve'` 时会保留修复后的多行布局。避免使用将这些声明重新折叠为单行的格式化配置或规则。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/define-macros-newline.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/define-macros-newline.test.ts)
