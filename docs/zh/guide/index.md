---
description: 安装 Vue Perfectionist，并在 ESLint 扁平化配置中启用规则。
---

# 快速开始 {#getting-started}

`eslint-plugin-vue-perfectionist` 为 Vue 3 脚本和模板提供可配置的 ESLint 规则。
按以下步骤注册插件、启用规则并运行检查。

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
      'vue-perfectionist/define-macros-newline': 'error',
      'vue-perfectionist/no-complex-template-expression': 'error',
    },
  },
])
```

对于仅使用 JavaScript 的单文件组件，省略 TypeScript 解析器导入及 `parserOptions.parser`。如果已有 Vue 配置提供了解析器，只需添加插件和所需规则。

## 运行 ESLint {#run-eslint}

对源文件运行 ESLint，添加 `--fix` 可应用受支持的修复：

```shell
pnpm exec eslint .
pnpm exec eslint . --fix
```

组合式函数的返回对象和消费端解构可以分别启用
[sort-composable-return](/zh/rules/sort-composable-return) 与
[sort-composable-destructure](/zh/rules/sort-composable-destructure)。
两者默认状态在前、方法在后，保留组内顺序，只自动修复空行。

## 后续步骤 {#next-steps}

- [选择规则](/zh/rules/)：按用途浏览规则，查看适用文件范围、默认行为和自动修复支持情况。
- [配置](/zh/guide/configuration)：配置独立 JS/TS 文件、自动导入的 Vue API 和公共类型。
- [规则组合](/zh/guide/rule-composition)：组合相关检查，了解自动修复边界及与其他插件的交互。
- [问题排查](/zh/guide/troubleshooting)：排查规则未生效、缺少自动修复和类型服务配置。
