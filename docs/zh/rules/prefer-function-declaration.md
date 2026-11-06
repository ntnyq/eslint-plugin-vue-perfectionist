---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-function-declaration
description: 要求在单文件组件和组合式函数中使用函数声明。
---

# vue-perfectionist/prefer-function-declaration

> 要求在单文件组件和组合式函数中使用函数声明。

在 Vue 脚本顶层、组件 setup 函数体及匹配的组合式函数内，对直接定义的函数绑定使用函数声明。这是需显式启用的项目规范。本规则仅报告，不提供修复或建议。

## 用法 {#usage}

注册插件，为需要检查的文件配置解析器：

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/prefer-function-declaration': 'error' },
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

无需 TypeScript 类型信息或项目配置。

## :book: 规则详情 {#rule-details}

在受检查容器中，直接以箭头函数或函数表达式初始化的标识符必须改用函数声明。`const`、`let`、`var`、多声明及导出同等检查，包括 async 和生成器函数。

::: correct

```vue
<script setup>
function save() {}
async function load() {}
function* iterate() {}
</script>
```

:::

::: incorrect

```vue
<script setup>
const save = () => {}
const load = async () => {}
const iterate = function* () {}
</script>
```

:::

仅检查直接函数定义，不推断变量类型或追踪函数值。始终跳过解构，包括别名、数组模式及默认函数表达式。已有函数引用、调用、宏、绑定函数及条件表达式也允许。

::: correct

```vue
<script setup lang="ts">
const emit = defineEmits<{ save: [] }>()

const { save: submit, reset = () => {} } = actions
const [value, toggle] = useToggle()
const save = actions.save
const load = importedLoad
const search = debounce(handler, 300)
const bound = handler.bind(context)
const selected = enabled ? primarySave : fallbackSave
const doubled = computed(() => count.value * 2)
watch(source, () => {})
emit('save')
</script>
```

:::

### 直接顶层语句 {#direct-top-level}

仅检查受检查脚本或函数体中的直接语句。条件、循环、`try`、独立块、普通嵌套函数、回调、对象属性、后续赋值及返回函数均不在此范围内，即使使用 `var`。

::: correct

```ts
function useForm() {
  function save() {}
  function reset() {
    const normalize = () => {}
  }
  if (enabled) {
    var retry = () => {}
  }
  watch(source, () => {
    const update = () => {}
  })
  const actions = { save: () => {} }
  return () => renderContent()
}
```

:::

::: incorrect

```ts
function useForm() {
  const save = () => {}
}
```

:::

## :wrench: 选项 {#options}

默认值：

```json
{
  "scopes": ["sfc", "composables"],
  "functionPattern": "^use[A-Z]",
  "ignoreNames": [],
  "allowTypeAnnotation": false
}
```

| 选项                  | 类型                                     | 默认值                   | 含义                                        |
| --------------------- | ---------------------------------------- | ------------------------ | ------------------------------------------- |
| `scopes`              | 不重复的 `'sfc'` 或 `'composables'` 数组 | `['sfc', 'composables']` | 替换受检查容器；`[]` 禁用全部检查。         |
| `functionPattern`     | 正则源码字符串                           | `'^use[A-Z]'`            | 匹配组合式函数容器的绑定名。                |
| `ignoreNames`         | 非空且不重复的字符串数组                 | `[]`                     | 精确排除的组合式函数容器名称；`[]` 不排除。 |
| `allowTypeAnnotation` | 布尔值                                   | `false`                  | 允许带变量类型注解的函数绑定。              |

### scopes

`sfc` 检查普通 `<script>` 和 `<script setup>` 的直接顶层，还检查 SFC 脚本中的组件 setup 函数体：

- 内联默认导出选项对象中的 `setup()`、`setup: function` 或 `setup: () => {}`。
- 传给 Vue `defineComponent` 首个参数的内联选项对象。
- 直接传给 `defineComponent` 首个参数的 setup 函数。

