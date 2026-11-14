---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/consistent-template-element-layout
description: 强制 Vue 模板元素使用一致的布局，并保留行内文本流。
---

# vue-perfectionist/consistent-template-element-layout

> 强制 Vue 模板元素使用一致的布局，并保留行内文本流。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                   |
| -------- | -------------------------------------- |
| 适用范围 | 模板                                   |
| 默认行为 | 兼容格式化工具的布局检查；默认仅报告。 |
| 必需选项 | 无；启用后即使用默认选项。             |
| 自动修复 | 需显式启用                             |
| 类型信息 | 不需要 TypeScript 类型服务。           |

:::

<!-- summary:end -->

:wrench: 默认仅报告。设置 `fix: 'safe'` 后，可移除拆行结束标签内部的格式空白。
内容和兄弟标签之间的空白始终不自动修复。

## 使用方式 {#usage}

注册插件并配置 `vue-eslint-parser`：

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
      'vue-perfectionist/consistent-template-element-layout': 'error',
    },
  },
])
```

TypeScript 脚本还需通过 `parserOptions.parser` 配置 TypeScript 解析器，
参见[快速开始](../guide/index.md#basic-usage)。

## :book: 规则详情 {#rule-details}

块级元素允许内容完整放在同一行，也允许内容与开始、结束标签分别换行。
多行内容区域可以包含多行文本、子元素、注释和插值。
属性换行和缩进交给格式化工具处理。

::: correct

```vue
<template>
  <p>Hello</p>
  <p>Hello world</p>
</template>
```

:::

半展开布局会被报告，但不修复内容：

::: incorrect

<!-- prettier-ignore -->
```vue
<template>
  <p>Hello
  </p>
</template>
```

:::

::: incorrect

<!-- prettier-ignore -->
```vue
<template>
  <p>
    Hello</p>
</template>
```

:::

连续兄弟元素的角色都为 `block` 时，必须换行。中间可以有水平空白，
但水平空白不能满足换行要求。注释、文本、插值、实体或其他元素会中断配对。
这里不要求空行；空行数量可以另外配置 `padding-line-between-tags`。

::: incorrect

<!-- prettier-ignore -->
```vue
<template>
  <section>Introduction</section><section>Details</section>
</template>
```

:::

行内文本流允许保留，行内兄弟元素可以相邻。
两种模式都不对行内元素应用块级内容边界检查：

::: correct

```vue
<template>
  <p>Read <a href="/guide">the guide</a>.</p>
  <p><strong>Warning:</strong><span>Be careful.</span></p>
</template>
```

:::

## :wrench: 选项 {#options}

```json
{
  "mode": "compatible",
  "fix": "never",
  "groups": []
}
```

省略选项或传入 `{}` 都使用上述默认值。未知属性和无效枚举值会被拒绝。

### mode

- 类型：`'compatible' | 'strict'`
- 默认值：`'compatible'`

`compatible` 检查原生块级元素的结束标签拆行；允许行内元素和未知组件的
结束标签拆行，以保留格式化工具表达空白语义的方式。
对于分组为块级的组件，如果开始标签的尖括号借到内容所在行，或结束标签拆行，
也不会报告半展开布局。普通的半展开组件仍然会被报告。
如果前一个组件的结束标签（或自闭合开始标签）内部包含格式化换行，
也允许分组为块级的兄弟组件相邻。

`strict` 进一步报告行内元素和未知组件的结束标签拆行，并取消分组块级组件的
上述格式化例外。它仍然保留行内文本流，不要求行内兄弟元素分行。

使用 `mode: 'strict'` 时，以下结束标签会被报告：

::: incorrect element-layout-strict

<!-- prettier-ignore -->
```vue
<template>
  <span>Hello</span
  >
