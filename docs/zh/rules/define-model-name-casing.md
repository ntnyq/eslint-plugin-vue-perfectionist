---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/define-model-name-casing
description: 强制显式声明的 defineModel 名称使用指定的大小写风格。
---

# vue-perfectionist/define-model-name-casing

> 强制显式声明的 defineModel 名称使用指定的大小写风格。

:wrench: 仅在 `fix: true` 时提供自动修复。修复会改变组件的对外约定，默认禁用。

## 用法 {#usage}

在现有 `vue-eslint-parser` 配置中启用规则。TypeScript 脚本还需要以 `@typescript-eslint/parser` 作为脚本解析器。

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/define-model-name-casing': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

显式模型名称默认使用 `camelCase`。检查传给宏的名称，与接收变量及模板参数无关。

::: correct

```vue
<script setup lang="ts">
const fileList = defineModel<string[]>('fileList')
const modelValue = defineModel<string>()
</script>

<template>
  <FileUploader v-model:file-list="fileList" />
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
const fileList = defineModel<string[]>('file-list')
const userName = defineModel<string>('UserName')
</script>
```

:::

检查字符串字面量及无插值模板字面量，包括解码后的转义及透明 TypeScript 包装。每个不匹配名称在名称表达式处报告一次。

::: incorrect

```vue
<script setup lang="ts">
const files = defineModel(`file-list`)
const user = defineModel('user_name' as const)
</script>
```

:::

## :wrench: 选项 {#options}

默认配置如下：

```json
{
  "vue-perfectionist/define-model-name-casing": [
    "error",
    { "casing": "camelCase", "fix": false }
  ]
}
```

### casing

- **类型**：`'camelCase' | 'PascalCase' | 'kebab-case' | 'snake_case'`
- **默认值**：`'camelCase'`

