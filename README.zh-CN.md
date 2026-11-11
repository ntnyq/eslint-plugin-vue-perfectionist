# eslint-plugin-vue-perfectionist

[English](./README.md) | 简体中文

[![CI](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-vue-perfectionist.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/LICENSE)

ESLint 规则，帮助你编写风格一致、易读且易于维护的 Vue 3 代码。

为组合式函数、宏声明、命名、组件使用、模板和语句排序定义规范。

本插件**仅提供规则**，不提供内置配置。请根据项目需要，显式启用规则并配置相应选项。

> [!WARNING]
> 本项目正在积极开发中。API 尚不稳定，在首次稳定版本发布前可能引入破坏性变更。

[文档](https://vue-perfectionist.vercel.app/zh/) · [快速开始](https://vue-perfectionist.vercel.app/zh/guide/) · [规则](https://vue-perfectionist.vercel.app/zh/rules/)

## 看看规则效果

启用 `callback-style` 后，表达式回调会被报告：

```ts
import { watchEffect } from 'vue'

watchEffect(() => refresh())
```

运行 ESLint 的 `--fix` 后，回调使用块级函数体，并保留返回值：

```ts
import { watchEffect } from 'vue'

watchEffect(() => {
  return refresh()
})
```

## 安装与使用

本包采用 ESM 格式，要求安装 ESLint `^10.0.0` 和 `vue-eslint-parser` `^10.0.0`。

```shell
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

如果使用 TypeScript 单文件组件，还需要安装 TypeScript 解析器：

```shell
pnpm add -D @typescript-eslint/parser typescript
```

在 `eslint.config.mjs` 中注册插件并启用所需规则：

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
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/callback-style': 'error',
      'vue-perfectionist/define-macros-newline': 'error',
      'vue-perfectionist/no-complex-template-expression': 'error',
    },
  },
])
```

对于仅使用 JavaScript 的单文件组件，省略 TypeScript 解析器的导入和 `parserOptions.parser`。如果现有 Vue 配置已经设置了解析器，只需添加插件及所需规则。

运行检查，并按需应用支持的自动修复：

```shell
pnpm exec eslint .
pnpm exec eslint . --fix
```

部分诊断需要手动修改，例如命名变更和无法证明安全的语句重排。
`--fix` 不会修复所有问题，具体边界见各规则页面。

更多配置方式请参阅[快速开始](https://vue-perfectionist.vercel.app/zh/guide/)。

## 配置

- [文件范围与解析器](https://vue-perfectionist.vercel.app/zh/guide/configuration)：配置 Vue 单文件组件及独立的 JS/TS 文件。
- [自动导入的 API](https://vue-perfectionist.vercel.app/zh/guide/configuration#auto-imported-vue-apis)：识别自动导入工具提供的 Vue API。
- [规则组合](https://vue-perfectionist.vercel.app/zh/guide/rule-composition)：组合相关检查，避免排序规则或空行规则相互冲突。
- [公共类型](https://vue-perfectionist.vercel.app/zh/guide/configuration#public-typescript-api)：为规则选项和共享设置添加类型约束。
- [问题排查](https://vue-perfectionist.vercel.app/zh/guide/troubleshooting)：规则未生效、无法自动修复和类型服务配置。

## 规则

下方按用途列出全部规则。文件范围及自动修复支持情况请参阅[规则概览](https://vue-perfectionist.vercel.app/zh/rules/)，选项与默认行为见对应规则页。

<!-- rules:start -->

### 回调函数与组合式函数

| 规则                                                                                                     | 描述                                                  |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [callback-style](https://vue-perfectionist.vercel.app/zh/rules/callback-style)                           | 强制 Vue API 的回调函数使用指定风格。                 |
| [max-lines-per-callback](https://vue-perfectionist.vercel.app/zh/rules/max-lines-per-callback)           | 限制 Vue API 内联回调函数的行数。                     |
| [prefer-composable-options](https://vue-perfectionist.vercel.app/zh/rules/prefer-composable-options)     | 优先使用末尾的选项对象传递组合式函数参数。            |
| [prefer-function-declaration](https://vue-perfectionist.vercel.app/zh/rules/prefer-function-declaration) | 要求在单文件组件和组合式函数中使用函数声明。          |
| [prefer-on-scope-dispose](https://vue-perfectionist.vercel.app/zh/rules/prefer-on-scope-dispose)         | 优先在具名 Vue 组合式函数中使用基于作用域的清理方式。 |
| [prefer-watch-effect-alias](https://vue-perfectionist.vercel.app/zh/rules/prefer-watch-effect-alias)     | 优先为 post 和 sync 侦听副作用使用专用别名。          |
| [require-injection-key](https://vue-perfectionist.vercel.app/zh/rules/require-injection-key)             | 禁止在 Vue 的 provide 和 inject 调用中使用字符串键。  |

### 宏声明与组件模型

| 规则                                                                                               | 描述                                                  |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [define-macros-newline](https://vue-perfectionist.vercel.app/zh/rules/define-macros-newline)       | 要求内联 Vue 宏声明使用多行格式。                     |
| [define-macros-type-style](https://vue-perfectionist.vercel.app/zh/rules/define-macros-type-style) | 强制 Vue 宏类型使用指定的声明风格。                   |
| [define-model-name-casing](https://vue-perfectionist.vercel.app/zh/rules/define-model-name-casing) | 强制显式声明的 defineModel 名称使用指定的大小写风格。 |
| [prefer-define-model](https://vue-perfectionist.vercel.app/zh/rules/prefer-define-model)           | 优先使用 defineModel 替代配套的 prop 和更新事件声明。 |
| [require-macro-type-name](https://vue-perfectionist.vercel.app/zh/rules/require-macro-type-name)   | 要求 Vue 宏调用处的类型使用指定名称。                 |

### ref 与返回值命名

| 规则                                                                                                                 | 描述                                   |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [consistent-template-ref-name](https://vue-perfectionist.vercel.app/zh/rules/consistent-template-ref-name)           | 要求模板 ref 的变量名与键名一致。      |
| [prefer-function-result-pattern](https://vue-perfectionist.vercel.app/zh/rules/prefer-function-result-pattern)       | 强制函数返回值绑定使用指定的命名模式。 |
| [prefer-ref-pattern](https://vue-perfectionist.vercel.app/zh/rules/prefer-ref-pattern)                               | 强制模板 ref 使用指定的命名模式。      |
| [prefer-use-template-ref-inference](https://vue-perfectionist.vercel.app/zh/rules/prefer-use-template-ref-inference) | 优先为静态 Vue 模板 ref 使用推断类型。 |

### 组件使用约定

| 规则                                                                                             | 描述                               |
| ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| [component-prop-types](https://vue-perfectionist.vercel.app/zh/rules/component-prop-types)       | 强制组件 prop 的值符合配置的类型。 |
| [component-prop-values](https://vue-perfectionist.vercel.app/zh/rules/component-prop-values)     | 强制组件 prop 的值符合配置的约束。 |
| [require-component-props](https://vue-perfectionist.vercel.app/zh/rules/require-component-props) | 要求使用组件时提供配置的 prop。    |
| [require-component-slots](https://vue-perfectionist.vercel.app/zh/rules/require-component-slots) | 要求使用组件时提供配置的插槽。     |
| [require-vue-generic](https://vue-perfectionist.vercel.app/zh/rules/require-vue-generic)         | 要求为配置的组件添加显式泛型注释。 |

### 模板规范

| 规则                                                                                                                               | 描述                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [no-complex-template-expression](https://vue-perfectionist.vercel.app/zh/rules/no-complex-template-expression)                     | 限制 Vue 模板中逻辑运算符的数量和条件表达式的嵌套层数。 |
| [no-complex-v-for-source](https://vue-perfectionist.vercel.app/zh/rules/no-complex-v-for-source)                                   | 禁止在 Vue v-for 数据源中使用复杂表达式。               |
| [no-restricted-html-elements](https://vue-perfectionist.vercel.app/zh/rules/no-restricted-html-elements)                           | 禁止在 Vue 模板中使用指定的原生 HTML 元素。             |
| [no-template-type-assertion](https://vue-perfectionist.vercel.app/zh/rules/no-template-type-assertion)                             | 禁止在 Vue 模板中使用 as 类型断言。                     |
| [padding-line-between-tags](https://vue-perfectionist.vercel.app/zh/rules/padding-line-between-tags)                               | 强制相邻模板标签之间使用指定数量的空行。                |
| [prefer-simple-event-handler](https://vue-perfectionist.vercel.app/zh/rules/prefer-simple-event-handler)                           | 要求具名模板事件处理器使用简单表达式。                  |
| [prefer-template-literal-in-interpolation](https://vue-perfectionist.vercel.app/zh/rules/prefer-template-literal-in-interpolation) | 优先使用单个模板字面量表示混合的文本与插值。            |
| [require-props-prefix](https://vue-perfectionist.vercel.app/zh/rules/require-props-prefix)                                         | 要求在 Vue 模板中显式使用 props 对象前缀。              |

### 语句排序

| 规则                                                                                                     | 描述                                           |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [sort-composable-destructure](https://vue-perfectionist.vercel.app/zh/rules/sort-composable-destructure) | 按状态和方法对组合式函数的解构成员分组。       |
| [sort-composable-return](https://vue-perfectionist.vercel.app/zh/rules/sort-composable-return)           | 按状态和方法对组合式函数的返回成员分组。       |
| [sort-script-setup](https://vue-perfectionist.vercel.app/zh/rules/sort-script-setup)                     | 对 `<script setup>` 的顶层语句进行分组和排序。 |

<!-- rules:end -->

## 开发

本地环境配置、测试和文档维护流程请参阅[贡献指南](https://vue-perfectionist.vercel.app/zh/guide/contributing)。

## 致谢

- [eslint-plugin-perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist)：为排序规则的命名、分组模型及配置 API 提供了灵感。
- [eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue) 和 [vue-eslint-parser](https://github.com/vuejs/vue-eslint-parser)：为 Vue 代码检查及单文件组件解析所做的工作。

本项目是独立项目，并非 `eslint-plugin-perfectionist` 或 `eslint-plugin-vue` 的官方扩展。

## 许可证

[MIT](./LICENSE) 许可证 © 2026 至今 [ntnyq](https://github.com/ntnyq)
