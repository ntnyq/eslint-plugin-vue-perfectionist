---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-complex-template-expression
description: Limit logical operators and conditional nesting in Vue templates.
---

# vue-perfectionist/no-complex-template-expression

> Limit logical operators and conditional nesting in Vue templates.

## Usage

Configure `vue-eslint-parser`; see [Getting Started](/guide/).

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/no-complex-template-expression': 'error' },
  },
]
```

## :book: Rule Details

Keep conditions and bindings readable by extracting branching into computed
properties or named functions. Simple translation and formatting calls are fine.

::: correct

```vue
<template>
  <button
    :disabled="isDisabled"
    type="button"
  >
    {{ t('submit') }}
  </button>
  <span>{{ ready ? label : fallback }}</span>
  <div v-if="name && source && category" />
</template>
```

:::

::: incorrect

```vue
<template>
  <button
    :disabled="!name.trim() || (!source && !category) || uncertain"
    type="button"
  />
  <span>{{ pending ? 'loading' : failed ? 'error' : 'done' }}</span>
</template>
```

:::

## :wrench: Options

```json
{
  "maxLogicalExpressions": 2,
  "maxConditionalDepth": 1,
  "directives": ["if", "else-if", "show", "bind"],
  "checkInterpolations": true,
  "ignoreScopeReferences": false
}
```

- `maxLogicalExpressions` (nonnegative integer, default `2`): total number of
  `&&`, `||`, and `??` operators in each expression. `a && b && c` has two.
  Counts across call arguments, arrays, objects, computed keys, and inline
  callback bodies. `0` prohibits all logical operators.
- `maxConditionalDepth` (nonnegative integer, default `1`): deepest nesting of
  ternary expressions. A single ternary has depth one. Nested tests and branches
  count equally; sibling ternaries do not add depth. `0` prohibits ternaries.
- `directives` (array, default `["if", "else-if", "show", "bind"]`): replaces
  checked directive names, without the `v-` prefix or argument. Also accepts
  `text`, `html`, `model`, and `memo`. `[]` disables directive checks.
- `checkInterpolations` (boolean, default `true`): checks `{{ expression }}`.
- `ignoreScopeReferences` (boolean, default `false`): skip an entire expression
  if it references a runtime-visible `v-for` or slot variable. Type-only
  references do not qualify. A `v-if`/`v-else-if` cannot use its own element's
  `v-for` aliases, and slot variables are only visible to descendants. Outer
  loop or slot variables still qualify in those positions. Other expressions
  on the same element are still checked. By default, local expressions are checked:
  extract them into a function accepting `item`/`row`, or into a child component,
  rather than a computed property that cannot access template locals.

For example, permit three logical operators and skip expressions that depend on
loop or slot variables:

```json
{ "maxLogicalExpressions": 3, "ignoreScopeReferences": true }
```

## Scope

Only checks Vue template expressions with `vue-eslint-parser`. Plain JS/TS,
script blocks, static attributes, dynamic directive arguments, and empty or
unparseable expressions are skipped. TypeScript expression wrappers do not
reset either metric; erased type annotations and type arguments do not count.
Each binding/interpolation has independent counters.

Calls, arithmetic, member access, optional chaining, and negation have no cost
by themselves. Their nested logical and conditional expressions still count.
The rule measures these two specific metrics, not every kind of complexity.
An expression exceeding both limits receives two diagnostics, both located on
the complete expression.

`v-on`, `v-for` sources, and slot binding patterns are always outside this rule.
Use [prefer-simple-event-handler](./prefer-simple-event-handler.md) and
[no-complex-v-for-source](./no-complex-v-for-source.md) for their separate checks.

No automatic fix or suggestion is provided. Extraction requires choosing a
meaningful name and preserving reactivity and template-local scope.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-complex-template-expression.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-complex-template-expression.test.ts)