</template>
```

:::

### fix

- 类型：`'never' | 'safe'`
- 默认值：`'never'`

`never` 只报告，不提供修复或建议，即使执行 ESLint `--fix` 也一样。
`safe` 只合并结束标签名称和 `>` 之间的空白：`</p\n>` 变为 `</p>`。
不提供不安全修复模式。

将 `<p>Hello</p>` 展开后，Vue 编译得到的文本会从 `"Hello"` 变成 `" Hello "`。
在兄弟元素间插入第一个换行也可能改变 `condense` 模式下的文本节点。
这些修改始终仅报告，即使组件被显式分到 `block` 组也一样。
分组只表达布局意图，不能证明组件的根元素或插槽处理方式。

### groups

- 类型：`TemplateElementLayoutGroup[]`
- 默认值：`[]`

```json
{
  "groups": [
    { "tags": ["AppCard"], "layout": "block" },
    { "tags": ["RouterLink"], "layout": "inline" },
    { "tags": ["CodeEditor"], "layout": "preserve" }
  ]
}
```

每项必须提供非空的 `tags` 数组，成员为唯一的非空字符串；`layout` 必须是
`block`、`inline` 或 `preserve`。按模板原始标签名精确匹配，区分大小写：
`AppCard` 与 `app-card` 需要分别声明。名称按字面量解释，不解析通配符、
正则、前缀、导入或动态 `:is`。最后一个匹配组生效。
分组扩展或覆盖原生角色，空数组保留原生默认值。
`preserve` 跳过整个子树，内置的保留上下文不能被覆盖。

上述分组下：

::: correct element-layout-components

```vue
<template>
  <AppCard>
    <p>See <RouterLink to="/">details</RouterLink>.</p>
  </AppCard>
  <CodeEditor><p>Source text</p></CodeEditor>
</template>
```

:::

::: incorrect element-layout-components

<!-- prettier-ignore -->
```vue
<template>
  <AppCard>Content
  </AppCard>
</template>
```

:::

## 检查范围 {#scope}

仅检查 Vue 单文件组件中的 HTML 模板，不需要脚本类型服务。
脚本、JSX、样式、自定义块和非 HTML 模板语言不在范围内。

原生块级默认值为 `address`、`article`、`aside`、`blockquote`、`body`、
`caption`、`center`、`dd`、`details`、`dialog`、`dir`、`div`、`dl`、`dt`、
`fieldset`、`figcaption`、`figure`、`footer`、`form`、`h1`–`h6`、`header`、
`hgroup`、`hr`、`html`、`legend`、`li`、`main`、`menu`、`nav`、`ol`、`p`、
`search`、`section`、`summary`、`table`、`tbody`、`td`、`tfoot`、`th`、
`thead`、`tr` 和 `ul`。常见的短语元素和替换元素，例如 `span`、`a`、
`strong`、`em`、`img`、`input`、`button`，使用行内角色。
未列出的名称和未配置组件属于未知角色。
角色代表源码布局策略，不推断 CSS 或组件渲染结果。

跳过 `pre`、`textarea`、`script`、`style`、`xmp`、`listing`、`plaintext`、
`v-pre`、配置为 `preserve` 的分组及其所有后代。
SVG 和 MathML 子树整体跳过，包括其中恢复 HTML 命名空间的集成点。
原生名称使用精确的小写拼写，`<Pre>` 仍然视为组件。

自闭合和空元素不检查内容，但可参与块级兄弟检查。
空的成对元素可以保留，不强制改成自闭合。
SFC 根模板、嵌套 `template`、`slot` 和 `component` 仅作为遍历容器：
跳过它们自身的内容边界和结束标签，但仍检查符合条件的后代与内部直接兄弟。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

安全修复只修改结束标签内部的空白，保留文本、插值、实体、注释、属性、
插槽内容，以及周围的换行风格和缩进。
测试使用最低和当前支持版本的 Vue 编译器，在 `condense` 与 `preserve`
两种模式下比较编译结果。

格式化往返测试覆盖 Prettier 3.10.1、Oxfmt 0.78.0，使用
`htmlWhitespaceSensitivity: 'css'` 和 `'ignore'`；
行内及未知组件的空白敏感场景还覆盖 `'strict'`。
兼容模式并不保证接受格式化工具的所有设置：严格空白敏感配置可能拆开原生
块级结束标签，自定义 display 注释或 CSS 也可能与本规则的角色冲突。
规则的严格模式有意报告更多格式化例外。遇到这些情况需协调格式化设置；
`ignore` 本身可能改变有意义的空白，本规则不要求启用它。

其他内容换行或结束标签规则可能采用不同策略，应为本规则管理的标签协调选项。
本规则不管理开始标签尖括号的位置、行宽、缩进或空行数量。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/consistent-template-element-layout.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/consistent-template-element-layout.test.ts)
