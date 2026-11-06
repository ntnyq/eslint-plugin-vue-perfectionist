---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-template-literal-in-interpolation
description: 在可安全转换时，要求用单个模板字面量表示混合文本与插值。
---

# vue-perfectionist/prefer-template-literal-in-interpolation

> 在可安全转换时，要求用单个模板字面量表示混合文本与插值。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| 适用范围 | 模板                                             |
| 默认行为 | 将符合条件的混合文本与插值合并为单个模板字面量。 |
| 必需选项 | 无；启用后即使用默认选项。                       |
| 自动修复 | 支持部分情况                                     |
| 类型信息 | 不需要 TypeScript 类型服务。                     |

:::

<!-- summary:end -->

:wrench: 表达式结果和文本可安全转换时自动修复。默认不报告无法确定的片段。

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
      'vue-perfectionist/prefer-template-literal-in-interpolation': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

片段由同一父级下连续的文本和插值节点构成，至少含一个插值及部分非空白文本。每片段最多报告一次，元素和注释会结束片段。

::: correct

```vue
<template>
  <span>{{ `${42}分` }}</span>
  <span>{{ `共 ${0}/${10} 项` }}</span>
  <span>{{ first }} {{ second }}</span>
  <span>Plain text</span>
</template>
```

:::

::: incorrect

```vue
<template>
  <span>{{ 42 }}分</span>
  <span>共 {{ 0 }}/{{ 10 }} 项</span>
  <span>{{ ok ? 0 : null }}分</span>
</template>
```

:::

nullish 示例会修复为带 `?? ''` 的模板替换，保留 `0` 的显示，并将 `null` 显示为空字符串：

::: correct

```vue
<template>
  <span>{{ `${(ok ? 0 : null) ?? ''}分` }}</span>
</template>
```

:::

## :wrench: 选项 {#options}

```json
{
  "vue-perfectionist/prefer-template-literal-in-interpolation": [
    "error",
    {
      "reportUnfixable": false
    }
  ]
}
```

### `reportUnfixable`

- 类型：`boolean`
- 默认值：`false`

设为 `false` 时仅报告可安全修复片段。设为 `true` 时报告范围内全部混合片段，包括因类型或格式无法安全修复者。这些问题无修复或编辑器建议，在代码或配置更改前会持续报告。

默认接受未知变量和成员访问：

::: correct

```vue
<template>
  <span>{{ area.score }}分</span>
  <span>共 {{ total }} 项</span>
</template>
```

:::

设置 `reportUnfixable: true` 时，同一表达式会报告但不修复。内联 ESLint 配置使该示例使用非默认选项：

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-template-literal-in-interpolation
<script setup>
/* eslint vue-perfectionist/prefer-template-literal-in-interpolation: [error, { reportUnfixable: true }] */
</script>

<template>
  <span>{{ area.score }}分</span>
  <span>共 {{ total }} 项</span>
</template>
```

:::

## 适用范围 {#scope}

- 检查 HTML Vue SFC 模板子节点，包括原生元素、组件和模板局部作用域。无需脚本块或 Vue 导入。
- 跳过独立脚本、JSX/TSX、属性、指令值、纯文本、单个插值，以及仅由空白分隔的插值。
- 不跨元素或 HTML 注释合并，首尾纯空白节点留在替换范围外。
- 跳过 `v-pre`、`v-text`、`v-html` 子树、非 HTML 模板语言、SVG/MathML 等外来命名空间，以及 `pre`、`textarea`、`title`、`script`、`style`、`xmp`、`iframe`、`noembed`、`noframes`、`noscript`、`plaintext`、`listing` 等特殊文本上下文及后代。`reportUnfixable: true` 时同样排除。
- 需要 Vue 模板访问器服务，安全跳过其他解析器。修复要求使用默认双花括号插值分隔符。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

使用**本地语法推断**，不使用 TypeScript 类型检查器：

| 表达式结果                                              | 修复行为                 |
| ------------------------------------------------------- | ------------------------ |
| 字符串、数值、布尔值或 bigint 字面量                    | 直接转换                 |
| 已有模板字面量、`!value` 或 `typeof value`              | 转换已为原始值的结果     |
| 每个结果分支均受支持的三元表达式                        | 转换，保留条件及分支求值 |
| `null`、`void expression`，或包含它们的受支持三元表达式 | 使用 `?? ''` 转换        |
| 标识符、成员访问、函数调用或其他未证明的结果            | 默认跳过                 |
| 对象、数组、函数、正则或 symbol                         | 默认跳过                 |

也推断已知 number/bigint 表达式上受支持的一元数值运算。TypeScript 断言、`satisfies`、非空断言仅解包，不证明运行时类型或取消 nullish 处理。即使 `undefined` 标识符也不假设为全局，可能是组件或模板局部绑定。`any`、`unknown` 及未解析泛型不能使片段可修复。启用类型检查不会扩大范围，本版本尚无模板到脚本的类型映射。

Vue 显示转换与 JavaScript 模板替换对部分值不同，尤其 nullish、数组及对象。必须证明片段内每个表达式安全才修复。各表达式按原顺序各求值一次；无法确定时不提供部分修复。

文本实体解码一次，再按 JavaScript 和 Vue 插值规则转义。反斜杠、反引号、字面 `${...}` 文本及闭合花括号会转义。保留原表达式源码、括号和块注释。包含行注释时保守地不修复，包括注释分隔符写为 HTML 实体的情况。

包含制表符、换行（含 CRLF）、换页符或重复 ASCII 空格的文本不修复，因为 Vue 的 `condense` 和 `preserve` 模式可能渲染不同。仅在 `reportUnfixable: true` 时报告这些片段。外层缩进保持不变；修复后运行格式化工具简化括号并整理表达式。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-template-literal-in-interpolation.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-template-literal-in-interpolation.test.ts)
