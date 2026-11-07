---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-function-result-pattern
description: 强制函数返回值绑定使用指定的命名模式。
---

# vue-perfectionist/prefer-function-result-pattern

> 强制函数返回值绑定使用指定的命名模式。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 适用范围 | Vue 脚本及独立 JS/TS 文件                                              |
| 默认行为 | 布尔 Vue ref/computed 使用 is/has/should/can 前缀；VueUse 需显式启用。 |
| 必需选项 | 无；启用后即使用默认选项。                                             |
| 自动修复 | —                                                                      |
| 类型信息 | 不需要 TypeScript 类型服务。                                           |

:::

<!-- summary:end -->

## 用法 {#usage}

在扁平化配置中添加规则。TypeScript 和 Vue SFC 需单独配置常规解析器，JavaScript 使用 ESLint 默认解析器。

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  {
    files: ['**/*.{vue,js,jsx,ts,tsx}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-function-result-pattern': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

每个目标通过导入来源及原始导出名识别函数，选择返回值绑定，并用正则检查名称。同一目标的方法共享选项；需要不同模式或返回位置时应拆分目标。

默认布尔状态名必须匹配 `^(is|has|should|can)[A-Z]`。`isOpen`、`hasPermission` 通过；`is`、`island`、`is_open`、`IsOpen` 不通过。默认模式不限制标识符剩余部分。

| 来源  | 导出                | 检查的绑定                                           |
| ----- | ------------------- | ---------------------------------------------------- |
| `vue` | `ref`, `shallowRef` | 布尔字面量或显式布尔类型参数对应的直接变量。         |
| `vue` | `computed`          | 显式布尔类型参数或支持的布尔 getter 对应的直接变量。 |

::: correct

```ts
import { ref, shallowRef } from 'vue'

const isLoading = ref(false)
const hasPermission = shallowRef<boolean>()
const count = ref(0)
```

:::

::: incorrect

```ts
import { ref, shallowRef } from 'vue'

const loading = ref(false)
const permission = shallowRef<boolean>()
```

:::

支持具名导入别名、命名空间导入及命名空间接收者的 TypeScript 包装，例如 `(Vue as typeof Vue).ref(false)`。以下声明会报告，但不自动重命名：

::: incorrect

```ts
import { ref as makeRef } from 'vue'
import * as Vue from 'vue'

const ready = makeRef(false)
const open = Vue.shallowRef(false)
```

:::

## :wrench: 选项 {#options}

省略 `targets` 时使用以下 Vue 目标。启用 `vueuse` 后，还会加入下文的 `useToggle` 目标：

```json
{
  "targets": [
    {
      "source": "vue",
      "names": ["ref", "shallowRef", "computed"],
      "pattern": "^(is|has|should|can)[A-Z]",
      "booleanOnly": true
    }
  ]
}
```

### VueUse {#vueuse}

- 选项：`vueuse`
- 类型：`boolean`
- 默认值：`settings['vue-perfectionist'].vueuse`，否则为 `false`

规则级 `vueuse` 选项优先于共享设置：`options.vueuse ?? settings['vue-perfectionist'].vueuse ?? false`。它仅控制内置 `useToggle` 目标。Vue 内置目标和显式 `targets` 均不受此开关影响。

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    settings: {
      'vue-perfectionist': { vueuse: true, autoImport: true },
    },
    rules: {
      'vue-perfectionist/prefer-function-result-pattern': 'error',
    },
  },
])
```

这会启用以下来自 `@vueuse/core` 的内置目标：

```json
{
  "source": "@vueuse/core",
  "names": ["useToggle"],
  "pattern": "^(is|has|should|can)[A-Z]",
  "returnIndex": 0,
  "booleanOnly": true
}
```

仅在无参数或只有一个布尔字面量参数时检查数组元素零。显式导入仅需 `vueuse: true`；未绑定的 `useToggle` 调用还需要 `autoImport: true`。别名、命名空间调用、TypeScript 包装和局部遮蔽均遵循与 Vue API 相同的身份检查。

使用上述配置时：

::: correct vueuse-function-results

```ts
import { useToggle } from '@vueuse/core'

const [isOpen, toggle] = useToggle(false)
const [hasPermission] = useToggle()
const flip = useToggle(isOpen)
```

:::

::: incorrect vueuse-function-results

```ts
import { useToggle as createToggle } from '@vueuse/core'
import * as VueUse from '@vueuse/core'

const [open] = createToggle()
const [ready] = VueUse.useToggle(false)
```

:::

为本规则设置 `vueuse: false` 可覆盖共享启用值。关闭 VueUse 集成时，以下声明不会报告：

::: correct

```ts
import { useToggle } from '@vueuse/core'

