---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/sort-composable-body
description: 对具名组合式函数体的直接语句进行可配置的分组和排序。
---

# vue-perfectionist/sort-composable-body

> 对具名组合式函数体的直接语句进行可配置的分组和排序。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                                                        |
| -------- | ----------------------------------------------------------- |
| 适用范围 | Vue 脚本及独立 JS/TS 文件                                   |
| 默认行为 | 匹配 ^use[A-Z] 绑定；保留组内顺序；仅应用已证明安全的修复。 |
| 必需选项 | 无；启用后即使用默认选项。                                  |
| 自动修复 | 支持部分情况                                                |
| 类型信息 | 不需要 TypeScript 类型服务。                                |

:::

<!-- summary:end -->

- :wrench: ESLint 的 `--fix` 可应用已证明安全的语句移动与配置的空白调整。可能改变运行行为的移动只报告，不提供修复或建议。

## Usage

支持 JavaScript、TypeScript 和 Vue 脚本。TypeScript 使用
`@typescript-eslint/parser`，SFC 使用 `vue-eslint-parser`：

```js
import tsParser from '@typescript-eslint/parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: { parser: tsParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/sort-composable-body': 'error' },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/sort-composable-body': 'error' },
  },
]
```

纯 JavaScript 模块使用 ESLint 默认解析器即可，无需 TypeScript 类型服务。
使用 ESLint `files` 覆盖实现不同文件的配置。

## :book: Rule Details

规则检查绑定名匹配 `^use[A-Z]` 的函数内的完整直接语句。默认要求分组顺序，
保留每组内部的源码顺序。初始化依赖优先于风格顺序。

::: correct

```ts
function useCounter() {
  const step = 1
  function reset() {}
  return { reset, step }
}
```

:::

::: incorrect

```ts
function useCounter() {
  function reset() {}
  const step = 1
  return { reset, step }
}
```

:::

上例中独立的原始值常量与普通函数声明可安全重排。运行时调用的修复权限更严格。
以下错误示例报告 `unsafeReorder`，不提供自动移动：

::: correct

```ts
import { onMounted, ref } from 'vue'

function useCounter() {
  const count = ref(0)
  onMounted(() => {})
  return { count }
}
```

:::

::: incorrect

```ts
import { onMounted, ref } from 'vue'

function useCounter() {
  onMounted(() => {})
  const count = ref(0)
  return { count }
}
```

:::

## :wrench: Options

接受一个选项对象，默认值如下：

```json
{
  "functionPattern": "^use[A-Z]",
  "ignoreNames": [],
  "groups": [
    ["interface", "type"],
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
    "provide"
  ],
  "customGroups": [],
  "type": "unsorted",
  "order": "asc",
  "fallbackSort": { "type": "unsorted" },
  "alphabet": "",
  "ignoreCase": true,
  "specialCharacters": "keep",
  "locales": "en-US",
  "partitionByComment": false,
  "partitionByNewLine": false,
  "newlinesBetween": "ignore",
  "newlinesInside": "ignore",
  "vueImportSources": ["vue"],
  "fix": "safe"
}
```

| 选项                 | 类型和行为                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `functionPattern`    | 区分大小写的正则表达式源码字符串，只编译一次；非法表达式会产生配置错误。匹配函数的绑定名。                                                  |
| `ignoreNames`        | 精确排除的绑定名，替换默认空列表。                                                                                                          |
| `groups`             | 替换默认分组。数组合并同优先级的选择器；对象可覆盖比较与组内间距。`[]` 禁用所有报告。                                                       |
| `customGroups`       | 替换默认空列表的具名自定义分组，首个匹配定义优先，每个名称必须在 `groups` 中引用。                                                          |
| `type`               | `alphabetical`、`natural`、`line-length`、`custom` 或 `unsorted`，仅影响组内顺序。                                                          |
| `order`              | `asc` 或 `desc`，不会反转分组优先级。                                                                                                       |
| `fallbackSort`       | `{ type, order? }`，支持上述比较类型及 `subgroup-order`。主比较类型为 `unsorted` 时忽略。                                                   |
| `alphabet`           | 自定义排序的字符顺序；启用自定义比较时必须非空，不允许重复字符。                                                                            |
| `ignoreCase`         | 名称比较是否忽略大小写，不影响正则表达式。                                                                                                  |
| `specialCharacters`  | `keep`、`trim` 或 `remove`，在比较前规范化名称。                                                                                            |
| `locales`            | 名称比较使用的语言标识字符串或非空数组。                                                                                                    |
| `partitionByComment` | 布尔值、正则选项或 `{ line?, block? }`，匹配的前置注释开始新分区。                                                                          |
| `partitionByNewLine` | 布尔值，空行开始新分区，不能与数值间距策略同时使用。                                                                                        |
| `newlinesBetween`    | `ignore` 或非负安全整数，表示组间空行数。                                                                                                   |
| `newlinesInside`     | 同上，另支持 `newlinesBetween`：组间间距为数值时要求组内零空行。                                                                            |
| `vueImportSources`   | 精确运行时导入来源，替换 `['vue']`。                                                                                                        |
| `vueGlobals`         | 显式 Vue API 名称，覆盖共享 `settings['vue-perfectionist'].autoImport`；`[]` 禁用全局识别。未指定时使用共享设置，局部绑定始终遮蔽全局名称。 |
| `fix`                | `safe` 或 `none`。`none` 禁用移动和空白修复，但保留诊断类型选择。                                                                           |

