# 宏类型规则设计 {#macro-type-rules-design}

状态：已实现。本文记录设计和行为约定。用法、配置及实时诊断示例见 [define-macros-type-style](../rules/define-macros-type-style.md) 和 [require-macro-type-name](../rules/require-macro-type-name.md)。

## 动机与规则拆分 {#motivation-and-rule-split}

组件约定需要两项独立控制：宏类型参数声明的位置，以及调用处使用的类型名称。

| 规则                                         | 职责                           | 启用后的默认行为                   |
| -------------------------------------------- | ------------------------------ | ---------------------------------- |
| `vue-perfectionist/define-macros-type-style` | 要求内联、本地或导入类型       | props、emits 和 slots 使用本地声明 |
| `vue-perfectionist/require-macro-type-name`  | 要求使用精确名称的直接类型引用 | 分别为 `Props`、`Emits` 和 `Slots` |

两规则可独立启用。风格规则不指定名称，命名规则不指定来源。二者均为 `meta.type: 'suggestion'`、`recommended: false`，插件仍不提供内置配置。

上游已有规则处理相邻关注点：

- [`vue/define-props-declaration`](https://eslint.vuejs.org/rules/define-props-declaration) 选择类型或运行时 props 声明。
- [`vue/define-emits-declaration`](https://eslint.vuejs.org/rules/define-emits-declaration.html) 选择 emits 声明语法。
- [`vue/require-macro-variable-name`](https://eslint.vuejs.org/rules/require-macro-variable-name.html) 约束接收宏返回值的变量名。

仅检查显式类型参数，不要求宏存在，不转换运行时声明，也不要求补充缺失泛型。若必须使用类型式 props 和 emits，请使用上游声明规则。

## 共享范围 {#shared-scope}

首版支持由 `vue-eslint-parser` 和支持 TypeScript 的内层解析器解析的 SFC `<script setup>` 中的 `defineProps`、`defineEmits`、`defineSlots`。无需 TypeScript 项目或类型检查器。

检查以下位置的调用：

- 顶层变量声明的初始化器，包括解构。
- 顶层表达式语句。
- 上述任一位置中，未遮蔽 `withDefaults` 的首参数 `defineProps`，内层类型仅报告一次。

接受调用外的括号及透明 TypeScript 包装。不遍历任意外层调用、条件表达式、函数体、嵌套块或模板表达式寻找候选。

要求以标准宏名直接、非可选地调用标识符，且无局部定义。复用 `getCallIdentity()` 边界，接受解析器提供且无定义的宏全局。跳过导入宏、别名、命名空间/成员调用、计算调用和遮蔽绑定。名为 `defineProps` 的本地函数不视为编译器宏。

内层宏恰有一个显式类型参数，无运行时参数。跳过无效组合，交由 Vue/TypeScript 验证。按 `getSetupRange()` 检查完整调用范围。跳过普通脚本、独立 JS/TS、仅运行时调用及缺少 SFC 服务的情况。双脚本仅检查 setup，但两个块中的可访问类型声明和导入均可确定来源。

暂不支持 `defineModel`：值类型、修饰符类型及多个具名模型需独立选项约定。`defineExpose`、`defineOptions`、运行时组合式函数及自定义宏也不在首版范围内。

Vue 的 [script setup 参考](https://vuejs.org/api/sfc-script-setup.html#type-only-props-emit-declarations)说明了导入宏类型及复杂类型转换限制。通过这两条规则不证明类型可被 Vue 编译，仅说明符合源码规范。

## `define-macros-type-style`

### 选项 {#options}

接受一个选项对象，完整展开默认值如下：

```json
{
  "vue-perfectionist/define-macros-type-style": [
    "error",
    {
      "macros": {
        "defineProps": "local",
        "defineEmits": "local",
        "defineSlots": "local"
      }
    }
  ]
}
```

每个宏接受 `'inline'`、`'local'`、`'imported'`、这些值构成的非空不重复数组，或 `false`。数组允许任一列出风格，并替换该宏默认值；`false` 禁用该宏检查。

省略的键保留默认值，因此 `{}` 和 `{ macros: {} }` 均检查三个宏。这是规则显式逐键合并，不依赖 ESLint 默认选项合并。仅检查 props 时，将 `defineEmits` 和 `defineSlots` 设为 `false`。

拒绝两层对象的未知字段、未知宏名、`true`、`null`、空数组、重复风格和含 `false` 的数组。无全局后备选项、递归来源模式或修复选项。

### 分类 {#classification}

移除语法括号后，分类最外层类型参数。嵌套属性类型和泛型引用参数不影响分类。

| 类型参数                                                             | 分类             |
| -------------------------------------------------------------------- | ---------------- |
| `{ title: string }`，包括调用签名成员                                | `inline`         |
| `(event: 'save') => void`                                            | `inline`         |
| `Props` 或 `Props<T>` 绑定到顶层本地 `interface` 或 `type`           | `local`          |
| `Props` 或 `Props<T>` 绑定到具名或默认 ES 导入                       | `imported`       |
| `Contracts.Props`，其中 `Contracts` 为 ES 命名空间导入               | `imported`       |
| `import('./types').Props`，包括泛型参数                              | `imported`       |
| 未解析/ambient 引用、内置类型引用、SFC 泛型参数或歧义绑定            | 来源未知：报告   |
| 联合、交叉、映射/条件/索引访问、`typeof`、关键字或其他不支持外层类型 | 形式不支持：报告 |

`inline` 指直接类型字面量或函数类型，不是尖括号内的任意表达式，避免将 `Props & Extra` 等同于内联约定或任意指定来源。内联字面量仍可含导入属性类型。

`import type { Props }`、`import { type Props }` 和普通 `import { Props }` 都算导入，类型专用导入语法由其他规则负责。限定名仅支持命名空间导入根，不支持本地命名空间及限定的具名/默认导入。裸命名空间导入作为约定类型时来源未知。`TSImportType` 必须带限定名且不能是 `typeof` 查询。

通过调用词法作用域的类型命名空间解析引用，不扫描文件找同名标识符，也不依赖首个定义。本地指此 SFC 脚本顶层可访问的非 ambient `interface` 或 `type`，可在调用后或普通脚本中声明。多个兼容本地接口仍为本地。混合、不支持或歧义类型定义报告来源未知；同名值绑定不能替换类型绑定。

分类止于直接引用绑定。例如 `type Props = ImportedProps`、`interface Props extends ImportedProps {}`、`type Props = Partial<ImportedProps>` 都为本地。相反，直接 `defineProps<Partial<ImportedProps>>()` 的外层通常为未解析/内置引用，除非 `Partial` 本身有支持的本地或导入绑定。不加载文件或追踪别名链。这约束声明风格，不限制类型依赖。

### 示例 {#examples}

默认接受独立本地声明，无论名称：

::: correct

```vue
<script setup lang="ts">
interface ButtonProps {
  title: string
}

const props = defineProps<ButtonProps>()
</script>
```

:::

默认报告内联约定：

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>
```

:::

若允许 SFC 或其他模块中的独立声明：

```json
{
  "vue-perfectionist/define-macros-type-style": [
    "error",
    {
      "macros": {
        "defineProps": ["local", "imported"],
        "defineEmits": ["local", "imported"],
        "defineSlots": ["local", "imported"]
      }
    }
  ]
}
```

该配置下接受以下代码：

::: correct

```vue
<script setup lang="ts">
import type { ButtonProps as Props } from './types'

const props = defineProps<Props>()
</script>
```

:::

## `require-macro-type-name`

### 选项 {#options-1}

接受一个选项对象，逐键合并和 `false` 语义相同：

```json
{
  "vue-perfectionist/require-macro-type-name": [
    "error",
    {
      "macros": {
        "defineProps": "Props",
        "defineEmits": "Emits",
        "defineSlots": "Slots"
      }
    }
  ]
}
```

每值为精确、区分大小写的类型标识符或 `false`。拒绝未知字段/宏、`true`、`null`、数组、空字符串、空白、点分路径和无法声明为 TypeScript 类型别名的名称。schema 字符串约束与规则创建时标识符验证共同生效，不能静默接受不可能名称。允许有效 Unicode 标识符。首版无正则、文件名替换或导出名检查。

### 匹配约定 {#matching-contract}

要求 `TSTypeReference` 的 `typeName` 是匹配配置名称的标识符。比较解码名称而非转义源码。允许泛型参数，`Props<T>` 满足 `Props` 命名规范，不检查泛型内容。

| `defineProps` 输入                                            | 期望 `Props` 时                |
| ------------------------------------------------------------- | ------------------------------ |
| 本地 `interface Props` 或 `type Props`，以 `Props` 引用       | 接受                           |
| `import type { ButtonProps as Props }`，以 `Props` 引用       | 接受                           |
| `import type { Props as ButtonProps }`，以 `ButtonProps` 引用 | 报告名称错误                   |
| `Props<T>`                                                    | 接受                           |
| `Contracts.Props` 或 `import('./types').Props`                | 报告：需要直接具名引用         |
| `{ title: string }`、`Props & Extra` 或 `Partial<Props>`      | 报告                           |
| 名为 `Props` 的未解析标识符                                   | 名称通过；风格规则报告来源未知 |

即使单独启用也要求具名约定，会报告内联类型，不静默忽略。从不检查接收宏返回值的变量名，也不重命名导入的导出。

使用默认命名规范时：

::: correct

```vue
<script setup lang="ts">
interface Props {
  title: string
}

type Emits = {
  save: [value: string]
}

type Slots = {
  default(props: { title: string }): unknown
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const slots = defineSlots<Slots>()
</script>

<template>
  <button
    @click="emit('save', props.title)"
    type="button"
  >
    Save
  </button>
</template>
```

:::

以下调用处类型名错误：

::: incorrect

```vue
<script setup lang="ts">
interface ButtonProps {
  title: string
}

const props = defineProps<ButtonProps>()
</script>
```

:::

## 组合与诊断 {#composition-and-diagnostics}

两规则均使用默认值时，要求本地具名约定：

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    rules: {
      'vue-perfectionist/define-macros-type-style': 'error',
      'vue-perfectionist/require-macro-type-name': 'error',
    },
  },
])
```

以下片段假定已注册插件并配置 Vue/TypeScript 解析器。两规则均已实现并由插件导出。

若要求某宏内联，请禁用其命名规范，如风格规则 `defineProps: 'inline'`、命名规则 `defineProps: false`。同时启用两项要求无法满足。两规则不读取对方配置或抑制诊断，同一类型参数可以分别收到一条报告。

每规则对每个符合条件宏调用最多报告一次：

| 规则 / 消息 ID               | 位置           | 消息模板                                                                                                             |
| ---------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| 风格 / `unexpectedTypeStyle` | 完整类型参数   | Expected {{macro}} type argument to use {{expected}} style; found {{actual}}.                                        |
| 风格 / `unsupportedTypeForm` | 完整类型参数   | Expected {{macro}} type argument to use {{expected}} style; this type expression is not supported.                   |
| 风格 / `unknownTypeSource`   | 完整类型参数   | Cannot determine the declaration source of the {{macro}} type argument. Use an explicit local declaration or import. |
| 名称 / `expectedNamedType`   | 完整类型参数   | Expected {{macro}} type argument to be a direct reference named "{{expected}}".                                      |
| 名称 / `unexpectedTypeName`  | 仅类型名标识符 | Expected {{macro}} type name "{{expected}}"; found "{{actual}}".                                                     |

风格诊断按固定 `inline`、`local`、`imported` 顺序列出允许风格，不受数组顺序影响。先解析外层形式：不支持语法用 `unsupportedTypeForm`，支持引用未解析用 `unknownTypeSource`，仅在已知分类被选项排除时用 `unexpectedTypeStyle`。即使允许三种风格，未知也不能静默通过。

两规则均不提供自动修复或建议。提取和移动需决定作用域、注释及文件边界；重命名可影响引用并冲突。手动示例不承诺自动转换。不设置 `meta.fixable` 或 `meta.hasSuggestions`。

## 实现清单 {#implementation-checklist}

1. 在 `src/utils/vue/macro-types.ts` 添加聚焦的共享工具，处理宏调用资格及类型参数结构，复用 `getSetupRange()` 和 `getCallIdentity()`，不改变其他规则行为。
2. 仅为风格规则解析类型绑定，使用解析器作用域引用及定义。针对当前解析器验证双脚本及 SFC 泛型，明确保留未知结果。
3. 分别实现规则和选项/消息类型文件。公共选项使用 `DefineMacrosTypeStyleOptions`、`RequireMacroTypeNameOptions`，各自维护消息 ID 联合。显式规范化默认值，在访问节点前验证选项。
4. 注册前添加共享运行器行为测试及无效选项测试，每个无效用例均断言无修复。
5. 按字母顺序注册两规则，更新公共类型导出及插件约定测试，再更新 README、规则概览、指南和侧栏。
6. 添加独立中英文规则页，使用 `correct` / `incorrect` 容器；在文档诊断转换器中注册规则。非默认示例必须在精确对应的设置下验证。

本设计页位于设计侧栏。容器展示接受及拒绝行为，不执行实时诊断；独立规则页提供实时诊断示例。

## 验收测试矩阵 {#acceptance-test-matrix}

| 领域         | 必需用例                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| 基本行为     | 每个宏、每种风格、默认本地约定、正确/错误名称、内联命名报告                                                   |
| 选项         | 部分覆盖、空对象保留默认值、全部风格组合、逐宏 `false`、全部禁用、自定义名称、无效 schema 和标识符            |
| 识别         | 未绑定/解析器全局、局部遮蔽、无关导入、Vue 宏导入/别名、成员/计算/可选调用                                    |
| 范围         | TS setup、双脚本两种顺序、仅普通脚本、JS SFC、纯 JS/TS、缺少解析器服务、嵌套函数/块、任意外层表达式           |
| 调用         | 解构、表达式语句、包装、`withDefaults` 及其遮蔽、缺少/多余类型参数、运行时参数                                |
| 绑定         | `interface`/`type`、先使用后声明、具名/默认/命名空间导入、两种仅类型语法、普通导入、别名方向、双脚本导入/类型 |
| 类型命名空间 | 同名值/类型、接口合并、歧义定义、ambient/全局类型、未解析名、SFC 泛型                                         |
| 外层形式     | 字面量、函数类型、`Props<T>`、联合/交叉、工具类型、索引/映射/条件、限定引用、导入类型、`typeof`、括号         |
| 非递归行为   | 导入类型的本地别名/继承、嵌套导入属性类型、来源不同的泛型参数                                                 |
| 组合         | 仅风格、仅名称、两者默认、本地/导入加名称、内联/命名冲突的独立报告                                            |
| 诊断约定     | 数量、消息 ID/数据、位置、LF/CRLF、输出不变、`fixed: false`、无修复或建议                                     |
| 集成         | 精确规则列表、用户组合的扁平化配置、无内置配置、公共选项和私有消息 ID                                         |

使用 `tests/helpers/rule-tester.ts` 的 `run({ valid, invalid })`，无效用例需 `output: null` 并断言没有修复/建议。无效选项使用 `createRuleTester<unknown>`，`Linter` 仅用于插件集成。解析器/编译器边界相关场景，验证编译器支持的正确 fixture 能被已安装 Vue 编译器编译。

交付前运行格式、lint、类型检查、构建、完整测试和文档构建。按示例声明的选项验证渲染结果，仅构建成功不足以证明正确。
