# sort-script-setup 规则选项设计

状态：首版已实现。核对日期：2026-09-11。实际使用方式与修复范围见[规则文档](../rules/sort-script-setup.md)。

规则名：`vue-perfectionist/sort-script-setup`。

沿用任务「设计 Vue script 排序插件」的结论：仅支持 Vue 3，专注 `<script setup>` 顶层语句，默认保留组内顺序，依赖与执行语义优先于风格配置。

## 1. 设计结论

建议采用 **Perfectionist 通用排序配置 + Vue 语义分组 + 保守自动修复**。

- `groups` 决定类别顺序；`type`、`order`、`fallbackSort` 决定同组元素顺序。
- 默认 `type: 'unsorted'`，依然检查分组顺序与用户配置的空行。
- 分类能力覆盖宏、响应式声明、composable、watch、生命周期等；分类成功不等于可以自动移动。
- 一条完整顶层语句是最小移动单位；不拆声明、不重排调用参数、不进入函数体排序。
- 不设置关闭依赖检查或宣称调用纯净的选项。
- 首版支持主要通用选项；明确拒绝暂未实现的上游选项，避免制造完全兼容的印象。

本文件保留规则的设计契约。首版已提供规则与预设；示例需要在已配置 Vue parser 的 ESLint 环境中使用。

## 2. Perfectionist 兼容基线

