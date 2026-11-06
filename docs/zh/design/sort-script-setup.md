# sort-script-setup 设计 {#sort-script-setup-design}

状态：初版已实现。本文记录 `vue-perfectionist/sort-script-setup` 的设计约定。用法及支持的自动修复见[规则文档](../rules/sort-script-setup.md)。

针对 Vue 3 `<script setup>` 顶层语句，默认保留组内顺序，初始化依赖及执行行为优先于风格偏好。

## 1. 设计决策 {#_1-design-decisions}

使用 Perfectionist 风格排序选项、Vue 语义分组和保守自动修复：

- `groups` 决定类别顺序，`type`、`order`、`fallbackSort` 决定组内顺序。
- 默认 `type: 'unsorted'` 仍检查分组顺序及配置空白。
- 分类涵盖宏、响应式声明、组合式函数、侦听器和生命周期钩子；分类成功不表示可安全移动。
- 完整顶层语句是最小移动单位，不拆声明、不重排参数、不对函数体内部排序。
- 不提供禁用依赖保护或将调用声明为纯函数的选项。
- 初始 API 支持文档声明的上游选项子集，拒绝不支持的规则选项。

ESLint 配置必须使用 Vue 解析器。

## 2. Perfectionist 兼容性基线 {#_2-perfectionist-compatibility-baseline}

