---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/callback-style
description: Require callbacks to be declared inline at known Vue API argument positions, with configurable function and body styles.
---

# vue-perfectionist/callback-style

> Require callbacks to be declared inline at known Vue API argument positions, with configurable function and body styles.

- :wrench: ESLint's `--fix` option can automatically fix some problems reported by this rule. Only arrow expression bodies can be automatically converted to block bodies.

The rule checks JavaScript and TypeScript files and both ordinary and setup scripts in Vue SFCs, including calls inside composables and other functions. Template expressions are outside its scope. Enable it explicitly in your ESLint configuration.

## Usage

Enable the rule alongside your existing parser configuration:

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/callback-style': 'error',
    },
  },
]
```

## :book: Rule Details

With the defaults:

::: correct

```ts
import { onMounted, watch, watchEffect } from 'vue'

onMounted(() => {
  fetchData()
})
watch(userId, (value, oldValue, onCleanup) => {
  handleUserChange(value, oldValue, onCleanup)
})
watchEffect(onCleanup => {
  updateTitle(onCleanup)
})
```

:::

::: incorrect

```ts
import { onMounted, watch, watchEffect } from 'vue'

onMounted(fetchData)
watch(userId, handleUserChange)
watchEffect(updateTitle)
onMounted(() => fetchData())
onMounted(function () {
  fetchData()
})
```

:::

The callback may contain any number of statements. It does not have to wrap an existing function.

## :wrench: Options

```js
{
  'vue-perfectionist/callback-style': ['error', {
    groups: ['lifecycle', 'watch'],
    functionStyle: 'arrow',
    bodyStyle: 'block',
    exclude: [],
    customCallbacks: [],
    vueGlobals: [],
    vueImportSources: ['vue'],
  }],
}
```

| Option             | Default                  | Meaning                                                                                 |
| ------------------ | ------------------------ | --------------------------------------------------------------------------------------- |
| `groups`           | `['lifecycle', 'watch']` | Built-in API groups to check. `[]` disables built-ins.                                  |
| `functionStyle`    | `'arrow'`                | `'arrow'` requires arrow functions; `'any'` also accepts inline function expressions.   |
| `bodyStyle`        | `'block'`                | `'block'` requires braces for arrow callback bodies; `'any'` permits expression bodies. |
| `exclude`          | `[]`                     | Built-in APIs to skip, using original export names.                                     |
| `customCallbacks`  | `[]`                     | Additional exact import matches and callback argument indices.                          |
| `vueGlobals`       | `[]`                     | Explicit unbound Vue API names supplied by auto-import tooling.                         |
| `vueImportSources` | `['vue']`                | Exact module specifiers exposing Vue APIs. Replaces the default list.                   |

Inline callbacks are always required, even when both style options are `'any'`. Each rule has its own options; these settings are not inherited from `sort-script-setup`.

### Built-in groups

Indices are zero-based.

| Group       | APIs                                                                                                                                                                                                         | Callback index     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `lifecycle` | `onBeforeMount`, `onMounted`, `onBeforeUpdate`, `onUpdated`, `onBeforeUnmount`, `onUnmounted`, `onActivated`, `onDeactivated`, `onErrorCaptured`, `onRenderTracked`, `onRenderTriggered`, `onServerPrefetch` | `0`                |
| `watch`     | `watch`                                                                                                                                                                                                      | `1`                |
| `watch`     | `watchEffect`, `watchPostEffect`, `watchSyncEffect`                                                                                                                                                          | `0`                |
| `cleanup`   | `onScopeDispose`, `onWatcherCleanup`                                                                                                                                                                         | `0`                |
| `scheduler` | `nextTick`                                                                                                                                                                                                   | `0`, when supplied |

`cleanup` and `scheduler` are opt-in. `computed`, `customRef`, and other APIs are not built in.

Only the second argument of `watch` is checked. Sources such as getter functions, refs, reactive objects, and arrays are left alone:

::: correct

```ts
import { watch } from 'vue'

watch(
  () => userId.value,
  () => {
    refresh()
  },
)
```

:::

### Import identity and auto-imports

Named import aliases and namespace imports match the original export name:

::: incorrect

```ts
import { onMounted as mounted } from 'vue'
import * as Vue from 'vue'

mounted(handler)
Vue.onMounted(handler)
```

:::

Imports from other modules, local functions, and shadowed bindings do not match built-ins. Type-only imports do not match. Default imports are not treated as named Vue APIs.

For auto-imports, configure `vueGlobals: ['onMounted', 'watch', 'watchEffect']`. These names match only when there is no local binding. For re-export modules, configure `vueImportSources: ['vue', '#imports']`.

There is no prefix guessing or cross-file analysis. Computed member access, optional calls, and optional member access are skipped.

### Custom callbacks

```js
{
  customCallbacks: [
    {
      source: 'vue-router',
      name: 'onBeforeRouteLeave',
      callbackIndices: [0],
    },
    {
      source: '@vueuse/core',
      name: 'watchDebounced',
      callbackIndices: [1],
    },
    {
      source: '@/composables/events',
      name: 'subscribe',
      callbackIndices: [1, 2],
    },
  ],
}
```

`source` and `name` are exact, nonempty strings. `name` is the original export name; use `'default'` to match a default import regardless of its local name. Aliases and namespace calls are supported. Each `callbackIndices` list must contain at least one unique, nonnegative integer.

Custom entries apply independently of `groups` and `exclude`. Matching indices are combined, and each argument is reported at most once. Custom entries do not match unbound globals.

## Diagnostics and fixes

References, member access, `.bind()` calls, callback factories, conditional expressions, and other non-function arguments are reported. TypeScript `as`, `satisfies`, type assertions, non-null assertions, and instantiation wrappers are unwrapped before checking.

Missing arguments are skipped. An argument at or after a spread is skipped because its position cannot be established; known arguments before a spread are still checked. The rule does not validate call signatures or callback types.

| Diagnostic               | Automatic fix                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `expectedInlineCallback` | None. Wrapping references can change argument forwarding, receiver binding, evaluation timing, and return behavior. |
| `expectedArrowCallback`  | None. Ordinary functions may depend on `this`, `arguments`, recursion, or generator behavior.                       |
| `expectedBlockBody`      | Wrap the existing arrow expression body in a block with `return`.                                                   |

For example, the automatic fix preserves the return value:

::: incorrect

```ts
onMounted(() => fetchData())
```

:::

::: correct

```ts
onMounted(() => {
  return fetchData()
})
```

:::

The returned expression is parenthesized to preserve sequence expressions and prevent automatic semicolon insertion around comments and line breaks. Existing parentheses, comments, async modifiers, parameters, and TypeScript annotations are retained. Your formatter can format the resulting block.

Keeping `return` preserves promises and values such as `false`. If a callback intentionally discards its return value, write that block manually. When combining this rule with `arrow-body-style`, configure that rule to allow block bodies.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/callback-style.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/callback-style.test.ts)
