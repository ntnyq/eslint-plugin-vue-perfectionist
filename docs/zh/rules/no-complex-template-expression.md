---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-complex-template-expression
description: 限制 Vue 模板中逻辑运算符的数量和条件表达式的嵌套层数。
---

# vue-perfectionist/no-complex-template-expression

> 限制 Vue 模板中逻辑运算符的数量和条件表达式的嵌套层数。

## 用法 {#usage}

配置 `vue-eslint-parser`，见[快速开始](/zh/guide/)。

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/no-complex-template-expression': 'error' },
  },
]
```

## :book: 规则详情 {#rule-details}

将分支逻辑提取为计算属性或具名函数，以保持条件和绑定易读。简单的翻译或格式化调用不受影响。

::: correct

```vue
<template>
  <button
    :disabled="isDisabled"
    type="button"
  >
    {{ t('submit') }}
  </button>
  <span>{{ ready ? label : fallback }}</span>
  <div v-if="name && source && category" />
</template>
```

:::

::: incorrect

```vue
<template>
  <button
    :disabled="!name.trim() || (!source && !category) || uncertain"
    type="button"
  />
  <span>{{ pending ? 'loading' : failed ? 'error' : 'done' }}</span>
</template>
```

:::

## :wrench: 选项 {#options}

```json
{
  "maxLogicalExpressions": 2,
  "maxConditionalDepth": 1,
  "directives": ["if", "else-if", "show", "bind"],
  "checkInterpolations": true,
  "ignoreScopeReferences": false
}
```

- `maxLogicalExpressions`（非负整数，默认 `2`）：每个表达式中 `&&`、`||`、`??` 的总数。`a && b && c` 计两个；调用参数、数组、对象、计算键及内联回调体内均计入。`0` 禁止所有逻辑运算符。
- `maxConditionalDepth`（非负整数，默认 `1`）：三元表达式的最深嵌套层数。单个三元表达式为一层，条件及分支中的嵌套同等计数；同级三元表达式不叠加深度。`0` 禁止三元表达式。
- `directives`（数组，默认 `["if", "else-if", "show", "bind"]`）：替换要检查的指令名称，不带 `v-` 前缀或参数。也接受 `text`、`html`、`model`、`memo`；`[]` 禁用指令检查。
- `checkInterpolations`（布尔值，默认 `true`）：检查 `{{ expression }}`。
- `ignoreScopeReferences`（布尔值，默认 `false`）：表达式引用运行时可见的 `v-for` 或插槽变量时，跳过整个表达式。仅类型引用不算。`v-if`/`v-else-if` 无法使用同元素的 `v-for` 别名，插槽变量仅对子级可见；外层循环或插槽变量在这些位置仍有效。同元素其他表达式仍检查。默认检查局部表达式：应提取到接收 `item`/`row` 的函数或子组件，而非无法访问模板局部变量的计算属性。

例如，允许三个逻辑运算符，并跳过依赖循环或插槽变量的表达式：

```json
{ "maxLogicalExpressions": 3, "ignoreScopeReferences": true }
```

## 适用范围 {#scope}

仅检查由 `vue-eslint-parser` 解析的 Vue 模板表达式。跳过独立 JS/TS、脚本、静态属性、动态指令参数及空或无法解析的表达式。TypeScript 包装不重置指标，擦除的类型注解及类型参数不计入。每个绑定和插值独立计数。

调用、算术、成员访问、可选链和取反本身不计入，但其中嵌套的逻辑和条件表达式仍计入。只度量这两项指标，不衡量所有复杂度。同一表达式同时超限时报告两项诊断，均定位到完整表达式。

始终不检查 `v-on`、`v-for` 数据源及插槽绑定模式。分别使用 [prefer-simple-event-handler](./prefer-simple-event-handler.md) 和 [no-complex-v-for-source](./no-complex-v-for-source.md)。

不提供自动修复或建议。提取时需要选择有意义的名称，并保留响应性和模板局部作用域。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-complex-template-expression.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-complex-template-expression.test.ts)