分组覆盖、正则描述对象和数组、修饰符优先级、分区注释、空行分隔项及比较细节
沿用 [sort-script-setup](./sort-script-setup.md#options)。`line-length` 比较完整语句
的源码长度，排除末尾分号，包含语句内部文本，不比较绑定名长度。

### 选择器与自定义分组

支持 `call`、`class`、`composable`、`computed`、`constant`、`enum`、`function`、
`inject`、`interface`、`lifecycle-hook`、`provide`、`reactive`、`ref`、`template-ref`、
`type`、`variable` 和 `watch`。修饰符为 `async`、`const`、`declare`、`destructured`、
`let` 和 `var`，合法组合与 setup 排序一致。环境声明为固定边界。
拒绝编译宏选择器；函数内未绑定的 `defineProps()` 只是普通调用或变量初始化器。

自定义条件支持 `selector`、`modifiers`、`elementNamePattern`、`callNamePattern`
和 `importSourcePattern`。同一条件按 AND 组合，`anyOf` 按 OR 组合。
模式接受字符串、`{ pattern, flags? }` 或表示 OR 的数组。解构可按任意绑定名匹配，
但排序键使用第一个绑定，且始终作为一条完整语句移动。

`callNamePattern` 使用直接调用解析后的导入标识：具名导入别名使用导出名，默认导入
使用局部名。来源条件要求运行时导入，不为局部调用推断来源，也不搜索回调内的调用。
支持非计算的命名空间调用及透明 TypeScript 包装；计算属性和可选调用不会获得 Vue 标识。

例如，配置路由分组：

```js
export default {
  rules: {
    'vue-perfectionist/sort-composable-body': [
      'error',
      {
        groups: ['constant', 'router', 'composable', 'ref', 'function'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
            importSourcePattern: '^vue-router$',
          },
        ],
      },
    ],
  },
}
```

独立自定义分组的覆盖优先于分组对象覆盖；合并分组内部的自定义覆盖不会创建逐成员
比较器。省略的分类成为边界；`unknown` 纳入其他未分组的受支持语句，默认保留内部
顺序，除非其分组对象覆盖 `type`。它不会使不支持的语句变得可排序。
Vue API 识别表与 setup 排序共享；`onScopeDispose` 等不在表内的 API 需要自定义分组。
分类结果不代表纯度证明。

## Scope

检查具有块函数体的函数声明、直接绑定变量的箭头函数和函数表达式。
无需导出；支持具名默认导出声明。变量绑定名优先于函数表达式内部名称。
支持透明 TypeScript 初始化器包装。

跳过生成器、异步生成器、表达式体箭头函数、匿名默认导出、对象或类方法、回调、
赋值、返回的函数以及没有受支持直接绑定的工厂包装回调。名称匹配不要求 Vue 导入、
对象返回值或导出状态。

独立检查符合条件的嵌套 composable。普通辅助函数、回调和嵌套控制流的内部不是父级
的分区。仅排序 `fn.body.body`；参数、返回对象成员和调用方解构由各自规则负责。

直接 `return`、`throw`、控制流、显式块、赋值、自增自减、指令序言、多声明符语句、
`using`、重载、声明合并及不支持语法形成固定边界。当前执行层的 `await` 固定其所在
语句并切分两侧区域，包括初始化器和异步循环。嵌套函数的 await 不切分父级。
return 后不可达语句可形成独立分区。

依赖按词法变量身份解析。参数、自身绑定和外层变量是外部输入。直接重声明参数的
`var` 声明是固定边界，因为其初始化器会覆盖已有输入。
立即调用的局部函数、IIFE、watch 来源 getter、立即 watch 回调、同步副作用和
`customRef` 工厂保留初始化依赖。延迟捕获沿用 setup 策略，无法解析的回调选项按
保守方式处理。环中剩余语句保留源码顺序。不提供已有初始化错误的修复，也不跨分区
移动依赖。

## Automatic fixes and formatting

移动要求连续替换区间只包含独立的类型或接口声明、原始值常量及普通函数声明。
函数值变量、解构、运行时调用、属性读取、类和枚举不获得移动修复权限。
注释、指令、含糊分隔符和自动分号插入可能阻止其他本来安全的移动。
函数体开括号同行的注释保持原位；附着于声明的文档注释可随声明移动。

空白修复只影响相邻已分类语句的间隙，保留缩进、换行符、附着注释和语句内部文本；
不会调整花括号或 return 边界的留白。每次空白替换最多 65,536 个字符。
同一轮中，排序诊断覆盖的语句对不会再产生间距诊断。

Oxfmt 可能合并多个空行。与格式化一起使用时，建议配置零或一个空行，或者使用
`fix: 'none'` 只报告。嵌套修复与其他规则的修复会在后续 ESLint 轮次中收敛。

可同时启用 [sort-script-setup](./sort-script-setup.md)、
[sort-composable-return](./sort-composable-return.md) 和
[sort-composable-destructure](./sort-composable-destructure.md)，分别配置外层脚本、
函数体语句、公开返回成员与调用方解构。没有不安全修复模式或依赖保护关闭选项。
不支持 `typeInformation`、`memberKinds`、`unknownMembers`、`usage`、`tsconfig`
与 `useConfigurationIf`。

## :mag: Implementation

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-composable-body.ts)
- [规则测试](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/sort-composable-body/selection.test.ts)
- [设计说明](../design/sort-composable-body.md)
