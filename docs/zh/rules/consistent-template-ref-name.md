---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/consistent-template-ref-name
description: 要求模板 ref 的变量名与键名一致。
---

# vue-perfectionist/consistent-template-ref-name

> 要求模板 ref 的变量名与键名一致。

比较接收变量名与传给 Vue `useTemplateRef()` 的静态键。不一致时在变量标识符处报告，不提供自动修复或建议。

## 用法 {#usage}

在现有解析器和插件配置中添加规则：

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    rules: {
      'vue-perfectionist/consistent-template-ref-name': 'error',
    },
  },
])
```

插件注册及完整扁平化配置见[指南](../guide/index.md#basic-usage)。Vue SFC 需要 `vue-eslint-parser`，TypeScript 脚本还需要 TypeScript 解析器。独立 JS/TS 文件使用常规 ESLint 解析器，并通过配置中的 `files` 模式匹配。

## :book: 规则详情 {#rule-details}

直接初始化的变量必须与键名称完全一致。以下脚本示例也适用于 `<script setup>` 和普通 Vue 脚本块：

::: correct

```js
import { useTemplateRef } from 'vue'

const inputRef = useTemplateRef('inputRef')
const panelRef = useTemplateRef(`panelRef`)
```

:::

::: incorrect

```js
import { useTemplateRef } from 'vue'

const inputRef = useTemplateRef('fieldRef')
```

:::

字符串比较区分大小写。也检查空字符串及 kebab-case 键，它们无法与 JavaScript 变量标识符相等。

本规则不要求后缀或正则模式。如果名称还需遵循以 `Ref` 结尾等规范，请另外启用 [`prefer-ref-pattern`](./prefer-ref-pattern.md)：

::: correct

```js
import { useTemplateRef } from 'vue'

const input = useTemplateRef('input')
```

:::

上述示例仅通过本规则，不符合 `prefer-ref-pattern` 的默认规范。

## :wrench: 选项 {#options}

此规则没有选项。

## 适用范围 {#scope}

- 检查使用 `const`、`let` 或 `var` 的直接标识符声明，包括函数内声明、导出声明和 SFC 的两个脚本块。后续重新赋值不会使初始化器检查失效。
- 识别来自 `vue` 的显式运行时导入，包括具名导入别名、命名空间导入，以及 `Vue['useTemplateRef']()` 等静态命名空间属性访问。
- 按解码后的值比较字符串字面量及无插值模板字面量。支持括号、TypeScript 类型参数、断言、非空断言及 `satisfies` 包装。
- 跳过动态键、含插值字符串、保存键的常量、展开参数、解构、声明后赋值，以及嵌套在其他表达式或自定义包装中的调用。跳过可选链。
- 跳过局部函数、被遮蔽绑定、默认导入、仅类型导入、其他模块的导入及赋值给变量的别名。
- 仅当 `settings['vue-perfectionist'].autoImport` 为 `true` 时识别未导入的 `useTemplateRef()`，见[自动导入配置](../guide/index.md#auto-imported-vue-apis)。该设置默认为 `false`，不覆盖局部绑定。
- 不检查模板属性、普通 `ref()` / `shallowRef()` 状态，也不检查键与模板元素之间的对应关系。

## 自动修复 {#automatic-fixes}

修改键可能破坏与模板的关联；变量重命名需要更新引用并检查命名冲突。因此，本规则仅报告问题，不提供自动修复或建议。请确定目标名称，并同时更新相关脚本和模板引用。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/consistent-template-ref-name.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/consistent-template-ref-name.test.ts)
