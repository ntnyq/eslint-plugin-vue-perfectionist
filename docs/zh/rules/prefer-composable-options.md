---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-composable-options
description: 优先使用末尾的选项对象传递组合式函数参数。
---

# vue-perfectionist/prefer-composable-options

> 优先使用末尾的选项对象传递组合式函数参数。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                         |
| -------- | -------------------------------------------- |
| 适用范围 | Vue 脚本及独立 JS/TS 文件                    |
| 默认行为 | 不允许位置参数；需要输入时使用单个选项对象。 |
| 必需选项 | 无；启用后即使用默认选项。                   |
| 自动修复 | —                                            |
| 类型信息 | 不需要 TypeScript 类型服务。                 |

:::

<!-- summary:end -->

将组合式函数输入放在具名字段中，可选择允许前置位置参数。这是需主动启用的项目 API 规范，并不意味着 Vue 要求所有组合式函数都使用选项对象。

## 用法 {#usage}

注册插件，为需要检查的文件启用规则：

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/prefer-composable-options': 'error' },
  },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
  },
])
```

仅使用语法及局部作用域信息，不需要 TypeScript 项目、`parserOptions.project` 或 `projectService`。

## :book: 规则详情 {#rule-details}

默认匹配函数可以没有参数，或仅有一个选项参数。对象解构可选：

::: correct

```ts
interface UseCommentsOptions {
  id: string
  canReply: () => boolean
  thread?: string
}

export function useComments({
  id,
  canReply,
  thread = '',
}: UseCommentsOptions) {}

const useCommentList = (options: UseCommentsOptions) => options

function useCurrentUser() {}
```

:::

::: incorrect

```ts
export function useComments(id: string, canReply: () => boolean, thread = '') {}

function useCurrentUser(id: string) {}
```

:::

只有最后一个参数可以是选项容器。之前的参数均计为位置参数，包括对象、ref、数组、回调、可选参数及带默认值参数。TypeScript 的 `this` 参数不计入，因为调用方不会传入它。

只要普通参数多于一个，即使全部参数都在位置参数限额内，最后一个也必须是已确认的选项对象。无参数函数始终允许。

### 选项对象识别 {#recognizing-options}

| 参数形式                                                                  | 结果                                       |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| 对象解构，包括 `{}`、默认值和对象剩余属性                                 | 选项容器                                   |
| 无类型标识符，直接以对象字面量为默认值，如 `config = {}`                  | 选项容器                                   |
| 至少有一个具名属性或方法，且无调用或构造签名的类型字面量                  | 选项容器                                   |
| 本地非泛型类型别名及不带 `extends` 的接口                                 | 解析外层结构，别名可引用其他受支持本地类型 |
| 无泛型或 `extends` 的本地合并接口                                         | 合并检查全部成员                           |
| 支持的选项结构的联合，可包含 `undefined`                                  | 选项容器                                   |
| 每个成员均为受支持选项结构的交叉类型                                      | 选项容器                                   |
| 原始类型、函数、数组、元组语法，或调用/构造签名                           | 位置参数                                   |
| 包含原始类型、`null`、函数、数组或元组结构的联合                          | 位置参数                                   |
| 仅名为 `options`，或使用 `any`、`unknown`、`object`、`{}`、仅索引签名类型 | 无法确认                                   |
| 导入或限定类型、泛型类型或类型参数、继承接口、映射/条件类型、类或循环别名 | 无法确认                                   |

名称不是类型证据：`options: string` 和本地 `type UseCommentsOptions = string` 仍是位置参数。参数无需命名为 `options`，类型也无需以 `Options` 结尾。

对象解构本身足以证明是具名字段容器，无需解析类型注解。标识符参数的显式类型优先于默认值，例如 `options: unknown = {}` 无法确认。不推断 `options = defaults` 等默认引用或 `options = {} as Options` 等断言默认值。

本地类型解析遵守词法作用域，区分普通脚本绑定和 setup 中的遮蔽绑定。只检查容器，不检查字段类型，因此选项字段可包含回调、导入、泛型和递归类型。结构匹配的业务实体也可能符合要求，语法无法判断作者意图。仅有计算键时，除非键为字面量，否则不足以证明具名字段。索引签名可与具名字段共存。

::: correct

```js
function useComments({ id, canReply, thread = '', ...rest }) {}

function useCommentList(config = {}) {}
```

:::

::: incorrect

```ts
import type { UseCommentsOptions } from './options'