名称必须与 [`uncase`](https://github.com/ntnyq/uncase) 规范化后的结果一致。例如，camelCase 下 `URLValue` 变为 `urlValue`。支持 Unicode 单词。这是大小写检查，不验证标识符或非空名称：规范化后不变的名称，包括空字符串及纯数字字符串，均被接受。

| casing       | 符合要求的名称 |
| ------------ | -------------- |
| `camelCase`  | `fileList`     |
| `PascalCase` | `FileList`     |
| `kebab-case` | `file-list`    |
| `snake_case` | `file_list`    |

例如，要求使用 snake_case：

```json
{ "casing": "snake_case" }
```

从不检查或重命名 `defineModel()` 的隐式默认模型，即使配置风格与 `modelValue` 不同。显式传入的 `'modelValue'` 按普通名称检查。未知字段及大小写名称（包括 `'pascalCase'` 等转换器别名）会被拒绝。

### fix

- **类型**：`boolean`
- **默认值**：`false`

设置 `fix: true`，允许 ESLint 的 `--fix` 按配置风格重命名显式模型：

```json
{
  "vue-perfectionist/define-model-name-casing": [
    "error",
    { "casing": "camelCase", "fix": true }
  ]
}
```

此配置会把 `defineModel('file-list')` 改为 `defineModel('fileList')`。默认 `fix: false` 时仅报告，不修复，也不提供编辑器建议。修复还受下述运行时兼容及冲突边界限制；`fix: true` 不代表所有转换都可修复。

::: warning 组件对外约定变更

启用后可能改变组件公开的 prop、`update:` 事件及修饰符 prop 名称。修复器无法更新其他文件的使用方，请同时检查和更新父级绑定、事件监听器、显式 prop 访问及测试。

:::

## 适用范围 {#scope}

仅检查 `.vue` setup 脚本顶层变量初始化器或表达式语句中未被遮蔽、未导入的 `defineModel` 调用。支持解构绑定、括号、透明 TypeScript 包装和双脚本 SFC。需要 Vue 解析器服务，不需要 TypeScript 项目或类型检查器，也不依赖自动导入设置。

跳过导入的宏（含别名和命名空间）、被遮蔽名称、可选调用、嵌套函数或块、任意外层表达式、普通脚本、模板及独立 JS/TS 文件。超过两个运行时参数的调用不做命名诊断或修复，但静态模型名称仍参与冲突检查。不解析缺失名称、仅选项调用、动态字符串、拼接、标识符及展开参数。

不约束变量名，不要求显式名称，不修改模板 `v-model` 参数，也不检查 `defineProps` / `defineEmits` 约定。识别可手动迁移的配套 prop 和事件声明请使用 [`prefer-define-model`](./prefer-define-model.md)。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

自动修复需要 `fix: true`，且仅替换显式名称字面量。保留引号分隔符、周围注释、括号、TypeScript 包装、选项、接收变量名、模板参数及换行符。被替换名称中的转义会规范化为转换后的值。

转换后的名称必须不受 Vue 驼峰化影响。本规则不推断使用方 Vue 运行时版本，也不提供版本覆盖，因此即使使用新版 Vue 也遵循此保守边界。例如，要求 `kebab-case` 时，`fileList` 仅报告而不修复：在 Vue 3.4.38 中将其改为 `file-list` 会使返回模型丢失值，即使父级绑定已更新。将 `FILE` 转为单词 `file` 则仍可修复。

这也阻止转换为 `model-value`。即使当前 Vue 版本中，编译器也生成 `model-valueModifiers`，而 `useModel` 读取特殊的 `modelModifiers`，因此从 `modelValue` 重命名仍可能丢失修饰符，即使父级绑定已更新。对于需要运行时驼峰化的名称，请在目标 Vue 运行时验证模型值和修饰符后手动迁移。

包含 `satisfies` 的名称参数仅报告不修复，包括被断言或非空表达式包裹的约束。重命名字面量可能违反字面量类型、联合类型或类型别名约束。缺少类型检查器时，即使 `satisfies string` 或 `satisfies unknown` 也保守地仅报告。返回模型 ref 外的 `satisfies` 不约束名称，因此不会禁用修复。

::: incorrect

```vue
<script setup lang="ts">
type Name = 'file-list'
const files = defineModel('file-list' satisfies Name)
</script>
```

:::

转换结果还必须在一次转换后保持稳定。部分 Unicode 大小写映射需要多次转换：PascalCase 下 `ß` 先变为 `SS`，再变为 `Ss`；camelCase 下 `İ` 先变为带组合点的 `i`，下一次移除该点。这些名称只报告，包括后续结果会与其他模型冲突的情况，以避免只完成部分约定重命名。稳定的 Unicode 转换仍可修复。受约束、不稳定及因运行时兼容而无法转换的名称，在冲突检查中保留其现有生成 prop 和运行时修饰符查找名称，而非假设的转换名称。

例如，将 `'file-list'` 改为 `'fileList'`，会把生成名称 `file-list`、`update:file-list`、`file-listModifiers` 改为 `fileList`、`update:fileList`、`fileListModifiers`。这不能证明使用方兼容。

即使 `fix: true`，空转换结果、Vue 保留 prop（如 `key`、`ref`、`ref_key` 和 vnode 生命周期钩子），以及与同一 setup 内其他模型现有或转换后名称冲突的模型或修饰符 prop，均只报告。保留名与冲突检查对值和修饰符 prop 都使用 Vue 驼峰化。例如，已有 `'foo-1'` 时不能将 `'Foo1'` 改为 `'foo1'`，因为二者均规范化为 `foo1`。也检查隐式 `modelValue` 及其他跳过命名检查的静态模型调用。现有名称如 `model-value` 会额外保留 `modelModifiers`，因为即使编译器生成不同 prop，Vue 也可能读取它，避免独立重命名后读取另一模型的修饰符。这些检查不保证与其他 prop 或使用方兼容。

冲突检查还保留 Vue 运行时查找修饰符时使用的原始、驼峰及连字符形式。仅生成 prop 不同不足以证明安全：缺少 `FooModifiers` 时，`Foo` 可回退读取 `fooModifiers`。例如，`casing: 'PascalCase'` 时，受保护的 `defineModel('foo' satisfies 'foo')` 会阻止另一模型从 `FOO` 改为 `Foo`，否则重命名模型可能继承首个模型的 `trim` 或 `number`，在父级绑定已更新后仍改变发出的值。也会阻止将模型值重命名为另一模型修饰符回退读取的 prop。互不影响的名称仍可修复。

模板字面量模型名称需要 [Vue 3.5.31+](https://github.com/vuejs/core/blob/main/CHANGELOG.md#3531-2026-03-25)。更早的编译器将其视为默认 `modelValue` 模型的选项。本规则不推断编译器版本，因此模板字面量名称还会保留 `modelValue` 和 `modelModifiers`，包括受 `satisfies` 约束或跳过命名检查的调用。与任一编译结果冲突的重命名均仅报告，其他独立模型仍可修复。

即使 `fix: true`，以下两个字符串字面量名称也仅报告而不修复，以避免旧编译器中的默认模型及修饰符冲突：

::: incorrect

```vue
<script setup>
const other = defineModel(`other`)
const value = defineModel('ModelValue')
const modifiers = defineModel('ModelModifiers')
</script>
```

:::

生成的 prop 与事件约定见 Vue 的 [defineModel 文档](https://vuejs.org/api/sfc-script-setup.html#definemodel)。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/define-model-name-casing.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/define-model-name-casing.test.ts)
