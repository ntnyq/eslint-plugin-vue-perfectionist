---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-component-slots
description: 要求使用 Vue 组件时提供配置的插槽。
---

# vue-perfectionist/require-component-slots

> 要求使用 Vue 组件时提供配置的插槽。

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

配置 Vue 解析器，并列出每次使用组件时必须提供的插槽。默认不检查任何组件。

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
      'vue-perfectionist/require-component-slots': [
        'error',
        {
          targets: [
            { components: ['AppDialog'], slots: ['header', 'footer'] },
            { components: ['AppButton'], slots: ['default'] },
          ],
          unknownSlots: 'report',
        },
      ],
    },
  },
])
```

对于 TypeScript 单文件组件，还需将 `languageOptions.parserOptions.parser` 配置为 `@typescript-eslint/parser`，见[指南](../guide/index.md)。

## :book: 规则详情 {#rule-details}

示例采用上述约定，所有列出插槽均必须提供。识别 `#header` 和 `v-slot:header`，插槽名区分大小写。静态名称保留全部点号，包括连续或尾部点：`header..footer`、`header.footer`、`header.` 各不相同。

::: correct

```vue
<template>
  <AppDialog>
    <template #header>Title</template>
    <template #footer>
      <AppButton>Confirm</AppButton>
    </template>
  </AppDialog>
</template>
```

:::

::: incorrect

```vue
<template>
  <AppDialog>
    <template #header>Title</template>
  </AppDialog>
</template>
```

:::

第二个示例在起始标签名称处报告 `Component <AppDialog> requires slot "footer".`，每个缺失插槽各报告一次。

### 默认插槽 {#default-slots}

约定中使用 `default` 表示默认插槽。显式 `#default`、无参数 `v-slot`、组件级 `v-slot` 及隐式子内容均满足要求。无插槽参数、仅修饰符形式也指 `default`，后缀不是字面插槽名。文本、插值和子元素算隐式内容；仅格式空白（空格、制表、换行、换页）或注释不算。`&nbsp;`、`&#x2003;` 等 Unicode 间距字符算内容，与 Vue 编译器一致。

::: correct

```vue
<template>
  <AppButton>Confirm</AppButton>
  <AppButton>&nbsp;</AppButton>
  <AppButton>{{ label }}</AppButton>
  <AppButton><span /></AppButton>
  <AppButton>
    <template #default />
  </AppButton>
  <AppButton v-slot="scope">{{ scope }}</AppButton>
</template>
```

:::

::: incorrect

```vue
<template>
  <AppButton />
  <AppButton><!-- Add content later. --></AppButton>
  <AppButton>
    <template #header>Title</template>
  </AppButton>
</template>
```

:::

显式插槽即使为空也计入。检查语法存在性，不证明可见内容。组件级具名 `v-slot:header` 将全部子级分配给 `header`，不会同时提供 `default`。

### 插槽归属与条件 {#slot-ownership-and-conditions}

仅组件级声明和直接子级 `<template v-slot>` 为组件提供具名插槽。嵌套元素或组件内的插槽不满足外层要求。

::: incorrect

```vue
<template>
  <AppDialog>
    <template #header>Title</template>
    <OtherPanel>
      <template #footer>Nested footer</template>
    </OtherPanel>
  </AppDialog>
</template>
```

:::

条件或重复声明也算提供，不证明运行时可用性，不求值条件，也不要求循环非空。

::: correct

```vue
<template>
  <AppDialog>
    <template
      v-if="visible"
      #header
    >
      Title
    </template>
    <template #footer />
  </AppDialog>
</template>
```

:::

### 动态名称 {#dynamic-names}

识别动态参数中的字符串及无插值模板字面量。其他表达式（含变量引用）仍未知，支持字面量外的 TypeScript 包装。闭合方括号后的后缀也使名称未知，例如 ``#[`header`].foo`` 不视为字面名 `header`。

::: correct

```vue
<template>
  <AppDialog>
    <template #[`header`] />
    <template #[`footer`] />
  </AppDialog>
</template>
```

:::

未知名称可能提供任意必需插槽（含 `default`）。默认对每个尚未满足的要求报告 `unverifiableRequiredSlot`。

::: incorrect

```vue
<template>
  <AppDialog>
    <template #header />
    <template #[slotName] />
  </AppDialog>
</template>
```

:::

这里只报告无法验证的 `footer`。设 `unknownSlots: 'ignore'` 可接受不确定要求。嵌套动态声明不会使外层组件插槽名不确定。

## :wrench: 选项 {#options}

默认值：

```json
{
  "targets": [],
  "unknownSlots": "report"
}
```

### `targets`

类型：`{ components: string[], slots: string[] }[]`。默认值：`[]`。

每项需要非空组件和插槽列表，字符串非空、不重复且不含空白。空 `targets` 禁用检查，无内置约定可扩展。重叠目标合并插槽要求，每个组件使用处的每个插槽最多报告一次。

```json
{
  "targets": [
    {
      "components": ["AppDialog", "AppDrawer"],
      "slots": ["header", "footer"]
    },
    {
      "components": ["app-dialog"],
      "slots": ["default"]
    }
  ]
}
```

此配置要求 `AppDialog` 提供 `header`、`footer`、`default`，`AppDrawer` 提供 `header` 和 `footer`。

### `unknownSlots`

类型：`'report' | 'ignore'`。默认值：`'report'`。

`ignore` 仅抑制不确定要求。已知插槽名缺少必需插槽时，仍报告 `missingSlot`。

## 适用范围 {#scope}

- 通过 `vue-eslint-parser` 检查 SFC 模板，包括纯模板、普通脚本、setup 及双脚本。
- 匹配模板标签名：`AppDialog` 与 `app-dialog` 等价，`appdialog` 和未配置导入别名不匹配。不解析导入，不使用正则、glob 或跨文件分析。
- 插槽名保留精确大小写及写法，`Header`、`header`、`itemName`、`item-name` 不同。`#item.name` 等静态名中的点属于名称。
- 跳过原生 HTML/SVG/MathML 和 `v-pre` 子树。不解析编译器自定义元素设置，显式配置的自定义标签仍检查。
- 跳过动态组件，包括 `<component is="AppDialog">` 和 `<component :is="'AppDialog'">`。不检查独立 JS/TS、JSX 或渲染函数。
- 跳过 `<slot>` 出口，不检查组件 `defineSlots` 或后备内容。组件定义中的默认内容不满足调用方必须提供的要求。
- 重复插槽、错误 `v-slot` 位置及无效模板交由 Vue 语法规则。

### 诊断与修复 {#diagnostics-and-fixes}

`missingSlot` 和 `unverifiableRequiredSlot` 指向组件起始标签名，保留模板组件写法及配置插槽写法。

不提供自动修复或建议，无法决定缺失插槽的业务内容；插入空插槽可能改变后备行为。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-component-slots.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-component-slots.test.ts)
