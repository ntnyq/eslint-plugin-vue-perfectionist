---
description: 组合相关规则、配置组件使用约定，并了解自动修复边界。
---

# 规则组合 {#rule-composition}

各规则独立启用。当它们约束同一规范的不同方面时，可以组合使用；检查内容重叠时，应保持配置一致。[规则概览](/zh/rules/)列出了所有规则及其适用范围。

## 回调函数与组合式函数 {#callbacks-and-composables}

使用 [`callback-style`](/zh/rules/callback-style) 要求内联回调并指定函数及函数体风格，再使用 [`max-lines-per-callback`](/zh/rules/max-lines-per-callback) 限制回调大小。当回调过长时，将内部逻辑提取为函数，再从简短的内联回调中调用。直接传入提取后的函数会违反默认的内联回调规范。

[`prefer-composable-options`](/zh/rules/prefer-composable-options) 检查参数结构，[`prefer-function-declaration`](/zh/rules/prefer-function-declaration) 检查指定 SFC 与组合式函数作用域中的函数声明方式。它们检查函数定义，不检查组合式函数的导入或调用方式。

[`prefer-function-result-pattern`](/zh/rules/prefer-function-result-pattern) 检查接收指定函数返回值的绑定名称。默认覆盖静态可确定为布尔值的 Vue ref、受支持的计算属性 getter 和 VueUse 开关函数。其他库或命名规范可通过 `targets` 配置；传入的目标会替换默认值。

## 宏类型与布局 {#macro-types-and-layout}

根据偏好的声明风格组合宏规则：

| 关注点                       | 规则                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| 内联声明的换行               | [`define-macros-newline`](/zh/rules/define-macros-newline)       |
| 内联、本地声明或导入的宏类型 | [`define-macros-type-style`](/zh/rules/define-macros-type-style) |
| 调用处的精确类型名称         | [`require-macro-type-name`](/zh/rules/require-macro-type-name)   |

`define-macros-type-style` 默认要求 `defineProps`、`defineEmits` 和 `defineSlots` 使用本地类型。`require-macro-type-name` 默认要求分别使用 `Props`、`Emits` 和 `Slots`。如果要求某个宏使用内联类型，请在命名规则中禁用该宏。`define-macros-newline` 仅规范内联声明格式，不会把本地或导入的类型转为内联类型。

## 模板 ref {#template-refs}

[`consistent-template-ref-name`](/zh/rules/consistent-template-ref-name) 要求 `useTemplateRef()` 的变量名与键名一致。[`prefer-ref-pattern`](/zh/rules/prefer-ref-pattern) 则要求指定 ref 使用位置符合命名模式。两者独立：名称一致仍可能违反命名模式，符合命名模式也不保证变量名与键名一致。

