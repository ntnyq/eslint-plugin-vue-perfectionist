---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-props-prefix
description: 要求在 Vue 模板中显式使用 props 对象前缀。
---

# vue-perfectionist/require-props-prefix

> 要求在 Vue 模板中显式使用 props 对象前缀。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                                |
| -------- | --------------------------------------------------- |
| 适用范围 | 模板                                                |
| 默认行为 | 报告 setup 组件模板中的裸 prop 引用；默认禁用修复。 |
| 必需选项 | 无；启用后即使用默认选项。                          |
| 自动修复 | 需显式启用                                          |
| 类型信息 | 不需要 TypeScript 类型服务。                        |

:::

<!-- summary:end -->

:wrench: 设置 `autofix: true` 后提供安全的自动修复；默认 `autofix: false` 仅报告问题，不修改代码。不提供编辑器建议。

## 用法 {#usage}

在已有的 `vue-eslint-parser` 配置中启用此规则。TypeScript 脚本还需要使用 `@typescript-eslint/parser` 作为脚本解析器。

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // 此处使用已有的 Vue 和 TypeScript 解析器配置。
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-props-prefix': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

通过 props 对象访问，让模板中的值明确显示其来源。规则检查 `<script setup>` 中由 `defineProps()` 或 `withDefaults(defineProps(), …)` 声明、且能静态确定的 prop 的裸引用。

::: correct

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>

<template>
  <h1>{{ props.title }}</h1>
  <Card
    :title="props.title"
    :data="{ title: props.title }"
  />
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>

<template>
  <h1>{{ title }}</h1>
  <Card
    :title
    :data="{ title }"
  />
</template>
```

:::

检查插值、指令值、事件处理器、动态指令参数和 `v-bind` 同名简写。支持运行时对象/数组声明、内联类型，以及非泛型的本地类型别名和接口（包括继承与交叉类型）。

脚本绑定和模板局部变量优先于 prop。例如，循环来源可以是 prop，而循环变量属于局部作用域。独立内层函数或块中的声明不会遮蔽外层 prop 引用。允许派生值，不继续追踪其数据流：

::: correct

<!-- eslint-skip -->

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ title: string; titles: string[] }>()
const label = computed(() => props.title.toUpperCase())
</script>

<template>
  <h1>{{ label }}</h1>
  <span
    v-for="title in props.titles"
    :key="title"
    >{{ title }}</span
  >
  <Card #default="{ title }">{{ title }}</Card>
</template>
```

:::

这是一项可读性约定。Vue 3.5+ 支持[响应式 props 解构](https://cn.vuejs.org/api/sfc-script-setup.html#reactive-props-destructure)，不能把“解构必然丢失响应性”作为使用本规则的理由。

### 与声明规则组合使用 {#combining-declaration-rules}

已将 `eslint-plugin-vue` 注册为 `vue`，并配置好两个插件和 Vue 解析器后，可以组合以下规则：

```js
rules: {
  'vue/define-props-destructuring': ['error', {
    destructure: 'never',
  }],
  'vue/require-macro-variable-name': ['error', {
    defineProps: 'props',
  }],
  'vue-perfectionist/require-props-prefix': ['error', {
    autofix: false,
  }],
}
```

- [`vue/define-props-destructuring`](https://eslint.vuejs.org/rules/define-props-destructuring.html) 的 `destructure: 'never'` 要求保存 props 对象，并禁止宏声明解构。
- [`vue/require-macro-variable-name`](https://eslint.vuejs.org/rules/require-macro-variable-name.html) 将绑定名称约束为 `props`。
- 本规则检查模板中的裸 prop 引用。

前缀从实际宏绑定推导，因此 `componentProps.title` 也可以使用；是否必须命名为 `props` 由命名规则负责。本规则不创建绑定、不改写解构声明，也不禁止脚本中的所有后续解构。解构得到的脚本绑定视为脚本局部变量，应使用声明规则禁止宏解构。

## :wrench: 选项 {#options}

默认配置：

```json
{
  "vue-perfectionist/require-props-prefix": ["error", { "autofix": false }]
}
```

### autofix

- **类型**：`boolean`
- **默认值**：`false`

设置 `autofix: true` 后，通过 ESLint `--fix` 或编辑器修复操作应用安全修复。不安全的引用仍只报告。未知选项和非布尔值会被拒绝。

启用后，符合条件的裸引用会补上实际绑定前缀；对象简写保留键名，同名绑定展开为显式值。以下示例展示一种受支持的转换：

::: incorrect props-prefix-autofix

```vue
<script setup>
const props = defineProps(['title'])
</script>

<template>
  <Card
    :title
    :data="{ title }"
    >{{ title }}</Card
  >
</template>
```

:::

::: correct props-prefix-autofix

```vue
<script setup>
const props = defineProps(['title'])
</script>

<template>
  <Card
    :title="props.title"
    :data="{ title: props.title }"
  >
    {{ props.title }}
  </Card>
</template>
```

:::

## 适用范围 {#scope}

仅检查具有完整 `<script setup>` 块和 Vue 模板解析器服务的 `.vue` 文件，支持 JavaScript、TypeScript 和双脚本单文件组件。宏必须是位于顶层变量初始化或表达式语句中的未绑定编译器宏。跳过导入或被局部变量遮蔽的宏、可选调用、嵌套调用、普通脚本的 props 和独立 JS/TS 文件。

分析基于语法，不需要 TypeScript 项目。不解析导入类型、泛型、映射/条件/工具类型、动态运行时声明、展开项和未知计算属性键；部分动态声明中显式已知的键仍会检查。存在多个 `defineProps()` 调用时直接跳过，不猜测组件约定。忽略未知模板名称、仅类型引用、注释、静态文本和 `v-pre` 内容。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

修复要求已有稳定的 `const` 标识符绑定到宏返回值，且该绑定在引用位置可访问，未被模板或表达式中的局部变量遮蔽。TypeScript 的 `enum` 和 `namespace` 运行时声明也参与遮蔽判断；声明名称不会被当成 prop 引用。无法确定绑定可见性时保持只报告。脚本或模板中任何对绑定的写入都会禁用修复。

即使启用 `autofix: true`，以下引用仍只报告：

- 缺少对象绑定、绑定为解构或可变声明，或使用事件处理器特殊名称 `$event` 作为 props 绑定。
- props 绑定使用 `Math`、`undefined`、`console` 等 Vue 模板全局名称。单独编译模板时，这些名称可能解析为全局值，而非 setup 绑定。
- 赋值、更新、删除、经成员写入及 `v-model` 目标。
- 直接调用 prop 函数及标签模板，避免改变依赖接收者的行为。经 prop 对象成员的调用保留原接收者，可以修复。
- 名为 `__proto__` 的对象简写，展开可能改变对象构造语义。

例如，以下报告不会自动插入声明：

::: incorrect props-prefix-autofix

```vue
<script setup>
defineProps(['title'])
</script>

<template>
  <h1>{{ title }}</h1>
</template>
```

:::

修复保留周围注释和换行风格，其他格式交给格式化工具。本规则不会让 prop 修改变得安全，应继续启用 `vue/no-mutating-props` 等 Vue 正确性规则。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-props-prefix.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-props-prefix.test.ts)
