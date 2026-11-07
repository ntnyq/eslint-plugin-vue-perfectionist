---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/max-lines-per-callback
description: 限制 Vue API 内联回调函数的行数。
---

# vue-perfectionist/max-lines-per-callback

> 限制 Vue API 内联回调函数的行数。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                           |
| -------- | ------------------------------ |
| 适用范围 | Vue 脚本及独立 JS/TS 文件      |
| 默认行为 | 生命周期或侦听回调最多 20 行。 |
| 必需选项 | 无；启用后即使用默认选项。     |
| 自动修复 | —                              |
| 类型信息 | 不需要 TypeScript 类型服务。   |

:::

<!-- summary:end -->

将内部逻辑提取为独立函数，并在内联回调中调用，以保持回调简短。本规则报告行数超限，不提供自动修复或建议。

## 用法 {#usage}

在现有 Vue 和 TypeScript 解析器配置中启用规则：

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
      'vue-perfectionist/max-lines-per-callback': [
        'error',
        {
          max: 15,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
])
```

两条规则的选项独立。`callback-style` 要求内联回调并控制其语法；`max-lines-per-callback` 仅检查长度。函数引用不在本规则范围内，同时启用时仍由 `callback-style` 报告。

## :book: 规则详情 {#rule-details}

设置 `max: 3` 时，此回调超过限制：

::: incorrect

<!-- eslint-skip -->

```ts eslint-check=vue-perfectionist/max-lines-per-callback
/* eslint vue-perfectionist/max-lines-per-callback: [error, { max: 3 }] */
import { watch } from 'vue'

watch(source, (value, oldValue, onCleanup) => {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
})
```

:::

提取内部逻辑，同时保留简短的内联回调：

::: correct

<!-- eslint-skip -->

```ts eslint-check=vue-perfectionist/max-lines-per-callback
/* eslint vue-perfectionist/max-lines-per-callback: [error, { max: 3 }] */
import { watch } from 'vue'

function handleChange(value, oldValue, onCleanup) {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
}

watch(source, (value, oldValue, onCleanup) => {
  return handleChange(value, oldValue, onCleanup)
})
```

:::

转发逻辑所需参数，并保留返回行为。提取后的函数不受本规则的行数限制。

## 行数计算方式 {#counting-lines}

从内联函数的首个 token 到最后一个 token，按实际源码行计数，包含首尾行。签名、多行参数、花括号及嵌套函数均计入。空的单行回调计一行。不计外围调用、外层 TypeScript 断言及函数外注释。

检查箭头函数（含表达式函数体）及普通函数表达式，包括 async 和生成器函数。嵌套 API 回调独立检查，也计入外层回调行数。

- `skipBlankLines` 排除仅含空白的行。
- `skipComments` 排除仅含注释及空白的行，包括块注释内部行。带尾部或行内注释的代码行仍计入。字符串或模板字面量内类似注释的文本仍计入。
- 两个选项互相独立。仅设 `skipComments` 时，注释外空行仍计入；仅设 `skipBlankLines` 时，非空注释行仍计入。多行字符串内的空白行也遵循 `skipBlankLines`。

例如，设置 `max: 3`、`skipBlankLines: true` 和 `skipComments: true`：

::: correct

<!-- eslint-skip -->

```ts eslint-check=vue-perfectionist/max-lines-per-callback
/* eslint vue-perfectionist/max-lines-per-callback: [error, { max: 3, skipBlankLines: true, skipComments: true }] */
import { onMounted } from 'vue'

