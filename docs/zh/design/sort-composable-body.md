---
description: 组合式函数体排序设计，包括 Perfectionist 风格选项、执行边界与保守修复约定。
---

# sort-composable-body 设计

状态：已实现。可用配置与示例见[规则文档](../rules/sort-composable-body.md)。

`vue-perfectionist/sort-composable-body` 对具名组合式函数体的直接语句排序。分组、比较、依赖、注释和安全修复沿用 [sort-script-setup](./sort-script-setup.md)，函数选择与执行边界单独定义。

## 1. 设计决策

- `sort-script-setup` 继续只负责 SFC setup 顶层语句；新规则负责 JavaScript、TypeScript 和两种 SFC script 中的组合式函数体。
- 使用相同的 Perfectionist 风格 `groups`、`customGroups`、比较器、分区与空行选项。默认 `type: 'unsorted'`，忽略空行数量，保留组内源码顺序。
- 使用现有 composable 规则的 `functionPattern` 和 `ignoreNames` 选择函数。命名匹配表示采用该约定，不证明函数使用 Vue 或返回对象。
- 最小移动单位为完整的直接语句。参数、返回值、回调内部和嵌套控制流维持各自职责。
- 依赖优先于分组顺序。分类不证明纯净性，运行时调用不获得移动修复资格。
- 排除编译宏 selector。不提供 `return` selector、不安全修复模式、纯净性声明选项或关闭依赖保护的选项。

