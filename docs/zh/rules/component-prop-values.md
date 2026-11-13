---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/component-prop-values
description: 强制在 Vue 组件使用处传入符合配置约束的 prop 值。
---

# vue-perfectionist/component-prop-values

> 强制在 Vue 组件使用处传入符合配置约束的 prop 值。

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

此规则可要求值为十的倍数、数值位于指定范围、值属于允许的变体，或字符串符合指定长度及模式。这些是规则实现的轻量约束，并非某种 JSON Schema 方言，不需要额外的验证依赖。

仅报告问题，不提供自动修复或编辑器建议，因为修改 prop 值可能改变应用行为。

## 用法 {#usage}

在扁平化配置中使用 Vue 解析器注册插件：

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
      'vue-perfectionist/component-prop-values': [
        'error',
        {
          targets: [
            {
              components: ['AppStepCounter'],
              props: { count: { multipleOf: 10 } },
            },
          ],
          unknownValues: 'report',
        },
      ],
    },
  },
])
```

对于 TypeScript 单文件组件，将 Vue 解析器的 `parserOptions.parser` 配置为 `@typescript-eslint/parser`，见[安装指南](../guide/index.md#basic-usage)。

## :book: 规则详情 {#rule-details}

以下示例使用上述配置。所有已知候选值都必须满足约束。数值约束要求有限数值，不会转换字符串。

::: correct

```vue
<template>
  <AppStepCounter :count="20" />
  <AppStepCounter :count="0" />
  <AppStepCounter :count="-10" />
  <AppStepCounter :count="10 * 3" />
  <AppStepCounter :count="enabled ? 20 : 30" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppStepCounter :count="25" />
  <AppStepCounter count="20" />
  <AppStepCounter :count="enabled ? 20 : 25" />
</template>
```

:::

即使另一个分支无法确定且 `unknownValues` 为 `'ignore'`，已知无效分支仍会报告。同一传入 prop 违反多项约束时只报告一次，列出失败的约束及无效值。

设置 `unknownValues: 'report'` 后，无法确定的值会产生另一类诊断，说明该值无法验证：

::: incorrect

```vue
<template>
  <AppStepCounter :count="currentCount" />
  <AppStepCounter :count="getCount()" />
  <AppStepCounter :count="value * 10" />
  <AppStepCounter
    :count="20"
    v-bind="extra"
  />
</template>
```

:::

未知的对象绑定可能覆盖已知值。prop 不存在原始键别名歧义时，后续组中的已知绑定可以重新确定该值：

::: correct

```vue
<template>
  <AppStepCounter
    v-bind="extra"
    :count="20"
  />
  <AppStepCounter v-bind="{ ...extra, count: 20 }" />
</template>
```

:::

未知展开可能同时包含 `fieldName` 与 `field-name`，原始键更新会保留键顺序，因此后续显式写入也无法确定规范化后的最终值。多个未知计算键也可能留下这类别名，这些值仍按 `unknownValues` 处理。

一组显式属性和具名绑定中的重复静态键以首个值为准。对象形式的 `v-bind`、对象形式的 `v-on` 及动态事件名会开始新组，后续组覆盖之前的值。对象字面量中以最后一个键为准。计算形式的绑定参数仍按顺序写入，即使名称是常量字符串。

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/component-prop-values
<template>
  <AppStepCounter
    :count="20"
    v-bind:count="25"
  />
</template>
```

:::

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/component-prop-values
<template>
  <AppStepCounter
    :count="25"
    v-bind:count="20"
  />
