---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-simple-event-handler
description: 要求具名 Vue 模板事件处理器使用简单表达式。
---

# vue-perfectionist/prefer-simple-event-handler

> 要求具名 Vue 模板事件处理器使用简单表达式。

<!-- summary:start -->

::: info 规则速览

| 项目     | 说明                           |
| -------- | ------------------------------ |
| 适用范围 | 模板                           |
| 默认行为 | 具名事件处理器使用简单表达式。 |
| 必需选项 | 无；启用后即使用默认选项。     |
| 自动修复 | —                              |
| 类型信息 | 不需要 TypeScript 类型服务。   |

:::

<!-- summary:end -->

在模板中保留简单操作，将复杂逻辑移到脚本函数。仅检查语法，不检查圈复杂度或运行时副作用。每个处理器最多报告一次，不提供自动修复或建议。

## 用法 {#usage}

以下完整扁平化配置支持 JavaScript 和 TypeScript Vue 单文件组件：

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-simple-event-handler': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

默认接受方法引用、调用、赋值、自增自减及简单内联函数。每个函数块必须恰好包含一个表达式语句，或一个带表达式的 `return`：

::: correct

```vue
<template>
  <button
    @click="handleClick"
    type="button"
  />
  <button
    @click="actions.save"
    type="button"
  />
  <button
    @click="save(item, $event)"
    type="button"
  />
  <button
    @click="isVisible = !isVisible"
    type="button"
  />
  <button
    @click="count++"
    type="button"
  />
  <button
    @click="formRef?.submit()"
    type="button"
  />
  <button
    @click="() => save(item)"
    type="button"
  />
  <button
    @click="
      () => {
        save(item)
      }
    "
    type="button"
  />
  <button
    @click="
      () => {
        return save(item)
      }
    "
    type="button"
  />
  <button
    @click="
      function () {
        return save(item)
      }
    "
    type="button"
  />
  <button
    @click="async () => await save()"
    type="button"
  />
  <button
    @click="save(normalize(item))"
    type="button"
  />
</template>
```

:::

始终报告多语句、逗号表达式、控制流和声明，用函数包装也无法绕过：

::: incorrect

```vue
<template>
  <button
    @click="
      save()
      close()
    "
    type="button"
  />
  <button
    @click="
      () => {
        save()
        close()
      }
    "
    type="button"
  />
  <button
    @click="(save(), close())"
    type="button"
  />
  <button
    @click="if (ok) save()"
    type="button"
  />
  <button
    @click="
      () => {
        if (ok) save()
      }
    "
    type="button"
  />
  <button
    @click="
      () => {
        while (ok) save()
      }
    "
    type="button"
  />
  <button
    @click="
      () => {
        const result = save()
      }
    "
    type="button"
  />
  <button
    @click="() => {}"
    type="button"
  />
  <button
    @click="
      () => {
        return
      }
    "
    type="button"
  />
</template>
```

:::

默认还禁止三元、逻辑表达式和逻辑赋值。递归检查调用参数、计算属性、参数默认值、对象和数组值及嵌套函数：

::: incorrect

```vue
<template>
  <button
    @click="ok ? save() : close()"
    type="button"
  />
  <button
    @click="ok && save()"
    type="button"
  />
  <button
    @click="save(value ?? fallback)"
    type="button"
  />
  <button
    @click="value ||= next"
    type="button"
  />
  <button
    @click="save(ok ? first : second)"
    type="button"
  />
  <button
    @click="save((prepare(), item))"
    type="button"
  />
  <button
    @click="
      run(() => {
        save()
        close()
      })
    "
    type="button"
  />
</template>
```

:::

## :wrench: 选项 {#options}

默认配置如下：

```json
{
  "vue-perfectionist/prefer-simple-event-handler": [
    "error",
    {
      "allowInlineFunctions": true,
      "allowConditional": false,
      "allowLogical": false
    }
  ]
}
```

| 选项                   | 类型      | 默认值  | 含义                                                           |
| ---------------------- | --------- | ------- | -------------------------------------------------------------- |
| `allowInlineFunctions` | `boolean` | `true`  | 允许箭头函数及普通函数表达式，包括对象方法；函数体仍检查。     |
| `allowConditional`     | `boolean` | `false` | 允许整个处理器中的三元表达式，不允许 `if` 或 `switch`。        |
| `allowLogical`         | `boolean` | `false` | 允许整个处理器中的 `&&`、`\|\|`、`??`、`&&=`、`\|\|=`、`??=`。 |

选项互相独立且递归生效。任何选项都不允许多语句、逗号表达式、声明或控制流。

### `allowInlineFunctions`

设置 `{ allowInlineFunctions: false }` 时，仍接受方法引用和简单操作：

::: correct

