---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-use-template-ref-inference
description: 优先为静态 Vue 模板 ref 使用推断类型。
---

# vue-perfectionist/prefer-use-template-ref-inference

> 优先为静态 Vue 模板 ref 使用推断类型。

Vue 3.5+ 配合 `@vue/language-tools` 2.1+ 可从同一 SFC 中匹配的静态 ref 推断类型，包括 DOM 元素及组件实例，见 [Vue 模板 ref 类型指南](https://vuejs.org/guide/typescript/composition-api.html#typing-template-refs)。编辑器中请使用兼容的 Vue 语言工具，命令行用 `vue-tsc` 检查类型。本规则不检查工具版本或 TypeScript 配置。

这是风格偏好，无法证明显式类型与推断类型等价。仅报告，不提供自动修复或建议；删除泛型仍需有意评估其对类型检查的影响。

## 用法 {#usage}

在 TypeScript Vue SFC 的扁平化配置中添加规则：

```js [eslint.config.mjs]
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-use-template-ref-inference': 'error',
    },
  },
])
```

识别从 `vue` 直接、同名导入的运行时 API。自动导入 `useTemplateRef` 时，启用默认关闭的共享设置：

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    settings: {
      'vue-perfectionist': {
        autoImport: true,
      },
    },
  },
])
```

该设置也识别 ESLint `languageOptions.globals` 声明的名称。局部绑定、其他模块导入及仅类型导入优先。它不会配置自动导入或启用类型推断。

## :book: 规则详情 {#rule-details}

恰有一个显式类型参数，且字面量键唯一匹配同一 SFC 中元素或静态组件的 `ref="key"` 时报告。诊断覆盖整个类型参数列表，包括 `<` 和 `>`。

::: correct

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const videoRef = useTemplateRef('videoRef')
const playerRef = useTemplateRef('playerRef')
</script>

<template>
  <video ref="videoRef" />
  <VideoPlayer ref="playerRef" />
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')
const playerRef = useTemplateRef<PlayerInstance>('playerRef')
</script>

<template>
  <video ref="videoRef" />
  <VideoPlayer ref="playerRef" />
</template>
```

:::

绑定名无需与键一致。键可以是字符串或无插值模板字面量。`v-if`、`v-for` 不豁免唯一静态 ref：

::: incorrect

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const element = useTemplateRef<HTMLVideoElement>('videoRef')
</script>

<template>
  <video
    v-if="visible"
    ref="videoRef"
  />
</template>
```

:::

## :wrench: 选项 {#options}

默认配置：

```json
{
  "vue-perfectionist/prefer-use-template-ref-inference": [
    "error",
    {
      "ignoreRefs": []
    }
  ]
}
```

### ignoreRefs

类型：`string[]`。默认值：`[]`。

允许列出的模板 ref **键**保留显式类型。精确、区分大小写地匹配；条目不是变量名或正则。数组替换默认空列表；空数组不豁免任何键。

适用于有意暴露的公共接口、扩展 DOM 类型或语言工具推断限制。在 ESLint 配置范围内豁免全部匹配键。对于个别例外，也可使用说明原因的局部 ESLint 禁用注释。

设置 `{ ignoreRefs: ['editorRef'] }` 时，以下代码被接受：

::: correct

<!-- prettier-ignore -->
```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const editor = useTemplateRef<EditorInterface>('editorRef')
</script>

<template>
  <Editor ref="editorRef" />
</template>
```

:::

## 适用范围 {#scope}

仅检查 `<script setup lang="ts">` 内直接作为顶层变量初始化器或表达式语句的调用。调用结果外可带括号及 `as`、`satisfies`、非空包装。普通或 setup 脚本均可提供导入，但仅检查 setup 调用。

跳过以下情况：

- 普通脚本、JavaScript 或 TSX setup、独立文件、模板表达式、渲染函数、JSX、嵌套块、函数及回调。
- 本地名称不同的导入别名、命名空间调用、可选调用及包装后的被调用者。不支持自定义导入来源或语言工具的组合式函数名称设置。
- 无类型参数或多个类型参数、运行时参数不恰好为一个、展开参数、动态键及键外的 TypeScript 包装。
- 缺失 ref、`:ref="key"` 或 `:ref="'key'"` 等绑定 ref、重复静态键，包括条件分支间重复。同键绑定字符串也会使静态 ref 有歧义。
- 动态 `<component>`、带 `is` 或 `:is` 的元素、`<template>` / `<slot>` ref、`v-pre` 内容，以及带对象形式 `v-bind`、动态绑定参数或竞争绑定 ref 的元素。
- 被 `<!-- @vue-skip -->` 语言工具指令排除的元素及后代。位于 `v-if` 前的指令也排除其 `v-else-if`、`v-else` 分支，不影响无关后续同级元素。
- 原始属性值与解码后键不同的静态 ref，如 `ref="video&#82;ef"`。语言工具可能在推断键中保留实体文本；这些 ref 仍参与解码键的重复检查。

动态组件可能确实需要显式联合类型：

::: correct

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const playerRef = useTemplateRef<AudioPlayer | VideoPlayer>('playerRef')
</script>

<template>
  <component
    ref="playerRef"
    :is="currentPlayer"
  />
</template>
```

:::

静态组件（含泛型组件）无需解析声明也会检查。若显式类型必需，请用 `ignoreRefs` 或局部禁用注释保留。本规则不进行 TypeScript 类型等价检查。

命名规范请单独启用 [`consistent-template-ref-name`](./consistent-template-ref-name.md) 或 [`prefer-ref-pattern`](./prefer-ref-pattern.md)。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-use-template-ref-inference.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-use-template-ref-inference.test.ts)
