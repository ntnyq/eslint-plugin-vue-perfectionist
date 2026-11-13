---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-composable-return-bindings
description: 要求组合式函数的返回字段暴露本地绑定。
---

# vue-perfectionist/require-composable-return-bindings

> 要求组合式函数的返回字段暴露本地绑定。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| 适用范围 | Vue 脚本及独立 JS/TS 文件                              |
| 默认行为 | 暴露本地绑定；允许改名；禁止直接暴露参数及内联表达式。 |
| 必需选项 | 无；启用后即使用默认选项。                             |
| 自动修复 | —                                                      |
| 类型信息 | 不需要 TypeScript 类型服务。                           |

:::

<!-- summary:end -->

让返回对象专注于暴露组合式函数的 API：先声明值和函数，再返回绑定。这是一项可选的项目约定，并非 Vue 的强制要求。

## 用法 {#usage}

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-composable-return-bindings': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
  },
])
```

本规则仅使用语法和词法作用域信息，不需要 TypeScript 类型服务、项目配置或 Vue 导入。

## :book: 规则详情 {#rule-details}

暴露当前组合式函数内部声明的绑定。默认允许返回时改名；变量的初始化表达式可以是任意表达式，本规则不检查其内容。

::: correct

```ts
import { computed, ref } from 'vue'

function useResize() {
  const direction = ref('horizontal')
  const { position } = usePosition()
  const resizing = computed(() => state.resizing)

  function beginResize() {}

  return { position, resizing, beginResize, resizeDirection: direction }
}
```

:::

直接写在返回对象中的字面量、调用、属性访问、计算、函数、方法、getter、setter、数组和嵌套对象都会报告。嵌套对象作为内联值只报告一次，不递归检查内部字段。

::: incorrect

```ts
import { computed } from 'vue'

function useResize() {
  return {
    enabled: true,
    position: state.position,
    area: width.value * height.value,
    direction: computed(() => state.direction),
    beginResize: () => start(),
    stopResize() {},
    get resizing() {
      return state.resizing
    },
  }
}
```

:::

### 本地绑定 {#local-bindings}

绑定必须解析为当前函数体内拥有的声明，且在返回位置可见。变量（`const`、`let`、`var`）、函数和类声明、枚举绑定、catch 绑定及解构绑定均符合条件。块内声明在可见的同一作用域内返回时也允许。本规则检查词法关系，不分析是否完成赋值或初始化。

模块变量、导入、外层函数绑定、全局变量、未解析标识符和仅类型声明不符合要求。默认也不允许直接暴露参数。通过本地别名可以显式建立符合条件的绑定，即使初始化表达式来自外部变量或参数也允许。

::: incorrect

```ts
import { reset } from './actions'

const count = 0

function useResize(target) {
  return { count, reset, target }
}
```

:::

::: correct

```ts
import { reset } from './actions'

