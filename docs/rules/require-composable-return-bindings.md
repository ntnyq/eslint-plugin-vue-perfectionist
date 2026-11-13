---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-composable-return-bindings
description: Require composable return fields to expose local bindings.
---

# vue-perfectionist/require-composable-return-bindings

> Require composable return fields to expose local bindings.

<!-- summary:start -->

::: info At a glance

| Concern          | Behavior                                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| Scope            | Vue scripts and standalone JS/TS files                                            |
| Defaults         | Expose local bindings; allow aliases; disallow parameters and inline expressions. |
| Required options | None; enabling the rule uses its defaults.                                        |
| Automatic fixes  | —                                                                                 |
| Type information | No TypeScript type services required.                                             |

:::

<!-- summary:end -->

Keep the return object focused on exposing the composable API. Declare values
and functions before returning them. This is an opt-in project convention,
not a requirement imposed by Vue.

## Usage

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-composable-return-bindings': 'error',
    },
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
])
```

The rule uses syntax and lexical scope information. It does not require
TypeScript type services, a project, or imports from Vue.

## :book: Rule Details

Expose bindings declared inside the current composable. Aliases are allowed
by default; variable initializers can be any expression and are not checked.

::: correct

```ts
import { computed, ref } from 'vue'

function useResize() {
  const direction = ref('horizontal')
  const { position } = usePosition()
  const resizing = computed(() => state.resizing)

  function beginResize() {}

  return { position, resizing, beginResize, resizeDirection: direction }
}
```

:::

Inline values, calls, property access, calculations, functions, methods,
getters, setters, arrays, and nested objects are reported. Nested objects are
reported once as an inline value; their fields are not recursively checked.

::: incorrect

```ts
import { computed } from 'vue'

function useResize() {
  return {
    enabled: true,
    position: state.position,
    area: width.value * height.value,
    direction: computed(() => state.direction),
    beginResize: () => start(),
    stopResize() {},
    get resizing() {
      return state.resizing
    },
  }
}
```

:::

### Local bindings

A binding must resolve to a declaration owned by the current function and be
visible at the return site. Variables (`const`, `let`, `var`), function and class
declarations, enum bindings, catch bindings, and destructuring bindings qualify.
Block-local declarations qualify when returned from the same visible scope.
This is a lexical check, not definite-assignment or initialization analysis.

Module variables, imports, enclosing-function bindings, globals, unresolved
identifiers, and type-only declarations do not qualify. Parameters are rejected
by default. A local alias explicitly establishes a qualifying binding, even if
its initializer refers to an external value or a parameter.

::: incorrect

```ts
import { reset } from './actions'

const count = 0

function useResize(target) {
  return { count, reset, target }
}
```

:::

::: correct

```ts
import { reset } from './actions'

function useResize(target) {
  const localTarget = target
  const resetResize = reset
  return { target: localTarget, reset: resetResize }
}
```

:::

### Explicit public fields

Spread members are reported even when spreading a local binding. Keys must be
static: identifier keys, primitive literals (including computed literals), signed
numeric literals, and expression-free templates are supported. Computed identifier
keys and concatenations are reported without evaluating them.

Non-computed colon-form `__proto__: value` sets the prototype and is reported.
Shorthand `__proto__` and computed `['__proto__']` are ordinary fields.

::: incorrect

```ts
function useResize() {
  const count = 0
  const key = 'count'
  const state = { count }
  return { ...state, [key]: count, __proto__: state }
}
```

:::

::: correct

```ts
function useResize() {
  const count = 0
  const __proto__ = null
  return { count: count, ['total']: count, __proto__, ['__proto__']: __proto__ }
}
```

:::

## :wrench: Options

```js
{
  'vue-perfectionist/require-composable-return-bindings': [
    'error',
    {
      functionPattern: '^use[A-Z]',
      ignoreNames: [],
      allowAliases: true,
      allowParameters: false,
    },
  ],
}
```

| Option            | Type       | Default       | Meaning                                                                                                                              |
| ----------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `functionPattern` | `string`   | `'^use[A-Z]'` | Regular expression matching the function binding name. An empty string matches every named definition. Invalid regexes are rejected. |
| `ignoreNames`     | `string[]` | `[]`          | Exact binding names to exclude, taking precedence over the pattern. Replaces the list; empty excludes nothing.                       |
| `allowAliases`    | `boolean`  | `true`        | Allow static public keys to differ from binding names.                                                                               |
| `allowParameters` | `boolean`  | `false`       | Allow current function parameter bindings, including destructured, default, and rest parameters.                                     |

### `allowAliases`

With `allowAliases: false`, compare the static public key with the referenced
binding name. Explicit `direction: direction` remains allowed; this option does
not require shorthand syntax. When destructuring a parameter, use the local
binding name rather than the original parameter property name.

::: correct return-bindings-no-aliases

```ts
function useResize() {
  const direction = 'horizontal'
  return { direction, direction: direction, ['direction']: direction }
}
```

:::

::: incorrect return-bindings-no-aliases

```ts
function useResize() {
  const direction = 'horizontal'
  return { resizeDirection: direction }
}
```

:::

### `allowParameters`

With `allowParameters: true`, parameters of the current composable qualify.
Parameters from an enclosing function still do not qualify. Alias policy applies
independently to allowed parameters.

::: correct return-bindings-parameters

```ts
function useResize(target, { disabled }) {
  return { target, disabled }
}
```

:::

### Function selection

For example, check `createXxx` definitions except `createLegacy`:

```js
{ functionPattern: '^create[A-Z]', ignoreNames: ['createLegacy'] }
```

::: correct return-bindings-custom-names

```ts
function createLegacy() {
  return { enabled: true }
}
function useResize() {
  return { enabled: true }
}
```

:::

::: incorrect return-bindings-custom-names

```ts
function createResize() {
  return { enabled: true }
}
```

:::

## Scope

Supports standalone JS/TS and both ordinary `<script>` and `<script setup>` in
Vue SFCs. Template expressions are not checked. Select files with ESLint
`files` and `ignores`.

Checks matching function declarations and arrow/function expressions directly
assigned to identifier variables. The variable name takes precedence over an
internal function-expression name. Named default exports, async functions,
nested named definitions, and each direct-return branch are supported.

Only directly returned object literals are checked, including arrow expression
bodies and transparent parentheses / TypeScript `as`, `satisfies`, type assertions,
and non-null wrappers. Nested callback returns do not belong to an outer
composable; matching nested functions are checked independently.

Indirect returns (`return result`), wrapper calls (`return reactive({ count })`),
conditional returns (`return ready ? { count } : {}`), anonymous default exports,
object/class methods, generators, and higher-order wrappers are outside scope.
The rule does not require a function to return an object.

## Diagnostics and fixes

Each invalid member produces at most one diagnostic. Spreads, dynamic keys, and
prototype setters are checked before field values; binding locality and parameter
policy are checked before aliases.

No automatic fixes or suggestions are provided. Extracting an expression can
change evaluation timing, branch behavior, closures, or accessors, and generated
names can conflict. Choose the declaration and its location manually.

Enable [sort-composable-return](/rules/sort-composable-return) independently to
check member grouping and spacing. This rule checks how fields are produced;
the sorting rule checks their layout.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-composable-return-bindings.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-composable-return-bindings.test.ts)
