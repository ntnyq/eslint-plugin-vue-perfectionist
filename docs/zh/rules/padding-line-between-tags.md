---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/padding-line-between-tags
description: 强制相邻 Vue 模板标签之间使用指定数量的空行。
---

# vue-perfectionist/padding-line-between-tags

> 强制相邻 Vue 模板标签之间使用指定数量的空行。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                     |
| -------- | ---------------------------------------- |
| 适用范围 | 模板                                     |
| 默认行为 | 符合条件的相邻标签之间恰好保留一个空行。 |
| 必需选项 | 无；启用后即使用默认选项。               |
| 自动修复 | 支持部分情况                             |
| 类型信息 | 不需要 TypeScript 类型服务。             |

:::

<!-- summary:end -->

:wrench: 已位于不同行的标签可自动修复；同行相邻标签需要额外空行时，只报告不修复。

官方 [`vue/padding-line-between-tags`](https://eslint.vuejs.org/rules/padding-line-between-tags.html#options) 支持 `always`、`never`、`consistent`，但不支持精确空行数。尤其 `always` 接受**一行或更多**空行，无法要求恰好一行或两行。

本规则增加非负整数策略：`1` 要求恰好一行空行，`2` 要求恰好两行。同时提供同组件标签对的 `tag` 简写及例外策略 `ignore`。本规则独立实现，不解释官方规则的 `consistent` 或 `:single-line`、`:multi-line` 等布局伪类。请对本规则控制的标签对禁用官方规则，避免修复冲突。

## 用法 {#usage}

在扁平化配置中注册插件并配置 `vue-eslint-parser`：

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
      'vue/padding-line-between-tags': 'off',
      'vue-perfectionist/padding-line-between-tags': [
        'error',
        { targets: [{ tag: 'ElFormItem' }] },
      ],
    },
  },
])
```

此配置仅检查相邻 `ElFormItem` 标签，要求恰好一行空行。TypeScript 脚本需通过 `parserOptions.parser` 配置 TypeScript 解析器，见[安装指南](../guide/index.md#basic-usage)。

## :book: 规则详情 {#rule-details}

不传选项时，每对相邻同级标签之间要求恰好一行空行。空行指标签之间完全为空或仅含空白的行；单个换行虽使标签分行，但只有**零行**空行。

::: correct

```vue
<template>
  <ElFormItem />

  <ElFormItem />
</template>
```

:::

::: incorrect

```vue
<template>
  <ElFormItem />
  <ElFormItem />
</template>
```

:::

多行空行也违反默认的精确数量要求：

::: incorrect

<!-- prettier-ignore -->
```vue eslint-check=vue-perfectionist/padding-line-between-tags
<template>
  <ElFormItem />


  <ElFormItem />
</template>
```

:::

## :wrench: 选项 {#options}

唯一选项是含可选 `ignoreComments` 和 `targets` 字段的对象。实际默认值为：

```json
{
  "ignoreComments": false,
  "targets": [
    {
      "prev": "*",
      "next": "*",
      "blankLine": 1
    }
  ]
}
```

省略选项或传入 `{}` 均保留这些默认值。省略 `targets` 时保留默认通配策略。显式 `targets` 数组替换默认值；`{ targets: [] }` 禁用全部检查。不匹配的标签对忽略。多个条目匹配时，无论简写或完整形式，**最后匹配的条目优先**。未知选项字段会被拒绝。

不再接受直接数组选项。迁移时，将 `['error', entries]` 改为 `['error', { targets: entries }]`。

### ignoreComments

- 类型：`boolean`
- 默认值：`false`

默认情况下，HTML 注释会中断标签对。设置 `ignoreComments: true` 后，会跨过一条或多条 HTML 注释检查匹配的同级标签，包括 `@vue-generic` 指令注释：

```js
{
  'vue-perfectionist/padding-line-between-tags': [
    'error',
    {
      ignoreComments: true,
      targets: [{ tag: 'ElTableColumn' }],
    },
  ],
}
```

使用此配置时，修复会在注释前插入空行，让注释仍紧邻后面的组件：

::: correct ignore-comments

<!-- prettier-ignore -->
```vue
<template>
  <ElTableColumn />

  <!-- @vue-generic {import('#types').IExperimentReportTemplate} -->
  <ElTableColumn />
</template>
```

:::

::: incorrect ignore-comments

<!-- prettier-ignore -->
```vue
<template>
  <ElTableColumn />
  <!-- @vue-generic {import('#types').IExperimentReportTemplate} -->
  <ElTableColumn />
