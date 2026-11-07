---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-template-type-assertion
description: 禁止在 Vue 模板中使用 as 类型断言。
---

# vue-perfectionist/no-template-type-assertion

> 禁止在 Vue 模板中使用 `as` 类型断言。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                              |
| -------- | ------------------------------------------------- |
| 适用范围 | 模板                                              |
| 默认行为 | 报告所有 as 断言（包括 as const），提示移至脚本。 |
| 必需选项 | 无；启用后即使用默认选项。                        |
| 自动修复 | —                                                 |
| 类型信息 | 不需要 TypeScript 类型服务。                      |

:::

<!-- summary:end -->

## 用法 {#usage}

为 `vue-eslint-parser` 配置 `@typescript-eslint/parser`，以解析模板中的 TypeScript 表达式。不需要 TypeScript 类型服务。

```js
import tsParser from '@typescript-eslint/parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/no-template-type-assertion': 'error' },
  },
]
```

## :book: 规则详情 {#rule-details}

将类型断言移至 `<script>`，让模板专注于渲染。优先使用准确的源类型或类型守卫。确实需要断言时，使用计算属性保留响应性，或使用接收模板局部变量的函数。

::: correct

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: unknown }>()
const label = computed(() => props.value as string)
</script>

<template>
  <AppLabel :value="label" />
  <span>{{ label }}</span>
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
defineProps<{ value: unknown }>()
</script>

<template>
  <AppLabel :value="value as string" />
  <span>{{ value as string }}</span>
</template>
```

:::

常量断言和链式断言也会报告，每个 `as` 断言分别产生一项诊断。

::: incorrect

```vue
<script setup lang="ts">
defineProps<{ value: unknown }>()
</script>

<template>
  <AppLabel :value="'ready' as const" />
  <span>{{ value as unknown as string }}</span>
</template>
```

:::

## :wrench: 选项 {#options}

此规则没有选项。

## 适用范围 {#scope}

检查 Vue 模板中所有成功解析的 `TSAsExpression`，包括插值、指令值、事件处理器、`v-for` 数据源、插槽默认值和动态指令参数。回调及其他表达式中嵌套的断言也会检查。引用 `v-for` 或插槽变量的断言同样报告；应移至接收这些变量的函数或子组件中。

不检查脚本块及独立 JavaScript/TypeScript 文件。跳过静态文本、静态属性、注释、`v-pre` 内容和解析器无法解析的表达式。此规则不禁止 `satisfies`、非空断言（`value!`）或尖括号类型断言（`<Type>value`）。

不提供自动修复或建议。提取时需要选择有意义的名称，并保留响应性和模板局部作用域。

## 替代方案：vue/no-restricted-syntax {#alternative-vue-no-restricted-syntax}

如果已使用 `eslint-plugin-vue`，也可以通过
[`vue/no-restricted-syntax`](https://eslint.vuejs.org/rules/no-restricted-syntax.html)
和 `TSAsExpression` 选择器实现相同检查。该规则检查模板表达式，并支持自定义提示：

```js
import tsParser from '@typescript-eslint/parser'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { vue },
    rules: {
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression',
          message: 'Move this type assertion into <script>.',
        },
      ],
    },
  },
]
```

本规则与替代方案二选一启用，避免重复报告。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-template-type-assertion.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-template-type-assertion.test.ts)
