---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/callback-style
description: 要求在已知 Vue API 的参数位置内联声明回调函数，并可配置函数及函数体风格。
---

# vue-perfectionist/callback-style

> 要求在已知 Vue API 的参数位置内联声明回调函数，并可配置函数及函数体风格。

- :wrench: ESLint 的 `--fix` 选项可以自动修复该规则报告的部分问题，仅支持将箭头表达式函数体转换为块级函数体。

该规则检查 JavaScript 和 TypeScript 文件，以及 Vue 单文件组件的普通脚本和 setup 脚本，包括组合式函数及其他函数内部的调用。不检查模板表达式。请在 ESLint 配置中显式启用。

## 用法 {#usage}

在现有解析器配置中启用该规则：

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/callback-style': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

使用默认选项时：

::: correct

```ts
import { onMounted, watch, watchEffect } from 'vue'

onMounted(() => {
  fetchData()
})
watch(userId, (value, oldValue, onCleanup) => {
  handleUserChange(value, oldValue, onCleanup)
})
watchEffect(onCleanup => {
  updateTitle(onCleanup)
})
```

:::

::: incorrect

```ts
import { onMounted, watch, watchEffect } from 'vue'

onMounted(fetchData)
watch(userId, handleUserChange)
watchEffect(updateTitle)
onMounted(() => fetchData())
onMounted(function () {
  fetchData()
})
```

:::

回调函数可以包含任意数量的语句，无需仅包装某个已有函数。可配合 [max-lines-per-callback](./max-lines-per-callback.md) 限制行数；较长的内部逻辑可提取为独立函数，再从内联回调中调用。

## :wrench: 选项 {#options}

```json
{
  "vue-perfectionist/callback-style": [
    "error",
    {
      "groups": ["lifecycle", "watch"],
      "functionStyle": "arrow",
      "bodyStyle": "block",
      "exclude": [],
      "customCallbacks": [],
      "vueGlobals": [],
      "vueImportSources": ["vue"]
    }
  ]
}
```

| 选项               | 默认值                   | 含义                                                             |
| ------------------ | ------------------------ | ---------------------------------------------------------------- |
| `groups`           | `['lifecycle', 'watch']` | 要检查的内置 API 分组。`[]` 禁用内置目标。                       |
| `functionStyle`    | `'arrow'`                | `'arrow'` 要求箭头函数；`'any'` 也接受内联函数表达式。           |
| `bodyStyle`        | `'block'`                | `'block'` 要求箭头函数体使用花括号；`'any'` 也允许表达式函数体。 |
| `exclude`          | `[]`                     | 要跳过的内置 API，使用原始导出名称。                             |
| `customCallbacks`  | `[]`                     | 额外的回调目标，支持为每个条目配置自动导入。                     |
| `vueGlobals`       | `[]`                     | 显式指定自动导入工具提供的、未绑定的 Vue API 名称。              |
| `vueImportSources` | `['vue']`                | 提供 Vue API 的精确模块标识符，替换默认列表。                    |

即使两个风格选项都为 `'any'`，仍要求内联回调。每条规则有独立的选项，不继承 `sort-script-setup` 的设置。

### 内置分组 {#built-in-groups}

索引从零开始。

| 分组        | API                                                                                                                                                                                                          | 回调索引            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `lifecycle` | `onBeforeMount`, `onMounted`, `onBeforeUpdate`, `onUpdated`, `onBeforeUnmount`, `onUnmounted`, `onActivated`, `onDeactivated`, `onErrorCaptured`, `onRenderTracked`, `onRenderTriggered`, `onServerPrefetch` | `0`                 |
| `watch`     | `watch`                                                                                                                                                                                                      | `1`                 |
| `watch`     | `watchEffect`, `watchPostEffect`, `watchSyncEffect`                                                                                                                                                          | `0`                 |
| `cleanup`   | `onScopeDispose`, `onWatcherCleanup`                                                                                                                                                                         | `0`                 |
| `scheduler` | `nextTick`                                                                                                                                                                                                   | `0`，仅在提供时检查 |

`cleanup` 和 `scheduler` 需要显式启用。`computed`、`customRef` 等 API 不在内置列表中。

仅检查 `watch` 的第二个参数，不检查 getter 函数、ref、响应式对象及数组等侦听源：

::: correct

```ts
import { watch } from 'vue'

watch(
  () => userId.value,
  () => {
    refresh()
  },
)
```

:::

### 导入身份与自动导入 {#import-identity-and-auto-imports}

具名导入别名和命名空间导入均按原始导出名称匹配：

命名空间接收者外的 TypeScript 包装（如 `(Vue as typeof Vue).onMounted(...)`）仍保留导入及遮蔽检查。

::: incorrect

```ts
import { onMounted as mounted } from 'vue'
import * as Vue from 'vue'

mounted(handler)
Vue.onMounted(handler)
```

:::

