---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/define-macros-type-style
description: 强制 Vue 编译器宏的类型参数使用内联、本地声明或导入风格。
---

# vue-perfectionist/define-macros-type-style

> 强制 Vue 编译器宏的类型参数使用内联、本地声明或导入风格。

## 用法 {#usage}

在现有的 `vue-eslint-parser` 配置中启用规则，并使用 `@typescript-eslint/parser` 作为脚本解析器：

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/define-macros-type-style': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

默认情况下，每个宏必须引用本地 `interface` 或 `type` 声明，名称不限。风格由直接引用的声明决定；本地别名及继承导入类型的接口仍视为本地类型。

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

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>
```

:::

默认要求本地类型，因此导入类型也会报告：

::: incorrect

```vue
<script setup lang="ts">
import type { Props } from './types'

const props = defineProps<Props>()
</script>
```

:::

## :wrench: 选项 {#options}

展开后的默认配置：

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

`macros` 的每个值可以是 `'inline'`、`'local'`、`'imported'`、由这些风格组成的非空且不重复数组，或用于禁用该宏的 `false`。数组替换该宏默认值。省略的键保留默认值，`{}` 和 `{ macros: {} }` 也一样。未知字段和宏名会被拒绝。

例如，允许 props 使用本地声明或导入类型，并跳过其他宏：

```json
{
  "macros": {
    "defineProps": ["local", "imported"],
    "defineEmits": false,
    "defineSlots": false
  }
}
```

| 外层类型形式                                                      | 分类                   |
| ----------------------------------------------------------------- | ---------------------- |
| 直接类型字面量或函数类型                                          | `inline`               |
| 引用顶层、非 ambient 的本地接口或类型别名                         | `local`                |
| 引用具名或默认 ES 导入，包括仅类型导入                            | `imported`             |
| 根节点为 ES 命名空间导入的限定名                                  | `imported`             |
| 带限定名的 `import('./types').Props`，包括泛型参数                | `imported`             |
| 未解析、ambient、内置类型、泛型参数、裸命名空间导入或有歧义的绑定 | 来源未知，报告问题     |
| 联合、交叉、映射、条件、索引访问、关键字或 `typeof` 类型          | 不支持的形式，报告问题 |

泛型参数不影响外层分类。`Props<T>` 取决于 `Props` 的绑定，嵌套的导入属性类型不影响内联字面量。不支持本地命名空间及限定的具名或默认导入。兼容的接口合并仍归为本地，同名值绑定不会替换已解析的类型绑定。声明可位于调用之后或普通脚本块中。不追踪别名链，也不加载其他文件。

即使允许全部三种风格，未知来源仍会报告。支持但不允许的风格报告 `unexpectedTypeStyle`；不支持的外层语法报告 `unsupportedTypeForm`；未解析或有歧义的来源报告 `unknownTypeSource`。诊断范围覆盖完整类型参数。

## 适用范围 {#scope}

仅检查 `.vue` setup 脚本中恰有一个显式类型参数、没有运行时参数的 `defineProps`、`defineEmits` 和 `defineSlots`。调用必须是顶层变量初始化器（含解构）或表达式语句。支持括号及透明的 TypeScript 表达式包装。两种位置均支持未被遮蔽的 `withDefaults` 以首个参数包装 `defineProps`，内层类型只检查一次。

跳过导入或被遮蔽的宏、别名、成员或可选调用、任意外层表达式、嵌套函数或块、普通脚本调用、模板表达式和独立 JS/TS 文件。两个脚本块中可访问的类型都可用于确定来源。缺少解析器服务、运行时声明、缺少或多余类型参数、带运行时参数的调用均跳过。`defineModel`、`defineExpose`、`defineOptions` 及自定义宏不在检查范围内。

无需 TypeScript 项目或类型检查器。本规则约束声明风格，不保证 Vue 能编译该类型，也不要求宏必须存在或补充缺失的泛型参数。

可与 [`require-macro-type-name`](./require-macro-type-name.md) 组合，要求调用处使用指定名称。两者均为默认选项时，类型必须在本地声明，并命名为 `Props`、`Emits` 和 `Slots`。要求内联类型时，应禁用对应的命名检查，避免冲突。

## 自动修复与格式化 {#automatic-fixes-and-formatting}

不提供自动修复或建议。提取或移动类型需要决定作用域、注释及文件边界。示例展示手动修改方式。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/define-macros-type-style.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/define-macros-type-style.test.ts)
