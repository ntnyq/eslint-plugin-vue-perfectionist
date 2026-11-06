---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/sort-script-setup
description: 强制 Vue 3 `<script setup>` 顶层语句遵循可配置的分组和排序规范。
---

# vue-perfectionist/sort-script-setup

> 强制 Vue 3 `<script setup>` 顶层语句遵循可配置的分组和排序规范。

- :wrench: ESLint 的 `--fix` 选项可修复部分问题。可能改变执行行为的移动仅报告，不修复。

## 为什么使用此规则？ {#why-this-rule}

Vue setup 混合了编译器宏、状态、计算属性、函数和副作用。统一分组顺序可提升可读性。本规则结合 Vue 语义分类、可配置排序偏好及保守自动修复。

默认强制分组顺序，保留各组内部现有顺序。初始化依赖优先于两者。

## 交互演示 {#interactive-demo}

选择排序方式，查看安全修复的动画。比较分组、排序与运行时安全性，再用**重置**恢复原始代码。

<script setup>
import SortScriptSetupDemo from '../../.vitepress/components/demos/sort-script-setup/index.vue'
</script>

<SortScriptSetupDemo />

## :book: 规则详情 {#rule-details}

通过 `vue-eslint-parser` 支持 JS/TS。保留普通 `<script>`、导入、函数体及嵌套表达式不变。TypeScript 需要配置相应解析器。

以下示例使用默认选项，类型在常量之前，常量在函数之前：

::: correct

```vue
<script setup lang="ts">
interface Props {
  title: string
}
const z = 2
const a = 1
function run() {}
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
function run() {}
const z = 2
const a = 1
interface Props {
  title: string
}
</script>
```

:::

错误示例可安全修复为正确示例。默认 `type` 为 `unsorted`，因此常量保留相对顺序。使用 `type: 'natural'` 时，`a` 将在 `z` 之前。

识别出的 Vue API 也可能产生不带移动修复的诊断：

::: incorrect

```vue
<script setup>
import { computed, ref } from 'vue'

const doubled = computed(() => 2)
const count = ref(0)
</script>
```

:::