其他模块的导入、局部函数及被遮蔽的绑定不会匹配内置目标。仅类型导入不会匹配，默认导入也不视为具名 Vue API。

双脚本 SFC 中，`<script setup>` 内的局部声明仅在 setup 内遮蔽同名导入。两个脚本块的导入在模块作用域中均可用，与 Vue 的导入提升行为一致。

自动导入可通过 `settings['vue-perfectionist'].autoImport: true` 启用（见[共享配置](../guide/configuration.md#auto-imported-vue-apis)），也可以单独为本规则设置 `vueGlobals: ['onMounted', 'watch', 'watchEffect']`。显式 `vueGlobals` 会覆盖内置 Vue API 的共享设置；`[]` 禁用全局识别。自定义回调使用各自的 `autoImport`。这些名称仅在没有局部绑定时匹配，包括 ESLint 全局变量声明的名称。重新导出模块可配置为 `vueImportSources: ['vue', '#imports']`。

不根据前缀猜测，也不进行跨文件分析。跳过计算成员访问、可选调用及可选成员访问。

### 自定义回调 {#custom-callbacks}

```json
{
  "customCallbacks": [
    {
      "source": "vue-router",
      "name": "onBeforeRouteLeave",
      "callbackIndices": [0]
    },
    {
      "source": "@vueuse/core",
      "name": "watchDebounced",
      "callbackIndices": [1]
    },
    {
      "source": "@/composables/events",
      "name": "subscribe",
      "callbackIndices": [1, 2]
    }
  ]
}
```

`source` 和 `name` 为精确匹配的非空字符串。`name` 是原始导出名称；使用 `'default'` 可匹配任意本地名称的默认导入。支持别名和命名空间调用。`callbackIndices` 必须至少包含一个非负整数，且不得重复。

自定义条目独立于 `groups`、`exclude` 和 `vueGlobals` 生效。匹配的索引会合并，每个参数最多报告一次。

各条目接受可选布尔值 `autoImport`。省略时继承 `settings['vue-perfectionist'].autoImport`（默认 `false`）；设为 `true` 或 `false` 可覆盖共享设置。显式导入不受此选项影响，仍会匹配。

例如，让以下 VueUse 回调继承共享设置：

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    settings: {
      'vue-perfectionist': {
        autoImport: true,
      },
    },
    rules: {
      'vue-perfectionist/callback-style': [
        'error',
        {
          customCallbacks: [
            {
              source: '@vueuse/core',
              name: 'useResizeObserver',
              callbackIndices: [1],
            },
            {
              source: '@vueuse/core',
              name: 'tryOnMounted',
              callbackIndices: [0],
            },
            {
              source: '@vueuse/core',
              name: 'tryOnUnmounted',
              callbackIndices: [0],
            },
          ],
        },
      ],
    },
  },
])
```

使用此配置时：

::: incorrect

```ts
useResizeObserver(containerRef, resize)
tryOnMounted(mount)
tryOnUnmounted(unmount)
```

:::

::: correct

```ts
useResizeObserver(containerRef, () => {
  resize()
})
tryOnMounted(() => {
  mount()
})
tryOnUnmounted(() => {
  unmount()
})
```

:::

自动导入仅在配置的 `name` 没有局部绑定时匹配，包括 ESLint 全局变量声明的名称。局部声明、参数、其他来源的导入和仅类型导入均跳过。该设置声明未绑定名称属于指定来源，不读取自动导入清单，不推断别名或命名空间对象；`name: 'default'` 仍需要显式导入。

## 诊断与修复 {#diagnostics-and-fixes}

引用、成员访问、`.bind()` 调用、回调工厂、条件表达式及其他非函数参数均会报告。检查前会移除 TypeScript 的 `as`、`satisfies`、类型断言、非空断言和实例化包装。

跳过缺失参数。展开参数及其后的参数因无法确定位置而跳过；展开参数之前位置已知的参数仍会检查。不验证调用签名和回调类型。

| 诊断                     | 自动修复                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `expectedInlineCallback` | 无。包装引用可能改变参数转发、接收者绑定、求值时机和返回行为。 |
| `expectedArrowCallback`  | 无。普通函数可能依赖 `this`、`arguments`、递归或生成器行为。   |
| `expectedBlockBody`      | 用包含 `return` 的块包装原箭头表达式函数体。                   |

例如，自动修复会保留返回值：

::: incorrect

```ts
onMounted(() => fetchData())
```

:::

::: correct

```ts
onMounted(() => {
  return fetchData()
})
```

:::

返回表达式会加上括号，保留序列表达式语义，并避免注释和换行附近的自动分号插入。已有括号、注释、async 修饰符、参数和 TypeScript 注解均保留。生成的代码块可交由格式化工具处理。

保留 `return` 可以保留 Promise 及 `false` 等返回值。如果有意丢弃返回值，请手动编写块级函数体。与 `arrow-body-style` 一起使用时，请配置该规则以允许块级函数体。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/callback-style.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/callback-style.test.ts)
