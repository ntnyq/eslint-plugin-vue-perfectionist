---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-complex-v-for-source
description: 禁止在 Vue `v-for` 数据源中使用复杂表达式。
---

# vue-perfectionist/no-complex-v-for-source

> 禁止在 Vue `v-for` 数据源中使用复杂表达式。

将复杂表达式移到脚本变量或计算属性，保持迭代数据源易读。本规则仅报告，不提供自动修复或建议。

## 用法 {#usage}

以下完整扁平化配置支持 JavaScript 和 TypeScript Vue 单文件组件：

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/no-complex-v-for-source': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

仅检查 `in` 或 `of` 右侧的数据源。接受标识符、属性访问、计算键及可选链；默认允许调用和原始值字面量：

::: correct

```vue
<template>
  <div
    v-for="(item, index) in items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in ITEMS"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in props.items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in state?.items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[key]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[0]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems()"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items.filter(predicate)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getData().items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[getKey()]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(n, index) in 10"
    :key="index"
  >
    {{ n }}
  </div>
  <div
    v-for="(char, index) in 'hello'"
    :key="index"
  >
    {{ char }}
  </div>
</template>
```

:::

禁止数组和对象字面量、三元和逻辑表达式、算术、赋值、自增自减、逗号表达式、构造调用、内联函数及含插值模板字面量。递归检查成员接收者和计算键，因此不能用属性访问隐藏复杂数据源：

::: incorrect

```vue
<template>
  <div
    v-for="(item, index) in [1, 2, 3]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(value, index) in { a: 1 }"
    :key="index"
  >
    {{ value }}
  </div>
  <div
    v-for="(item, index) in enabled ? a : b"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items || []"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in [a, b][0]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[index + 1]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in new Set(items)"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

## :wrench: 选项 {#options}

默认配置如下：

```json
{
  "vue-perfectionist/no-complex-v-for-source": [
    "error",
    {
      "allowCallExpression": true,
      "allowLiteral": true
    }
  ]
}
```

| 选项                  | 类型      | 默认值 | 含义                                     |
| --------------------- | --------- | ------ | ---------------------------------------- |
| `allowCallExpression` | `boolean` | `true` | 允许数据源、成员接收者及计算键中的调用。 |
| `allowLiteral`        | `boolean` | `true` | 允许原始值字面量直接作为迭代数据源。     |

### `allowCallExpression`

设置 `{ allowCallExpression: false }` 时，以下调用会报告，包括可选调用及嵌套在属性访问中的调用：

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-complex-v-for-source
<script setup>
/* eslint vue-perfectionist/no-complex-v-for-source: [error, { allowCallExpression: false }] */
</script>

<template>
  <div
    v-for="(item, index) in getItems()"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items.filter(predicate)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getData().items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[getKey()]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems?.()"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

允许调用时，仍递归检查被调用者。例如，`[a, b].filter(predicate)` 的接收者是数组字面量，仍被禁止。不检查调用参数、展开参数及回调函数体：

::: correct

```vue
<template>
  <div
    v-for="(item, index) in getItems(10)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems([1, 2], { active: true })"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems(ok ? first : second)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems(...args)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items.filter(item => item.active)"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

### `allowLiteral`

设置 `{ allowLiteral: false }` 时，直接使用原始值作为数据源会报告：

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-complex-v-for-source
<script setup>
/* eslint vue-perfectionist/no-complex-v-for-source: [error, { allowLiteral: false }] */
</script>

<template>
  <div
    v-for="(n, index) in 10"
    :key="index"
  >
    {{ n }}
  </div>
  <div
    v-for="(char, index) in 'hello'"
    :key="index"
  >
    {{ char }}
  </div>
</template>
```

:::

该选项涵盖数值、字符串、布尔值、null、bigint 字面量、带符号数值字面量及无插值模板字面量。正则、数组及对象始终不视为原始值字面量。本规则检查语法，不判断值是否适合或能有效地用作 Vue 迭代数据源。

仅控制直接作为数据源的字面量，包括括号或 TypeScript 断言包装的形式。成员接收者、计算键及调用参数中的字面量仍允许：

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-complex-v-for-source
<script setup>
/* eslint vue-perfectionist/no-complex-v-for-source: [error, { allowLiteral: false }] */
</script>

<template>
  <div
    v-for="(item, index) in ITEMS"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[0]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in state['items']"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems(10)"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

两个选项互相独立。即使同时禁用，仍接受 `items`、`state.items` 和 `groups[0]` 等引用和属性访问。

## 适用范围 {#scope}

- 检查原生元素、组件及嵌套 `<template>` 上的 `v-for`。每个源表达式最多报告一次，范围覆盖整个表达式。
- 递归检查成员接收者、计算键及被调用者。括号、可选链、TypeScript 断言、非空断言、`satisfies` 和泛型实例化无法绕过检查。
- 不检查 `in` / `of` 左侧别名或解构默认值、其他指令值、插值或脚本实现。
- 不追踪变量初始化器、导入、计算属性 getter 或函数实现。以数组或调用初始化的变量仍被接受。
- 支持无脚本、普通脚本、setup 或双脚本 SFC。不影响独立 JS/TS；安全跳过不提供 Vue 模板访问器服务的解析器。
- 跳过缺失、空白或无法解析的指令值。无效 `v-for` 语法请使用 Vue 正确性规则检查。

## 自动修复 {#automatic-fixes}

不提供自动修复或建议。提取数据源需要选择声明位置，保留模板局部绑定、响应性及求值时机。请手动移到合适的脚本变量、计算属性或函数中。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-complex-v-for-source.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-complex-v-for-source.test.ts)