本次核对上游仓库提交 [`c0b3b8e`](https://github.com/azat-io/eslint-plugin-perfectionist/tree/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc)，其 `package.json` 标记版本为 `5.11.0`。这是设计核对基线，不承诺跟随上游任意版本自动兼容。

通用配置形状参考上游 [common-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-options.ts)、[common-groups-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-groups-options.ts) 和 [common-partition-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-partition-options.ts)。以下默认值与 Vue 扩展是本插件的设计决定。

| 选项                 | 建议默认值             | 首版设计                                                        |
| -------------------- | ---------------------- | --------------------------------------------------------------- |
| `type`               | `'unsorted'`           | 支持 `alphabetical / natural / line-length / custom / unsorted` |
| `order`              | `'asc'`                | 只影响组内比较，不反转 `groups` 和依赖                          |
| `fallbackSort`       | `{ type: 'unsorted' }` | 主比较相等时执行；另支持 `subgroup-order`                       |
| `alphabet`           | `''`                   | 自定义字符顺序；有效比较器使用 `custom` 时必须提供非空值        |
| `ignoreCase`         | `true`                 | 参与名称比较，不影响分组正则                                    |
| `specialCharacters`  | `'keep'`               | 支持 `keep / trim / remove`                                     |
| `locales`            | `'en-US'`              | 接受 BCP 47 字符串或非空字符串数组                              |
| `groups`             | 见第 5 节              | 字符串、同级组数组、组级覆盖、空行分隔对象                      |
| `customGroups`       | `[]`                   | 有序数组，支持条件组合与 `anyOf`                                |
| `partitionByComment` | `false`                | 布尔值、正则配置、按注释类型配置                                |
| `partitionByNewLine` | `false`                | 空行划分独立排序区域                                            |
| `newlinesBetween`    | `'ignore'`             | 非负整数或 `ignore`                                             |
| `newlinesInside`     | `'ignore'`             | 非负整数或 `ignore`；兼容旧值 `newlinesBetween`                 |
| `vueImportSources`   | `['vue']`              | Vue 扩展：运行时 API 的可信导入来源                             |
| `vueGlobals`         | `[]`                   | Vue 扩展：显式声明自动导入的 Vue 运行时 API 名称                |
| `fix`                | `'safe'`               | Vue 扩展：`safe / none`                                         |

与上游的有意差异：默认不做组内字符排序；默认不管理空行；选择器面向 Vue；自动修复覆盖范围更保守。

首版不接收 `type: 'usage'`，也不接收 `fallbackSort.type: 'usage'`。上游此选项涉及同组引用顺序；本规则中，运行时立即读取、闭包捕获、同步执行回调必须分别建模，不能仅靠名称引用套用。依赖保护始终存在，不依赖排序类型。[上游规则选项](https://perfectionist.dev/rules/sort-modules#type)

暂不移植 `tsconfig`、`additionalModuleBlockTypes`、`useExperimentalDependencyDetection`、`newlinesBetweenOverloadSignatures`、`commentAbove`、`useConfigurationIf`。本规则限定 SFC 范围、保持重载整体，并暂不自动生成分组标题。JSON Schema 应拒绝这些规则级字段。

## 3. 适用范围与移动单位

| 内容                                               | 行为                                                    |
| -------------------------------------------------- | ------------------------------------------------------- |
| Vue 3 `<script setup>`，JS 或 TS                   | 处理顶层候选语句                                        |
| 普通 `<script>`、Options API、普通 `.ts/.js`       | 跳过                                                    |
| 同时包含普通 script 和 setup                       | 按 SFC 节点范围精确选取 setup；不跨块移动               |
| imports，包括副作用 import                         | 固定边界；交给 `perfectionist/sort-imports`             |
| `if / for / while / switch / try / block` 等控制流 | 整个语句固定，形成边界；不递归整理                      |
| 顶层执行路径包含 `await` 或 `for await`            | 整个语句固定，形成边界                                  |
| 赋值、更新、任意复杂表达式语句                     | 固定边界                                                |
| 直接调用表达式语句                                 | 可分类候选；自动移动另行判断                            |
| 函数、箭头函数、回调内部内容                       | 保留原文；只为依赖分析读取                              |
| class、enum、namespace、decorator                  | class/enum 可分类但默认不自动移动；namespace 等暂作边界 |

必须依赖 `vue-eslint-parser` 的 SFC 信息，不能仅通过扩展名或拼接后的 `Program.body` 判断范围。缺少 SFC 信息时跳过；不把普通 JS 当作 setup。TS 需要用户为 `vue-eslint-parser` 配置支持 TS 的内部 parser。

移动单位还包含明确属于该语句的前置注释和行尾注释。连续函数重载签名与实现不可拆分，首版将这些声明固定为边界；同名声明合并、环境声明与无法确认归属的指令注释也固定。

`const a = ref(0), b = computed(...)` 首版固定为边界，不拆成两句，也不随意选一个类别。解构是一条语句：可以分类，但不重排解构成员。

## 4. 公共选项契约

以下类型表达 API 结构；非空数组、有效组名、非负整数、跨字段约束仍由 Schema 和配置校验承担。

```ts
type SortType =
  'alphabetical' | 'natural' | 'line-length' | 'custom' | 'unsorted'

type SortOrder = 'asc' | 'desc'
type Newlines = number | 'ignore'
type RegexPattern = string | { pattern: string; flags?: string }
type RegexOption = RegexPattern | RegexPattern[]
type CommentPartition =
  | boolean
  | RegexOption
  | {
      line?: boolean | RegexOption
      block?: boolean | RegexOption
    }

interface FallbackSort {
  type: SortType | 'subgroup-order'
  order?: SortOrder
}

interface GroupOverrides {
  type?: SortType
  order?: SortOrder
  fallbackSort?: FallbackSort
  newlinesInside?: Newlines
}

type GroupEntry =
  | string
  | string[]
  | ({ group: string | string[] } & GroupOverrides)
  | { newlinesBetween: Newlines }

type Selector =
  | 'interface'
  | 'type'
  | 'enum'
  | 'class'
  | 'define-options'
  | 'define-props'
  | 'define-emits'
  | 'define-slots'
  | 'define-model'
  | 'define-expose'
  | 'constant'
  | 'inject'
  | 'template-ref'
  | 'ref'
  | 'reactive'
  | 'computed'
  | 'composable'
  | 'variable'
  | 'function'
  | 'watch'
  | 'lifecycle-hook'
  | 'provide'
  | 'call'

type Modifier = 'declare' | 'async' | 'destructured' | 'const' | 'let' | 'var'

interface MatchCondition {
  selector?: Selector
  modifiers?: Modifier[]
  elementNamePattern?: RegexOption
  callNamePattern?: RegexOption
  importSourcePattern?: RegexOption
}

type CustomGroup = {
  groupName: string
} & GroupOverrides &
  ((MatchCondition & { anyOf?: never }) | { anyOf: MatchCondition[] })

interface CommonSortOptions {
  type?: SortType
  order?: SortOrder
  fallbackSort?: FallbackSort
  alphabet?: string
  ignoreCase?: boolean
  specialCharacters?: 'keep' | 'trim' | 'remove'
  locales?: string | string[]
  partitionByComment?: CommentPartition
  partitionByNewLine?: boolean
  newlinesBetween?: Newlines
  newlinesInside?: Newlines | 'newlinesBetween'
}

interface SortScriptSetupOptions extends CommonSortOptions {
  groups?: GroupEntry[]
  customGroups?: CustomGroup[]
  vueImportSources?: string[]
  vueGlobals?: string[]
  fix?: 'safe' | 'none'
}

type RuleOptions = [SortScriptSetupOptions?]
```

使用单个 options object。按文件差异使用 ESLint `files` 配置，不另外设计多套规则选项的条件路由。

## 5. 内置分组

### 5.1 默认 groups

```js
groups: [
  ['interface', 'type'],
  'define-options',
  'define-props',
  'define-emits',
  'define-slots',
  'define-model',
  'constant',
  'inject',
  'composable',
  'template-ref',
  ['ref', 'reactive'],
  'computed',
  'variable',
  ['enum', 'class'],
  'function',
  'watch',
  'lifecycle-hook',
  'provide',
  'define-expose',
]
```

这是可配置的阅读顺序，不是 Vue 的执行规范。`composable` 使用前面创建的状态、`variable` 被 computed 立即使用等情形，由依赖关系保留必要顺序。`define-expose` 表示当前分区内的末尾偏好，不保证移动到整个文件最后。

### 5.2 分类定义

| selector             | 匹配范围                                                        | 补充说明                                                                        |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `interface` / `type` | TS 接口与类型别名                                               | 不改变成员排序                                                                  |
| `enum` / `class`     | 顶层枚举与类                                                    | 可能有运行时初始化，不能按类型声明处理                                          |
| `define-options`     | `defineOptions(...)`                                            | 编译宏                                                                          |
| `define-props`       | `defineProps(...)`、`withDefaults(defineProps(...), ...)`       | 包装调用整体属于 props；解构同样适用                                            |
| `define-emits`       | `defineEmits(...)`                                              | 包括有返回绑定或独立调用                                                        |
| `define-slots`       | `defineSlots(...)`                                              | 同上                                                                            |
| `define-model`       | `defineModel(...)`                                              | 返回值解构不影响分类                                                            |
| `define-expose`      | `defineExpose(...)`                                             | 其对象值读取与 await 边界必须保留                                               |
| `constant`           | 单绑定 `const`，初始化为原始值字面量或无插值模板                | 不包括正则、对象、数组、调用、成员读取；`-1` 可按数字字面量的一元正负号形式识别 |
| `inject`             | Vue `inject(...)`                                               | 默认值工厂可能执行                                                              |
| `template-ref`       | Vue `useTemplateRef(...)`                                       | 不通过 `ref(null)` 或变量名推断模板引用                                         |
| `ref`                | Vue `ref / shallowRef / customRef / toRef / toRefs`             | 按 API 家族分类；`customRef` 的工厂可能同步执行                                 |
| `reactive`           | Vue `reactive / shallowReactive / readonly / shallowReadonly`   | readonly 放入同一响应式对象家族                                                 |
| `computed`           | Vue `computed(...)`                                             | 不将闭包捕获一律视为立即读取                                                    |
| `composable`         | 直接调用，解析后的导出名匹配 `^use[A-Z0-9]`，且具有静态导入来源 | Vue 专门类别优先；这只是命名分类，不证明纯度                                    |
| `variable`           | 其余单 declarator 的变量声明                                    | 包括一般对象、数组与其他初始化表达式                                            |
| `function`           | 命名函数声明、单绑定箭头函数或函数表达式                        | 不包含返回函数的调用                                                            |
| `watch`              | Vue `watch / watchEffect / watchPostEffect / watchSyncEffect`   | 返回 stop handle 的声明也属于此组                                               |
| `lifecycle-hook`     | 明确列举的 Vue 生命周期注册 API                                 | 不匹配任意 `onXxx`                                                              |
| `provide`            | Vue `provide(...)`                                              | 初始化参数可能有依赖                                                            |
| `call`               | 其余直接调用表达式语句                                          | 供 customGroups 匹配；默认不安排其顺序                                          |

生命周期 API 首版清单：`onBeforeMount`、`onMounted`、`onBeforeUpdate`、`onUpdated`、`onBeforeUnmount`、`onUnmounted`、`onActivated`、`onDeactivated`、`onErrorCaptured`、`onRenderTracked`、`onRenderTriggered`、`onServerPrefetch`。`onScopeDispose`、`onWatcherCleanup` 不混入生命周期组；需要时用自定义组分类。

不提供 `macros`、`state`、`effects` 等额外别名；用同级组数组表达合并，避免维护两套分组名称。例如 `['ref', 'reactive', 'computed']` 就是一个状态大组。

### 5.3 识别顺序与 modifiers

先分析语句事实，再选择唯一的基础 selector：编译宏 → 明确 Vue API → 已导入的 `useXxx` → 函数初始化 → 字面量常量 → 普通变量/调用；直接声明按 AST 类型识别。

每个节点只有一个基础 selector。`const count = ref(0)` 的 selector 是 `ref`，不是同时属于 `ref`、`variable`、`constant`。

修饰符表示独立事实：`declare` 为环境声明，`async` 为函数本身异步，`destructured` 为解构绑定，`const / let / var` 为声明种类。例如 `const-ref`、`destructured-define-props`、`async-function`。

选择组时先考虑已配置并命中的自定义组，再考虑内置组。内置组匹配采用修饰符数量优先，同数量按 `declare → async → destructured → const → let → var` 比较；基础 selector 最后匹配。修饰符可以以任意顺序书写，但必须在 selector 前。名称归一化后检查重复；非法 selector/modifier 组合直接报配置错误。

`unknown` 是分组回退名，不是 AST selector。没有任何已配置组命中的候选语句归入 unknown；默认未列出 unknown，这些语句固定并隔断排序。显式加入 `'unknown'` 才检查其类别位置。unknown 组内默认强制保留顺序，可用 `{ group: 'unknown', type: 'natural' }` 显式覆盖；仍不能覆盖控制流等硬边界。这是本规则明确的保守扩展。

## 6. groups、组内排序与覆盖

### 6.1 同级数组不是先后顺序

```js
groups: [['interface', 'type'], ['ref', 'reactive'], 'computed']
```

两个嵌套数组分别形成一个排序桶。`type: 'natural'` 时，同桶里的 ref 和 reactive 按名称混排；`type: 'unsorted'` 时保持同桶原有相对顺序。

`fallbackSort: { type: 'subgroup-order' }` 仅在主比较相等时，按嵌套数组内的位置打破平局；它不能把同级数组变成强制先后组。主 `type: 'unsorted'` 时整个组内比较关闭，fallback 也不执行。这一细节与上游 [compute-comparators.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/compare/compute-comparators.ts) 一致。

### 6.2 覆盖顺序

对于单独出现的自定义组，优先级从高到低：

1. `customGroups` 中该组显式配置的 `type / order / fallbackSort / newlinesInside`。
2. `groups` 中 `{ group: '...', ... }` 的对应配置。
3. 规则级配置及共享设置解析后的结果。

自定义组放入同级数组时，不应用该自定义组自己的排序/空行覆盖；整个桶统一使用桶级配置。这避免同一个比较器因元素不同而得到不一致的排序关系。若需要统一覆盖，写 `{ group: ['a', 'b'], type: 'natural' }`。

以上优先级与上游 [compute-overridden-options-by-group-index.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/compute-overridden-options-by-group-index.ts) 对齐。不要误写成 groups 永远优先于 customGroups。

### 6.3 排序键

| 语句                 | 名称键                                                           |
| -------------------- | ---------------------------------------------------------------- |
| 函数、类型、类、枚举 | 声明标识符                                                       |
| 单变量绑定           | 本地绑定名，例如 `count`                                         |
| 解构绑定             | 按源码遍历顺序提取第一个本地绑定；空模式退回调用名或完整语句文本 |
| 无绑定的调用         | 解析后的调用名，如 `watchEffect`、`onMounted`、`defineExpose`    |

不把 callee 当作有绑定声明的默认名称键。例如 `const route = useRoute()` 按 `route` 排序，调用分类仍使用 `useRoute`。

`line-length` 使用顶层 AST 语句的源码长度，剔除末尾分号，不计外部附属注释；内部注释和换行包含在源码长度中，不是最长物理行的宽度。重载整体使用完整聚合范围。该计量方式参考上游 [range-to-diff.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/range-to-diff.ts)。

名称相等、fallback 也相等时，最终以原索引维持稳定顺序。`order: 'desc'` 永远不反转依赖边。

字符比较需针对上游建立兼容用例：包括大小写、数字、前导 `_/$`、标点、中文和自定义 alphabet 未收录字符。不要用一个自行简化的 `localeCompare({ numeric: true })` 宣称完全等价于上游 natural。自定义 alphabet 中重复字符报错；未收录字符遵循上游比较后仍相等时保持稳定的行为。`trim/remove` 的字符范围以固定基线实现为准，不擅自替换成 `\W`。

## 7. customGroups

### 7.1 匹配字段

| 字段                  | 意义                                                           |
| --------------------- | -------------------------------------------------------------- |
| `groupName`           | 用户定义的名称，必须在 groups 中引用                           |
| `selector`            | 第 5 节的基础 selector                                         |
| `modifiers`           | 语句必须包含列出的全部修饰符                                   |
| `elementNamePattern`  | 匹配本地声明名；解构时任一绑定名命中即可；无绑定调用使用调用名 |
| `callNamePattern`     | Vue 扩展：匹配直接初始化调用或独立调用的规范名称               |
| `importSourcePattern` | Vue 扩展：匹配该调用的直接静态导入模块字符串                   |
| `anyOf`               | 任一条件对象整体命中即可                                       |

同一条件对象中的字段为 AND；正则数组为 OR；多个 customGroups 按数组顺序，首个命中的已配置组生效。至少提供一个非空匹配字段；需要兜底时显式写 `elementNamePattern: '.*'`。`anyOf` 与顶层匹配字段互斥，暂不支持递归逻辑。

正则配置使用字符串或 `{ pattern, flags }`，不接受 JS `RegExp` 实例；不隐式增加 `^/$`。非法表达式和 flags 报配置错误；每次测试重置 `lastIndex`，避免 `g/y` 导致结果随遍历次数变化。名称正则直接匹配原始名称，不受 `ignoreCase`、`specialCharacters` 影响。

`callNamePattern` 的目标是直接调用：不会因为函数体内出现 `watch()`，就把外面的函数声明归为 watch。对于 `withDefaults(defineProps(...))`，规范调用名特例为 `defineProps`。

### 7.2 业务组示例

```js
{
  groups: [
    ['interface', 'type'],
    'define-props',
    'define-emits',
    'router',
    'stores',
    'composable',
    ['ref', 'reactive'],
    'computed',
    { group: 'handlers', type: 'natural' },
    'function',
    'watch',
    'lifecycle-hook',
    'define-expose',
  ],
  customGroups: [
    {
      groupName: 'router',
      callNamePattern: '^use(Route|Router)$',
      importSourcePattern: '^vue-router$',
    },
    {
      groupName: 'stores',
      callNamePattern: '^use[A-Z].*Store$',
      importSourcePattern: '^(@/stores/|~/stores/)',
    },
    {
      groupName: 'handlers',
      selector: 'function',
      elementNamePattern: '^(handle|on)[A-Z]',
    },
  ],
}
```

这个例子是定制后的完整 groups，不会与默认 groups 合并；遗漏的类别按 unknown 规则处理。store composable 通常从项目文件导入，所以不能默认匹配 `importSourcePattern: '^pinia$'`。

Nuxt `definePageMeta` 等可以通过 `{ selector: 'call', callNamePattern: '^definePageMeta$' }` 建立自定义组。这里仅声明分类，不意味着插件理解该框架的宏提升或转换语义，也不会因此允许自动修复。

需要区分不同 watch 或生命周期 API 时也使用 customGroups；首版不再增加 `watchOrder`、`lifecycleOrder`、`macrosOrder` 三套平行选项。

## 8. Vue 调用来源与自动导入

`vueImportSources` 是运行时 API 来源白名单，接受精确模块名，数组整体替换默认值。例如 `['vue', '@vue/reactivity']`。白名单声明的是 API 身份，不是“调用纯净”。

```ts
import { ref as createRef } from 'vue'
import * as Vue from 'vue'
import { ref } from './local-helper'

const first = createRef(0) // ref
const second = Vue.ref(0) // ref
const third = ref(0) // variable
```

通过 ESLint scope 解析绑定，命名导入的规范调用名使用原导出名称，默认导入使用本地绑定名；类型专用导入不作为运行时来源。静态 namespace 成员可识别，动态成员 `Vue[name]()`、可选调用、额外变量别名和跨模块转导出追踪首版不推断。对未解析成员调用，customGroups 可匹配源码 callee 名如 `api.useThing`，但没有可信 `importSource`。

`vueGlobals` 仅用于没有本地/导入绑定的 Vue 运行时 API；允许的名称来自内置 Vue API 表。例：`vueGlobals: ['ref', 'computed', 'watch', 'onMounted']`。局部同名绑定优先，不能被设置覆盖。编译宏无需加入；仅在没有冲突的本地或外部导入绑定时，按官方宏身份识别。

自动导入的业务 composable 用 customGroups 的名称条件配置；没有静态 import 时，`importSourcePattern` 不匹配，不能虚构模块来源。无需为此引入 Nuxt 专用模式。

## 9. 分区、空行与注释

`partitionByComment` 与 `partitionByNewLine` 决定“哪些语句可以一起比较”；`groups` 决定同一区域里的顺序，二者不是同一个概念。

```js
{
  partitionByComment: {
    line: '^\\s*#region\\b',
    block: false,
  },
  newlinesBetween: 1,
  newlinesInside: 'ignore',
}
```

只在顶层语句之间判断分区注释，不用函数体、对象内部注释切割外层。行尾注释属于前一语句；作为分区标记的独立注释固定在边界，不随着后续首条语句移动。连续前置注释默认附属于下一语句；归属不明确时不提供移动修复。

空行数指空白物理行数：`1` 表示两个语句之间恰有一个空白行。`newlinesInside: 'newlinesBetween'` 仅用于兼容：全局 `newlinesBetween === 'ignore'` 时解析为 `ignore`，否则为 `0`；新配置建议显式填写数字或 `ignore`。

```js
groups: [
  'define-props',
  { newlinesBetween: 0 },
  'define-emits',
  { newlinesBetween: 1 },
  ['ref', 'reactive'],
]
```

中间组为空时，按实际相邻组之间经过的配置边界汇总：存在正整数取最大值；否则存在 `ignore` 则忽略；否则为 `0`。未显式设置的边界使用全局值。该算法与上游 [get-newlines-between-option.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/get-newlines-between-option.ts) 对齐。

`partitionByNewLine: true` 时，全局及所有组级空行选项必须为 `ignore` 或未设置；兼容值先归一化后验证。冲突直接报配置错误，包括继承 settings 后产生的冲突。不要静默忽略数字配置，否则修复新插入的空行会在下一轮变成新的排序边界。

空行修复仅在分区内真实相邻的候选语句之间执行，不能跨 import、控制流、await、未纳入 unknown 等边界。不整理语句内部空行，也不改 script 标签边缘空行。

`eslint-disable`、`eslint-enable`、`eslint-disable-next-line` 等控制注释应保护禁用语句及其区域边界，避免移动后改变诊断覆盖范围。`@ts-expect-error`、`@ts-ignore` 和工具指令注释首版连同受影响语句固定；JSDoc 在归属明确时随声明移动。

## 10. 共享 settings 与预设

建议读取 `settings.perfectionist` 的已支持通用字段，允许现有用户复用排序偏好；同时提供 `settings['vue-perfectionist']` 覆盖 Vue 插件的通用偏好。不需要安装上游插件才能使用这些设置。

规则级公共字段优先级：

```text
规则 options
  > settings['vue-perfectionist']
  > settings.perfectionist 中已支持的公共字段
  > 本规则默认值
```

共享字段为第 4 节 `CommonSortOptions`。`groups / customGroups / vueGlobals / vueImportSources / fix` 仅允许在规则 options 中出现，因为未来其他 Vue 规则不一定具有这些语义。

只对 `settings.perfectionist` 的支持字段做投影和校验；上游其他合法字段如 `tsconfig` 跳过，不因此拒绝整个配置。被选中的字段若包含不支持的值（例如 `usage`）则明确报错。自有 settings 命名空间严格校验未知字段，不静默吞掉拼写错误。被更高层整体覆盖的旧值不参与最终语义校验。

按上游 [complete.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/complete.ts) 风格，配置层之间逐字段浅覆盖：数组整体替换，`fallbackSort` 对象也整体替换。组级覆盖时，`fallbackSort` 按字段继承；未得到 `fallbackSort.order` 时使用当前组的 `order`。不要通过无条件深合并把上一层已不需要的规则带入下一层。

```js
{
  settings: {
    perfectionist: {
      type: 'natural',
      order: 'asc',
      ignoreCase: true,
    },
    'vue-perfectionist': {
      type: 'unsorted',
    },
  },
  rules: {
    'vue-perfectionist/sort-script-setup': ['error', {
      newlinesBetween: 1,
      newlinesInside: 'ignore',
      groups: [
        ['interface', 'type'],
        'define-props',
        'define-emits',
        ['ref', 'reactive'],
        'computed',
        { group: 'function', type: 'natural' },
        'watch',
        'lifecycle-hook',
        'define-expose',
      ],
    }],
  },
}
```

这个示例中，普通 Vue 组保留原顺序，函数组自然排序。若省略 `settings['vue-perfectionist'].type`，上游共享设置的 `natural` 会覆盖本规则默认值；文档必须说明这一点。

未来预设建议：`recommended` 仅启用规则并使用默认值，`recommended-natural` 显式设定 `type: 'natural'`，`recommended-alphabetical` 显式设定 `alphabetical`。后两者显式规则选项会优先于 settings。`recommended-custom` 没有合适的默认 alphabet，首版不提供。

## 11. 依赖约束与修复契约

### 11.1 检查与修复分开

规则先计算分类偏好和立即求值依赖约束下的稳定目标顺序，再判断实现该顺序需要的移动是否安全。

- 硬边界：不跨边界比较、不跨边界修复。
- 已知依赖：前置值必须先初始化，依赖约束优先于组顺序与字符顺序。
- 无法证明安全的执行顺序变化：可以报告当前区域的风格偏差，但不给自动修复，也不提供未经验证的 suggestion。
- 已被依赖约束合理保留的顺序：不再报告要求反转该依赖的风格错误。

依赖调整后的顺序可以使某类别重复出现；空行按实际相邻类别计算。不要为了强行让组连续而引入运行时错误，也不要给永远无法满足的相邻关系反复报错。

```ts
const count = ref(0)
const snapshot = count.value
```

即使用户把 variable 配在 ref 前面，也保留 `count → snapshot`。

```ts
const result = computed(() => input.value)
const input = ref(0)
```

创建闭包不等于立即读取 `input`。这类捕获不能机械地转成 TDZ 依赖；但后续对 computed 的首次读取、传入同步回调的函数引用等仍可能触发求值。首版不因 recognized computed 就跳过安全分析。

```ts
const initial = readLater()
const later = 1

function readLater() {
  return later
}
```

这段源码已有立即调用导致的初始化问题。排序器不能因函数声明提升就判定无依赖，也不承担修复原有运行时错误的责任。无法解析的调用链保留原文且不给自动移动。

### 11.2 safe 的具体范围

`fix: 'safe'` 只自动修复可证明语义不变的目标片段：

- 普通不合并的 type/interface 声明之间的重排。
- 互不依赖、独立标识符绑定、无装饰器/指令、初始化为原始字面量的 const 声明之间的重排。
- 无重载歧义、无同名冲突的普通顶层函数声明之间的重排；不修改函数体。
- 不触碰指令含义和语句解析结果的空行调整。

以上可修复单位只能在连续可证明安全的片段内交换；首版不跨越运行时调用，不把箭头函数变量等未经覆盖的形态顺带列为可修复。类型合并与重载顺序可能影响类型行为，不能一概视作“类型擦除所以安全”。

以下即使没有显式变量依赖，也默认不给移动修复：Vue 运行时 API、业务 composable、watch 与 effect、生命周期注册、provide/inject、成员读取、解构初始化、new、class/enum 初始化、编译宏及其包装调用。精确 Vue 编译语义和更多安全初始化形态可以以后通过语义用例逐步扩充，不改变选项形状。

这意味着首版可以检查 ref/computed/watch 的结构顺序，但 `--fix` 主要整理类型、简单声明和空行。该限制必须出现在规则说明中，不能将首版宣传为能自动整理任意 setup。

`fix: 'none'` 保留相同诊断，禁用本规则全部自动修复，包括空行修复。它不是 `type: 'unsorted'` 的同义词。

### 11.3 await 与副作用

Vue setup 会在实例创建时执行，宏还涉及编译处理和提升；顶层 await 会引入异步执行边界。因此必须把源码位置与运行时语义分开考虑。[Vue 官方 script setup 文档](https://vuejs.org/api/sfc-script-setup.html)

```ts
const count = ref(0)
watchEffect(() => console.log(count.value))
count.value = 1
```

不能把 watchEffect 当作单纯声明。类似 `const stop = watchEffect(...)` 也不能因为外层是 const 就安全移动。

```ts
const data = await loadData()
defineExpose({ data })
```

不把 expose 跨越 await 自动提前，也不为“expose 最后”把其他 expose 推迟到 await 后。已有的 expose-after-await 问题交给专门规则处理。

如果检测到依赖环，保持环内原顺序且不给涉及该环的移动修复；其他独立片段仍可检查。实现上采用依赖图上的稳定拓扑选择，候选优先级为组序、组内比较、原索引；副作用无法证明安全的节点参与诊断但阻止相应移动 fix。

修复应从验证通过的目标顺序中选取独立连续片段，保留原源码与注释；多个片段的 range 不重叠。验证 ASI、分号、换行风格、注释归属和重新解析结果；不能通过重排之后再强行格式化整个 script 来掩盖语义变化。

## 12. 配置校验与诊断

Schema 之外应校验：

- `groups` 重复名称、归一化后重复、未知内置名、未定义的自定义组名。
- `customGroups.groupName` 唯一、非空、不能冒充内置组；每个定义必须被 groups 引用。
- 不允许深层嵌套组数组；空数组拒绝，单元素数组归一化。
- `{ newlinesBetween }` 不能在 groups 首尾或连续出现，不能与 `{ group }` 混用。
- 空行数是有限非负整数；空行分区与数量配置不能并用。
- 所有最终有效的 custom 比较器必须有合法 alphabet，包括 fallback 和组级覆盖。
- 修饰符重复、互斥声明类型、对某 selector 不成立的修饰符组合报错。
- 空正则数组、无条件 anyOf 分支、无效 flags、无效 locale、未知 Vue global 名称报错。
- 所有对象拒绝未知字段；共享上游 settings 仅按白名单投影，按第 10 节处理。

`groups: []` 表示没有参与排序的组，整条规则在内容排序和空行方面均不产生诊断；不暗中恢复默认 groups。`customGroups: []` 表示清空自定义匹配。

建议诊断按用户可操作的结果区分：

| messageId                   | 意义                                   | fix                  |
| --------------------------- | -------------------------------------- | -------------------- |
| `unexpectedGroupOrder`      | 当前语句所属类别应在另一类别之前       | 安全性验证通过时提供 |
| `unexpectedOrder`           | 同组名称/长度顺序不符                  | 安全性验证通过时提供 |
| `unexpectedNewlinesBetween` | 实际组间空行数不符                     | 可独立安全修复       |
| `unexpectedNewlinesInside`  | 实际组内空行数不符                     | 可独立安全修复       |
| `unsafeReorder`             | 有风格偏差，但所需移动可能改变执行顺序 | 不提供               |

同一偏差只报告一次；不能同时报告一个可修复排序错误和一个禁止同一移动的错误。`fix: 'none'` 单纯关闭 fix，不把原本安全的偏差改称 unsafe。配置错误作为配置错误抛出，不伪装成源码问题。

## 13. 与其他规则协作

- imports 交给 `perfectionist/sort-imports`；本规则不提供 import 分组，也不负责把散落 import 移到文件开头。
- 由于本规则也管理顶层 type/interface/function，在启用本规则的 `.vue` 文件配置中关闭 `perfectionist/sort-modules`，避免重叠重排。
- 同一 `<script setup>` 的宏顺序由本规则管理时，关闭 `vue/define-macros-order`。这条现有规则覆盖宏位置，配置不一致会产生冲突。[官方说明](https://eslint.vuejs.org/rules/define-macros-order.html)
- `vue/no-expose-after-await`、`vue/no-watch-after-await`、`vue/no-lifecycle-after-await` 等语义规则应保留；本规则不代替它们。
- 对象键、函数参数、解构成员的排序继续由各自规则负责。本规则不重写这些内部结构。
- 若启用 `padding-line-between-statements`、`max-empty-lines` 或格式化器，应统一空行配置；默认 `ignore` 可减少规则之间的反复修复。

下例假设现有 ESLint 配置已经注册两个插件并正确配置 Vue/TS parser；本对象应放在相关预设之后覆盖冲突规则：

```js
{
  files: ['**/*.vue'],
  rules: {
    'perfectionist/sort-modules': 'off',
    'vue/define-macros-order': 'off',
    'vue-perfectionist/sort-script-setup': ['error', {
      type: 'unsorted',
      newlinesBetween: 'ignore',
      newlinesInside: 'ignore',
      fix: 'safe',
    }],
  },
}
```

## 14. 实现验收矩阵

此处是实现的验收要求；实际测试位于 `tests/sort-script-setup.test.ts`，不以此表替代测试结果。

| 维度     | 必须覆盖的行为                                                      |
| -------- | ------------------------------------------------------------------- |
| 范围     | JS/TS setup、普通 script 跳过、双 script 隔离、缺少 parser services |
| 分组     | 默认序、部分 groups、空 groups、同级数组、unknown 显式与遗漏        |
| 宏       | 独立调用、变量绑定、withDefaults、props 解构、多个 model、同名遮蔽  |
| 调用来源 | import alias、namespace、非 Vue 同名函数、自动导入、动态 callee     |
| 自定义组 | 首次匹配、AND/OR、静态导入来源、未引用组、名称冲突                  |
| 比较器   | 五种 type、fallback、subgroup-order、desc、平局稳定、Unicode        |
| 设置覆盖 | 上游 settings、自有 settings、规则、组、自定义组、数组替换          |
| 空行     | inside/between、空组穿越、分区冲突、注释附近、CRLF                  |
| 依赖     | TDZ、跨组依赖、立即调用、闭包捕获、同步回调、环与重载               |
| 副作用   | watchEffect immediate、watch 默认值未知、composable、inject 工厂    |
| 修复边界 | await、赋值、控制流、多 declarator、禁用注释、指令注释              |
| 安全正例 | 独立 type/interface、字面量 const、普通函数、独立空行修复           |
| 稳定性   | 第一次修复后再次修复无变化；unsafe 原文不变；无重叠 fix             |
| 集成     | 与 sort-imports 共用、其他排序规则关闭、格式化后 lint 不振荡        |

实现顺序建议：先完成配置解析与分类事实；再完成分组、比较器和 report-only 诊断；随后增加依赖约束、注释边界和白名单安全修复；最后添加共享 settings、预设与完整文档示例。每阶段均按上述契约验收，避免先实现广泛移动再补安全边界。