兼容基线沿用 `sort-script-setup` 记录的选项子集与固定上游版本。上游[分组选项](https://perfectionist.dev/rules/sort-modules#groups)用于参考配置形状；本地默认值和修复权限由本项目决定。

## 2. 函数选择与范围

| 源码或函数形式                                          | 行为                                               |
| ------------------------------------------------------- | -------------------------------------------------- |
| 普通 JS/TS 模块或任意 SFC script                        | 检查符合条件的函数；只有 SFC 需要 Vue 解析器服务   |
| `function useCounter() {}`                              | 按声明绑定名选择                                   |
| `const useCounter = () => {}`                           | 按变量绑定名选择                                   |
| `const useCounter = function internal() {}`             | 使用 `useCounter`，不使用 `internal`               |
| 导出声明，包括具名默认导出                              | 使用相同绑定名策略，不要求导出                     |
| 函数初始化器外的透明 TypeScript 包装                    | 通过 `getFunctionBindingName()` 解包               |
| 块体 async 函数                                         | 检查由当前执行层 `await` 分隔的独立区间            |
| generator 或 async generator                            | 跳过整个函数                                       |
| 表达式体箭头、匿名默认导出、对象/类方法、回调、包装工厂 | 没有支持的直接函数绑定与块体时跳过                 |
| 嵌套具名 composable                                     | 绑定名匹配时独立检查其直接函数体                   |
| 不匹配的函数                                            | 不排序其函数体；内部独立匹配的 composable 仍可检查 |

复用 `getFunctionBindingName()`，不推测对象属性、赋值目标、返回函数或包装工厂的名字。例如，`const useCounter = factory(() => {})` 不会选择其中的回调。不要求返回对象、导入 Vue、导出函数或启用 TypeScript 类型服务。

默认 `functionPattern: '^use[A-Z]'` 与精确的 `ignoreNames` 排除项对齐现有 composable 规则。`functionPattern` 是区分大小写的正则源码字符串，只编译一次；无效正则属于配置错误。它不改变函数内部语句分类。现有导入调用分类器继续使用 `^use[A-Z0-9]`；跨规则统一这一区别不属于本提案。

每个函数体都是独立排序容器。嵌套函数声明可作为父容器中的 `function` 语句，但它的内部不属于父容器的另一个分区。独立选中的嵌套 composable 可能产生重叠修复；后续 ESLint 修复轮次必须收敛。

## 3. 公共选项

只接受一个选项对象。文件级偏好通过 ESLint `files` 覆盖设置。以下为拟议公共类型草图，共享类型保持 `sort-script-setup` 的确切语义。

```ts
export interface SortComposableBodyOptions extends CommonSortOptions {
  customGroups?: SortComposableBodyCustomGroup[]
  fix?: 'none' | 'safe'
  functionPattern?: string
  groups?: GroupEntry[]
  ignoreNames?: string[]
  vueGlobals?: string[]
  vueImportSources?: string[]
}

export type SortComposableBodySelector =
  | 'call'
  | 'class'
  | 'composable'
  | 'computed'
  | 'constant'
  | 'enum'
  | 'function'
  | 'inject'
  | 'interface'
  | 'lifecycle-hook'
  | 'provide'
  | 'reactive'
  | 'ref'
  | 'template-ref'
  | 'type'
  | 'variable'
  | 'watch'

export interface SortComposableBodyMatchCondition {
  callNamePattern?: RegexOption
  elementNamePattern?: RegexOption
  importSourcePattern?: RegexOption
  modifiers?: Modifier[]
  selector?: SortComposableBodySelector
}

export type SortComposableBodyCustomGroup = GroupOverrides & {
  groupName: string
} & (
    | (SortComposableBodyMatchCondition & { anyOf?: never })
    | { anyOf: SortComposableBodyMatchCondition[] }
  )

export type SortComposableBodyRuleOptions = [SortComposableBodyOptions]
```

| 选项                                                     | 默认值与行为                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `functionPattern`、`ignoreNames`                         | `'^use[A-Z]'`、`[]`；选择所属函数                                                                                |
| `groups`、`customGroups`                                 | 下文默认分组、`[]`；数组替换默认值                                                                               |
| `type`、`order`、`fallbackSort`                          | `'unsorted'`、`'asc'`、`{ type: 'unsorted' }`；只影响组内比较                                                    |
| `alphabet`、`ignoreCase`、`specialCharacters`、`locales` | `''`、`true`、`'keep'`、`'en-US'`                                                                                |
| `partitionByComment`、`partitionByNewLine`               | `false`、`false`；沿用 setup 的注释和空行分区策略                                                                |
| `newlinesBetween`、`newlinesInside`                      | `'ignore'`、`'ignore'`；默认不约束空行                                                                           |
| `vueImportSources`                                       | `['vue']`；精确的运行时导入来源                                                                                  |
| `vueGlobals`                                             | 显式名单替换共享自动导入选择，`[]` 可关闭；未指定时沿用 setup 的 `settings['vue-perfectionist'].autoImport` 策略 |
| `fix`                                                    | `'safe'`；`'none'` 同时关闭移动和空白修复                                                                        |

比较类型仍为 `alphabetical`、`natural`、`line-length`、`custom` 和 `unsorted`；后备排序额外接受 `subgroup-order`。`line-length` 沿用完整语句源码长度约定，排除末尾分号，不按绑定名长度或缩进计算。本规则不继承返回值/解构规则的 `name-length` 比较。

保留现有重复/冲突分组、modifier 组合、locale、正则 flags、自定义字母表、安全整数空行数量及空行/分区冲突校验。拒绝未知字段和宏分组 selector，包括自定义条件中的宏 selector。拒绝 `typeInformation`、`memberKinds`、`unknownMembers`、`usage`、`tsconfig`、回调依赖豁免及 `useConfigurationIf`。不要求 TypeScript 类型检查器。

## 4. 分组与分类

默认分组为 setup 默认值去掉编译宏：

```json
{
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
  ]
}
```

这只是分区内的阅读偏好。例如 composable 立即消费某个 ref 时，即使默认 `composable` 在 `ref` 前，仍必须保留该初始化依赖。

原始值 `constant`、类型、函数、Vue API 家族、运行时导入别名、命名空间调用、遮蔽和 TypeScript 包装均沿用 setup 分类约定。初始化器为 `watch` 的 stop handle 声明仍属于 `watch`。解构是一个语句，不拆成多个绑定排序。箭头/函数表达式变量属于 `function`，但不获得普通函数声明的提升或移动权限。

本容器关闭宏识别。未绑定的 `defineProps(...)` 只可能是普通 `call` 或 `variable`，不作为编译宏；规则不检查这种代码是否合法。`onScopeDispose` 等现有 Vue 表之外的 API 不会自动加入 `lifecycle-hook`，可通过自定义分组处理。

- `groups` 顺序控制组间优先级；`order: 'desc'` 只影响组内比较。
- `['ref', 'reactive']` 合并为相同优先级。要求 ref 在 reactive 前时应分开列出。
- 分组对象可覆盖 `type`、`order`、`fallbackSort`、`newlinesInside`；`{ newlinesBetween }` 控制组间分隔。
- 自定义分组优先于内置匹配，首个匹配定义生效。条件内过滤项为 AND，`anyOf` 为 OR。自定义分组必须被 `groups` 引用。
- 匹配模式支持字符串、`{ pattern, flags? }` 或表示 OR 的数组。名称比较的 `ignoreCase` 不影响正则。沿用首个绑定作为排序键、任一解构绑定可匹配的策略。
- `callNamePattern` 匹配直接调用的归一化导入身份；`importSourcePattern` 要求解析出运行时导入来源。二者都不搜索回调内部任意调用。本地调用不推断导入来源。具名导入别名使用导出名，默认导入使用本地名。
- 单独的自定义分组覆盖项优先于分组对象；合并数组内不启用每成员独立比较器。
- 省略的类别固定并切断分区。`unknown` 可显式纳入未分组的受支持候选，默认保持内部顺序，除非其分组对象设置 `type`。它不能使不支持的语句参与排序。
- `groups: []` 关闭本规则的排序与空行报告。

配置示例：

```js
export default {
  rules: {
    'vue-perfectionist/sort-composable-body': [
      'error',
      {
        functionPattern: '^use[A-Z]',
        ignoreNames: ['useLegacyCounter'],
        type: 'unsorted',
        groups: [
          ['interface', 'type'],
          'constant',
          'inject',
          'router',
          'stores',
          'composable',
          'template-ref',
          ['ref', 'reactive'],
          'computed',
          'variable',
          ['enum', 'class'],
          { group: 'function', type: 'natural' },
          'watch',
          'lifecycle-hook',
          'provide',
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
        ],
        newlinesBetween: 1,
        fix: 'safe',
      },
    ],
  },
}
```

## 5. 执行边界与依赖

仅收集 `fn.body.body`。每个分区始终处于所属函数和原始执行区间内。

固定边界包括 return、throw、控制流、显式块、赋值和更新、指令序言、多声明语句、`using` 声明、ambient/合并声明及不支持的语法。重载签名和实现保持原位。当前执行层的 `await`（包括初始化器和 `for await`）固定所在语句并分隔前后区间。嵌套函数内部的 `await` 不切断父函数体。

直接 `return` 是边界，不是需要推到末尾的排序项。提前返回 `if (...) return ...` 使整个 `if` 成为边界。return 后的语句可形成独立的不可达分区，但绝不能移到 return 前。本规则不检查或重写返回参数的成员。

按词法变量身份解析依赖，不按拼写。普通/解构参数、函数自身绑定及外层绑定都是外部输入，不是可排序语句；它们的默认表达式和初始化顺序保持原样。直接重声明参数的 `var` 声明作为固定边界，因为其初始化器覆盖已有输入。参数正常遮蔽导入，因此 `function useThing(ref) { const value = ref(0) }` 不把该调用分类为 Vue `ref`。

分区内继续区分立即读取和延迟捕获。通过解析后的 Vue 身份跟踪直接调用的本地函数、IIFE、watch source getter、immediate watch 回调、同步 watch effect 和 `customRef` 工厂。延迟回调沿用 setup 策略；无法解析的回调选项保守保留可能的立即依赖。

先计算稳定且满足依赖的顺序，再对可选语句应用风格偏好。循环剩余项保持源码顺序。被初始化依赖阻止的分组偏好本身不构成排序违规。不修复已有 TDZ 或跨分区初始化错误，不推断全程序副作用，也不为满足依赖跨越边界。

## 6. 修复与诊断

移动修复要求连续替换片段仅包含已证明安全、相互独立的类型/interface 声明、原始值常量声明和普通函数声明。沿用 setup 对注释、指令、声明合并、自动分号插入和源码分隔符的保护。不扩大函数值变量、解构、运行时调用、属性读取、class 或 enum 的修复权限。

例如配置 `groups: ['constant', 'function']` 时，把 `const step = 1` 移到独立的 `function reset() {}` 前可以修复。相反，要求导入的 Vue `ref(0)` 出现在之前的生命周期注册前时可以报告排序问题，但不提供移动修复或 suggestion。

空白修复只修改相邻已分类语句之间的安全间隙。保留函数体缩进、换行符、附属注释和语句内部原文。函数体开括号同行的注释保持原位。不改变函数花括号、指令序言、参数或 `return` 等边界前后留白。保留单次空白替换 65,536 字符上限。同一轮中，已被排序报告覆盖的语句对不再报告空行问题。

复用 setup 的诊断 ID 和选择约定：

| Message ID                  | 条件                                       |
| --------------------------- | ------------------------------------------ |
| `unexpectedGroupOrder`      | 满足依赖且已证明安全的组间移动             |
| `unexpectedOrder`           | 满足依赖且已证明安全的组内移动             |
| `unsafeReorder`             | 期望移动无法证明安全，无 fix 或 suggestion |
| `unexpectedNewlinesBetween` | 组间空行不符合配置                         |
| `unexpectedNewlinesInside`  | 组内空行不符合配置                         |

`fix: 'none'` 保留诊断并关闭全部自动编辑，不会把原本安全的移动改报为 `unsafeReorder`。

## 7. 实现归属

实现将容器策略与共享语句引擎分离。

- 新增 `src/rules/sort-composable-body.ts`，负责元信息、函数 visitor、选择和容器收集。设置 `meta.docs.recommended: false`、`meta.fixable: 'code'`；仍由用户组合规则，不提供内置配置。
- 新增 `src/types/rules/sort-composable-body.ts`，定义公共选项及诊断类型，通过既有包入口显式导出。
- 将 `src/utils/sort-script-setup/` 中实际共享的语句引擎提取到 `src/utils/sort-statements/`：分组匹配、比较、依赖索引、分区、注释、报告及共享 schema 片段。接收解析器支持的直接语句，不要求 `ProgramStatement` 或 SFC range。
- setup 默认值、宏分类、SFC range 收集及 schema 组合留在 `sort-script-setup`。函数选择、无宏 selector/默认值及 schema 组合归 `src/utils/sort-composable-body/`。
- 共享模块接收已解析选项和分类策略，不导入任一规则的专属 context，也不在内部获取 setup range。每文件只建立一次词法引用和注释索引，供多个函数体容器复用，但各分区声明映射独立。
- 提取时保持现有 setup 公共类型和行为，不扩展其 selector 或函数范围。`src/utils/sort-composable/` 继续独立负责公共对象成员分析，其证据和修复权限不同。

按可审查步骤实施：先无行为变化地提取，再加入函数体选择和分类，接入报告/修复，最后补齐包注册、文档和规则组合覆盖。

## 8. 验收与交付

以下是实现时必须具备的测试，不表示当前已覆盖。使用共享规则 runner，明确诊断和输出；不安全移动使用 `output: null`，并断言没有 suggestion。

| 领域 | 必测用例                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 选择 | JS/TS、两种 SFC script、具名导出/默认导出、声明/箭头/表达式、TS 包装、async、自定义 pattern、精确忽略、负向形式、generator |
| 范围 | 普通嵌套 helper、独立匹配的嵌套 composable、回调、控制流、提前/多处 return、throw、不可达区间                              |
| 身份 | 具名别名、命名空间、包装、仅类型导入、本地/参数遮蔽、双 script SFC、共享自动导入和显式覆盖                                 |
| 分类 | 全部受支持 selector/modifier、无宏 selector、本地/导入调用、stop handle、原始值与运行时初始化、解构、多声明                |
| 选项 | 合并分组、覆盖、`anyOf`、正则数组/flags、稳定同序、后备比较、unknown/省略/空分组、无效字段及语义冲突                       |
| 依赖 | 参数/默认值、自身/外层绑定、同名遮蔽、立即读取、延迟闭包、本地调用/IIFE、同步 Vue 回调、未知选项、环                       |
| 安全 | return/throw/await 分区、嵌套 await、指令/重载/合并、注释、ASI、LF/CRLF、缩进、运行时调用仅报告、`fix: 'none'`             |
| 收敛 | 递归修复稳定性、嵌套重叠修复、formatter 稳定性、不编辑返回成员或调用端解构                                                 |
| 组合 | 与 `sort-script-setup`、`sort-composable-return`、`sort-composable-destructure` 同时启用，保持各自范围与修复约定           |
| 性能 | 每文件只索引一次作用域/注释；对大量 composable 和嵌套函数统计操作次数，不依赖耗时                                          |
| 包   | 规则注册、公共运行时导出、NodeNext 与 Bundler 下的选项声明                                                                 |

实现时遵循仓库新增规则工作流：注册规则和公共类型、添加双语规则页与经测试的示例、更新共享目录并运行 `pnpm docs:sync`。验证格式、lint、类型检查、源码测试、包构建/测试和文档检查/构建。

规则已注册到共享目录，并提供双语规则页和生成的规则列表。