onMounted(() => {
  // Delegate initialization.

  initialize() // This line still counts.
})
```

:::

## :wrench: 选项 {#options}

```json
{
  "vue-perfectionist/max-lines-per-callback": [
    "error",
    {
      "max": 20,
      "skipBlankLines": false,
      "skipComments": false,
      "groups": ["lifecycle", "watch"],
      "exclude": [],
      "customCallbacks": [],
      "vueGlobals": [],
      "vueImportSources": ["vue"]
    }
  ]
}
```

| 选项               | 类型               | 默认值                   | 含义                                                                            |
| ------------------ | ------------------ | ------------------------ | ------------------------------------------------------------------------------- |
| `max`              | 整数 ≥ 1           | `20`                     | 每个内联回调最多计入的行数。                                                    |
| `skipBlankLines`   | boolean            | `false`                  | 排除仅含空白的行。                                                              |
| `skipComments`     | boolean            | `false`                  | 排除仅含注释的行。                                                              |
| `groups`           | `CallbackGroup[]`  | `['lifecycle', 'watch']` | 内置 API 分组，替换默认值；`[]` 禁用内置目标。                                  |
| `exclude`          | `string[]`         | `[]`                     | 要跳过的内置原始导出名称，不影响自定义条目。                                    |
| `customCallbacks`  | `CustomCallback[]` | `[]`                     | 以精确导入来源和导出名称匹配的额外回调位置。                                    |
| `vueGlobals`       | `string[]`         | 共享设置，否则 `[]`      | 显式的未绑定内置 API 名称，覆盖共享设置；`[]` 禁用 Vue 与 VueUse 内置全局目标。 |
| `vueImportSources` | `string[]`         | `['vue']`                | 提供 Vue API 的精确模块标识符；`[]` 禁用 Vue 导入，不影响 VueUse 模块。         |
| `vueuse`           | boolean            | 共享设置，否则 `false`   | 启用内置 VueUse 回调，规则级值优先于共享设置。                                  |

省略 `vueGlobals` 时继承 `settings['vue-perfectionist'].autoImport`。上方配置显式传入空列表，会对内置 API 禁用继承。其他选项不继承自 `callback-style` 或 `sort-script-setup`。

### 内置分组 {#built-in-groups}

回调索引从零开始，与 `callback-style` 一致。

| 分组        | API                                                                                                                                                                                                          | 回调索引            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `lifecycle` | `onBeforeMount`, `onMounted`, `onBeforeUpdate`, `onUpdated`, `onBeforeUnmount`, `onUnmounted`, `onActivated`, `onDeactivated`, `onErrorCaptured`, `onRenderTracked`, `onRenderTriggered`, `onServerPrefetch` | `0`                 |
| `watch`     | `watch`                                                                                                                                                                                                      | `1`                 |
| `watch`     | `watchEffect`, `watchPostEffect`, `watchSyncEffect`                                                                                                                                                          | `0`                 |
| `cleanup`   | `onScopeDispose`, `onWatcherCleanup`                                                                                                                                                                         | `0`                 |
| `scheduler` | `nextTick`                                                                                                                                                                                                   | `0`，仅在提供时检查 |

需显式启用 `cleanup` 和 `scheduler`，例如 `groups: ['lifecycle', 'watch', 'cleanup', 'scheduler']`。仅检查 `watch` 第二个参数，不检查源 getter 和源数组。`computed`、`customRef` 等 API 需要自定义配置。

### 导入身份与自动导入 {#import-identity-and-auto-imports}

具名导入别名及命名空间导入按原始导出名称匹配。命名空间接收者外的 TypeScript 包装（如 `(Vue as typeof Vue).onMounted(...)`）保留导入和遮蔽检查。局部声明、遮蔽参数、其他模块导入及仅类型导入不匹配。默认导入不视为内置 Vue API。重新导出模块可设置 `vueImportSources: ['vue', '#imports']`。

启用 `settings['vue-perfectionist'].autoImport: true`，或配置本规则的 `vueGlobals`，可识别未绑定 Vue API。ESLint 全局变量声明的名称也符合条件，但仅声明全局变量不会启用识别，见[共享配置](../guide/configuration.md#auto-imported-vue-apis)。显式 `vueGlobals` 仅对内置目标覆盖共享设置。

### VueUse {#vueuse}

启用 `settings['vue-perfectionist'].vueuse: true` 后，会检查下表中的 VueUse API。规则级布尔选项 `vueuse` 优先于共享值：`options.vueuse ?? settings['vue-perfectionist'].vueuse ?? false`。

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    settings: {
      'vue-perfectionist': { vueuse: true, autoImport: true },
    },
    rules: {
      'vue-perfectionist/max-lines-per-callback': ['error', { max: 3 }],
    },
  },
])
```