设计基线为上游提交 [`c0b3b8e`](https://github.com/azat-io/eslint-plugin-perfectionist/tree/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc)，对应版本 `5.11.0`。这是固定参考，不承诺自动兼容全部上游版本。

选项结构遵循 [common-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-options.ts)、[common-groups-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-groups-options.ts) 和 [common-partition-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-partition-options.ts)。默认值及 Vue 扩展由本项目自行决定。

| 选项                 | 默认值                 | 约定                                                             |
| -------------------- | ---------------------- | ---------------------------------------------------------------- |
| `type`               | `'unsorted'`           | `alphabetical`、`natural`、`line-length`、`custom` 或 `unsorted` |
| `order`              | `'asc'`                | 仅影响组内比较                                                   |
| `fallbackSort`       | `{ type: 'unsorted' }` | 主要比较相等时决胜，也支持 `subgroup-order`                      |
| `alphabet`           | `''`                   | 生效的自定义比较器要求非空字符表                                 |
| `ignoreCase`         | `true`                 | 影响名称，不影响分组正则                                         |
| `specialCharacters`  | `'keep'`               | `keep`、`trim` 或 `remove`                                       |
| `locales`            | `'en-US'`              | BCP 47 字符串或非空区域字符串数组                                |
| `groups`             | 见第 5 节              | 名称、合并数组、分组覆盖和换行分隔项                             |
| `customGroups`       | `[]`                   | 有序匹配条件，包括 `anyOf`                                       |
| `partitionByComment` | `false`                | 布尔值、正则选项或分别配置行/块注释                              |
| `partitionByNewLine` | `false`                | 已有空行形成独立分区                                             |
| `newlinesBetween`    | `'ignore'`             | 非负整数或 `ignore`                                              |
| `newlinesInside`     | `'ignore'`             | 非负整数、`ignore` 或兼容旧值 `newlinesBetween`                  |
| `vueImportSources`   | `['vue']`              | 识别 Vue 运行时 API 的精确导入来源                               |
| `vueGlobals`         | `[]`                   | 未绑定、自动导入 Vue API 的显式名称                              |
| `fix`                | `'safe'`               | `safe` 或 `none`                                                 |

有意保留的差异包括：默认保留组内顺序、默认忽略空行数、Vue 专用选择器，以及更小的可自动移动语句集合。

`type` 和 `fallbackSort.type` 均不接受 `usage`。即时读取、延迟捕获和同步回调需要不同依赖模型；无论比较方式如何，依赖保护始终生效。

不接受 `tsconfig`、`additionalModuleBlockTypes`、`useExperimentalDependencyDetection`、`newlinesBetweenOverloadSignatures`、`commentAbove`、`useConfigurationIf`。针对 SFC，保留重载，不生成分组标题；schema 拒绝这些字段。

## 3. 范围与移动单位 {#_3-scope-and-movement-units}

| 源码                                            | 行为                                |
| ----------------------------------------------- | ----------------------------------- |
| JavaScript 或 TypeScript Vue 3 `<script setup>` | 检查顶层候选                        |
| 普通 `<script>`、选项式 API、独立 `.ts`/`.js`   | 跳过                                |
| 双脚本 SFC                                      | 按 SFC 范围选择 setup，从不跨脚本块 |
| 导入，包括副作用导入                            | 固定边界                            |
| `if`、循环、`switch`、`try` 及块等控制流        | 固定边界，不递归排序                |
| 含 `await` 或 `for await` 的顶层执行            | 固定边界                            |
| 赋值、自增自减及复杂表达式语句                  | 固定边界                            |
| 直接调用表达式语句                              | 可分类候选，移动需另行分析安全性    |
| 函数和回调体                                    | 保留文本，仅为依赖分析检查          |
| 类和枚举                                        | 可分类，不自动移动                  |
| 命名空间及不支持声明形式                        | 固定边界                            |

使用 `vue-eslint-parser` 的 SFC 信息，不依赖扩展名或合并后的 `Program.body`。无 SFC 信息则跳过。TypeScript 需支持其语法的内层解析器。

移动单位包含明确附属的前后注释。重载签名及实现、合并声明、ambient 声明及受保护指令固定。`const a = ref(0), b = computed(...)` 是边界，不拆分或任意归类。解构为单个候选，不重排其成员。

## 4. 公共选项约定 {#_4-public-option-contract}

规则接受一个选项对象。按文件配置偏好请用 ESLint `files`，不要向规则添加条件路由。

权威 TypeScript 约定位于 [sort-script-setup.ts](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/types/rules/sort-script-setup.ts)：

- `CommonSortOptions` 包含共享比较、分区及间距选项。
- `SortScriptSetupOptions` 增加 `groups`、`customGroups`、`vueImportSources`、`vueGlobals` 和 `fix`。
- `GroupEntry` 接受名称、合并名称数组、`group` 与 `GroupOverrides` 组成的对象，或 `{ newlinesBetween }` 分隔项。
- `GroupOverrides` 含 `type`、`order`、`fallbackSort`、`newlinesInside`。
- `RegexOption` 接受字符串、`{ pattern, flags? }` 或两者的数组。
- `CustomGroup` 将 `groupName` 和覆盖项与直接匹配字段或 `anyOf` 条件组合。

类型描述结构；schema 及语义验证还要求必要数组非空、分组名合法、整数非负、正则有效，以及字段之间约束成立。

## 5. 内置分组 {#_5-built-in-groups}

### 默认分组 {#default-groups}

```json
{
  "groups": [
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
}
```

这是可配置阅读顺序。组合式函数使用状态或表达式读取其他绑定时，依赖保留必要初始化顺序。`define-expose` 仅是当前分区内偏好，不要求移到文件末尾。

### 分类 {#classification}

| 选择器              | 匹配内容                                                         | 说明                                                     |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| `interface`, `type` | TypeScript 接口及别名                                            | 不改变成员顺序                                           |
| `enum`, `class`     | 顶层枚举和类                                                     | 可能执行运行时初始化                                     |
| `define-options`    | `defineOptions(...)`                                             | 编译器宏                                                 |
| `define-props`      | `defineProps(...)` 及 `withDefaults(defineProps(...), ...)`      | 包括解构，包装整体为单个 props 候选                      |
| `define-emits`      | `defineEmits(...)`                                               | 绑定或独立调用                                           |
| `define-slots`      | `defineSlots(...)`                                               | 绑定或独立调用                                           |
| `define-model`      | `defineModel(...)`                                               | 包括解构结果                                             |
| `define-expose`     | `defineExpose(...)`                                              | 保留参数依赖及 await 边界                                |
| `constant`          | 以原始值或无插值模板初始化的单个 `const` 绑定                    | 排除正则、对象、数组、调用、属性读取；带符号数值符合要求 |
| `inject`            | Vue `inject(...)`                                                | 默认工厂可能执行                                         |
| `template-ref`      | Vue `useTemplateRef(...)`                                        | 不从 `ref(null)` 或绑定名推断                            |
| `ref`               | Vue `ref`, `shallowRef`, `customRef`, `toRef`, `toRefs`          | `customRef` 工厂可能同步执行                             |
| `reactive`          | Vue `reactive`, `shallowReactive`, `readonly`, `shallowReadonly` | 同一响应式对象族                                         |
| `computed`          | Vue `computed(...)`                                              | 区分延迟捕获与即时读取                                   |
| `composable`        | 导出名匹配 `^use[A-Z0-9]` 的静态导入直接调用                     | Vue 专用类别优先，名称不证明纯度                         |
| `variable`          | 其他单声明变量                                                   | 包括对象、数组和其他初始化器                             |
| `function`          | 具名函数声明及以箭头/函数表达式初始化的单绑定                    | 排除返回函数的调用                                       |
| `watch`             | Vue `watch`, `watchEffect`, `watchPostEffect`, `watchSyncEffect` | 包括绑定停止句柄的声明                                   |
| `lifecycle-hook`    | 显式 Vue 生命周期注册 API                                        | 不匹配任意 `onXxx`                                       |
| `provide`           | Vue `provide(...)`                                               | 参数可能有依赖                                           |
| `call`              | 其他直接调用语句                                                 | 可用于自定义组，不在默认组中                             |

生命周期列表为 `onBeforeMount`、`onMounted`、`onBeforeUpdate`、`onUpdated`、`onBeforeUnmount`、`onUnmounted`、`onActivated`、`onDeactivated`、`onErrorCaptured`、`onRenderTracked`、`onRenderTriggered`、`onServerPrefetch`。需要时可通过自定义组处理 `onScopeDispose`、`onWatcherCleanup`。

没有额外的 `macros`、`state`、`effects` 别名。请直接合并类别，例如 `['ref', 'reactive', 'computed']`。

### 分类优先级与修饰符 {#classification-priority-and-modifiers}

先提取语句事实，再选择基础选择器，依次为编译器宏、已识别 Vue API、导入 `useXxx`、函数初始化器、原始值常量、普通变量/调用。直接声明使用 AST 类型，如 `const count = ref(0)` 的选择器为 `ref`。

修饰符记录独立事实：`declare`、`async`、`destructured` 及声明种类 `const`、`let`、`var`，如 `const-ref`、`destructured-define-props`、`async-function`。

自定义组优先于内置组。内置匹配优先修饰符更多者；相同时按 `declare`、`async`、`destructured`、`const`、`let`、`var` 决胜，普通选择器最后。修饰符可任意排序，但须位于选择器前。检查重复前规范化名称，拒绝无效选择器/修饰符组合。

`unknown` 是后备组名，不是 AST 选择器。未显式配置时，不匹配候选固定为边界。即使有全局比较器，unknown 组仍保序；可用 `{ group: 'unknown', type: 'natural' }` 覆盖。控制流等硬边界仍固定。

## 6. 分组排序与覆盖 {#_6-group-sorting-and-overrides}

### 合并数组 {#merged-arrays}

```json
{
  "groups": [["interface", "type"], ["ref", "reactive"], "computed"]
}
```

每个嵌套数组组成一组，自然排序按名称交错各类别；`unsorted` 保留现有相对顺序。

`fallbackSort: { type: 'subgroup-order' }` 仅在主要比较相等时，按数组位置决胜，不强制独立类别顺序。`type: 'unsorted'` 禁用组内全部比较（含后备），遵循固定上游[比较器基线](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/compare/compute-comparators.ts)。

### 覆盖优先级 {#override-priority}

独立自定义组按以下优先级取值：

1. `customGroups` 定义的显式覆盖。
2. 对应 `groups` 对象覆盖。
3. 解析后的规则选项。

合并数组内不应用各自定义组的覆盖，整组需要一致比较器和间距策略。使用 `{ group: ['a', 'b'], type: 'natural' }` 共享覆盖，遵循上游[分组覆盖基线](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/compute-overridden-options-by-group-index.ts)。

### 排序键 {#sorting-keys}

| 语句                 | 名称键                                                 |
| -------------------- | ------------------------------------------------------ |
| 函数、类型、类、枚举 | 声明标识符                                             |
| 单变量绑定           | 局部绑定名                                             |
| 解构                 | 源码遍历中的首个局部绑定；空模式回退到调用名或语句文本 |
| 无绑定调用           | 解析后的调用名                                         |

`const route = useRoute()` 以 `route` 排序、以 `useRoute` 分类。`line-length` 测整条语句源码长度，不含尾部分号及外部附属注释，内部注释和换行计入，不是最长物理行宽度。

主要及后备比较均相等时，保留原索引。降序不反转依赖边。自然排序按偏好顺序协商区域数组；区分大小写时，区域大小写比较打破自然排序平局，同时保留数值优先关系。自定义字符表按 Unicode 码点比较，拒绝重复字符。未列出字符同优先级，码点名称长度解决剩余前缀平局。

比较器回归覆盖大小写、数字、前导 `_`/`$`、标点、Unicode 及字符表缺失字符。不能用无关 `\W` 表达式替换基线特殊字符处理，也不能假设简化数值 `localeCompare` 完全等价。

## 7. 自定义分组 {#_7-custom-groups}

### 匹配字段 {#matching-fields}

| 字段                  | 含义                                                 |
| --------------------- | ---------------------------------------------------- |
| `groupName`           | 用户定义名，必须在 `groups` 出现                     |
| `selector`            | 第 5 节中的基础选择器                                |
| `modifiers`           | 列出的修饰符必须全部存在                             |
| `elementNamePattern`  | 本地声明名；解构任一绑定可匹配；无绑定调用使用调用名 |
| `callNamePattern`     | 直接初始化器或独立调用的标准名称                     |
| `importSourcePattern` | 直接调用的静态导入来源                               |
| `anyOf`               | 任一完整条件可匹配                                   |

同条件字段以 AND 组合，模式数组以 OR 组合。首个匹配的自定义组优先。要求至少一个非空匹配字段，显式 `elementNamePattern: '.*'` 可作后备。`anyOf` 不能与顶层过滤器并存，也不递归。

模式使用字符串或 `{ pattern, flags }`，不用 `RegExp` 实例。不加隐式锚点。拒绝无效表达式和标志；匹配间重置 `lastIndex`，确保 `g`/`y` 确定性。匹配原名称，不应用 `ignoreCase` 或 `specialCharacters` 规范化。

函数体内部调用不参与外层声明分类。`withDefaults(defineProps(...))` 的标准调用名是 `defineProps`。

### 项目特定分组 {#project-specific-groups}

```json
{
  "groups": [
    ["interface", "type"],
    "define-props",
    "define-emits",
    "router",
    "stores",
    "composable",
    ["ref", "reactive"],
    "computed",
    {
      "group": "handlers",
      "type": "natural"
    },
    "function",
    "watch",
    "lifecycle-hook",
    "define-expose"
  ],
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
    },
    {
      "groupName": "handlers",
      "selector": "function",
      "elementNamePattern": "^(handle|on)[A-Z]"
    }
  ]
}
```

此配置替换完整分组列表，省略类别遵循 unknown 策略。store 组合式函数通常来自项目文件，不应假定来源为 `pinia`。

Nuxt `definePageMeta` 等可用 `{ selector: 'call', callNamePattern: '^definePageMeta$' }`。分类不模拟框架提升，也不授权移动。侦听器或生命周期 API 也可通过自定义组细分，无独立 `watchOrder`、`lifecycleOrder` 或 `macrosOrder`。

## 8. Vue 调用来源与自动导入 {#_8-vue-call-sources-and-auto-imports}

`vueImportSources` 使用精确模块名，替换默认数组。例如 `['vue', '@vue/reactivity']` 识别两个来源。这只识别 API，不证明纯度。

```ts
import { ref as createRef } from 'vue'
import * as Vue from 'vue'
import { ref } from './local-helper'

const first = createRef(0) // ref
const second = Vue.ref(0) // ref
const third = ref(0) // variable
```

通过 ESLint 作用域解析绑定，具名导入用导出名，默认导入用本地名。仅类型导入无运行时来源。识别静态命名空间成员，不解析动态成员、可选调用、额外变量别名和跨模块重新导出。自定义组可匹配 `api.useThing` 等未解析成员，但不推断其导入来源。

`vueGlobals` 仅识别内置 Vue API 表的未绑定运行时名称，如 `['ref', 'computed', 'watch', 'onMounted']`。局部和导入绑定优先。宏无需列入，仅在无冲突局部或外部导入绑定时识别。

自动导入业务组合式函数使用名称条件。没有静态导入时，`importSourcePattern` 无法匹配虚构来源。不需要 Nuxt 专属模式。

## 9. 分区、空行与注释 {#_9-partitions-blank-lines-and-comments}

分区选项决定哪些语句可共同比较，`groups` 决定分区内顺序。

```json
{
  "partitionByComment": {
    "line": "^\\s*#region\\b",
    "block": false
  },
  "newlinesBetween": 1,
  "newlinesInside": "ignore"
}
```

仅顶层语句间注释形成分区。尾注释归属前一语句，独立分区标记留在边界，明确附属前置注释随后一语句移动；归属有歧义则不移动修复。

空行数指实际空行。`1` 表示语句间恰好一行空行。兼容旧值 `newlinesInside: 'newlinesBetween'`：全局组间为 `ignore` 则为 `ignore`，否则 `0`。新配置优先显式数值或 `ignore`。

```json
{
  "groups": [
    "define-props",
    {
      "newlinesBetween": 0
    },
    "define-emits",
    {
      "newlinesBetween": 1
    },
    ["ref", "reactive"]
  ]
}
```

中间组缺失时，合并实际相邻组跨越的边界：使用最大正数，否则有 `ignore` 则用它，否则 `0`。未指定边界继承全局值，遵循上游[换行边界基线](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/get-newlines-between-option.ts)。

`partitionByNewLine: true` 时，实际全局和分组间距必须为 `ignore` 或未设置。先规范化旧值，再拒绝冲突（含继承），避免新插入空行改变下次检查的分区。

空白修复仅在分区内实际相邻候选之间进行，不跨导入、控制流、await 或不匹配候选，不格式化语句内部或脚本标签间距。

ESLint 禁用/启用指令保护相关语句及边界。`@ts-expect-error`、`@ts-ignore` 及其他工具指令也与受影响语句固定。明确附属 JSDoc 可以移动。

## 10. 规则配置 {#_10-rule-configuration}

规则偏好使用以下优先级：

```text
rule options
  > rule defaults
```

排序偏好直接放在规则选项，共享排序设置忽略。共享 `autoImport` 是独立布尔开关，用于识别未绑定内置 Vue API。显式 `vueGlobals`（含空列表）覆盖它。分类和依赖分析使用同一解析结果；识别不证明纯度。

规则选项逐字段替换默认值，包括整个数组及 `fallbackSort` 对象，遵循上游[补全基线](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/complete.ts)。分组后备覆盖逐字段继承，缺失后备顺序使用分组顺序。

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    rules: {
      'vue-perfectionist/sort-script-setup': [
        'error',
        {
          newlinesBetween: 1,
          newlinesInside: 'ignore',
          groups: [
            ['interface', 'type'],
            'define-props',
            'define-emits',
            ['ref', 'reactive'],
            'computed',
            {
              group: 'function',
              type: 'natural',
            },
            'watch',
            'lifecycle-hook',
            'define-expose',
          ],
        },
      ],
    },
  },
])
```

此配置保留普通组内顺序，并对函数自然排序。省略 `type` 使用默认 `unsorted`。

插件仅提供规则，无内置配置。用户注册插件、配置解析器并启用所需规则。组内名称排序请在选项设 `type: 'natural'` 或 `'alphabetical'`。

## 11. 依赖与修复约定 {#_11-dependencies-and-fix-contract}

### 分离检查与修复 {#separate-checking-from-fixing}

按类别偏好和即时读取依赖计算稳定目标顺序，再评估所需移动的安全性：

- 从不跨硬边界比较或修复。
- 初始化依赖优先于分组和名称顺序。
- 需要不确定执行变更的风格问题仅报告，不提供修复或未经验证的建议。
- 不报告已被依赖约束排除的反转。

依赖调整后的顺序可能重复出现类别。按实际相邻类别计算间距，不强制同类别连续。

```ts
const count = ref(0)
const snapshot = count.value
```

即使配置中 `variable` 在 `ref` 前，也保留 `count` 在 `snapshot` 前。

```ts
const result = computed(() => input.value)
const input = ref(0)
```

创建闭包不会立即读取 `input`。延迟捕获不自动形成初始化依赖，但后续计算读取或同步回调可能触发求值。

```ts
const initial = readLater()
const later = 1

