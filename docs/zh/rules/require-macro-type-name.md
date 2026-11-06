---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-macro-type-name
description: 要求 Vue 编译器宏调用处的类型使用指定名称。
---

# vue-perfectionist/require-macro-type-name

> 要求 Vue 编译器宏调用处的类型使用指定名称。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                        |
| -------- | ------------------------------------------- |
| 适用范围 | TS setup                                    |
| 默认行为 | 宏调用处使用 Props、Emits 和 Slots 类型名。 |
| 必需选项 | 无；启用后即使用默认选项。                  |
| 自动修复 | —                                           |
| 类型信息 | 不需要 TypeScript 类型服务。                |

:::

<!-- summary:end -->

## 用法 {#usage}

在现有的 `vue-eslint-parser` 配置中启用规则，并使用 `@typescript-eslint/parser` 作为脚本解析器：

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-macro-type-name': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

类型参数必须是对应宏的 `Props`、`Emits` 或 `Slots` 直接引用。本地声明、导入别名及未解析引用同等处理，只检查调用处使用的名称。

::: correct

```vue
<script setup lang="ts">
interface Props {
  title: string
}

type Emits = {
  save: [value: string]
}

type Slots = {
  default(props: { title: string }): unknown
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const slots = defineSlots<Slots>()
</script>

<template>
  <button
    @click="emit('save', props.title)"
    type="button"
  >
    Save
  </button>
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
interface ButtonProps {
  title: string
}

const props = defineProps<ButtonProps>()
</script>
```

:::

导入别名检查本地名，不检查导出名：

::: correct

```vue
<script setup lang="ts">
import type { ButtonProps as Props } from './types'

const props = defineProps<Props>()
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
import type { Props as ButtonProps } from './types'

const props = defineProps<ButtonProps>()
</script>
```

:::

即使单独启用本规则，内联约定也会报告：

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>
```

:::

`Props<T>` 满足名称要求，不检查其泛型参数内容。接受带括号类型及解码后的转义标识符。`Contracts.Props`、`import('./types').Props`、联合及交叉类型因需要直接具名引用，在整个类型参数上报告 `expectedNamedType`。`Partial<Props>` 等错误标识符仅在标识符处报告 `unexpectedTypeName`。每个符合条件调用最多报告一次。

## :wrench: 选项 {#options}

展开后的默认值：

```json
{
  "vue-perfectionist/require-macro-type-name": [
    "error",
    {
      "macros": {
        "defineProps": "Props",
        "defineEmits": "Emits",
        "defineSlots": "Slots"
      }
    }
  ]
}
```

每个宏接受精确、区分大小写的 TypeScript 类型别名标识符，或用 `false` 禁用。支持有效 Unicode 标识符。省略键保留默认值，`{}` 或 `{ macros: {} }` 也一样。

例如，对 props 使用组件特定名称，并保留默认 emits 和 slots 检查：

```json
{
  "macros": {
    "defineProps": "ButtonProps"
  }
}
```

拒绝未知字段/宏、`true`、`null`、数组、空名、空白、点分路径、模式及保留类型名。创建规则时即验证标识符，即使没有符合条件调用。不支持正则、文件名替换或导出名检查。

## 适用范围 {#scope}

仅检查 `.vue` setup 脚本中恰有一个显式类型参数、无运行时参数的 `defineProps`、`defineEmits`、`defineSlots`。调用必须是顶层变量初始化器（含解构）或表达式语句。接受括号和透明 TypeScript 包装。两种位置均允许未遮蔽的 `withDefaults` 将 `defineProps` 作为首参数包装，内层类型仅检查一次。

跳过导入或遮蔽宏、别名、成员/可选调用、任意外层表达式、嵌套函数/块、普通脚本调用、模板表达式及独立 JS/TS。双脚本仅检查 setup 调用。缺少解析器服务、运行时声明、缺少或多余类型参数及带运行时参数调用均跳过。`defineModel`、`defineExpose`、`defineOptions` 和自定义宏不在范围内。

不要求宏或缺失的类型参数必须存在，不证明 Vue 可编译类型，也不检查接收变量名。无需 TypeScript 项目或类型检查器。

可与 [`define-macros-type-style`](./define-macros-type-style.md) 组合控制类型声明位置。两者默认要求本地声明，并命名为 `Props`、`Emits`、`Slots`。要求某宏内联时，需在本规则设为 `false`，因为内联与直接具名要求冲突。两规则独立报告，不互相抑制诊断。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

不提供自动修复或建议，重命名可能破坏其他引用或与现有类型冲突。示例展示手动替代方式。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-macro-type-name.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-macro-type-name.test.ts)
