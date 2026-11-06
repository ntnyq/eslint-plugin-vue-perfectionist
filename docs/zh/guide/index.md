---
description: 安装 Vue Perfectionist，并在 ESLint 扁平化配置中启用规则。
---

# 快速开始 {#getting-started}

`eslint-plugin-vue-perfectionist` 为 Vue 3 脚本和模板提供可配置的 ESLint 规则，涵盖回调函数、组合式函数定义、宏类型与布局、命名、组件使用约定、模板表达式和语句排序。

每条规则都有各自的适用范围。有些需要 `<script setup>`，有些检查模板，还有些支持普通脚本及独立 JavaScript 或 TypeScript 文件。具体范围见[规则概览](/zh/rules/)。

::: warning 开发状态
在首次稳定版本发布前，API 可能发生变化。升级时请查阅[更新日志](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/releases)。
:::

## 安装 {#install}

本包采用 ESM 格式，将 ESLint `^10.0.0` 和 `vue-eslint-parser` `^10.0.0` 声明为对等依赖。请一并安装：

::: code-group

```shell [pnpm]
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [npm]
npm i -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [yarn]
yarn add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

:::

如果使用 TypeScript 单文件组件，还需要安装脚本解析器和 TypeScript：

::: code-group

```shell [pnpm]
pnpm add -D @typescript-eslint/parser typescript@6
```

```shell [npm]
npm i -D @typescript-eslint/parser typescript@6
```

```shell [yarn]
yarn add -D @typescript-eslint/parser typescript@6
```

:::

## 基本用法 {#basic-usage}

在 `eslint.config.mjs` 中注册插件并启用所需规则。本插件仅提供规则，不提供内置配置。以下示例支持 JavaScript 和 TypeScript Vue 单文件组件：

```js [eslint.config.mjs]
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
      },
    },
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/callback-style': 'error',
      'vue-perfectionist/consistent-template-ref-name': 'error',
      'vue-perfectionist/define-macros-newline': 'error',
      'vue-perfectionist/prefer-ref-pattern': 'error',
      'vue-perfectionist/sort-script-setup': 'error',
    },
  },
])
```

对于仅使用 JavaScript 的单文件组件，省略 TypeScript 解析器导入及 `parserOptions.parser`。如果已有 Vue 配置提供了解析器，只需添加插件和所需规则。独立 JS/TS 文件及公共类型见[配置](/zh/guide/configuration)。

对源文件运行 ESLint，添加 `--fix` 可应用受支持的修复：

```shell
pnpm exec eslint .
pnpm exec eslint . --fix
```

## 选择规则 {#choosing-rules}

从[规则概览](/zh/rules/)中选择适合项目的检查。各规则独立启用，可以组合使用，约束互补的代码规范；示例见[规则组合](/zh/guide/rule-composition)。

组件 prop、插槽及泛型注释规则没有内置组件目标，需先配置 `targets` 才会报告问题。规则页面会说明默认值、选项、支持的语法，以及无法确定输入时的处理方式。

[`prefer-define-model`](/zh/rules/prefer-define-model) 用于识别配套的 prop 和更新事件声明，便于手动迁移到 Vue 3.4+ 的 `defineModel`。[`define-model-name-casing`](/zh/rules/define-model-name-casing) 则独立于模板参数，约束显式模型名称的大小写风格。

使用 [`prefer-watch-effect-alias`](/zh/rules/prefer-watch-effect-alias)，优先以 `watchPostEffect` 和 `watchSyncEffect` 替代静态的 `watchEffect` flush 选项。

使用 [`require-injection-key`](/zh/rules/require-injection-key)，禁止在 Vue 的 provide 和 inject 调用中使用字符串键。

使用 [`no-restricted-html-elements`](/zh/rules/no-restricted-html-elements)，通过精确的小写名称匹配禁止指定的原生 HTML 标签。其 `elements` 列表默认为空。

使用 [`no-complex-template-expression`](/zh/rules/no-complex-template-expression)，限制 Vue 模板中的逻辑运算符数量及条件表达式嵌套层数。

使用 [`prefer-on-scope-dispose`](/zh/rules/prefer-on-scope-dispose)，优先在具名组合式函数中使用基于作用域的清理方式，并为组件生命周期提供显式例外。

## 自动导入的 Vue API {#auto-imported-vue-apis}

使用自动导入工具时，启用 `settings['vue-perfectionist'].autoImport: true`，默认值为 `false`。支持的规则、规则级覆盖、局部遮蔽和 ESLint 全局变量见[自动导入配置](/zh/guide/configuration#auto-imported-vue-apis)。

## 自动修复 {#automatic-fixes}

七条规则可在支持的情况下自动修复：回调函数体风格、宏声明换行、模板标签间空行、混合文本插值、侦听副作用别名、setup 语句顺序，以及显式设置 `fix: true` 后的模型名称大小写。模型重命名会改变组件对外约定，其余问题需要手动修改。对整个项目应用修复前，请先了解[修复边界](/zh/guide/rule-composition#automatic-fixes)。

## 与其他排序规则一起使用 {#using-other-sorting-rules}

当 `sort-script-setup` 负责声明与宏的顺序时，应对同一批 `.vue` 文件禁用与其重叠的排序规则。仍应使用专门的导入排序规则及 Vue 正确性规则。覆盖配置见[语句排序](/zh/guide/rule-composition#statement-ordering)。
