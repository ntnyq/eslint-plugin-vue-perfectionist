---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/component-prop-types
description: 强制在 Vue 组件使用处传入符合配置类型的 prop 值。
---

# vue-perfectionist/component-prop-types

> 强制在 Vue 组件使用处传入符合配置类型的 prop 值。

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
      'vue-perfectionist/component-prop-types': [
        'error',
        {
          targets: [{ components: ['AppStepper'], props: { count: 'number' } }],
          unknownValues: 'ignore',
        },
      ],
    },
  },
])
```

对于 TypeScript 单文件组件，还需将 `languageOptions.parserOptions.parser` 配置为 `@typescript-eslint/parser`，见[指南](../guide/index.md)。

## :book: 规则详情 {#rule-details}

以下示例为 `AppStepper` 配置 `count: 'number'`。静态属性值为字符串，数值 prop 需要使用产生数值的表达式。

::: correct

```vue
<template>
  <AppStepper :count="20" />
  <AppStepper :count="-42" />
  <AppStepper :count="condition ? 1 : 2" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppStepper count="20" />
  <AppStepper count="20" />
  <AppStepper :count="null" />
  <AppStepper :count="condition ? 1 : '2'" />
</template>
```

:::

缺少 prop 不属于类型错误。要求 prop 存在请使用 [require-component-props](./require-component-props.md)。默认忽略无法确定的表达式，这表示未得出类型结论，并不表示值通过了验证。

### 最终生效的值与绑定顺序 {#effective-values-and-binding-order}

该规则遵循 Vue 编译器与运行时的 prop 合并行为。在一组显式属性和具名绑定中，重复的静态原始键以首次出现的值为准；对象字面量中则以最后一个键为准。对象形式的 `v-bind`、对象形式的 `v-on` 及动态事件名会拆分显式绑定组，后续组覆盖前面的值。计算形式的绑定参数始终按顺序写入，即使参数是常量字符串。

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/component-prop-types
<template>
  <AppStepper
    count="wrong"
    v-bind="{ count: 1 }"
  />
  <AppStepper
    v-bind="extra"
    :count="1"
  />
  <AppStepper v-bind="{ ...extra, count: 1 }" />
  <AppStepper
    :count="1"
    count="wrong"
  />
</template>
```

:::

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/component-prop-types
<template>
  <AppStepper
    v-bind="{ count: 1 }"
    count="wrong"
  />
  <AppStepper v-bind="{ ...extra, count: 'wrong' }" />
  <AppStepper
    count="wrong"
    :count="1"
  />
</template>
```

:::

对于 `:count="1" v-bind="extra"` 和 `{ count: 1, ...extra }`，键仍然存在，但最终值无法确定。混用 `pageSize` 与 `page-size` 等原始写法也会导致最终值无法确定：不能用简单合并规范化名称来代替 Vue 先合并原始键、后规范化 prop 的行为。

## :wrench: 选项 {#options}

默认值：

```json
{
  "targets": [],
  "unknownValues": "ignore"
}
```

### `targets`

类型：`{ components: string[], props: Record<string, Constraint> }[]`。默认值：`[]`。

每个目标需要非空且不重复的组件名列表，以及非空的 prop 映射。空 `targets` 数组会禁用检查；没有内置目标。每项约束可以是单个类型、非空且不重复的类型联合，或描述对象：

```json
{
  "targets": [
    {
      "components": ["AppSelect"],
      "props": {
        "label": "string",
        "modelValue": ["string", "number", "null"],
        "options": "array",
        "filter": "function",
        "disabled": {
          "type": "boolean",
          "booleanCasting": true
        }
      }
    }
  ]
}
```

| 类型        | 含义                                                  |
| ----------- | ----------------------------------------------------- |
| `string`    | 字符串                                                |
| `number`    | 数值，不限制整数、范围或有限性                        |
| `boolean`   | 布尔值                                                |
| `array`     | 数组，不检查元素类型                                  |
| `object`    | 排除数组及 `null` 的对象，不检查字段                  |
| `function`  | 函数，不检查签名                                      |
| `bigint`    | BigInt 值                                             |
| `symbol`    | Symbol 值；本版本无法确定通常用于产生 Symbol 的表达式 |
| `null`      | 显式的 `null`                                         |
| `undefined` | 显式的 `undefined` 或 `void` 表达式                   |

联合类型的顺序不影响行为。`null` 和 `undefined` 必须显式允许。匹配目标的不同 prop 约束会合并，等价约束可重复配置；同一规范化组件和 prop 的类型或 `booleanCasting` 冲突会抛出配置错误，包括同一 prop 映射内的冲突。

### `booleanCasting`

描述对象字段：`boolean`。默认值：`false`。

仅当实际组件为此 prop 启用了 Vue 布尔值转换（包括空字符串转换）时才应设置。它模拟将 `''` 或连字符形式的 prop 名称转换为 `true`，适用于静态属性、已知绑定字符串和对象绑定值。

为 `AppButton` 配置 `disabled: { type: 'boolean', booleanCasting: true }` 时：

::: correct

```vue
<template>
  <AppButton disabled />
  <AppButton disabled="" />
  <AppButton disabled="disabled" />
  <AppButton :disabled="false" />
  <AppButton disabled="" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppButton disabled="false" />
  <AppButton disabled="true" />
