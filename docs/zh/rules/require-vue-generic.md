---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-vue-generic
description: 要求为配置的组件添加显式 `@vue-generic` 注释。
---

# vue-perfectionist/require-vue-generic

> 要求为配置的组件添加显式 `@vue-generic` 注释。

## 用法 {#usage}

配置 Vue 解析器并列出目标组件，默认不检查任何组件。豁免需要显式配置，无内置组件库约定。

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
      'vue-perfectionist/require-vue-generic': [
        'error',
        {
          targets: [
            {
              components: ['ElTableColumn'],
              ignoreWhen: [{ props: { type: { enum: ['index'] } } }],
            },
            { components: ['BusinessSelect', 'BusinessTreeSelect'] },
          ],
          unknownValues: 'report',
        },
      ],
    },
  },
])
```

TypeScript SFC 还需将 `languageOptions.parserOptions.parser` 配置为 `@typescript-eslint/parser`，见[指南](../guide/index.md)。

## :book: 规则详情 {#rule-details}

以下示例针对 `ElTableColumn`，豁免 `type` 确定为 `'index'` 的用法。未豁免时，使用处之前需有内容非空的 `@vue-generic {...}` 注释。

::: correct

```vue
<template>
  <!-- @vue-generic {import('#types').IAiCourse} -->
  <ElTableColumn label="Actions">
    <template #default="{ row }">
      <TableActionList :row />
    </template>
  </ElTableColumn>
  <ElTableColumn type="index" />
</template>
```

:::

`type="index"` 和 `:type="'index'"` 均满足此豁免。

::: incorrect

```vue
<template>
  <ElTableColumn label="Actions" />
  <ElTableColumn type="selection" />
  <!-- @vue-generic {} -->
  <ElTableColumn />
</template>
```

:::

### 注释内容与关联 {#comment-content-and-association}

接受导入类型名、内联类型、`import()` 类型及多个泛型参数。仅检查花括号内容非空；类型语法、解析、参数数量及组件兼容性由 `vue-tsc` 检查。

指令与组件之间可有空白和普通注释。前置注释组中最后一个带花括号的 `@vue-generic` 优先，最后一个内容为空则不满足要求。忽略没有外围花括号的指令。

::: correct

```vue
<script setup lang="ts">
import type { IAiCourse } from '#types'
</script>

<template>
  <!-- @vue-generic {IAiCourse} -->
  <!-- Render row actions. -->
  <ElTableColumn />
  <!-- @vue-generic {{ id: number }, string} -->
  <ElTableColumn />
</template>
```

:::

注释必须位于同父级组件使用处之前。其他元素、非空白文本及插值会中断关联。父组件泛型不满足子组件要求，注释不复用于下一个同级元素。HTML `<pre>` 内的空白也中断关联；SVG 或 MathML 命名空间中的 `<pre>` 不保留空白。不换行空格及其他非 ASCII 空白仍属于文本，即使位于 `<pre>` 外也会中断关联。

::: incorrect

```vue
<template>
  <!-- @vue-generic {Course} -->
  <OtherComponent />
  <ElTableColumn />

  <!-- @vue-generic {Course} -->
  <ElTableColumn>
    <ElTableColumn />
  </ElTableColumn>
</template>
```

:::

### 无法确定的豁免 {#uncertain-exemptions}

可能覆盖豁免 prop 的动态值及展开，无法证明确定豁免。默认 `unknownValues: 'report'` 仍要求泛型注释：

::: incorrect

```vue
<template>
  <ElTableColumn :type="columnType" />
  <ElTableColumn
    type="index"
    v-bind="extra"
  />
