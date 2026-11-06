---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-watch-effect-alias
description: 优先为 post 和 sync 侦听副作用使用专用别名。
---

# vue-perfectionist/prefer-watch-effect-alias

> 优先为 post 和 sync 侦听副作用使用专用别名。

:wrench: 目标 API 和选项可安全修改时自动修复；其他匹配调用只报告。

## 用法 {#usage}

在现有解析器配置中启用。Vue SFC 需要 `vue-eslint-parser`；TypeScript 还需 `@typescript-eslint/parser` 作为脚本解析器。

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-watch-effect-alias': 'error',
    },
  },
])
```

## :book: 规则详情 {#rule-details}

Vue 提供 [`watchPostEffect` 和 `watchSyncEffect`](https://vuejs.org/api/reactivity-core.html#watchposteffect)，分别是带 `flush: 'post'` 和 `flush: 'sync'` 的 `watchEffect` 别名。使用它们可在调用处直接体现调度模式。

::: correct

```vue
<script setup lang="ts">
import { watchEffect, watchPostEffect, watchSyncEffect } from 'vue'

watchPostEffect(updateLayout)
watchSyncEffect(updateCache)
watchEffect(updateData)
watchEffect(updateData, { flush: 'pre' })
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
import { watchEffect } from 'vue'

watchEffect(updateLayout, { flush: 'post' })
watchEffect(updateCache, { flush: 'sync' })
</script>
```

:::

检查具名导入别名及非计算命名空间调用。回调可以内联或引用。调试钩子等其他选项不阻止报告；支持的修复会保留钩子及其求值顺序。

::: incorrect

```ts
import { watchEffect as effect } from 'vue'
import * as Vue from 'vue'

effect(updateLayout, { flush: 'post', onTrack: debug })
Vue.watchEffect(updateCache, { flush: 'sync' })
```

:::

## :wrench: 选项 {#options}

默认配置如下：

```json
{
  "vue-perfectionist/prefer-watch-effect-alias": [
    "error",
    { "vueImportSources": ["vue"] }
  ]
}
```

### vueImportSources

- **类型**：`string[]`
- **默认值**：`["vue"]`

提供 Vue 具名 API 的精确模块标识符。数组替换默认值，空数组禁用导入识别。比如 `["vue", "#imports"]` 可包含重新导出 Vue API 的模块。默认导入不视为 Vue 命名空间或具名 API。

### vueGlobals

- **类型**：`string[]`
- **默认值**：由共享 `autoImport` 设置决定，该设置默认为 `false`

使用 `vueGlobals: ["watchEffect"]` 检查自动导入提供的未绑定同名 `watchEffect`。此列表覆盖共享设置；`vueGlobals: []` 对本规则禁用全局识别。也可启用共享 `autoImport: true`。仅检查支持的 `watchEffect` 名称，不定义自定义别名。要允许修复为全局 `watchPostEffect` 或 `watchSyncEffect`，必须显式将其加入列表；仅共享设置不足以证明替代全局可用。局部声明、参数、仅类型导入及不支持模块的导入优先。

未知选项字段、非数组值、非字符串元素及重复数组条目会被拒绝。

## 适用范围 {#scope}

检查普通和 setup SFC 脚本（含嵌套函数）及独立 JS/TS 中的 Vue API。不检查模板表达式，不需要 TypeScript 类型信息。

调用必须恰有两个运行时参数，无展开参数，且选项为内联对象。支持括号、透明 TypeScript 包装、引号或静态计算属性键、转义字符串及无插值模板字面量。重复 `flush` 键以最后一个为准。每个匹配调用在被调用者处报告一次。

跳过选项变量、生成选项的调用、展开属性、动态计算键、动态 flush 值、访问器及作为 `flush` 的方法。只要对象含展开或未知键，即使后面有字面 `flush` 也跳过。也跳过可选调用、计算命名空间成员、赋值或解构创建的本地 API 别名及同名非 Vue 函数。不检查 `watch`、`watchPostEffect` 或 `watchSyncEffect`。

::: correct

```ts
import { watchEffect } from 'vue'

watchEffect(updateLayout, options)
watchEffect(updateLayout, { flush: timing })
watchEffect(updateLayout, { flush: 'post', ...options })
```

:::

## 自动修复与格式化 {#automatic-fixes-and-formatting}

安全情况默认修复，无需额外选项。修复器改变 API 并删除单个静态 `flush` 属性：

- 命名空间调用使用同一命名空间的对应成员。`vue`、`@vue/runtime-core`、`@vue/runtime-dom` 的目标导出已知；其他配置来源需已有来自同一来源的目标运行时具名导入，因为自定义模块可能只导出 `watchEffect`。添加具名导入也遵守此限制。
- 直接调用复用同来源可见的目标运行时具名导入，包括别名。自动导入调用可复用任意已配置 Vue 来源的导入。
- 否则，仅当全文件（含模板）没有目标名绑定或未解析引用时，才向原导入声明添加具名导入。模板和样式中出现目标名或其组件标签形式也会保守阻止。未绑定 `eval` 引用会阻止新导入，因为执行代码可访问 AST 未体现的名称。原 `watchEffect` 导入保留供其他脚本或模板使用，可随后由未使用导入规则清理。
- 自动导入调用可使用 `vueGlobals` 显式列出的目标全局，前提是未被遮蔽或赋值。对源全局的写入也阻止修复，即使有可复用别名导入；局部遮蔽写入不算全局写入。未绑定 `eval` 也阻止全局修复，因为它可能重新赋值 API。其他全局调用若无合适导入可复用，仍仅报告。

修复要求内联对象没有 TypeScript 包装，且只有一个 `flush` 属性。其他属性必须为名为 `onTrack` 或 `onTrigger` 的普通数据属性，值（含调用）按原序保留。访问器、方法、未知选项、原型覆盖、重复 `flush` 及类型包装选项均仅报告。

被调用者或命名空间接收者上的显式类型转换、`satisfies` 及类型参数均只报告：改变 API 或删除参数可能违反约束。非空断言保留，不阻止修复。

待删除属性内有注释时仅报告。保留外围注释。`flush` 为唯一属性且删除参数不丢失注释时移除选项参数，否则可能保留空对象。支持带括号的选项，即使对象为空也保留括号。保留回调和被调用者原有括号、尾逗号及换行；删除属性后的缩进与空白可由格式化工具处理。

例如，此调用可修复并保留调试钩子：

::: incorrect

```ts
import * as Vue from 'vue'

Vue.watchEffect(updateLayout, { flush: 'post', onTrack: createDebugger() })
```

:::

::: correct

```ts
import * as Vue from 'vue'

Vue.watchPostEffect(updateLayout, { onTrack: createDebugger() })
```

:::

此调用仅报告，因为删除首个 `flush` 会丢弃一次求值：

::: incorrect

```ts
import * as Vue from 'vue'

Vue.watchEffect(updateLayout, { flush: getTiming(), flush: 'post' })
```

:::

显式接收者类型也可能阻止修复，例如此类型不提供 `watchPostEffect`：

::: incorrect

```ts
import * as Vue from 'vue'

;(Vue as Pick<typeof Vue, 'watchEffect'>).watchEffect(() => {}, {
  flush: 'post',
})
```

:::

仅报告的情况不提供建议。迁移前请手动处理导入、名称冲突、注释及选项语义。

## :mag: 实现 {#implementation}

- [规则源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-watch-effect-alias.ts)
- [测试源码](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-watch-effect-alias.test.ts)