</template>
```

:::

## :wrench: 选项 {#options}

默认情况下，在配置目标之前不执行检查：

```json
{
  "targets": [],
  "unknownValues": "ignore"
}
```

### targets

`targets` 是 `{ components: string[], props: Record<string, Constraint> }` 数组。每项至少包含一个组件和一个 prop 约束。传入列表替换默认空列表；`[]` 禁用检查。

组件名显式匹配：`AppStepCounter` 与 `app-step-counter` 等价，`appstepcounter` 则不同。prop 名称兼容 camelCase 和 kebab-case。不解析导入，不支持通配符，也不查找组件声明。等价的重复约定会合并；同一规范化组件与 prop 上的不同约束属于配置错误。比较约定时，枚举及约束键的顺序不影响结果。

### prop 约束 {#prop-constraints}

| 约束                      | 配置                                                      | 含义                                            |
| ------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `enum`                    | 非空数组，元素为不重复的字符串、有限数值、布尔值或 `null` | 值必须与某个候选值严格相等，不进行类型转换。    |
| `multipleOf`              | 正安全整数                                                | 有限数值必须是该除数的精确倍数。                |
| `minimum` / `maximum`     | 有限数值                                                  | 包含端点的数值边界。                            |
| `minLength` / `maxLength` | 非负安全整数                                              | 包含端点的字符串长度边界，按 Unicode 码点计数。 |
| `pattern`                 | 正则表达式源码字符串                                      | 字符串必须匹配表达式；使用 `u` 标志编译一次。   |

每个约束对象至少包含一个受支持的键。未知键、无效正则、上下界倒置及混用数值与字符串约束均为配置错误。约束本身决定值的类别，不需要也不接受 `type` 字段。同一 prop 的全部约束必须同时成立，包括与数值或字符串约束组合的 `enum`。

例如：

```json
{
  "targets": [
    {
      "components": ["AppStepCounter"],
      "props": {
        "count": {
          "multipleOf": 10,
          "minimum": 0,
          "maximum": 100
        },
        "label": {
          "minLength": 1,
          "maxLength": 20,
          "pattern": "^\\S"
        },
        "variant": {
          "enum": ["primary", "secondary", "danger"]
        }
      }
    }
  ]
}
```

`multipleOf` 不支持小数除数。数值运算使用 JavaScript number 语义，没有舍入容差。除非边界排除，否则允许零和负倍数。`NaN` 及无穷值始终不满足数值约束。

长度按码点计数，不是 UTF-16 码元或用户感知的字素簇：`'😀'` 长度为一，组合字符序列可能大于一。`pattern` 接受不带斜杠分隔符和标志的源码，不会自动添加锚点；需要完整匹配时使用 `^` 和 `$`。空模式匹配所有字符串。配置字符串中的反斜杠需按 JavaScript 规则转义。

静态无值属性提供 `''`。不推断或应用组件 prop 声明的布尔值转换。数组、对象、函数、bigint、`undefined` 和 symbol 不在支持的标量范围内；已知不兼容类别会报告。不支持对象深比较、自定义函数、远程引用、数组约束或嵌套 schema。

### unknownValues

- `'ignore'`（默认）：跳过无法确定的值，不代表已确认有效。
- `'report'`：传入值无法静态验证时报告。

此选项仅处理确定已传入 prop 的值。缺失 prop 及是否存在无法确定的绑定由 [`require-component-props`](./require-component-props.md) 单独处理。例如，仅有 `v-bind="extra"` 无法证明已提供 `count`，因此本规则跳过。对必需 prop 做严格值检查时，请组合这两条规则。

## 适用范围 {#scope}

- 检查 Vue SFC 模板，支持 JavaScript、TypeScript、普通脚本、setup 脚本、双脚本及无脚本文件。不检查独立 JS/TS、JSX 或渲染函数。
- 跳过原生 HTML/SVG/MathML 标签及 `v-pre` 子树。识别 `<component is="AppStepCounter">` 和 `<component :is="'AppStepCounter'">` 等静态动态组件，跳过变量身份。
- 即使配置 `Slot`，也跳过小写 `<slot>` 出口；大写 `<Slot>` 组件及插槽后备内容中的组件仍会检查。
- 支持静态属性、具名 `v-bind`、已知键的内联对象展开、静态计算参数及 `v-model`。默认 `v-model` 提供 `modelValue`，修饰符不表示值已转换。修饰符还会生成对象类型的 `modelModifiers` 或 `<参数名>Modifiers` prop，遵循显式绑定的去重和合并顺序。
- 未知展开、计算键、`v-bind` 的 `.prop`/`.attr` 或同一规范化 prop 的混合原始写法会使相关值无法确定。原始键遵循 Vue 的去重和合并顺序，不执行 getter。不能将保留属性或事件监听器名称配置为 prop 约定。
- 识别标量字面量、无插值模板字符串、条件分支、一元数值运算 `+`、`-`、`~` 及二元数值运算 `+`、`-`、`*`、`/`、`%`、`**`。保守检查两个条件分支。TypeScript 断言、非空断言和 `satisfies` 保留底层表达式。
- 不求值脚本常量、标识符、成员访问、函数调用、含插值字符串、逻辑表达式或涉及类型转换的算术。即使确切值未知，已知类型也可能证明不匹配，包括与所有配置枚举成员的类型均不兼容的情况。表达式分析最多递归 32 层、保留 64 个候选值，超过限制视为未知。

本规则独立于 [`component-prop-types`](./component-prop-types.md)。数值和字符串约束已要求对应类别；若仅需要这些值限制，无需另外配置类型约束。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/component-prop-values.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/component-prop-values.test.ts)