const [open] = useToggle()
```

:::

显式 `targets` 数组替换全部内置目标，即使设置了 `vueuse: true`。反过来，显式配置的 `useToggle` 或其他 VueUse API 目标在 `vueuse: false` 时仍然生效，继续使用各自的命名模式、返回位置、布尔过滤及自动导入策略。

### `targets`

- 类型：`PreferFunctionResultPatternTarget[]`
- 默认值：上述 Vue 目标；启用 `vueuse` 时还包含内置 `useToggle` 目标

显式数组**替换**全部默认值，`targets: []` 禁用检查。若希望保留默认行为并增加自定义方法，需在数组中包含默认目标。

| 属性          | 类型       | 含义                                                                                                     |
| ------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `source`      | `string`   | 必填，非空且精确匹配的导入模块标识符。                                                                   |
| `names`       | `string[]` | 必填，非空、不重复的原始导出名数组；默认导入使用 `default`。                                             |
| `pattern`     | `string`   | 必填，不带分隔符或标志的 JavaScript 正则源码。不隐式添加锚点；空模式接受所有名称，无效表达式为配置错误。 |
| `returnIndex` | `number`   | 可选非负整数，选择数组解构元素；省略时检查直接变量。                                                     |
| `booleanOnly` | `boolean`  | 默认为 `false`，启用下述基于语法的布尔过滤。                                                             |
| `autoImport`  | `boolean`  | 默认继承共享 `settings['vue-perfectionist'].autoImport`，该共享设置默认为 `false`。                      |

模式通过 `new RegExp(pattern)` 编译，需要时显式添加 `^` 和 `$`。例如，`Ready` 也匹配 `wasReadyBefore`。

### 方法分组与目标覆盖 {#grouping-methods-and-overriding-targets}

此配置为 Vue 方法使用共享模式，仅对 `ref` 覆盖：

```json
{
  "targets": [
    {
      "source": "vue",
      "names": ["ref", "shallowRef"],
      "pattern": "^is[A-Z]"
    },
    {
      "source": "vue",
      "names": ["ref"],
      "pattern": "^has[A-Z]"
    }
  ]
}
```

使用上述配置时：

::: correct overridden-targets

```ts
import { ref, shallowRef } from 'vue'

const hasAccess = ref(false)
const isOpen = shallowRef(false)
```

:::

::: incorrect overridden-targets

```ts
import { ref, shallowRef } from 'vue'

const isReady = ref(false)
const hasAccess = shallowRef(false)
```

:::

同一方法及绑定位置，**最后匹配目标优先**。整个目标被替换，包括 `booleanOnly` 和 `autoImport`，字段不合并。先选择目标，再进行布尔过滤和自动导入检查。如果最终目标跳过调用，不回退到更早目标。不同 `returnIndex` 互相独立；直接绑定与数组首元素是不同位置。

### 自定义函数与元组返回值 {#custom-functions-and-tuple-results}

自定义函数使用相同格式，不受 `vueuse` 开关影响。除非设置 `booleanOnly: true`，否则无需布尔证据：

```json
{
  "targets": [
    {
      "source": "@vueuse/core",
      "names": ["useDark", "useOnline"],
      "pattern": "^is[A-Z]"
    },
    {
      "source": "./state",
      "names": ["useFlag"],
      "pattern": "^(is|has|should|can)[A-Z]",
      "returnIndex": 1
    },
    {
      "source": "./default",
      "names": ["default"],
      "pattern": "^(is|has|should|can)[A-Z]"
    }
  ]
}
```

使用上述配置时：

::: correct custom-functions

```ts
import { useDark, useOnline } from '@vueuse/core'
import makeFlag from './default'
import { useFlag } from './state'

const isDark = useDark()
const isOnline = useOnline()
const [toggle, hasAccess = false] = useFlag()
const isReady = makeFlag()
```

:::

::: incorrect custom-functions

```ts
import { useDark, useOnline } from '@vueuse/core'
import makeFlag from './default'
import { useFlag } from './state'

