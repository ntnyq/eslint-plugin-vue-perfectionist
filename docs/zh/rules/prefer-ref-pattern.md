---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-ref-pattern
description: 强制 Vue 模板引用使用指定的命名模式。
---

# vue-perfectionist/prefer-ref-pattern

> 强制 Vue 模板引用使用指定的命名模式。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                         |
| -------- | ---------------------------- |
| 适用范围 | 模板 + 脚本                  |
| 默认行为 | 模板 ref 名称以 Ref 结尾。   |
| 必需选项 | 无；启用后即使用默认选项。   |
| 自动修复 | —                            |
| 类型信息 | 不需要 TypeScript 类型服务。 |

:::

<!-- summary:end -->

在引用使用位置检查名称：模板 `ref` 属性、`useTemplateRef()` 键，以及传给 Vue `h()` 的 `ref` 属性。不检查普通响应式状态声明。

仅报告，不提供自动修复或建议。正则无法决定唯一替代名称，重命名 ref 可能影响脚本绑定、模板及 `$refs` 访问。

请在 ESLint 配置中显式启用此命名偏好。

## 用法 {#usage}

在现有 Vue 解析器和插件配置中添加规则：

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    rules: {
      'vue-perfectionist/prefer-ref-pattern': [
        'error',
        {
          pattern: '.+Ref$',
          targets: ['template', 'useTemplateRef', 'render'],
        },
      ],
    },
  },
])
```

完整扁平化配置见[指南](../guide/index.md#basic-usage)。模板需要 `vue-eslint-parser`。为相应文件启用规则后，脚本检查也支持使用常规解析器的 JS/TS 文件；TypeScript 需要相应解析器。

## :book: 规则详情 {#rule-details}

以下示例使用默认模式 `.+Ref$`：

::: correct

```vue
<script setup>
import { ref, useTemplateRef } from 'vue'

const element = useTemplateRef('tableRef')
const inputRef = ref(null)
const count = ref(0)
</script>

<template>
  <table ref="tableRef" />
  <input :ref="inputRef" />
  <section ref="panelRef" />
</template>
```

:::

允许 `element`，因为 `useTemplateRef` 目标检查键，不要求变量与键同名。`count` 是普通状态，不检查名称。若需同名，请另启用 [`consistent-template-ref-name`](./consistent-template-ref-name.md)。如果显式用于 `:ref="element"` 或 `h('div', { ref: element })`，则在使用处检查 `element` 名称。

::: incorrect

```vue
<script setup>
import { ref, useTemplateRef } from 'vue'

const element = useTemplateRef('table')
const panel = ref(null)
</script>

<template>
  <table ref="table" />
  <section :ref="panel" />
</template>
```

:::

每个不匹配用法独立报告。`useTemplateRef('table')` 和 `ref="table"` 都产生诊断。

渲染函数遵循相同规范：

::: correct

```js
import { h, shallowRef } from 'vue'

const tableRef = shallowRef(null)

h('table', { ref: tableRef })
h('table', { ref: 'tableRef' })
```

:::

::: incorrect

```js
import { h, shallowRef } from 'vue'

const panel = shallowRef(null)

h('section', { ref: panel })
h('section', { ref: 'panel' })
```

:::

## :wrench: 选项 {#options}

| 选项      | 默认值                                     | 描述                                      |
| --------- | ------------------------------------------ | ----------------------------------------- |
| `pattern` | `'.+Ref$'`                                 | 匹配每个 ref 名称的 JavaScript 正则源码。 |
| `targets` | `['template', 'useTemplateRef', 'render']` | 要检查的使用位置，空数组禁用全部检查。    |

### pattern

传入不带 `/` 分隔符和标志的正则源码，不自动添加锚点或改变大小写。需要匹配完整名称时使用 `^` 和 `$`。无效正则为配置错误。

| 模式                                  | 规范                            | 匹配示例           |
| ------------------------------------- | ------------------------------- | ------------------ |
| `.+Ref$`                              | 以 `Ref` 结尾，前面至少一个字符 | `tableRef`         |
| `^ref[A-Z]`                           | 以 `ref` 加大写字母开头         | `refTable`         |
| `^[a-z][a-zA-Z0-9]*Ref$`              | camelCase，带 `Ref` 后缀        | `searchInputRef`   |
| `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-ref$` | kebab-case，带 `-ref` 后缀      | `search-input-ref` |

### targets

| 目标             | 检查的值                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `template`       | 静态 `ref="name"`、`:ref` 中的字符串或无插值模板字面量，以及 `<script setup>` 中已确认的 ref 标识符。 |
| `useTemplateRef` | Vue `useTemplateRef()` 首参数中的字符串及无插值模板字面量。                                           |
| `render`         | Vue `h()` 第二参数对象中的字符串、无插值模板字面量及已确认 ref 标识符。                               |

例如，仅对模板名称和 `useTemplateRef` 键要求 kebab-case：

```json
{
  "pattern": "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-ref$",
  "targets": ["template", "useTemplateRef"]
}
```

目标替换默认列表，必须使用上述名称且不能重复。

## 识别与限制 {#recognition-and-limits}

- 默认必须显式从 `vue` 导入 API。支持具名别名和命名空间导入，包括静态命名空间访问。启用共享 `autoImport: true` 可识别未绑定的 `ref`、`shallowRef`、`useTemplateRef`、`h`，见[自动导入配置](../guide/configuration.md#auto-imported-vue-apis)，适用于模板 ref 绑定、键和渲染 ref。跳过局部函数、遮蔽绑定、仅类型及其他模块导入。
- 已确认 ref 标识符必须直接由 Vue `ref()`、`shallowRef()` 或 `useTemplateRef()` 初始化，且未重新赋值。支持 TypeScript 断言、非空断言及 `satisfies`。同名类型别名和接口不会隐藏运行时 ref 绑定。渲染用法按可见的运行时绑定解析：setup 局部值不会影响普通脚本渲染函数中的同名 ref；但 setup 中未被局部值遮蔽、实际指向普通脚本 ref 的赋值仍视为重新赋值。
- 模板标识符仅从 `<script setup>` 声明解析。普通脚本同名声明和赋值不影响 setup ref 识别，`v-for` 和插槽绑定优先。不推断选项式 API `setup()` 返回映射、解构、ref 变量别名或自定义组合式函数返回值。普通脚本或无脚本时仍检查静态模板字符串。
- 小写 `<slot>` 出口将 `ref` 作为普通参数传给插槽，因此跳过其属性。使用 `v-if`、`v-else-if`、`v-else`、`v-for` 或 `v-slot` 的结构性 `<template>` 同样不创建模板引用。`v-pre` 内不适用这些排除条件：这些标签是普通元素，静态 `ref` 仍会创建引用。`<Slot>` 等组件标签和普通 `<template>` 元素仍会检查。
- 跳过函数 ref、成员表达式、条件表达式、含插值字符串及动态指令参数。不求值保存字符串键的常量。跳过目标为普通属性而非模板 ref 的 `.prop` 和 `.attr` 绑定。
- 渲染检查仅查看内联 props 对象，包括简写 `ref` 和静态计算属性名。数值属性名不会隐藏前面的 `ref`。后续属性覆盖前面的属性；后续展开或未知计算键会使先前 ref 无法确定并跳过。不检查 props 变量、`mergeProps()`、JSX 或其他渲染 API。

## 参考资料 {#references}

- [最初的 template-ref-pattern 提案](https://github.com/vuejs/eslint-plugin-vue/issues/2139)
- [Vue 模板引用](https://vuejs.org/guide/essentials/template-refs.html)

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-ref-pattern.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-ref-pattern.test.ts)
