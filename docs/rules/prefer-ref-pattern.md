---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-ref-pattern
description: Enforce a naming pattern for Vue template references.
---

# vue-perfectionist/prefer-ref-pattern

> Enforce a naming pattern for Vue template references.

This rule checks names where references are used: template `ref` attributes,
`useTemplateRef()` keys, and `ref` properties passed to Vue's `h()`.
It does not check ordinary reactive state declarations.

The rule reports without automatic fixes or suggestions. A regular expression
cannot determine a unique replacement name, and renaming a ref may affect
script bindings, templates, and `$refs` access.

Enable this naming preference explicitly in your ESLint configuration.

## Usage

Add the rule to your existing Vue parser and plugin configuration:

```js
{
  rules: {
    'vue-perfectionist/prefer-ref-pattern': ['error', {
      pattern: '.+Ref$',
      targets: ['template', 'useTemplateRef', 'render'],
    }],
  },
}
```

See the [guide](../guide/index.md#basic-usage) for a complete flat configuration.
Templates require `vue-eslint-parser`. Script checks also work in JavaScript
and TypeScript files with their usual ESLint parser when the rule is enabled
for those files. TypeScript requires a TypeScript parser.

## :book: Rule Details

The following examples use the default pattern, `.+Ref$`:

::: correct

```vue
<script setup>
import { ref, useTemplateRef } from 'vue'

const element = useTemplateRef('tableRef')
const inputRef = ref(null)
const count = ref(0)
</script>

<template>
  <table ref="tableRef" />
  <input :ref="inputRef" />
  <section ref="panelRef" />
</template>
```

:::

`element` is allowed: the `useTemplateRef` target checks its key, and does not
require the variable name to equal that key. `count` is ordinary state, so its
name is not checked. If `element` is explicitly used in `:ref="element"` or
`h('div', { ref: element })`, its name is checked at that usage site.

::: incorrect

```vue
<script setup>
import { ref, useTemplateRef } from 'vue'

const element = useTemplateRef('table')
const panel = ref(null)
</script>

<template>
  <table ref="table" />
  <section :ref="panel" />
</template>
```

:::

Each nonmatching usage is reported independently. Both `useTemplateRef('table')`
and `ref="table"` produce a diagnostic.

Render functions use the same convention:

```js
import { h, shallowRef } from 'vue'

const tableRef = shallowRef(null)
const panel = shallowRef(null)

h('table', { ref: tableRef }) // Valid
h('table', { ref: 'tableRef' }) // Valid
h('section', { ref: panel }) // Reported
h('section', { ref: 'panel' }) // Reported
```

## :wrench: Options

| Option    | Default                                    | Description                                                         |
| --------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `pattern` | `'.+Ref$'`                                 | JavaScript regular expression source matched against each ref name. |
| `targets` | `['template', 'useTemplateRef', 'render']` | Usage sites to check. An empty array disables all checks.           |

### pattern

Pass a regular expression source string, without `/` delimiters or flags.
The rule does not add anchors or change case. Use `^` and `$` to require a
match over the whole name. Invalid regular expressions are configuration errors.

| Pattern                               | Convention                                         | Matching example   |
| ------------------------------------- | -------------------------------------------------- | ------------------ |
| `.+Ref$`                              | `Ref` suffix with at least one preceding character | `tableRef`         |
| `^ref[A-Z]`                           | `ref` prefix followed by an uppercase letter       | `refTable`         |
| `^[a-z][a-zA-Z0-9]*Ref$`              | camelCase with a `Ref` suffix                      | `searchInputRef`   |
| `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-ref$` | kebab-case with a `-ref` suffix                    | `search-input-ref` |

### targets

| Target           | Checked values                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `template`       | Static `ref="name"` attributes, string literals and interpolation-free template literals in `:ref`, and confirmed ref identifiers from `<script setup>`. |
| `useTemplateRef` | String literals and interpolation-free template literals in the first argument of Vue's `useTemplateRef()`.                                              |
| `render`         | String literals, interpolation-free template literals, and confirmed ref identifiers in the second argument object of Vue's `h()`.                       |

For example, enforce a kebab-case convention only on template names and
`useTemplateRef` keys:

```js
{
  pattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-ref$',
  targets: ['template', 'useTemplateRef'],
}
```

Targets replace the default list. They must be unique and use the names above.

## Recognition and Limits

- Vue APIs must be explicitly imported from `vue`. Named import aliases and
  namespace imports are supported, including static namespace property access.
  Local functions, shadowed bindings, type-only imports, imports from other
  modules, and unimported auto-import globals are skipped.
- A confirmed ref identifier has a direct `ref()`, `shallowRef()`, or
  `useTemplateRef()` initializer from Vue and is not reassigned. TypeScript
  assertions, non-null assertions, and `satisfies` wrappers are supported.
- Template identifiers are resolved only against `<script setup>` declarations.
  Same-name declarations and assignments in an ordinary `<script>` block do
  not affect setup ref recognition. `v-for` and slot bindings take precedence.
  Options API `setup()` return-value
  mappings, destructuring, aliases of ref variables, and custom composable
  return values are not inferred. Static template strings are still checked
  with ordinary `<script>` or no script block.
- Function refs, member expressions, conditional expressions, interpolated
  strings, and dynamically selected directive arguments are skipped. Constants
  holding string keys are not evaluated. `.prop` and `.attr` bindings are skipped
  because they target ordinary properties or attributes instead of template refs.
- Render checks inspect inline props objects, including shorthand `ref` and
  static computed property names. Numeric property names do not hide an earlier
  `ref` property. Later properties override earlier ones;
  a later spread or unknown computed key makes an earlier ref uncertain and
  it is skipped. Props variables, `mergeProps()`, JSX, and other render APIs
  are outside this rule's scope.

## References

- [Original template-ref-pattern proposal](https://github.com/vuejs/eslint-plugin-vue/issues/2139)
- [Vue template refs](https://vuejs.org/guide/essentials/template-refs.html)

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-ref-pattern.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-ref-pattern.test.ts)
