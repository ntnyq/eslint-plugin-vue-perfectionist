---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-on-scope-dispose
description: 优先在具名 Vue 组合式函数中使用基于作用域的清理方式。
---

# vue-perfectionist/prefer-on-scope-dispose

> 优先在具名 Vue 组合式函数中使用基于作用域的清理方式。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| 适用范围 | Vue 脚本及独立 JS/TS 文件                        |
| 默认行为 | 在命名的 useXxx 组合式函数内优先使用作用域清理。 |
| 必需选项 | 无；启用后即使用默认选项。                       |
| 自动修复 | —                                                |
| 类型信息 | 不需要 TypeScript 类型服务。                     |

:::

<!-- summary:end -->

## 用法 {#usage}

为文件配置合适的解析器，见[快速开始](/zh/guide/)。

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/prefer-on-scope-dispose': 'error' },
  },
]
```

## :book: 规则详情 {#rule-details}

组合式函数可在独立 `effectScope` 中运行，不依赖组件。资源属于该作用域时，应使用 `onScopeDispose` 注册清理。此规范要求注册时存在活动的副作用作用域。

::: correct

```ts
import { onScopeDispose } from 'vue'

export function usePolling() {
  const timer = setInterval(refresh, 3000)
  onScopeDispose(() => clearInterval(timer))
}
```

:::

::: incorrect

```ts
import { onUnmounted } from 'vue'

export function usePolling() {
  const timer = setInterval(refresh, 3000)
  onUnmounted(() => clearInterval(timer))
}
```

:::

## :wrench: 选项 {#options}

```json
{
  "functionPattern": "^use[A-Z]",
  "ignoreNames": [],
  "hooks": ["onUnmounted"],
  "vueImportSources": ["vue"]
}
```

- `functionPattern`（正则源码，默认 `"^use[A-Z]"`）：匹配函数声明名及直接以函数初始化的变量绑定名。使用无标志、区分大小写的 JavaScript 正则。
- `ignoreNames`（`string[]`，默认 `[]`）：精确豁免的函数绑定名，例如清理依赖组件 DOM 或生命周期顺序的组合式函数。空数组不排除。
- `hooks`（数组，默认 `["onUnmounted"]`）：替换要检查的生命周期 API，也接受 `onBeforeUnmount`；`[]` 禁用检查。卸载前钩子通常有意依赖其时机，因此默认排除。
- `vueImportSources`（`string[]`，默认 `["vue"]`）：替换识别的模块标识符；`[]` 禁用导入 API 识别。
- `vueGlobals`（`string[]`）：替换共享自动导入识别。省略时，共享 `autoImport: true` 启用未绑定 `onUnmounted` 和 `onBeforeUnmount`，仍由 `hooks` 过滤；否则禁用全局目标。`[]` 禁用全局目标，局部及仅类型绑定不会成为全局 API。

例如，也检查卸载前清理，但保留依赖 DOM 的组合式函数：

```json
{
  "hooks": ["onUnmounted", "onBeforeUnmount"],
  "ignoreNames": ["useDomTransition"]
}
```

## 适用范围 {#scope}

检查 Vue 脚本及独立 JS/TS。根据绑定名和识别的 Vue 生命周期调用选择函数，不依赖文件名。支持具名导入、别名、非计算命名空间调用及 TypeScript 包装。包括具名默认导出函数声明，不包括匿名默认导出。变量名优先于函数表达式内部名。

仅检查**最近一层函数体**中的调用。`if` 等块仍属该函数，但嵌套回调、方法、类初始化器及参数默认值不继承组合式函数名称。具名嵌套组合式函数独立检查。传给工厂或赋值到对象属性的函数不在范围内。

跳过顶层 `<script setup>` 调用及普通组件 `setup()`。第二参数可能指定组件时跳过；未被遮蔽的 `undefined` 或 `void` 表达式仍指向默认当前实例，会检查，包括 TypeScript 包装。跳过局部绑定的 `undefined`、其他目标表达式及超过两个参数的调用。不求值别名或推断目标类型。跳过可选调用、计算 API 成员、默认导入、展开参数及模板表达式。

无法推断资源归属或 DOM 依赖。确实需要组件生命周期时，使用 `ignoreNames` 或局部 ESLint 禁用注释。本规则不验证调用时是否存在活动作用域。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

不提供自动修复或建议。作用域释放与组件卸载具有不同的时机和归属。修改前请检查清理要求，尤其涉及 DOM 状态或其他生命周期钩子时。回调引用和内联回调都会检查。

参阅 [Vue 的 onScopeDispose 文档](https://vuejs.org/api/reactivity-advanced.html#onscopedispose)。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-on-scope-dispose.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-on-scope-dispose.test.ts)
