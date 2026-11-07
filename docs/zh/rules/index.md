---
description: 按用途、文件范围及自动修复支持情况浏览所有 Vue Perfectionist 规则。
---

# 规则 {#rules}

请在 ESLint 配置中显式启用所需规则。本插件不提供内置配置，注册及解析器设置见[快速开始](/zh/guide/#basic-usage)。

## 按用途选择 {#choose-by-goal}

- [回调函数与组合式函数](#callbacks-and-composables)
- [宏声明与组件模型](#macros-and-component-models)
- [ref 与返回值命名](#refs-and-result-names)
- [组件使用约定](#component-usage-contracts)
- [模板规范](#template-conventions)
- [语句排序](#statement-ordering)

互补检查、配置示例及与其他插件的交互见[规则组合](/zh/guide/rule-composition)。

## 文件范围与默认行为 {#scope-and-defaults}

- **模板**指使用 `vue-eslint-parser` 解析的 Vue SFC 模板。
- **setup** 指 SFC 的 `<script setup>` 块；**TS setup** 还要求 TypeScript 语法及相应脚本解析器。
- **脚本**包括 Vue 脚本块及独立 JS/TS 文件。各规则仍会限制具体检查的定义或 API 调用。

组件 prop、插槽及泛型注释规则需要显式配置 `targets`，默认空列表不做任何检查。`no-restricted-html-elements` 也需要显式的 `elements`。其他基于目标的规则可能有内置目标，替换前请查阅选项说明。

需要识别自动导入的 Vue API 时，请参阅[自动导入配置](/zh/guide/configuration#auto-imported-vue-apis)。各规则的选项与默认行为见对应规则页。

## 规则列表 {#all-rules}

自动修复仅适用于文档说明的情况。可修复规则也可能报告需要手动修改的问题，边界见[自动修复](/zh/guide/rule-composition#automatic-fixes)。

<!-- rules:start -->

### 回调函数与组合式函数 {#callbacks-and-composables}

| 规则                                                            | 描述                                                  | 范围 | 自动修复     |
| --------------------------------------------------------------- | ----------------------------------------------------- | ---- | ------------ |
| [callback-style](./callback-style.md)                           | 强制 Vue API 的回调函数使用指定风格。                 | 脚本 | 支持部分情况 |
| [max-lines-per-callback](./max-lines-per-callback.md)           | 限制 Vue API 内联回调函数的行数。                     | 脚本 | —            |
| [prefer-composable-options](./prefer-composable-options.md)     | 优先使用末尾的选项对象传递组合式函数参数。            | 脚本 | —            |
| [prefer-function-declaration](./prefer-function-declaration.md) | 要求在单文件组件和组合式函数中使用函数声明。          | 脚本 | —            |
| [prefer-on-scope-dispose](./prefer-on-scope-dispose.md)         | 优先在具名 Vue 组合式函数中使用基于作用域的清理方式。 | 脚本 | —            |
| [prefer-watch-effect-alias](./prefer-watch-effect-alias.md)     | 优先为 post 和 sync 侦听副作用使用专用别名。          | 脚本 | 支持部分情况 |
| [require-injection-key](./require-injection-key.md)             | 禁止在 Vue 的 provide 和 inject 调用中使用字符串键。  | 脚本 | —            |

### 宏声明与组件模型 {#macros-and-component-models}

| 规则                                                      | 描述                                                  | 范围     | 自动修复     |
| --------------------------------------------------------- | ----------------------------------------------------- | -------- | ------------ |
| [define-macros-newline](./define-macros-newline.md)       | 要求内联 Vue 宏声明使用多行格式。                     | Setup    | 支持部分情况 |
| [define-macros-type-style](./define-macros-type-style.md) | 强制 Vue 宏类型使用指定的声明风格。                   | TS setup | —            |
| [define-model-name-casing](./define-model-name-casing.md) | 强制显式声明的 defineModel 名称使用指定的大小写风格。 | Setup    | 需显式启用   |
| [prefer-define-model](./prefer-define-model.md)           | 优先使用 defineModel 替代配套的 prop 和更新事件声明。 | Setup    | —            |
| [require-macro-type-name](./require-macro-type-name.md)   | 要求 Vue 宏调用处的类型使用指定名称。                 | TS setup | —            |

### ref 与返回值命名 {#refs-and-result-names}

| 规则                                                                        | 描述                                   | 范围            | 自动修复 |
| --------------------------------------------------------------------------- | -------------------------------------- | --------------- | -------- |
| [consistent-template-ref-name](./consistent-template-ref-name.md)           | 要求模板 ref 的变量名与键名一致。      | 脚本            | —        |
| [prefer-function-result-pattern](./prefer-function-result-pattern.md)       | 强制函数返回值绑定使用指定的命名模式。 | 脚本            | —        |
| [prefer-ref-pattern](./prefer-ref-pattern.md)                               | 强制模板 ref 使用指定的命名模式。      | 模板 + 脚本     | —        |
| [prefer-use-template-ref-inference](./prefer-use-template-ref-inference.md) | 优先为静态 Vue 模板 ref 使用推断类型。 | TS setup + 模板 | —        |

### 组件使用约定 {#component-usage-contracts}

| 规则                                                    | 描述                               | 范围 | 自动修复 |
| ------------------------------------------------------- | ---------------------------------- | ---- | -------- |
| [component-prop-types](./component-prop-types.md)       | 强制组件 prop 的值符合配置的类型。 | 模板 | —        |
| [component-prop-values](./component-prop-values.md)     | 强制组件 prop 的值符合配置的约束。 | 模板 | —        |
| [require-component-props](./require-component-props.md) | 要求使用组件时提供配置的 prop。    | 模板 | —        |
| [require-component-slots](./require-component-slots.md) | 要求使用组件时提供配置的插槽。     | 模板 | —        |
| [require-vue-generic](./require-vue-generic.md)         | 要求为配置的组件添加显式泛型注释。 | 模板 | —        |

### 模板规范 {#template-conventions}

| 规则                                                                                      | 描述                                                    | 范围 | 自动修复     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---- | ------------ |
| [no-complex-template-expression](./no-complex-template-expression.md)                     | 限制 Vue 模板中逻辑运算符的数量和条件表达式的嵌套层数。 | 模板 | —            |
| [no-complex-v-for-source](./no-complex-v-for-source.md)                                   | 禁止在 Vue v-for 数据源中使用复杂表达式。               | 模板 | —            |
| [no-restricted-html-elements](./no-restricted-html-elements.md)                           | 禁止在 Vue 模板中使用指定的原生 HTML 元素。             | 模板 | —            |
| [no-template-type-assertion](./no-template-type-assertion.md)                             | 禁止在 Vue 模板中使用 as 类型断言。                     | 模板 | —            |
| [padding-line-between-tags](./padding-line-between-tags.md)                               | 强制相邻模板标签之间使用指定数量的空行。                | 模板 | 支持部分情况 |
| [prefer-simple-event-handler](./prefer-simple-event-handler.md)                           | 要求具名模板事件处理器使用简单表达式。                  | 模板 | —            |
| [prefer-template-literal-in-interpolation](./prefer-template-literal-in-interpolation.md) | 优先使用单个模板字面量表示混合的文本与插值。            | 模板 | 支持部分情况 |

### 语句排序 {#statement-ordering}

| 规则                                                            | 描述                                           | 范围  | 自动修复     |
| --------------------------------------------------------------- | ---------------------------------------------- | ----- | ------------ |
| [sort-composable-destructure](./sort-composable-destructure.md) | 按状态和方法对组合式函数的解构成员分组。       | 脚本  | 仅空白       |
| [sort-composable-return](./sort-composable-return.md)           | 按状态和方法对组合式函数的返回成员分组。       | 脚本  | 仅空白       |
| [sort-script-setup](./sort-script-setup.md)                     | 对 `<script setup>` 的顶层语句进行分组和排序。 | Setup | 支持部分情况 |

<!-- rules:end -->
