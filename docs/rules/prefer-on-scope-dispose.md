---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-on-scope-dispose
description: Prefer scope-based cleanup in named Vue composables.
---

# vue-perfectionist/prefer-on-scope-dispose

> Prefer scope-based cleanup in named Vue composables.

## Usage

Configure the appropriate parser for your files; see [Getting Started](/guide/).

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/prefer-on-scope-dispose': 'error' },
  },
]
```

## :book: Rule Details

A composable can run inside an independent `effectScope`, without a component.
Register cleanup with `onScopeDispose` when the resource belongs to that scope.
This convention requires an active effect scope at registration time.

::: correct

```ts
import { onScopeDispose } from 'vue'

export function usePolling() {
  const timer = setInterval(refresh, 3000)
  onScopeDispose(() => clearInterval(timer))
}
```

:::

::: incorrect

```ts
import { onUnmounted } from 'vue'

export function usePolling() {
  const timer = setInterval(refresh, 3000)
  onUnmounted(() => clearInterval(timer))
}
```

:::

## :wrench: Options

```json
{
  "functionPattern": "^use[A-Z]",
  "ignoreNames": [],
  "hooks": ["onUnmounted"],
  "vueImportSources": ["vue"]
}
```

- `functionPattern` (regular expression source, default `"^use[A-Z]"`): matches
  function declaration names and variable bindings initialized directly with
  functions. Uses case-sensitive JavaScript regex matching without flags.
- `ignoreNames` (`string[]`, default `[]`): exact function binding names to exempt,
  for example composables whose teardown depends on component DOM or lifecycle
  order. An empty array excludes nothing.
- `hooks` (array, default `["onUnmounted"]`): replaces checked lifecycle APIs.
  Also accepts `onBeforeUnmount`; `[]` disables checks. The before-unmount hook
  is excluded by default because its timing is often intentional.
- `vueImportSources` (`string[]`, default `["vue"]`): replaces recognized module
  specifiers. `[]` disables imported API recognition.
- `vueGlobals` (`string[]`): replaces shared auto-import recognition. When omitted,
  `settings['vue-perfectionist'].autoImport: true` enables unbound `onUnmounted`
  and `onBeforeUnmount`, still filtered by `hooks`. Otherwise globals are off.
  `[]` disables globals; local and type-only bindings never become globals.

For a project that also checks before-unmount cleanup, while preserving a
DOM-specific composable:

```json
{
  "hooks": ["onUnmounted", "onBeforeUnmount"],
  "ignoreNames": ["useDomTransition"]
}
```

## Scope

Checks Vue script blocks and standalone JS/TS. A function is selected by its
binding name and a recognized Vue lifecycle call, not by its filename. Supports
named imports, aliases, non-computed namespace calls, and TypeScript expression
wrappers. Named default-export function declarations are included; anonymous
default exports are not. Variable binding names take precedence over inner
function-expression names.

Only calls in the **nearest function's body** are checked. Blocks such as `if`
statements remain part of that function, but nested callbacks, methods, class
initializers, and parameter defaults do not inherit a composable's name.
Named nested composable declarations are checked independently. Functions
passed to factories or assigned to object properties are outside this rule.

Top-level `<script setup>` calls and ordinary component `setup()` are skipped.
Calls with a second argument are skipped when they may target a particular
component. An unshadowed `undefined` or a `void` expression still uses Vue's
default current instance and is checked, including TypeScript wrappers.
Locally bound `undefined`, other target expressions, and calls with more than
two arguments are skipped. The rule does not evaluate aliases or infer target
types. Optional calls, computed API members, default imports, spread arguments,
and template expressions are skipped.

The rule cannot infer resource ownership or DOM dependencies. Use `ignoreNames`
or a local ESLint disable comment when component lifetime is intentional.
It does not verify that the composable is called inside an active scope.

## Automatic fixes and formatting

No automatic fix or suggestion is provided. Scope disposal and component
unmounting have different timing and ownership. Review cleanup requirements
before changing the API, especially when DOM state or other lifecycle hooks
are involved. Callback references and inline callbacks are both checked.

See [Vue's onScopeDispose documentation](https://vuejs.org/api/reactivity-advanced.html#onscopedispose).

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-on-scope-dispose.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-on-scope-dispose.test.ts)