</template>
```

:::

未启用 `booleanCasting` 时，无值属性为空字符串。`type: ['boolean', 'string']` 的顺序不表示转换顺序：Vue 实际声明的 `[Boolean, String]` 和 `[String, Boolean]` 行为不同。若仅推断为字符串、无法确定具体字面量，它可能转换为布尔值，也可能保持字符串，因此仅允许布尔值的约定可能报告潜在不匹配。

### `unknownValues`

类型：`'ignore' | 'report'`。默认值：`'ignore'`。

设为 `report` 后，对于确定已传入、但无法确定类型的 prop，报告 `unverifiablePropType`。如果连是否存在都无法确定（如仅有 `v-bind="extra"`），交由 `require-component-props` 检查。即使另一分支无法确定且本选项为 `ignore`，已知错误分支仍会报告。

## 适用范围 {#scope}

组件匹配、prop 规范化、原生标签和插槽出口排除、`v-pre`、静态动态组件、指令支持及保留 prop 限制与 [require-component-props](./require-component-props.md#scope) 共享。仅检查 SFC 模板，不检查脚本声明和渲染函数。

| 表达式形式                                    | 推断类别                                        |
| --------------------------------------------- | ----------------------------------------------- |
| 字符串、数值、布尔值、BigInt 和 `null` 字面量 | 对应类别                                        |
| 模板字面量                                    | `string`                                        |
| 数组，包括未知元素或展开项                    | `array`                                         |
| 对象字面量，包括未知字段                      | `object`                                        |
| 函数表达式和箭头函数                          | `function`                                      |
| 正则表达式字面量                              | `object`                                        |
| `void expression`                             | `undefined`                                     |
| `undefined`                                   | 仅在未被脚本或模板绑定遮蔽时推断为 `undefined`  |
| `!value`、`!!value`                           | `boolean`                                       |
| `typeof value`                                | `string`                                        |
| 对已知数值使用一元 `+`、`-`、`~`              | 对应数值类别；对 BigInt 使用一元 `+` 仍无法确定 |
| 条件表达式                                    | 各分支类别的联合，包括无法确定的分支            |
| 标识符、成员访问、调用和其他运算符            | 无法确定                                        |

TypeScript 断言、`satisfies` 和非空断言仅被移除包装，不作为运行时证据。不跟踪脚本初始化器，不解包 ref，不使用 TypeScript 类型服务、导入定义或函数执行结果，也不模拟组件默认值和自定义转换。完整的 SFC 类型检查请使用 `vue-tsc`。

默认和具名 `v-model` 会提供相应 prop，但 `.number` 和 `.trim` 不能确定父级当前表达式的类型。对象 getter/setter 的值无法确定。不支持的 `.prop` 和 `.attr` 绑定会使对应 prop 的值无法确定。

### 诊断与修复 {#diagnostics-and-fixes}

- `invalidPropType`：已知类别不被允许。
- `possiblyInvalidPropType`：某个可能的分支或类别不被允许。
- `unverifiablePropType`：`unknownValues: 'report'` 下，传入值仍无法确定。

每个元素中，每个配置的 prop 最多报告一次，位置为最终生效的属性值、绑定表达式、对象属性值，或引入不确定性的绑定。消息保留配置中的 prop 写法。

不提供自动修复或编辑器建议。将 `count="20"` 改为 `:count="20"` 会改变传入组件的值，需要使用者自行决定。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/component-prop-types.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/component-prop-types.test.ts)
