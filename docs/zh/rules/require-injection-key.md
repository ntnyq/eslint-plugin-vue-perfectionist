---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-injection-key
description: 禁止在 Vue 的 provide 和 inject 调用中使用字符串键。
---

# vue-perfectionist/require-injection-key

> 禁止在 Vue 的 provide 和 inject 调用中使用字符串键。

## 用法 {#usage}

为文件配置合适的解析器，见[快速开始](/zh/guide/)。

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/require-injection-key': 'error' },
  },
]
```

## :book: 规则详情 {#rule-details}

优先使用键模块导出的共享 symbol。TypeScript 中使用 Vue `InjectionKey<T>` 注解，关联提供方和使用方类型。Vue 本身支持字符串，本规则约束的是项目规范。

::: correct

```ts
import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'

const formKey: InjectionKey<string> = Symbol('form')
provide(formKey, 'value')
const form = inject(formKey)
```

:::

::: incorrect

```ts
import { inject, provide } from 'vue'

provide('form', 'value')
const formKey = 'form'
const form = inject(formKey)
```

:::

## :wrench: 选项 {#options}

```json
{
  "strict": false,
  "allowStrings": [],
  "vueImportSources": ["vue"]
}
```

- `strict`（布尔值，默认 `false`）：除允许的字符串外，要求每个被检查键具有 Vue `InjectionKey<T>` 类型，需要完整 TypeScript 解析器服务，见[严格模式](#strict-mode)。
- `allowStrings`（`string[]`，默认 `[]`）：第三方字符串约定的精确、区分大小写例外，也适用于解析后的本地别名。空数组不允许字符串，无隐式例外。
- `vueImportSources`（`string[]`，默认 `["vue"]`）：替换识别模块；`[]` 禁用导入识别。
- `vueGlobals`（`string[]`）：替换共享自动导入识别。省略时，共享 `autoImport: true` 启用未绑定 `provide`、`inject`，否则均不识别。`[]` 禁用全局目标；局部和仅类型绑定不视为全局 API。

对于要求字符串键的库：

```json
{ "allowStrings": ["legacy-form"] }
```

### 严格模式 {#strict-mode}

仅对提供 TypeScript 类型信息的文件启用 `strict: true`。以下扁平化配置支持 TS 项目中的 `.ts` 和 Vue SFC：

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-injection-key': ['error', { strict: true }],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
  },
]
```

也支持 `parserOptions.project`。将文件纳入 TS 项目，并在 `tsconfig.json` 中启用 `strict: true`，保证可靠的可空性信息。缺少 program 或节点映射会产生配置错误，即使文件没有相关调用。严格模式不会静默回退到语法检查。JavaScript 请使用 `@typescript-eslint/parser`、`allowJs` 及 JSDoc 键类型。参阅[带类型信息的代码检查配置](https://typescript-eslint.io/getting-started/typed-linting/)。

::: correct

启用 `strict: true` 且提供类型信息时：

```ts
import { inject } from 'vue'
import type { InjectionKey } from 'vue'

const formKey: InjectionKey<string> = Symbol('form')
const form = inject(formKey)
```

:::

::: incorrect

启用 `strict: true` 后，普通 symbol 会报告：

```ts
import { inject } from 'vue'

const formKey = Symbol('form')
const form = inject(formKey)
```

:::

严格模式遵循调用处的 TypeScript 类型，包括导入键、模块成员、类型别名/重新导出、返回类型、受约束泛型及 `T['key']`、`T[K]` 等泛型索引访问。也检查延迟条件类型的可用约束，所有可能分支都必须符合要求。

识别已安装 `@vue/runtime-core` 中实际的 `InjectionKey` 声明和标记。本地或无关包中的同名类型不足以满足要求，普通 symbol 的结构可赋值性也不够。`vueImportSources` 仅改变 API 识别，不改变可信键类型来源。

联合的每个成员都必须是识别的键或允许的字符串字面量。交叉类型可细化识别的键。仅提取 Vue 内部标记不算键：完整交叉类型仍须是原始 symbol。拒绝仅携带标记的对象、字符串、数值和装箱 `Symbol`，同时兼容 Vue 早期基于接口的 `InjectionKey`。

报告 `any`、`unknown`、`never`、普通 `symbol`/`unique symbol`、宽泛字符串、无约束泛型和可空键。调用前请收窄可空键，或有意使用非空断言。不限制载荷类型参数本身。

`allowStrings` 适用于原始语法解析出的值；严格模式下也适用于导入、参数和联合成员的字符串字面量类型。仅因白名单非空，不会接受宽泛 `string`。

类型断言被视为 TypeScript 约定，而非运行时证明。除非已有语法检查发现禁止字符串，否则接受断言为 `InjectionKey<T>`。`Symbol() satisfies InjectionKey<T>` 保留推断的 symbol 类型，因此会报告，应改用类型注解。不验证载荷兼容、symbol 共享或其他 TypeScript 编译诊断。上述严格示例由带类型测试验证，本文档渲染器不显示其内联诊断。

## 适用范围 {#scope}

检查 Vue 脚本及独立 JS/TS，识别配置来源的具名导入、别名及非计算命名空间调用。解包 TypeScript 表达式包装，仅报告首个参数。

默认检查字符串、无插值模板字面量及本地 `const` 标识符初始化链，遵守词法和双脚本 SFC 作用域。不求值拼接、含插值模板、对象成员、可变变量或导入键值。接受未知键。

默认模式仅按语法禁止字符串，不需要类型服务。严格模式额外验证键的 Vue 类型来源。两种模式都跳过可选调用、计算 API 成员、默认导入、展开键、选项式 API 的 `provide`/`inject` 声明、`app.provide` 及模板表达式。

不提供自动修复或建议：提供方和使用方必须一起采用同一个 symbol。每次调用新建 symbol 会破坏依赖注入。

参阅 [Vue 带类型的 provide/inject 指南](https://vuejs.org/guide/typescript/composition-api.html#typing-provide-inject)。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-injection-key.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-injection-key.test.ts)
- [严格模式测试](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-injection-key-strict.test.ts)