function useComments(options: UseCommentsOptions) {}

function useCommentList(options) {}
```

:::

要求选项对象而末尾参数无法确认时，会给出专门诊断，不会静默通过或依赖类型名后缀。请用解构或受支持的本地对象类型明确结构。位置参数限额大于零时，单个无法确认的参数可占用一个位置，但不视为已确认选项。

## :wrench: 选项 {#options}

默认值：

```json
{
  "maxPositionalParams": 0,
  "functionPattern": "^use[A-Z]",
  "ignoreNames": []
}
```

| 选项                  | 类型                     | 默认值        | 含义                                       |
| --------------------- | ------------------------ | ------------- | ------------------------------------------ |
| `maxPositionalParams` | 非负整数                 | `0`           | 末尾选项对象之前允许的最大参数数。         |
| `functionPattern`     | 字符串                   | `'^use[A-Z]'` | 匹配函数绑定名称的 JavaScript 正则源码。   |
| `ignoreNames`         | 非空且不重复的字符串数组 | `[]`          | 精确排除的绑定名称，空数组不排除任何名称。 |

### maxPositionalParams

使用 `1` 允许主输入后接选项。单个位置输入也符合此限额：

::: correct

```ts
/* eslint vue-perfectionist/prefer-composable-options: [error, { maxPositionalParams: 1 }] */
interface UseCommentsOptions {
  canReply: () => boolean
  thread?: string
}

function useComments(id: string, options: UseCommentsOptions) {}

function useCurrentUser(id: string) {}
```

:::

即使 `maxPositionalParams: 2`，也不允许两个位置参数而没有选项对象：

::: incorrect

```ts
/* eslint vue-perfectionist/prefer-composable-options: [error, { maxPositionalParams: 2 }] */
function useComments(id: string, thread: string) {}
```

:::

同样的限额允许两个前置输入，前提是后接选项：

::: correct

```ts
/* eslint vue-perfectionist/prefer-composable-options: [error, { maxPositionalParams: 2 }] */
function useComments(
  id: string,
  thread: string,
  options: { canReply: () => boolean },
) {}
```

:::

本版本没有单独禁止回调或 `requireOptions` 模式。回调和其他输入一样，可使用允许的位置参数名额。

### functionPattern 与 ignoreNames {#functionpattern-and-ignorenames}

模式为不带分隔符及标志的 JavaScript 正则源码，区分大小写，不自动添加锚点。默认匹配 `use` 后接 ASCII 大写字母。无效模式属于配置错误。`ignoreNames` 优先于模式匹配。

例如，采用不同规范并添加一个显式例外：

```json
{
  "functionPattern": "^create[A-Z]",
  "ignoreNames": ["createLegacyComments"]
}
```

通过 ESLint 扁平化配置的 `files` 和 `ignores` 按目录应用不同规范。

## 适用范围 {#scope}

检查具名函数声明、具名默认导出函数声明，以及直接赋值给标识符变量声明的箭头或函数表达式。变量绑定名优先于函数表达式内部名。支持初始化器外的括号及 TypeScript 包装。包括嵌套定义、async 及泛型函数。不要求 Vue 导入或自动导入设置。

支持独立 JS/TS 和 Vue SFC 两个脚本块。同作用域存在实现的公共重载签名逐个检查，跳过实现签名以避免重复报告。无重载的普通函数照常检查。

首版不检查匿名默认导出、对象/类方法、函数属性、后续赋值、条件初始化器及 `createComposable(...)` 等工厂包装。跳过调用、模板表达式、独立函数类型、没有实现的 ambient 签名和声明文件（`.d.ts`、`.d.mts`、`.d.cts`）。

顶层剩余参数始终报告，包括带类型的剩余元组，因为它们会绕过位置参数限制。允许对象解构内部的剩余属性。

::: incorrect

```ts
function useComments(...args: unknown[]) {}
```

:::

## 自动修复与格式化 {#automatic-fixes-and-formatting}

仅报告，不提供自动修复或建议。将输入移入对象需协调调用方、重载及相关类型，可能涉及其他文件。默认值、`arguments` 和响应式解构也可能改变行为。

每个签名最多报告一次：顶层剩余参数优先，其次是确认选项对象之前位置参数过多，再次是缺失或无法确认的末尾选项对象。参数过多时指向首个超出限额参数，其他诊断指向剩余参数或末尾参数。格式不影响检查。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-composable-options.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-composable-options.test.ts)