</template>
```

:::

`unknownValues: 'ignore'` 接受这些不确定用法。prop 确定缺失或条件确定不满足时仍要求注释。无关未知 prop 不会豁免整个组件。

## :wrench: 选项 {#options}

默认值：

```json
{
  "targets": [],
  "unknownValues": "report"
}
```

### `targets`

类型：`RequireVueGenericTarget[]`。默认值：`[]`。

空数组禁用检查，没有内置目标可扩展。每个目标包含：

| 字段         | 类型                                                        | 默认值 | 含义                   |
| ------------ | ----------------------------------------------------------- | ------ | ---------------------- |
| `components` | `string[]`                                                  | 必填   | 非空的显式组件名列表。 |
| `ignoreWhen` | `{ props: Record<string, ComponentPropValueConstraint> }[]` | `[]`   | 可替代的豁免条件。     |

PascalCase 和 kebab-case 等价。规范化组件名在全部目标间必须唯一，包括同一目标内别名。重叠目标会被拒绝，不静默合并豁免条件。

### `targets[].ignoreWhen`

任一条件确定匹配即可豁免。同一条件内全部列出 prop 必须存在且满足全部约束。空 `ignoreWhen` 不提供豁免；空 `props` 或约束对象会被拒绝。camelCase 与 kebab-case prop 等价，同条件内重复规范化 prop 名会被拒绝。

约束格式与 [`component-prop-values`](./component-prop-values.md) 共享：`enum`、`pattern`、`minLength`、`maxLength`、`minimum`、`maximum`、`multipleOf`。枚举仅含字符串、有限数值、布尔值或 `null`，不强制转换。模式是无隐式锚点的 Unicode 正则源码，长度按码点计数。不能混用数值和字符串约束，边界需有序，`multipleOf` 必须为正安全整数。与组件 prop 规则一样，拒绝 `class`、`ref`、`is` 和事件监听器键等不支持的名称。

例如，豁免索引列，或 `field` 以 `internal` 开头且 `count` 为 2 到 4 之间偶数的列：

```json
{
  "targets": [
    {
      "components": ["AppColumn"],
      "ignoreWhen": [
        {
          "props": {
            "type": {
              "enum": ["index"]
            }
          }
        },
        {
          "props": {
            "fieldName": {
              "pattern": "^internal"
            },
            "count": {
              "minimum": 2,
              "maximum": 4,
              "multipleOf": 2
            }
          }
        }
      ]
    }
  ]
}
```

解析标量字面量、受支持数值常量运算、无插值模板字面量、条件变体及带嵌套展开的对象字面量绑定。不执行代码，不追踪脚本变量，不信任断言类型，也不应用子组件默认值。绑定顺序影响结果：未知展开后的已知写入可确定值；后续未知展开可使其失效。动态参数名及 `v-bind` 的 `.prop` / `.attr` 使相关 prop 不确定。

`v-model` 修饰符会生成对象类型的 `modelModifiers` 或 `<参数名>Modifiers` prop。这些写入遵循显式绑定的去重和覆盖顺序，其对象值无法满足标量豁免条件。

### `unknownValues`

类型：`'report' | 'ignore'`。默认值：`'report'`。

- `report`：除非确定满足豁免，否则要求注释。
- `ignore`：也跳过可能满足豁免的用法。只要任一 prop 确定不匹配，该条件就不成立，即便另一个 prop 的值未知。

即使确切值未知，只要已知类型与所有枚举成员的类型均不兼容，仍属于确定不匹配。例如，`:type="!value"` 不可能满足 `enum: ['index']`，因此 `ignore` 仍要求泛型注释。

条件表达式同时有匹配及不匹配变体时，条件不确定。替代条件独立求值，不证明不同 prop 相关性，也不合并不同条件的部分匹配。没有豁免条件时，`ignore` 无效果。

## 适用范围 {#scope}

- 检查 SFC 模板，包括纯模板、普通脚本、setup 及双脚本。跳过原生标签及 `v-pre` 子树，不检查独立脚本、渲染函数和 TSX。
- 跳过小写 `<slot>` 出口，即使配置 `Slot`。大写 `<Slot>` 及插槽后备内容中的组件仍检查。
- 显式匹配组件写法，不解析导入或别名。通过共享匹配器支持 `<component is="ElTableColumn">` 和 `<component :is="'ElTableColumn'">`，跳过未解析动态身份。
- 即使 prop 可推断泛型或脚本绑定已特化组件，仍要求显式注释。仅配置需要此规范的组件名。
- 当前组件的 `<script setup generic="T">`、`generic` 属性及 `:generic` 绑定不满足要求。
- 不验证组件实际支持泛型，语言特性见 [Vue 泛型组件文档](https://vuejs.org/api/sfc-script-setup.html#generics)。

### 诊断与修复 {#diagnostics-and-fixes}

注释缺失、错位或为空时，`missingVueGeneric` 指向组件起始标签名。不提供自动修复或建议，正确泛型需由作者选择。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-vue-generic.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-vue-generic.test.ts)