```vue
<template>
  <button
    @click="handleClick"
    type="button"
  />
  <button
    @click="save(item, $event)"
    type="button"
  />
</template>
```

:::

以下函数会报告，包括嵌套回调：

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-simple-event-handler
<script setup>
/* eslint vue-perfectionist/prefer-simple-event-handler: [error, { allowInlineFunctions: false }] */
</script>

<template>
  <button
    @click="() => save(item)"
    type="button"
  />
  <button
    @click="run(() => save(item))"
    type="button"
  />
</template>
```

:::

### `allowConditional` 与 `allowLogical` {#allowconditional-and-allowlogical}

设置 `{ allowConditional: true, allowLogical: true }` 时，以下表达式允许，包括参数及内联函数内部：

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-simple-event-handler
<script setup>
/* eslint vue-perfectionist/prefer-simple-event-handler: [error, { allowConditional: true, allowLogical: true }] */
</script>

<template>
  <button
    @click="ok ? save() : close()"
    type="button"
  />
  <button
    @click="ok && save()"
    type="button"
  />
  <button
    @click="save(value ?? fallback)"
    type="button"
  />
  <button
    @click="value ||= next"
    type="button"
  />
  <button
    @click="() => save(ok ? first : (second ?? fallback))"
    type="button"
  />
</template>
```

:::

即使启用这些选项，`if` 语句和逗号表达式仍报告：

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-simple-event-handler
<script setup>
/* eslint vue-perfectionist/prefer-simple-event-handler: [error, { allowConditional: true, allowLogical: true }] */
</script>

<template>
  <button
    @click="
      () => {
        if (ok) save()
      }
    "
    type="button"
  />
  <button
    @click="() => (save(), close())"
    type="button"
  />
</template>
```

:::

## 适用范围 {#scope}

- 仅检查**带事件参数的模板 `v-on` 指令值**，如 `@click`、`v-on:click`、`@click.stop`、动态 `@[eventName]` 及组件事件 `@update:model-value`。原生元素和组件遵循相同检查。
- 递归检查整个处理器，包括嵌套回调、对象方法、计算键及参数默认值。每个处理器最多在 AST 遍历遇到的首个禁止节点处报告一次。多语句块整体报告。
- 支持无脚本、普通脚本、setup 及双脚本模板，支持 JS/TS。不依赖 Vue 导入、自动导入或组合式 API。
- **不检查动态事件名本身**、对象形式 `v-on="listeners"` / `v-on="{ click: ... }"`、`:onClick`、普通 `onclick`、其他指令或插值。
- **不检查脚本实现**，不解析引用函数、追踪变量或导入，不检查渲染函数、JSX、TSX 处理器。不影响独立 JS/TS。需要 Vue 模板访问器服务，安全跳过其他解析器。
- 跳过缺失、空值及无法解析的表达式，此类问题请使用 Vue 正确性规则。

以下复杂脚本函数及事件映射不在检查范围内；仅检查 `@click` 值，允许其引用：

::: correct

```vue
<script setup>
function handleClick() {
  if (ok) {
    save()
  }
  close()
}
</script>

<template>
  <button
    @click="handleClick"
    type="button"
  />
  <button
    v-on="{
      click: () => {
        save()
        close()
      },
    }"
    type="button"
  />
  <button
    @[ok?first:second]="save()"
    type="button"
  />
</template>
```

:::

### 什么是简单表达式？ {#what-counts-as-simple}

这是结构限制，不是表达式白名单或调用次数限制。例如，`save(normalize(item))` 虽有两次调用仍被允许。字面量、算术、位运算、可选链及 `await` 本身不会被拒绝。本规则不证明表达式可调用、有意义或无副作用。

尾部分号、注释、换行、括号及 TypeScript 断言或非空断言不影响检查。额外空语句仍算语句。空函数块和裸 `return` 因不含表达式操作而报告。循环、`switch`、`try`、`throw`、标签、嵌套语句块、声明、类表达式及 `yield` 均被拒绝，即使只有一条也视为复杂。

忽略擦除的类型分支，包括 `as` 或 `satisfies` 类型中的调用和构造签名、参数类型注解及类型实参。TypeScript 包装内的运行时表达式仍会检查，例如 `(ok && save) as { (event: MouseEvent): void }` 仍视为复杂。

不强制方法引用或内联处理器风格。`allowInlineFunctions: false` 仍允许 `save(item)` 和 `count++`。

## 自动修复 {#automatic-fixes}

不提供自动修复或建议。提取函数需选择位置和参数，并保留 `v-for` 等模板局部变量、`$event`、`this` 和返回值。请手动移至脚本函数，显式传入所需局部值。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-simple-event-handler.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-simple-event-handler.test.ts)