function readLater() {
  return later
}
```

函数提升不消除即时调用的读取。不修复既有初始化错误，也不做全程序副作用分析。未解析执行路径不能作为移动依据。

对于识别的 Vue 调用，追踪注册时可能执行的内联和本地回调：watch 源 getter/数组、immediate watch 回调、`watchEffect`、`watchSyncEffect`、`customRef` 工厂。普通 watch 回调、`watchPostEffect` 和 `flush: 'post'` 的 `watchEffect` 仍延迟。未知选项保守保留潜在即时依赖。嵌套调用使用自身导入身份，外部同名函数不获得 Vue 回调语义。

### 安全修复 {#safe-fixes}

`fix: 'safe'` 仅允许在连续片段中移动已证明安全的语句：

- 无声明合并的独立类型/接口声明。
- 无装饰器或受保护指令的独立单标识符原始值常量。
- 无重载歧义或名称冲突的普通顶层函数声明，函数体不变。
- 保留指令含义和解析结果的空白调整。

这些单位不能跨运行时调用，不自动包括箭头函数变量等未证明形式。仅类型擦除不足以证明安全，声明合并和重载顺序仍可影响类型。

Vue 运行时 API、业务组合式函数、侦听/副作用、生命周期注册、provide/inject、属性读取、解构、`new`、类/枚举初始化、宏及宏包装，不会仅因未发现显式依赖而获准移动。初版修复主要整理类型、简单声明及空白。

`fix: 'none'` 保留诊断并禁用全部修复（含间距），不同于仅禁用组内比较的 `type: 'unsorted'`。

### await 与副作用 {#await-and-side-effects}

setup 在实例创建时执行；宏涉及编译处理及提升，顶层 await 引入异步边界。

```ts
const count = ref(0)
watchEffect(() => console.log(count.value))
count.value = 1
```

注册侦听器属于可执行行为，即使结果赋给 `const` 停止句柄。

```ts
const data = await loadData()
defineExpose({ data })
```

不能在任一方向将 expose 跨越 await。已有的 await 后 expose 问题由专用 Vue 规则检查。

循环依赖成员保留原序，不进行涉及循环的移动修复；独立片段仍检查。稳定拓扑选择依次使用分组、组内比较器和原索引。依赖排序器先计算稳定优先级，再使用入度和最小优先级就绪队列；新解除阻塞的语句在下次选择前参与竞争，剩余阻塞语句保留源码顺序。无内部依赖边时直接返回稳定风格顺序。V 条语句、E 条依赖边的成本为 O(V log V + E)。

不确定副作用参与诊断，但阻止不安全修复。

选择独立验证、修复范围不重叠的连续片段。保留源码、注释和换行，验证 ASI、分号、注释归属和解析。不能靠全脚本格式化掩盖语义变化。重复修复必须收敛，下次执行不再变化。

## 12. 验证与诊断 {#_12-validation-and-diagnostics}

ESLint 在创建规则前验证公共选项 schema，包括空行数非负安全整数上限。规则仍验证选项交互、正则、区域和分组语义。共同拒绝：

- 重复或未知组名，包括规范化修饰符重复及未定义自定义组。
- 空、重复、与内置冲突或未引用的自定义组名。
- 过深或空合并数组；单元素数组需规范化。
- 开头、结尾或连续换行分隔项，以及与 `group` 混用的分隔项。
- 非有限、负数、小数空行数，及数值间距与空行分区组合。
- 没有有效字符表的生效自定义比较器，包括后备和分组覆盖。
- 重复、不兼容或不适用选择器的修饰符。
- 空正则数组、无条件 `anyOf` 分支、无效表达式/标志/区域、未知 Vue 全局名。
- 规则选项中的未知字段。

`groups: []` 禁用排序和间距诊断，不恢复默认值。`customGroups: []` 清空自定义匹配。

| 消息 ID                     | 含义                   | 修复       |
| --------------------------- | ---------------------- | ---------- |
| `unexpectedGroupOrder`      | 某类别应在另一类别之前 | 证明安全时 |
| `unexpectedOrder`           | 组内名称或长度顺序错误 | 证明安全时 |
| `unexpectedNewlinesBetween` | 组间空行数错误         | 独立安全时 |
| `unexpectedNewlinesInside`  | 组内空行数错误         | 独立安全时 |
| `unsafeReorder`             | 无法证明偏好移动安全   | 无         |

每项差异报告一次，不对同一移动同时给出可修复和不安全报告。`fix: 'none'` 不会将安全差异改名为 `unsafeReorder`。配置错误应直接抛出，不伪装为源码诊断。

## 13. 与其他规则配合 {#_13-cooperation-with-other-rules}

- 导入交由 `perfectionist/sort-imports`，包括将分散导入移至顶部。
- 本规则负责顶层类型/接口/函数顺序的 `.vue` 文件中，禁用 `perfectionist/sort-modules`。
- 本规则负责宏顺序时禁用 `vue/define-macros-order`。
- 保留 `vue/no-expose-after-await`、`vue/no-watch-after-await`、`vue/no-lifecycle-after-await` 等正确性规则。
- 对象键、参数和解构成员交由专用规则。
- 协调空白偏好与空行规则和格式化工具；默认 `ignore` 可减少修复冲突。

以下覆盖假定已配置相应插件和解析器，应放在相关预设之后：

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['**/*.vue'],
    rules: {
      'perfectionist/sort-modules': 'off',
      'vue/define-macros-order': 'off',
      'vue-perfectionist/sort-script-setup': [
        'error',
        {
          type: 'unsorted',
          newlinesBetween: 'ignore',
          newlinesInside: 'ignore',
          fix: 'safe',
        },
      ],
    },
  },
])
```