</template>
```

:::

仅统计注释外的空行：注释前、多条注释之间和注释后的空行数会累加，注释行及多行注释内部的空行均不计入。所有 `blankLine` 策略和标签匹配规则仍然适用。文本、插值和空白实体仍会中断标签对。

### targets

每个 `targets` 条目使用 `tag`，或同时使用 `prev` 与 `next`：

```json
{
  "targets": [
    {
      "tag": "ElFormItem"
    },
    {
      "tag": "ElButton",
      "blankLine": "never"
    },
    {
      "prev": "PageHeader",
      "next": "PageContent",
      "blankLine": 2
    }
  ]
}
```

- `tag: 'ElFormItem'` 是 `prev: 'ElFormItem', next: 'ElFormItem'` 的简写。
- `tag` 接受非空的具体标签名，不接受 `tag: '*'`。
- `prev` 和 `next` 各接受非空源码标签名或表示任意标签的 `'*'`。标签对有方向，`Header` 后接 `Content` 与反向不同。
- 按源码写法精确、区分大小写地匹配，`ElFormItem` 和 `el-form-item` 不同。不解析导入、别名或动态 `:is`。可匹配 HTML 元素、组件和嵌套 `<template>`。
- 混用 `tag` 与 `prev`/`next`、缺少标签对一侧或包含未知字段均为配置错误。不支持 glob 或正则。

### targets[].blankLine

| 值               | 含义                                 |
| ---------------- | ------------------------------------ |
| 非负整数         | 恰好指定数量的空行，默认 `1`。       |
| `'always'`       | 至少一行空行，允许更多。             |
| `0` 或 `'never'` | 不允许空行；接受同行标签和单个换行。 |
| `'ignore'`       | 不检查该匹配标签对。                 |

数值策略必须是 `0` 到 `Number.MAX_SAFE_INTEGER` 的有限安全整数。不接受负数、小数、非有限数、不安全整数或其他字符串。各条目的策略可省略，默认为 `1`。

用后置例外覆盖通用策略：

```json
{
  "targets": [
    {
      "prev": "*",
      "next": "*",
      "blankLine": 1
    },
    {
      "tag": "ElFormItem",
      "blankLine": "ignore"
    }
  ]
}
```

## 适用范围 {#scope}

仅检查 Vue SFC 模板中相邻的直接同级元素。间隔只能包含字面空格、制表符或换行；设置 `ignoreComments: true` 时也允许 HTML 注释。默认情况下，注释会中断标签对；文本、插值和空白实体始终会中断标签对。其他元素也会中断同名标签序列：`<Item /><div /><Item />` 不构成 `Item` 标签对。较长序列中的每对相邻标签独立检查。

不检查脚本、独立 JS/TS 或样式。跳过 `<pre>`、`<textarea>`、`<script>`、`<style>`、`<xmp>`、`<listing>`、`<plaintext>` 及带 `v-pre` 元素的后代，也跳过 SVG、MathML 等非 HTML 命名空间。

原生标签排除按精确小写拼写判断。`<Pre>` 和 `<Textarea>` 等组件及其后代仍会检查。

默认选项下，以下被中断的标签对均被接受：

::: correct

```vue
<template>
  <ElFormItem />
  <!-- section boundary -->
  <ElFormItem />
  {{ label }}
  <ElFormItem />
</template>
```

:::

## 自动修复与格式化 {#automatic-fixes-and-formatting}

已分行标签的修复仅调整间隔空白，保留标签顺序、属性、注释、下一标签前缩进、上一标签后尾随空格，以及间隔中首个换行符的风格（LF、CRLF 或 CR）。移除空行时保留一个换行。这也保留 `v-if`、`v-else-if`、`v-else` 分支顺序。

设置 `ignoreComments: true` 时，修复仅调整注释外的空白，保留注释内容和顺序。缺少的空行会加在注释外的第一个已有换行处，通常位于第一条注释前。多余空行从左到右移除，每段原本含换行的空白都会保留至少一个换行。如果所有换行都在注释内部，则仅报告缺少空行，不自动修复。

为保持检查响应速度，每个替换间隔最多 65,536 个 UTF-16 码元，包括换行及保留空白。更大替换仅报告，不提供修复或建议。诊断仍使用配置的数量，不插入部分空行。

需要空行的同行相邻标签只报告，不提供修复或建议，因为添加第一个换行可能改变渲染空白：

::: incorrect

<!-- prettier-ignore -->
```vue eslint-check=vue-perfectionist/padding-line-between-tags
<template><span>First</span> <span>Second</span></template>
```

:::

对此请手动选择布局。`0` 或 `never` 已接受同行标签，且从不强制合并为一行。

格式化工具可能折叠多行空行。要求 `2` 或更多时，请协调格式化配置，或在格式化后应用本规则修复。默认单行空行与仓库格式化工具兼容。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/padding-line-between-tags.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/padding-line-between-tags.test.ts)
