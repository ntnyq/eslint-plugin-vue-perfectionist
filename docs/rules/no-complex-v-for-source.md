---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-complex-v-for-source
description: Disallow complex expressions in Vue v-for sources.
---

# vue-perfectionist/no-complex-v-for-source

> Disallow complex expressions in Vue `v-for` sources.

Keep iteration sources readable by moving complex expressions into script
variables or computed properties. This rule reports without automatic fixes or
suggestions.

## Usage

This complete flat configuration supports JavaScript and TypeScript Vue SFCs:

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/no-complex-v-for-source': 'error',
    },
  },
]
```

## :book: Rule Details

The rule checks only the source to the right of `in` or `of`. Identifiers,
property access, computed keys, and optional chaining are accepted. Calls and
primitive literals are allowed by default:

::: correct

```vue
<template>
  <div
    v-for="(item, index) in items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in ITEMS"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in props.items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in state?.items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[key]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[0]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems()"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items.filter(predicate)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getData().items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[getKey()]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(n, index) in 10"
    :key="index"
  >
    {{ n }}
  </div>
  <div
    v-for="(char, index) in 'hello'"
    :key="index"
  >
    {{ char }}
  </div>
</template>
```

:::

Array and object literals, ternary and logical expressions, arithmetic,
assignments, updates, comma expressions, constructors, inline functions, and
interpolated template literals are rejected. Member receivers and computed keys
are checked recursively, so property access cannot hide a complex source:

::: incorrect

```vue
<template>
  <div
    v-for="(item, index) in [1, 2, 3]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(value, index) in { a: 1 }"
    :key="index"
  >
    {{ value }}
  </div>
  <div
    v-for="(item, index) in enabled ? a : b"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items || []"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in [a, b][0]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[index + 1]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in new Set(items)"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

## :wrench: Options

The default configuration is:

```js
{
  'vue-perfectionist/no-complex-v-for-source': [
    'error',
    {
      allowCallExpression: true,
      allowLiteral: true,
    },
  ],
}
```

| Option                | Type      | Default | Meaning                                                         |
| --------------------- | --------- | ------- | --------------------------------------------------------------- |
| `allowCallExpression` | `boolean` | `true`  | Allow calls in the source, member receivers, and computed keys. |
| `allowLiteral`        | `boolean` | `true`  | Allow primitive literals directly as the iteration source.      |

### `allowCallExpression`

With `{ allowCallExpression: false }`, these calls are reported, including
optional calls and calls nested in property access:

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-complex-v-for-source
<script setup>
/* eslint vue-perfectionist/no-complex-v-for-source: [error, { allowCallExpression: false }] */
</script>

<template>
  <div
    v-for="(item, index) in getItems()"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items.filter(predicate)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getData().items"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[getKey()]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems?.()"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

When calls are allowed, their callee is checked recursively. For example,
`[a, b].filter(predicate)` is still rejected because its receiver is an array
literal. Call arguments, spread arguments, and callback bodies are not checked:

::: correct

```vue
<template>
  <div
    v-for="(item, index) in getItems(10)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems([1, 2], { active: true })"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems(ok ? first : second)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems(...args)"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in items.filter(item => item.active)"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

### `allowLiteral`

With `{ allowLiteral: false }`, direct primitive sources are reported:

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-complex-v-for-source
<script setup>
/* eslint vue-perfectionist/no-complex-v-for-source: [error, { allowLiteral: false }] */
</script>

<template>
  <div
    v-for="(n, index) in 10"
    :key="index"
  >
    {{ n }}
  </div>
  <div
    v-for="(char, index) in 'hello'"
    :key="index"
  >
    {{ char }}
  </div>
</template>
```

:::

The option includes number, string, boolean, null, and bigint literals, signed
numeric literals, and template literals without substitutions. Regular
expressions, arrays, and objects are never treated as primitive literals. The
rule checks syntax; it does not establish whether a value is a useful or valid
Vue iteration source.

The option only controls a literal used directly as the source, including
through parentheses or TypeScript assertions. Literals in member receivers,
computed keys, or call arguments remain accepted:

::: correct

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/no-complex-v-for-source
<script setup>
/* eslint vue-perfectionist/no-complex-v-for-source: [error, { allowLiteral: false }] */
</script>

<template>
  <div
    v-for="(item, index) in ITEMS"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in groups[0]"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in state['items']"
    :key="index"
  >
    {{ item }}
  </div>
  <div
    v-for="(item, index) in getItems(10)"
    :key="index"
  >
    {{ item }}
  </div>
</template>
```

:::

Both options are independent. Disabling both still accepts references and
property access such as `items`, `state.items`, and `groups[0]`.

## Scope

- Checks `v-for` on native elements, components, and nested `<template>` elements.
  Each source receives at most one diagnostic spanning the source expression.
- Checks member receivers, computed keys, and call callees recursively.
  Parentheses, optional chains, TypeScript assertions, non-null assertions,
  `satisfies`, and generic instantiations do not bypass the checks.
- Does not inspect aliases or destructuring defaults to the left of `in` / `of`,
  other directive values, interpolations, or script implementations.
- Does not follow variable initializers, imports, computed getters, or function
  implementations. A variable initialized with an array or a call is accepted.
- Works with no script, ordinary scripts, setup scripts, or both script blocks.
  Standalone JavaScript and TypeScript files are unaffected. Parsers without
  Vue's template visitor service are skipped safely.
- Skips missing, empty, and unparseable directive values. Use Vue correctness
  rules for invalid `v-for` syntax.

## Automatic fixes

There are no automatic fixes or suggestions. Extracting a source requires
choosing a declaration location and preserving template-local bindings,
reactivity, and evaluation timing. Move the expression into a suitable script
variable, computed property, or function manually.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-complex-v-for-source.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-complex-v-for-source.test.ts)