## 14. 验收矩阵 {#_14-acceptance-matrix}

此矩阵记录验收要求，不表示每种组合都有独立测试。可执行用例见[规则测试](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/tree/main/tests/rules/sort-script-setup)。

| 领域     | 必需行为                                                 |
| -------- | -------------------------------------------------------- |
| 范围     | JS/TS setup、跳过普通脚本、双脚本隔离、缺少 SFC 服务     |
| 分组     | 默认、部分/空列表、合并数组、显式/省略 unknown           |
| 宏       | 独立/绑定调用、withDefaults、props 解构、多模型、遮蔽    |
| 调用来源 | 导入别名、命名空间、外部同名、全局、动态被调用者         |
| 自定义组 | 首次匹配、AND/OR、静态来源、未引用组、名称冲突           |
| 比较器   | 五种类型、后备、子组顺序、降序、稳定平局、Unicode        |
| 选项     | 规则/分组/自定义优先级、数组替换、忽略共享排序设置       |
| 空白     | 组内/组间、缺失组、分区冲突、注释、CRLF                  |
| 依赖     | 初始化顺序、跨组读取、即时调用、捕获、回调、循环、重载   |
| 副作用   | 即时副作用、未知 watch 选项、组合式函数、inject 工厂     |
| 修复边界 | await、赋值、控制流、多声明、禁用/指令注释               |
| 安全情况 | 独立类型/接口、原始值常量、普通函数、间距                |
| 稳定性   | 幂等修复、不安全输入不变、修复范围不重叠                 |
| 集成     | 解析器和手动配置、导入排序共存、禁用重叠规则、格式稳定性 |

实现从选项解析和分类开始，再到分组和诊断、依赖保护和保守修复，最后插件集成和文档。扩大可移动语法前，必须先补充语义回归测试。

## 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-script-setup.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/tree/main/tests/rules/sort-script-setup)
- [插件集成测试](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/integration/eslint-plugin.test.ts)