根据词法绑定识别 Vue 具名导入、别名和命名空间导入。跳过仅类型导入、默认导入、其他模块、局部遮蔽、可选调用和计算命名空间调用。未绑定的 `defineComponent` 可通过共享 `autoImport: true` 识别，同名局部绑定仍优先。支持静态 `setup` 属性键及 TypeScript 包装；命名空间接收者支持 `as`、`satisfies`、尖括号断言、非空断言及嵌套组合。不追踪任意带 `setup` 属性的对象，或通过标识符引用的对象和函数。选项式 API 方法及生命周期体不属于组件 setup 函数体。

::: incorrect

```vue
<script>
import { defineComponent as component } from 'vue'

export default component({
  setup() {
    const save = () => {}
  },
})
</script>
```

:::

例如，命名空间接收者上的类型断言不影响识别：

::: incorrect

```vue
<script lang="ts">
import * as Vue from 'vue'

export default (Vue as typeof Vue).defineComponent({
  setup() {
    const save = () => {}
  },
})
</script>
```

:::

`composables` 检查独立 JS/TS 及两个 SFC 脚本块中匹配的函数体，不要求组合式函数自身使用函数声明：

::: correct

```ts
export const useForm = () => {
  function save() {}
  return { save }
}
```

:::

同一 `useForm` 若位于 SFC 脚本顶层，会由 `sfc` 范围报告。`sfc` 不检查独立模块顶层或非 SFC 中的组件 setup。SFC 检查需要 Vue 解析器服务。双脚本均检查，每个绑定最多报告一次。不检查模板。

### functionPattern 与 ignoreNames {#functionpattern-and-ignorenames}

模式为区分大小写、不带分隔符和标志的 JavaScript 正则源码。不添加锚点；无效模式为配置错误。`ignoreNames` 优先于模式匹配。

具名函数声明使用声明名。直接初始化标识符变量的箭头或函数表达式使用变量名，包括 TypeScript 包装；内部函数名不覆盖它。支持导出、async、泛型及独立匹配的嵌套函数。匿名默认导出、对象/类方法、后续赋值及工厂包装不构成组合式函数容器。不要求导入、路径或目录规范。

自定义规范示例：

```json
{
  "functionPattern": "^create[A-Z]",
  "ignoreNames": ["createLegacyForm"]
}
```

忽略组合式函数会跳过其作为容器的函数体，但自身绑定仍可能在 SFC 顶层或其他受检查容器中报告。独立匹配的嵌套组合式函数仍检查。按目录配置请使用 ESLint 的 `files` 和 `ignores`。

### allowTypeAnnotation

设置 `allowTypeAnnotation: true` 后，变量绑定可带显式类型以保留上下文类型推断。此例外不影响该函数被识别为组合式函数容器。

::: correct

```ts
/* eslint vue-perfectionist/prefer-function-declaration: [error, { allowTypeAnnotation: true }] */
function useForm() {
  const save: Handler = value => {}
}
```

:::

参数类型、返回类型、`as` 和 `satisfies` 不属于变量类型注解，不符合此例外。括号及 TypeScript 包装始终不能隐藏直接初始化的函数。

::: incorrect

```ts
/* eslint vue-perfectionist/prefer-function-declaration: [error, { allowTypeAnnotation: true }] */
function useForm() {
  const save = (value: string): void => {}
  const reset = (() => {}) satisfies Handler
}
```

:::

## 适用范围 {#scope}

检查基于语法，限于选定容器内直接标识符变量的初始化器，不对所有代码强制通用函数风格。内联回调由 `callback-style` 负责；解构函数和工厂返回值始终不在范围内。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

诊断指向变量绑定名。不提供自动修复或建议，因为转换可能影响提升、绑定可变性、词法 `this` 或 `arguments`、内部函数名及 TypeScript 上下文类型。即使简单空函数也仅报告。格式不影响检查范围。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-function-declaration.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-function-declaration.test.ts)