function useResize(target) {
  const localTarget = target
  const resetResize = reset
  return { target: localTarget, reset: resetResize }
}
```

:::

### 显式公开字段 {#explicit-public-fields}

展开成员一律报告，即使展开的是本地绑定。字段名必须静态可知：支持标识符键、原始值字面量（包括计算属性形式）、带正负号的数字字面量，以及无插值模板。计算属性中的标识符和字符串拼接会报告，不会尝试求值。

非计算、冒号形式的 `__proto__: value` 会设置对象原型，因此报告。简写 `__proto__` 和计算属性 `['__proto__']` 则是普通字段。

::: incorrect

```ts
function useResize() {
  const count = 0
  const key = 'count'
  const state = { count }
  return { ...state, [key]: count, __proto__: state }
}
```

:::

::: correct

```ts
function useResize() {
  const count = 0
  const __proto__ = null
  return { count: count, ['total']: count, __proto__, ['__proto__']: __proto__ }
}
```

:::

## :wrench: 选项 {#options}

```js
{
  'vue-perfectionist/require-composable-return-bindings': [
    'error',
    {
      functionPattern: '^use[A-Z]',
      ignoreNames: [],
      allowAliases: true,
      allowParameters: false,
    },
  ],
}
```

| 选项              | 类型       | 默认值        | 含义                                                                     |
| ----------------- | ---------- | ------------- | ------------------------------------------------------------------------ |
| `functionPattern` | `string`   | `'^use[A-Z]'` | 匹配函数绑定名的正则表达式。空字符串匹配所有具名定义；无效正则会被拒绝。 |
| `ignoreNames`     | `string[]` | `[]`          | 精确排除的绑定名，优先于正则。替换整个列表；空数组不排除任何函数。       |
| `allowAliases`    | `boolean`  | `true`        | 是否允许静态公开字段名与绑定名不同。                                     |
| `allowParameters` | `boolean`  | `false`       | 是否允许当前函数的参数绑定，包括解构、默认值和剩余参数。                 |

### `allowAliases`

设置 `allowAliases: false` 时，将静态公开字段名与引用的绑定名比较。显式写法 `direction: direction` 仍然允许；该选项不强制简写语法。对于解构参数，比较的是本地绑定名，而非参数中原来的属性名。

::: correct return-bindings-no-aliases

```ts
function useResize() {
  const direction = 'horizontal'
  return { direction, direction: direction, ['direction']: direction }
}
```

:::

::: incorrect return-bindings-no-aliases

```ts
function useResize() {
  const direction = 'horizontal'
  return { resizeDirection: direction }
}
```

:::

### `allowParameters`

设置 `allowParameters: true` 后，允许当前组合式函数的参数。外层函数的参数仍不符合要求。改名策略独立生效，也适用于允许暴露的参数。

::: correct return-bindings-parameters

```ts
function useResize(target, { disabled }) {
  return { target, disabled }
}
```

:::

### 函数选择 {#function-selection}

例如，检查 `createXxx` 定义，并排除 `createLegacy`：

```js
{ functionPattern: '^create[A-Z]', ignoreNames: ['createLegacy'] }
```

::: correct return-bindings-custom-names

```ts
function createLegacy() {
  return { enabled: true }
}
function useResize() {
  return { enabled: true }
}
```

:::

::: incorrect return-bindings-custom-names

```ts
function createResize() {
  return { enabled: true }
}
```

:::

## 检查范围 {#scope}

支持独立 JS/TS 文件，以及 Vue 单文件组件的普通 `<script>` 和 `<script setup>`；不检查模板表达式。使用 ESLint 的 `files` 和 `ignores` 选择文件。

检查匹配名称的函数声明，以及直接赋给标识符变量的箭头函数和函数表达式。变量名优先于函数表达式内部名称。支持具名默认导出、async 函数、嵌套具名定义，以及各个直接返回的分支。

仅检查直接返回的对象字面量，包括箭头函数的表达式函数体，以及透明的括号、TypeScript `as`、`satisfies`、尖括号类型断言和非空断言包装。嵌套回调的返回不属于外层组合式函数；自身名称匹配的嵌套函数独立检查。

间接返回（`return result`）、包装调用（`return reactive({ count })`）、条件返回（`return ready ? { count } : {}`）、匿名默认导出、对象或类方法、生成器和高阶函数包装不在范围内。本规则不强制函数返回对象。

## 诊断与修复 {#diagnostics-and-fixes}

每个违规成员最多产生一条诊断。先检查展开、动态键和原型设置，再检查字段值；先检查绑定来源和参数策略，再检查改名。

本规则不提供自动修复或建议修复。提取表达式可能改变求值时机、分支行为、闭包或访问器语义，自动生成的变量名也可能冲突。请手动选择声明及其位置。

可独立启用 [sort-composable-return](/zh/rules/sort-composable-return) 检查成员分组和空白。本规则检查字段如何产生，排序规则检查字段布局。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-composable-return-bindings.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-composable-return-bindings.test.ts)