| 分组        | VueUse API                                                                                                                                                                       | 回调索引 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `lifecycle` | `tryOnBeforeMount`, `tryOnBeforeUnmount`, `tryOnMounted`, `tryOnUnmounted`                                                                                                       | `0`      |
| `watch`     | `watchArray`, `watchAtMost`, `watchDebounced`, `watchDeep`, `watchIgnorable`, `watchImmediate`, `watchOnce`, `watchThrottled`, `watchTriggerable`, `watchWithFilter`, `whenever` | `1`      |
| `cleanup`   | `tryOnScopeDispose`                                                                                                                                                              | `0`      |
| `scheduler` | `useIntervalFn`, `useTimeoutFn`                                                                                                                                                  | `0`      |

精确匹配来自 `@vueuse/core` 和 `@vueuse/shared` 的导入，包括别名和命名空间导入。`groups` 和 `exclude` 同时作用于 Vue 与 VueUse 内置目标；`cleanup` 和 `scheduler` 仍需显式启用。`vueImportSources` 仅配置 Vue 导入，不替换 VueUse 的模块列表。其他模块重新导出的 VueUse API 请用 `customCallbacks` 配置。回调位置依据 [VueUse API 源码](https://github.com/vueuse/vueuse/tree/main/packages/shared)。已弃用别名和未列出的 API 不在内置列表中。`useEventListener` 等回调位置可变的 API，需根据项目使用的签名自行配置。

未绑定的 VueUse 名称还需要 `autoImport: true`，或在显式 `vueGlobals` 列表中包含相应名称。显式列表（包括 `[]`）覆盖两类内置 API 的共享自动导入识别，但不能单独启用 VueUse 集成。不计侦听源 getter 和源数组；导入身份及展开边界与 Vue API 一致。行数计算选项保持原有语义，不提供修复或建议。

使用上述配置时：

::: incorrect vueuse-callback-length

```ts
watchDebounced(
  () => query.value,
  () => {
    updateCache()
    refreshView()
  },
)
```

:::

::: correct vueuse-callback-length

```ts
watchDebounced(
  () => query.value,
  () => {
    refresh()
  },
)
```

:::

为本规则设置 `vueuse: false` 仅关闭其内置 VueUse 回调支持。显式 `customCallbacks` 始终生效，包括其中配置的 VueUse API。

### 自定义回调 {#custom-callbacks}

```json
{
  "customCallbacks": [
    {
      "source": "@vueuse/core",
      "name": "watchDebounced",
      "callbackIndices": [1],
      "autoImport": true
    },
    {
      "source": "vue-router",
      "name": "onBeforeRouteLeave",
      "callbackIndices": [0]
    },
    {
      "source": "@/composables/events",
      "name": "subscribe",
      "callbackIndices": [1, 2]
    }
  ]
}
```

`source` 和 `name` 必须为精确的非空字符串。`name` 为原始导出名称；`'default'` 匹配任意本地名称的显式默认导入。支持别名及命名空间调用。`callbackIndices` 至少包含一个非负整数，不得重复。

自定义条目独立于 `vueuse`、`groups`、`exclude` 和 `vueGlobals` 生效。内置与自定义目标匹配的索引会合并，每个参数最多报告一次。

条目的 `autoImport: false` 不会关闭与其重叠的内置目标。若希望完全由自定义条目控制该 API 的未绑定名称匹配，请用 `exclude` 或 `groups` 关闭对应内置目标。

各条目的可选 `autoImport` 继承共享设置（默认 `false`）；可显式设为 `true` 或 `false` 覆盖。显式导入始终匹配。自动导入仅匹配没有局部绑定的配置名称。不读取自动导入清单，不推断别名或命名空间对象，也不自动导入 `name: 'default'`。

## 适用范围 {#scope}

检查 JS/TS 文件及 Vue SFC 的普通和 setup 脚本，包括组合式函数及其他函数内部的调用。不检查模板表达式。

检查前移除 TypeScript 的 `as`、`satisfies`、类型断言、非空断言及实例化包装。跳过引用、工厂、条件表达式等非函数参数，不追踪其实现。也跳过缺失参数、可选调用、可选成员访问及计算成员访问。

展开参数及其后的参数因无法确定位置而跳过；展开之前的已知参数仍检查。不验证回调类型或 API 签名。

`exceededMaxLines` 包含 API 原始导出名、计入行数及最大值。高亮内联函数，并要求提取逻辑后从内联回调调用。不提供自动修复或建议，因为提取时需要手动检查闭包、参数、`this` 和返回行为。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/max-lines-per-callback.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/max-lines-per-callback.test.ts)