若希望 TypeScript setup 中的 ref 使用模板推断类型，可添加 [`prefer-use-template-ref-inference`](/zh/rules/prefer-use-template-ref-inference)。它需要符合条件的静态模板 ref，会报告显式泛型，但不会自动删除。API 识别遵循[自动导入配置](/zh/guide/configuration#auto-imported-vue-apis)。

## 组件使用约定 {#component-usage-contracts}

以下规则需要显式配置组件 `targets`，默认目标列表为空：

| 关注点                   | 规则                                                           | 无法确定输入时的选项                      |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------------- |
| 必需的 prop              | [`require-component-props`](/zh/rules/require-component-props) | `unknownBindings`                         |
| 传入 prop 的类型         | [`component-prop-types`](/zh/rules/component-prop-types)       | `unknownValues`                           |
| 传入 prop 的值约束       | [`component-prop-values`](/zh/rules/component-prop-values)     | `unknownValues`                           |
| 必需的具名插槽或默认插槽 | [`require-component-slots`](/zh/rules/require-component-slots) | `unknownSlots`                            |
| 显式泛型注释             | [`require-vue-generic`](/zh/rules/require-vue-generic)         | `ignoreWhen` 豁免条件中的 `unknownValues` |

类型或值约束不会要求 prop 必须存在。如果既要检查是否存在，又要约束传入值，请与 `require-component-props` 组合使用。例如，在 Vue 配置的 `rules` 对象中添加：

```js
const rules = {
  'vue-perfectionist/require-component-props': [
    'error',
    { targets: [{ components: ['AppCounter'], props: ['count'] }] },
  ],
  'vue-perfectionist/component-prop-types': [
    'error',
    { targets: [{ components: ['AppCounter'], props: { count: 'number' } }] },
  ],
  'vue-perfectionist/component-prop-values': [
    'error',
    {
      targets: [
        { components: ['AppCounter'], props: { count: { minimum: 0 } } },
      ],
    },
  ],
}
```

这些检查基于语法和保守的本地分析，不会加载组件定义或运行 TypeScript 类型检查器。各规则会说明如何处理动态绑定及其他无法验证的输入。违反约定时仅报告问题，不会修改值、添加插槽或生成泛型类型。

## 模板可读性 {#template-readability}

使用 [`no-complex-v-for-source`](/zh/rules/no-complex-v-for-source) 检查迭代数据源，使用 [`prefer-simple-event-handler`](/zh/rules/prefer-simple-event-handler) 检查具名事件处理器，使用 [`prefer-template-literal-in-interpolation`](/zh/rules/prefer-template-literal-in-interpolation) 检查混合文本与插值。各规则有独立的语法及安全边界，启用其中一条不会启用其他规则。

[`padding-line-between-tags`](/zh/rules/padding-line-between-tags) 强制相邻模板标签之间使用精确数量的空行。如果还使用 `vue/padding-line-between-tags`，请对由本规则控制的标签对禁用该规则。空行偏好应与格式化工具保持一致。

## 语句排序 {#statement-ordering}

[`sort-composable-return`](/zh/rules/sort-composable-return) 与
[`sort-composable-destructure`](/zh/rules/sort-composable-destructure)
分别检查组合式函数返回值和调用处的解构。两者默认状态在方法之前，保留组内顺序，
仅自动修复空白；成员重排需手动完成。它们也支持独立 JS/TS 文件。

[`sort-script-setup`](/zh/rules/sort-script-setup) 对 setup 顶层语句分组。默认的 `type: 'unsorted'` 保留普通组内的名称顺序。选择 `natural`、`alphabetical` 或其他支持的比较方式可对名称排序。所有排序偏好均应直接放在规则选项中。

继续使用 `perfectionist/sort-imports` 对导入排序。当本规则负责相同 Vue 文件中的声明和宏顺序时，禁用 `perfectionist/sort-modules` 和 `vue/define-macros-order`。以下覆盖配置假定相应插件和 Vue 解析器已配置，应放在这些预设之后：

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
          type: 'natural',
          fix: 'safe',
          newlinesBetween: 'ignore',
          newlinesInside: 'ignore',
        },
      ],
    },
  },
])
```

继续保留关于侦听器、生命周期注册以及 `await` 后 expose 的 Vue 正确性规则。排序会保留初始化依赖，不会修复已存在的执行错误。空白选项默认均为 `ignore`；显式配置间距时，应与空行规则及格式化工具协调。

## 自动修复 {#automatic-fixes}

目前只有以下规则提供自动修复，且均遵守各自文档中说明的边界：

| 规则                                                                                                                            | 自动修改内容                                                      |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`callback-style`](/zh/rules/callback-style#diagnostics-and-fixes)                                                              | 将箭头表达式函数体转为块级函数体，同时保留返回值。                |
| [`define-macros-newline`](/zh/rules/define-macros-newline#automatic-fixes-and-formatting)                                       | 插入换行而不改变成员顺序，缩进由格式化工具处理。                  |
| [`define-model-name-casing`](/zh/rules/define-model-name-casing#automatic-fixes-and-formatting)                                 | 仅在 `fix: true` 时重命名模型约定（默认 `false`），需检查调用方。 |
| [`padding-line-between-tags`](/zh/rules/padding-line-between-tags#automatic-fixes-and-formatting)                               | 调整已分行的、符合条件的标签之间的空行。                          |
| [`prefer-template-literal-in-interpolation`](/zh/rules/prefer-template-literal-in-interpolation#automatic-fixes-and-formatting) | 合并静态安全的原始值表达式与相邻文本，保留 nullish 值的显示行为。 |
| [`prefer-watch-effect-alias`](/zh/rules/prefer-watch-effect-alias#automatic-fixes-and-formatting)                               | 在目标绑定及静态选项可安全修改时，改用专用的副作用 API。          |
| [`sort-composable-destructure`](/zh/rules/sort-composable-destructure#automatic-fixes-and-formatting)                           | 仅调整组间及组内空白；成员顺序问题需手动修改。                    |
| [`sort-composable-return`](/zh/rules/sort-composable-return#automatic-fixes-and-formatting)                                     | 仅调整组间及组内空白；成员顺序问题需手动修改。                    |
| [`sort-script-setup`](/zh/rules/sort-script-setup#partitions-and-automatic-fixes)                                               | 在安全的连续片段内重排符合条件的声明，并调整支持的间距。          |

可自动修复的规则仍可能报告无法修复的情况。例如，`sort-script-setup` 会报告无法确定安全性的运行时移动，但不调整其顺序；`fix: 'none'` 会禁用包括间距在内的全部修复。模型名称大小写修复会改变公共组件约定，因此需要单独启用。其他命名、类型风格、组件约定、回调行数和函数声明问题均需手动修改。