默认分组要求 `ref` 在 `computed` 之前，但不自动移动这些运行时调用，见[分区与自动修复](#partitions-and-automatic-fixes)。

## 用法 {#usage}

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/sort-script-setup': [
        'error',
        {
          type: 'unsorted',
          newlinesBetween: 1,
          newlinesInside: 'ignore',
        },
      ],
    },
  },
])
```

仅 JavaScript 的 SFC 可省略 `parserOptions.parser`。现有 Vue 配置已提供解析器时，保留该配置并添加插件和规则。

本插件不提供内置配置，请自行注册并显式启用规则。

## :wrench: 选项 {#options}

| 选项                 | 默认值                 | 行为                                                             |
| -------------------- | ---------------------- | ---------------------------------------------------------------- |
| `type`               | `'unsorted'`           | `alphabetical`、`natural`、`line-length`、`custom` 或 `unsorted` |
| `order`              | `'asc'`                | 组内升序或降序                                                   |
| `fallbackSort`       | `{ type: 'unsorted' }` | 次级比较方式，也接受 `type: 'subgroup-order'`                    |
| `alphabet`           | `''`                   | 自定义排序的字符顺序                                             |
| `ignoreCase`         | `true`                 | 比较名称前规范化大小写                                           |
| `specialCharacters`  | `'keep'`               | `keep` 保留、`trim` 去除开头特殊字符、`remove` 去除全部特殊字符  |
| `locales`            | `'en-US'`              | 语言区域字符串或非空字符串数组                                   |
| `groups`             | 见下文                 | 完整分组顺序，替换默认值                                         |
| `customGroups`       | `[]`                   | 有序的自定义匹配条件列表                                         |
| `partitionByComment` | `false`                | 按注释或正则模式分区                                             |
| `partitionByNewLine` | `false`                | 将现有空行作为排序边界                                           |
| `newlinesBetween`    | `'ignore'`             | 组间精确非负空行数，或 `ignore`                                  |
| `newlinesInside`     | `'ignore'`             | 组内精确非负空行数，或 `ignore`                                  |
| `vueImportSources`   | `['vue']`              | 提供 Vue 运行时 API 的精确模块名                                 |
| `vueGlobals`         | `[]`                   | 显式识别未绑定、自动导入的 Vue 运行时 API 名称                   |
| `fix`                | `'safe'`               | `safe` 启用保守修复；`none` 禁用包括空白在内的全部修复           |

`unsorted` 保留组内顺序，但仍强制分组顺序和配置空白，同时禁用后备比较器。`order` 从不反转分组或初始化依赖。

名称来自局部绑定，解构使用首个绑定。无绑定调用语句使用被调用者名。`line-length` 测量整条语句源码长度，不含尾部分号及附加外部注释，不是最长物理行长度。

自然排序按偏好顺序协商语言区域数组。`ignoreCase: false` 时，仅大小写不同的名称在自然排序相等后、`fallbackSort` 前按区域规则决胜，数值排序不变。自定义字符表按 Unicode 码点比较，包含基本多文种平面以外字符。未列出字符优先级相同，名称长度按码点计。

兼容接受 `newlinesInside: 'newlinesBetween'`：全局 `newlinesBetween` 为 `ignore` 时解析为 `ignore`，否则为 `0`。新配置建议用显式值。数值空白选项不能与 `partitionByNewLine: true` 组合，包括分组数值覆盖。

不支持上游专属的 `usage`、`tsconfig`、`commentAbove`、`useConfigurationIf` 等选项。这是兼容 Perfectionist 排序词汇的子集，不是其规则包装。

## 分组 {#groups}

默认分组如下：

```json
[
  ["interface", "type"],
  "define-options",
  "define-props",
  "define-emits",
  "define-slots",
  "define-model",
  "constant",
  "inject",
  "composable",
  "template-ref",
  ["ref", "reactive"],
  "computed",
  "variable",
  ["enum", "class"],
  "function",
  "watch",
  "lifecycle-hook",
  "provide",
  "define-expose"
]
```

嵌套数组构成一组：`['ref', 'reactive']` 不要求 ref 在 reactive 之前。若需该顺序，请分开配置。空 `groups` 禁用排序及空白诊断。

`withDefaults(defineProps(...))` 归入 `define-props`。`ref` 包含 `shallowRef`、`customRef`、`toRef`、`toRefs`；`reactive` 包含浅层和只读变体；`watch` 包含 watch-effect 变体，即使停止句柄赋值给变量。`template-ref` 识别 `useTemplateRef`，不通过 `ref(null)` 或绑定名猜测。

`constant` 指单个 `const` 绑定，由原始值或无插值模板字面量初始化；对象、数组、属性读取和调用不符合。`function` 包括普通声明及函数值变量，但仅普通声明可移动修复。

专用 Vue API 分类后，`composable` 识别静态导入且导出名匹配 `^use[A-Z0-9]` 的调用。`lifecycle-hook` 使用显式 Vue 生命周期注册函数列表，不匹配任意 `onXxx`。

适用修饰符包括 `declare`、`async`、`destructured`、`const`、`let`、`var`，后接选择器，如 `async-function`、`const-ref`、`destructured-define-props`。更具体的已配置组优先于普通选择器。ambient 和合并声明无论分类如何始终固定。

不匹配任何已配置组的候选固定，分隔周围语句。可添加 `unknown` 显式安排这些候选；其组内保序，除非分组对象显式覆盖 `type`。赋值、控制流、多声明等不支持语句即使配置 `unknown` 也固定。

分组对象可覆盖排序与间距：

```json
{
  "groups": [
    "constant",
    {
      "newlinesBetween": 1
    },
    {
      "group": "function",
      "type": "natural",
      "newlinesInside": 1
    }
  ]
}
```

## 自定义分组 {#custom-groups}

```json
{
  "groups": ["router", "stores", ["ref", "reactive"], "computed", "function"],
  "customGroups": [
    {
      "groupName": "router",
      "callNamePattern": "^use(Route|Router)$",
      "importSourcePattern": "^vue-router$"
    },
    {
      "groupName": "stores",
      "callNamePattern": "^use[A-Z].*Store$",
      "importSourcePattern": "^(@/stores/|~/stores/)"
    }
  ]
}
```

每个自定义组必须被 `groups` 引用。此示例替换默认分组，省略类别将成为固定边界，除非包含 `unknown`。

过滤器包括 `selector`、`modifiers`、`elementNamePattern`、`callNamePattern`、`importSourcePattern`。同条件内以 AND 组合，列出修饰符须全部存在。`anyOf` 数组以 OR 组合多个条件对象，不能与顶层过滤器并存。自定义组优先于内置组，首个匹配自定义定义优先。

模式接受字符串、`{ pattern, flags }` 或两者组成的数组。数组表示 OR。无隐式锚点，不继承 `ignoreCase`。无效表达式为配置错误。解构任一局部绑定匹配即满足 `elementNamePattern`。

空模式匹配任意可用值，不会禁用过滤器。例如 `callNamePattern: ''` 匹配调用，`importSourcePattern: ''` 匹配有已解析导入来源的调用，均不匹配字面量常量。

`callNamePattern` 指直接初始化器或调用语句，不指函数体内部调用。具名别名规范化为导出名，默认导入使用本地绑定名。`importSourcePattern` 指直接调用的静态来源，不是语句中其他导入。未解析自动导入和仅类型导入不推断运行时来源。

独立自定义组的排序覆盖优先于其 `groups` 对象覆盖。嵌套组数组中，单个自定义组覆盖不生效，整组共享一个比较器，避免组内比较矛盾。

## 配置 {#configuration}

命名空间调用在 `(Vue as typeof Vue).watch(...)` 等 TypeScript 包装下保留导入身份。分组及同步回调依赖遵循与普通调用相同的修复安全规则。

排序偏好直接配置在规则选项中，显式选项覆盖默认值；共享设置中的排序偏好忽略。

自动导入 Vue API 可启用共享 `autoImport: true`，见[共享配置](../guide/configuration.md#auto-imported-vue-apis)。识别本规则内置 Vue API 表中的未绑定名称（含 ESLint 全局变量），不覆盖局部绑定或改变修复安全性。显式 `vueGlobals` 替换选择；`vueGlobals: []` 对本规则禁用。

数组及 `fallbackSort` 替换默认值。分组覆盖会合并后备字段；未指定后备顺序时继承该组顺序。

## 分区与自动修复 {#partitions-and-automatic-fixes}

导入、赋值、控制流、多声明语句、顶层 await、ambient 和合并声明构成边界，语句不能跨越。函数内部 await 本身不分隔周围声明。

注释分区接受布尔值、正则模式或分别配置行/块注释的 `{ line, block }`。仅顶层语句之间的注释构成分区，标记保留原位。明确附属的文档和尾注释随声明移动；歧义注释及 ESLint/TypeScript 控制指令阻止移动。

初始化依赖优先于风格。例如，即使分组更靠前，也不要求 `const snapshot = count.value` 位于 `count` 声明之前。区分延迟函数捕获与即时读取，包括直接调用的本地函数和 IIFE。不进行全程序副作用分析，也不修复既有初始化错误。

对识别的 Vue 调用，依赖分析追踪注册时执行的内联和本地回调：`watch` 源 getter（含内联源数组）、immediate `watch` 回调、`watchEffect`、`watchSyncEffect` 和 `customRef` 工厂。普通 `watch` 回调、`watchPostEffect` 及带 `flush: 'post'` 的 `watchEffect` 仍延迟。选项无法静态解析时，可能立即运行的回调保守保留依赖。立即调用本地函数中的调用使用自身 Vue 导入身份，不将同名无关函数当作 Vue API。

移动修复仅限已证明安全的连续片段：独立类型/接口声明、原始值常量声明及普通函数声明。运行时调用、编译器宏、解构、属性读取、类/枚举初始化及其他不确定移动报告 `unsafeReorder`，不提供修复或建议。识别 `ref`、`watchEffect`、生命周期钩子或组合式函数并不代表可自动移动。

安全修复保留原语句文本、附属注释和换行。潜在自动分号插入风险会阻止移动修复。空白修复不改写语句内部或脚本标签内边距。

每个空白替换最多 65,536 个字符，包括换行及保留缩进。更大的空行配置仍报告，但不生成自动修复。

## 相关规则 {#other-rules}

导入使用 `perfectionist/sort-imports`。本规则控制顶层声明和宏时，对相同 `.vue` 文件禁用 `perfectionist/sort-modules` 和 `vue/define-macros-order`。保留生命周期注册、侦听器及 await 后 expose 等 Vue 正确性规则。

空白选择应与格式化和空行规则协调，避免修复冲突。默认空白选项为 `ignore`。

完整分类表及验证约定见[设计规范](../design/sort-script-setup.md)。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-script-setup.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/tree/main/tests/rules/sort-script-setup)