const dark = useDark()
const online = useOnline()
const [toggle, access = false] = useFlag()
const ready = makeFlag()
```

:::

仅检查选定元组位置。跳过空位、剩余元素、对象模式及嵌套模式。`[toggle, access = false]` 等默认值仍检查标识符 `access`。

### 布尔值过滤 {#boolean-filtering}

`booleanOnly: true` 使用语法，不使用 TypeScript 类型服务或通用类型推断。对 Vue `ref` / `shallowRef` 和自定义方法：

- 显式首个类型参数优先，必须是 `boolean`、布尔字面量类型或仅含布尔类型的联合。
- 否则首个参数必须是 `true` 或 `false`，包括括号及 TypeScript 包装。
- 跳过未知初始值、比较、取反、别名及 `boolean | string` 等混合类型。后续参数和类型参数不作为证据。

对 `@vueuse/core` 的 `useToggle`，布尔过滤要求无参数或仅一个布尔字面量参数，且无类型参数。带选项、自定义真/假值或未知初始值时跳过。内置目标启用时仅检查数组首元素，因此 `const toggle = useToggle(isOpen)` 等直接函数绑定不在范围内。`booleanOnly: false` 移除此过滤，也适用于 `useToggle`。其他来源的同名导出使用通用过滤。

#### 布尔计算属性 {#boolean-computed-values}

默认目标包括 Vue `computed`。设置 `booleanOnly: true` 时，首个类型参数优先，必须是上述布尔类型。否则检查内联 getter：

- getter 显式返回类型必须为 `boolean`、布尔字面量或仅布尔联合，优先于函数体。
- 无返回注解时，表达式体或仅含一个 `return` 的块必须返回语法上为布尔值的表达式：`true` / `false`、取反 `!`、相等或关系比较、`in`、`instanceof`，或两个结果操作数均识别为布尔的条件/逻辑表达式。
- 可写计算属性支持 `get: () => ...` 和 `get() { ... }`。跳过带展开、动态键或重复 `get` 的对象。
- 跳过 async 和生成器 getter，除非显式提供布尔类型参数。

::: correct

```ts
import { computed } from 'vue'

const isReady = computed(() => count.value > 0)
const hasPermission = computed<boolean>(() => flag.value)
const canEdit = computed((): boolean => checkPermission())
const shouldRender = computed({
  get: () => !hidden.value,
  set(value) {
    hidden.value = !value
  },
})
```

:::

::: incorrect

```ts
import { computed } from 'vue'

const ready = computed(() => count.value > 0)
const permission = computed<boolean>(() => flag.value)
const editable = computed((): boolean => checkPermission())
const visible = computed({
  get: () => !hidden.value,
  set(value) {
    hidden.value = !value
  },
})
```

:::

未注解 getter 若返回标识符、`flag.value` 等成员或函数调用，即使 TypeScript 能推断为布尔也跳过。无返回注解时，也跳过多语句或控制流块。可用 `computed<boolean>(...)` 或 `(): boolean` 明确意图。跳过 `boolean | undefined` 等混合类型。其他来源名为 `computed` 的自定义导出使用通用过滤，不检查 getter。

### 自动导入 {#auto-imports}

对于 `unplugin-auto-import`，启用共享设置：

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
      'vue-perfectionist/prefer-function-result-pattern': 'error',
    },
  },
])
```

这会启用**所有已配置目标**中的未绑定名称，包括自定义方法及 ESLint `languageOptions.globals` 声明的名称。每个目标可独立覆盖：

```json
{
  "targets": [
    {
      "source": "vue",
      "names": ["ref", "shallowRef"],
      "pattern": "^is[A-Z]",
      "autoImport": false
    },
    {
      "source": "@vueuse/core",
      "names": ["useDark", "useOnline"],
      "pattern": "^is[A-Z]",
      "autoImport": true
    }
  ]
}
```

内置 `useToggle` 目标还需要 `vueuse: true`。显式配置的 VueUse API 目标不需要此开关。

`autoImport: false` 仅影响未绑定调用，显式导入仍匹配。局部声明、参数、其他来源导入及仅类型导入始终不视为自动导入。不推断自定义自动导入别名，也不读取 Vite 配置、生成声明或自动导入清单。

未绑定名称没有来源信息，由目标声明身份；多个来源配置同名和同一返回位置时，最后目标优先。可用显式导入消除歧义。仅声明 ESLint 全局变量不会启用匹配或配置 `no-undef`；使用该规则时请单独加载生成的全局变量。

## 适用范围 {#scope}

检查普通及 setup Vue 脚本和独立 JS/TS 中的变量声明，包括嵌套函数和导出绑定。初始化器必须是直接调用，可带括号或 TypeScript 包装。诊断指向选定绑定标识符。

精确匹配模块标识符和原始导出名，支持具名别名、命名空间及显式配置的 `default` 导出。默认目标不包含默认导出。

跳过声明后赋值、await 或间接结果、间接函数别名、可选调用、计算成员调用、`require()` 导入及 Vue 模板表达式。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

仅报告，不提供自动修复或建议。有意义的名称需要上下文，重命名可能影响脚本引用、模板用法和公共导出。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-function-result-pattern.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-function-result-pattern.test.ts)
