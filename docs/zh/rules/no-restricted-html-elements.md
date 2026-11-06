---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-restricted-html-elements
description: 禁止在 Vue 模板中使用指定的原生 HTML 元素。
---

# vue-perfectionist/no-restricted-html-elements

> 禁止在 Vue 模板中使用指定的原生 HTML 元素。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                             |
| -------- | -------------------------------- |
| 适用范围 | 模板                             |
| 默认行为 | 配置 elements 列表后才执行检查。 |
| 必需选项 | `elements`                       |
| 自动修复 | —                                |
| 类型信息 | 不需要 TypeScript 类型服务。     |

:::

<!-- summary:end -->

用项目组件替代选定的原生 HTML 元素。仅精确匹配小写标签名。不提供自动修复或建议，因为替换元素可能改变 prop、事件及行为。

## 用法 {#usage}

以下完整扁平化配置支持 JavaScript 和 TypeScript Vue 单文件组件：

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/no-restricted-html-elements': [
        'error',
        {
          elements: [
            'button',
            { name: 'input', message: 'Use <AppInput> instead.' },
          ],
        },
      ],
    },
  },
])
```

仅 JavaScript 的 SFC 可省略 TypeScript 解析器导入及 `parserOptions.parser`。默认限制列表为空，需配置 `elements` 才会报告。

## :book: 规则详情 {#rule-details}

设置 `elements: ['button', { name: 'input', message: 'Use <AppInput> instead.' }]` 后，直接使用这些原生元素会报告：

::: incorrect

```vue
<template>
  <button type="button">Save</button>
  <input />
</template>
```

:::

每个元素在起始标签名称处报告一次。诊断分别为 `Native HTML element <button> is not allowed.` 和 `Native HTML element <input> is not allowed. Use <AppInput> instead.`

按原始写法匹配，不转换大小写，也不使用前缀、正则或通配符。组件名及未列出的标签均被接受：

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-restricted-html-elements
<template>
  <AppButton>Save</AppButton>
  <AppInput />
  <Button />
  <BUTTON />
  <my-button />
  <button-group />
  <button2 />
  <appbutton />
  <div />
</template>
```

:::

## :wrench: 选项 {#options}

默认配置如下：

```json
{
  "vue-perfectionist/no-restricted-html-elements": ["error", { "elements": [] }]
}
```

### `elements`

- 类型：`(string | RestrictedHtmlElement)[]`
- 默认值：`[]`

该数组是完整限制列表，没有内置限制。空数组禁用所有检查。同名的字符串和对象匹配行为一致：

```ts
interface RestrictedHtmlElement {
  name: string
  message?: string
}
```

`name` 必须为规则原生 HTML 列表中的精确小写名称。列表基于 [Vue 原生 HTML 列表](https://github.com/vuejs/core/blob/main/packages/shared/src/domTagConfig.ts)和 [HTML 元素索引](https://html.spec.whatwg.org/multipage/indices.html#elements-3)，包含 `search`、`selectedcontent`，并保留 Vue 的 `param`。排除 Vue 结构标签 `template`、`slot`、`component`。未知名称、SVG/MathML 名称、大写名、正则、通配符及首尾空白会引发配置错误。

`message` 为可选提示，在标准诊断后以空格分隔追加。省略或为空时不追加。同名条目重复时使用最后一个提示，但每个匹配元素仍只报告一次。

## 适用范围 {#scope}

- 检查 Vue SFC 模板中的直接元素，支持 JavaScript、TypeScript、普通脚本、setup 及无脚本。
- 要求 HTML 命名空间及精确原始标签名。跳过 SVG/MathML 元素，包括与 HTML 同名的 `a`、`title`。SVG `foreignObject` 及带 `encoding="text/html"` 的 MathML `annotation-xml` 等集成点内的 HTML 后代仍检查。
- 检查 `v-pre` 内直接书写的 HTML，包括带 `v-pre` 的元素本身。属性和指令不影响直接标签匹配。
- 不解析 `<component>` 的 `is`，不检查 JSX 或 `h()`，也不解析 `v-html`、插值、脚本、注释、样式或自定义块中的字符串。
- 安全跳过不提供 Vue 模板访问器服务的解析器。

对于“用法”中的配置，间接引用和外来命名空间元素仍被接受：

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-restricted-html-elements
<template>
  <component is="button" />
  <component :is="'input'" />
  <svg><title>Icon</title></svg>
  <div v-html="'<button></button>'" />
</template>
```

:::

`v-pre` 中直接书写的 HTML 仍会报告：

::: incorrect

```vue
<template>
  <div v-pre>
    <button type="button" />
  </div>
</template>
```

:::

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-restricted-html-elements.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-restricted-html-elements.test.ts)
