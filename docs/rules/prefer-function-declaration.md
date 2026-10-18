---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-function-declaration
description: Require function declarations in SFCs and composables.
---

# vue-perfectionist/prefer-function-declaration

> Require function declarations in SFCs and composables.

Use declarations for directly defined function bindings at the top level of
Vue scripts, component setup bodies, and matching composables. This is an
opt-in project convention. The rule only reports and provides no fixes or
suggestions.

## Usage

Register the plugin and configure parsers for the files you want to check:

```js
import tsParser from '@typescript-eslint/parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/prefer-function-declaration': 'error' },
  },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
  },
]
```

TypeScript type information and a project configuration are not required.

## :book: Rule Details

An identifier initialized directly with an arrow function or function
expression must use a function declaration in a checked container.
`const`, `let`, and `var`, including multiple declarators and exports, are
checked equally. Async and generator functions are included.

::: correct

```vue
<script setup>
function save() {}
async function load() {}
function* iterate() {}
</script>
```

:::

::: incorrect

```vue
<script setup>
const save = () => {}
const load = async () => {}
const iterate = function* () {}
</script>
```

:::

The rule checks direct function definitions, without inferring variable types
or following function values. Destructuring is always skipped, including
aliases, array patterns, and default function expressions. Existing function
references, calls, macros, bound functions, and conditional expressions are
also allowed.

::: correct

```vue
<script setup lang="ts">
const emit = defineEmits<{ save: [] }>()

const { save: submit, reset = () => {} } = actions
const [value, toggle] = useToggle()
const save = actions.save
const load = importedLoad
const search = debounce(handler, 300)
const bound = handler.bind(context)
const selected = enabled ? primarySave : fallbackSave
const doubled = computed(() => count.value * 2)
watch(source, () => {})
emit('save')
</script>
```

:::

### Direct top level

Only statements directly in a checked script or function body are checked.
Conditionals, loops, `try` statements, standalone blocks, ordinary nested
functions, callbacks, object properties, later assignments, and returned
functions are outside that boundary, even when `var` is used.

::: correct

```ts
function useForm() {
  function save() {}
  function reset() {
    const normalize = () => {}
  }
  if (enabled) {
    var retry = () => {}
  }
  watch(source, () => {
    const update = () => {}
  })
  const actions = { save: () => {} }
  return () => renderContent()
}
```

:::

::: incorrect

```ts
function useForm() {
  const save = () => {}
}
```

:::

## :wrench: Options

Defaults:

```js
{
  scopes: ['sfc', 'composables'],
  functionPattern: '^use[A-Z]',
  ignoreNames: [],
  allowTypeAnnotation: false,
}
```

| Option                | Type                                              | Default                  | Meaning                                                             |
| --------------------- | ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `scopes`              | Array of unique `'sfc'` or `'composables'` values | `['sfc', 'composables']` | Replaces the checked containers. `[]` disables all checks.          |
| `functionPattern`     | Regular expression source string                  | `'^use[A-Z]'`            | Matches composable container binding names.                         |
| `ignoreNames`         | Array of unique, nonempty strings                 | `[]`                     | Exact composable container names to exclude. `[]` excludes nothing. |
| `allowTypeAnnotation` | Boolean                                           | `false`                  | Allows function bindings with a variable type annotation.           |

### scopes

`sfc` checks both ordinary `<script>` and `<script setup>` direct top levels.
It also checks component setup bodies in SFC scripts:

- An inline default-exported options object with `setup()`, `setup: function`,
  or `setup: () => {}`.
- An inline options object passed as the first argument to Vue's
  `defineComponent`.
- A setup function passed directly as the first argument to `defineComponent`.

Vue named imports, aliases, and namespace imports are recognized using lexical
bindings. Type-only imports, default imports, other modules, local shadowing,
optional calls, and computed namespace calls are skipped. For unbound
`defineComponent`, shared `settings['vue-perfectionist'].autoImport: true`
enables recognition; same-named local bindings still take precedence.
Static `setup` property keys and TypeScript expression wrappers are supported.
Namespace receivers can also use `as`, `satisfies`, angle-bracket assertions,
non-null assertions, or nested combinations of these wrappers.
Arbitrary objects with a `setup` property and objects or functions referenced
through identifiers are not followed. Options API methods and lifecycle bodies
are not component setup bodies.

::: incorrect

```vue
<script>
import { defineComponent as component } from 'vue'

export default component({
  setup() {
    const save = () => {}
  },
})
</script>
```

:::

For example, a type assertion on the namespace receiver preserves recognition:

::: incorrect

```vue
<script lang="ts">
import * as Vue from 'vue'

export default (Vue as typeof Vue).defineComponent({
  setup() {
    const save = () => {}
  },
})
</script>
```

:::

`composables` checks matching function bodies in standalone JS/TS and both SFC
script blocks. It does not require the composable itself to be a declaration:

::: correct

```ts
export const useForm = () => {
  function save() {}
  return { save }
}
```

:::

The same `useForm` binding at SFC script top level is reported by `sfc` scope.
Standalone module top level and component setup bodies outside SFCs are not
checked by `sfc` scope. SFC checks require Vue parser services. Both scripts in
a dual-script SFC are checked, with at most one report per binding. Templates
are skipped.

### functionPattern and ignoreNames

The pattern is case-sensitive JavaScript regular expression source without
delimiters or flags. No anchors are added; invalid patterns are configuration
errors. `ignoreNames` takes precedence over a pattern match.

Named function declarations use their declared name. Arrow/function
expressions directly initializing an identifier variable use the variable's
name, including through TypeScript wrappers; an internal function expression
name does not override it. Exported, async, generic, and independently matching
nested functions are supported. Anonymous default exports, object/class
methods, later assignments, and factory wrappers are not composable containers.
No import, file path, or directory convention is required.

For a custom convention:

```js
{
  functionPattern: '^create[A-Z]',
  ignoreNames: ['createLegacyForm'],
}
```

Ignoring a composable skips its body as a container. Its own binding can still
be reported at SFC top level or inside another checked container. Independently
matching nested composables are still checked. Use ESLint `files` and `ignores`
for directory-specific configuration.

### allowTypeAnnotation

With `allowTypeAnnotation: true`, the variable binding may carry an explicit
type, preserving contextual typing. The exception does not stop the function
from being recognized as a composable container.

::: correct

```ts
/* eslint vue-perfectionist/prefer-function-declaration: [error, { allowTypeAnnotation: true }] */
function useForm() {
  const save: Handler = value => {}
}
```

:::

Parameter types, return types, `as`, and `satisfies` are not variable type
annotations and do not qualify for this exception. Parentheses and TypeScript
wrappers never hide a directly initialized function.

::: incorrect

```ts
/* eslint vue-perfectionist/prefer-function-declaration: [error, { allowTypeAnnotation: true }] */
function useForm() {
  const save = (value: string): void => {}
  const reset = (() => {}) satisfies Handler
}
```

:::

## Scope

Checks are syntax-based and limited to direct identifier variable
initializers in the selected containers. This rule does not impose a general
function style on all code. Inline callbacks remain the responsibility of
`callback-style`; destructured functions and factory results are always
outside this rule's scope.

## Automatic fixes and formatting

Diagnostics point to the variable binding name. No automatic fixes or
suggestions are provided: converting an expression can change hoisting,
binding mutability, lexical `this` or `arguments`, internal function names,
and TypeScript contextual typing. Reports remain report-only even for a
simple empty function. Formatting does not change the scope of the checks.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-function-declaration.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-function-declaration.test.ts)
