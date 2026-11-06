---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-component-props
description: 要求使用 Vue 组件时提供配置的 prop。
---

# vue-perfectionist/require-component-props

> 要求使用 Vue 组件时提供配置的 prop。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                            |
| -------- | ------------------------------- |
| 适用范围 | 模板                            |
| 默认行为 | 配置组件 targets 后才执行检查。 |
| 必需选项 | `targets`                       |
| 自动修复 | —                               |
| 类型信息 | 不需要 TypeScript 类型服务。    |

:::

<!-- summary:end -->

## 用法 {#usage}

配置 Vue 解析器，并列出需要强制执行的组件约定。默认不检查任何组件。

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-component-props': [
        'error',
        {
          targets: [{ components: ['AppCounter'], props: ['count'] }],
          unknownBindings: 'report',
        },
      ],
    },
  },
])
```

对于 TypeScript 单文件组件，还需将 `languageOptions.parserOptions.parser` 配置为 `@typescript-eslint/parser`，见[指南](../guide/index.md)。

## :book: 规则详情 {#rule-details}

以下示例要求 `AppCounter` 必须传入 `count`。检查调用方是否提供 prop，与其值及子组件默认值无关。

::: correct

```vue
<template>
  <AppCounter :count="1" />
  <AppCounter count />
  <AppCounter :count="null" />
  <AppCounter :count="undefined" />
  <AppCounter :count />
  <AppCounter v-bind="{ count: 1 }" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppCounter />
  <AppCounter v-bind="{ title: 'Example' }" />
</template>
```

:::

可与 [component-prop-types](./component-prop-types.md) 组合约束值。例如，`:count="null"` 满足存在要求，但不满足 `number` 约定。

### 无法确定的绑定 {#uncertain-bindings}

未知对象展开及动态参数名可能提供缺失 prop。默认报告 `unverifiableRequiredProp`，不错误地断言 prop 缺失。

::: incorrect

```vue
<template>
  <AppCounter v-bind="extra" />
  <AppCounter :[key]="value" />
</template>
```

:::

一旦确定键已提供，后续未知展开可改变值，但不会移除其存在性：

::: correct

```vue
<template>
  <AppCounter
    :count="1"
    v-bind="extra"
  />
  <AppCounter v-bind="{ count: 1, ...extra }" />
  <AppCounter v-bind="{ ...extra, count: 1 }" />
</template>
```

:::

## :wrench: 选项 {#options}

默认值：

```json
{
  "targets": [],
  "unknownBindings": "report"
}
```

### `targets`

类型：`{ components: string[], props: string[] }[]`。默认值：`[]`。

每项要求非空且不重复的组件名和 prop 列表。空 `targets` 禁用检查，没有内置目标可扩展。重叠目标合并必需 prop，包括等价 camelCase/kebab-case 名称；每个元素的每个 prop 最多报告一次。

```json
{
  "targets": [
    {
      "components": ["AppPagination"],
      "props": ["currentPage", "pageSize"]
    },
    {
      "components": ["AppInput", "AppSelect"],
      "props": ["modelValue"]
    }
  ]
}
```

### `unknownBindings`

类型：`'report' | 'ignore'`。默认值：`'report'`。

`ignore` 仅抑制无法确定存在性的问题。已知对象缺少必需键时仍报告 `missingProp`，不会跳过整个元素的全部检查。

## 适用范围 {#scope}

- 通过 `vue-eslint-parser` 检查 SFC 模板，包括纯模板、普通脚本、setup 及双脚本。不检查独立脚本和渲染函数。
- 显式匹配组件名：`AppCounter` 与 `app-counter` 等价，`appcounter` 及未配置导入别名不匹配。不解析导入，不使用正则、glob 或跨文件分析。
- prop 名按 Vue 驼峰化匹配，`pageSize` 与 `page-size` 等价，`pagesize` 和 `page_size` 不等价。
- 跳过原生 HTML/SVG/MathML 及 `v-pre` 子树。不解析自定义元素编译器设置；显式列于 `targets` 的自定义标签仍检查。
- 跳过小写 `<slot>` 出口，即使配置了 `Slot`；大写 `<Slot>` 及插槽后备内容中的组件仍检查。
- 支持 `<component is="AppCounter">` 和 `<component :is="'AppCounter'">`，跳过 `:is="current"` 等动态身份。`is` 选择器必须显式提供，不能来自对象绑定。
- 识别静态属性、`v-bind:prop`、同名简写 `:prop`、对象字面量绑定、静态计算字符串键及嵌套字面量展开。未知展开和计算名使相关存在性无法确定。已知键的访问器和方法仍提供该键。
- 默认 `v-model` 识别为 `modelValue`，具名 `v-model:count` 识别为 `count`。带修饰符时，也识别生成的 `modelModifiers` 或 `<参数名>Modifiers` prop。不推断更新监听器。
- 解析 `:['count']` 等字符串动态参数，支持 `v-bind` 的 `.camel`。`v-bind` 的 `.prop` 和 `.attr` 对具名 prop 视为不确定，不假定其提供普通组件 prop。
- 拒绝配置 `class`、`style`、`key`、`ref`、`refFor`、`refKey`、`ref_for`、`ref_key`、`is` 和 `onClick` 等事件监听器键，其合并或框架语义不在约定范围内。
- 重复属性及无效指令交由 Vue 语法规则，本规则不添加语法诊断。

### 诊断与修复 {#diagnostics-and-fixes}

`missingProp` 指向组件标签名；`unverifiableRequiredProp` 指向妨碍证明存在性的绑定。消息保留配置的 prop 写法。

不提供自动修复或建议，因为无法为缺失 prop 选择正确值。组件默认值不满足调用方必须传入的要求。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-component-props.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-component-props.test.ts)
