---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-component-props
description: Require configured props at Vue component usage sites.
---

# vue-perfectionist/require-component-props

> Require configured props at Vue component usage sites.

## Usage

Configure the Vue parser and list the component contracts to enforce. No components are checked by default.

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-component-props': [
        'error',
        {
          targets: [{ components: ['AppCounter'], props: ['count'] }],
          unknownBindings: 'report',
        },
      ],
    },
  },
]
```

For TypeScript SFCs, also configure `@typescript-eslint/parser` as `languageOptions.parserOptions.parser`, as shown in the [guide](../guide/index.md).

## :book: Rule Details

The following examples require `count` on `AppCounter`. This checks whether the caller provides the prop, independently of its value or any default declared by the child component.

::: correct

```vue
<template>
  <AppCounter :count="1" />
  <AppCounter count />
  <AppCounter :count="null" />
  <AppCounter :count="undefined" />
  <AppCounter :count />
  <AppCounter v-bind="{ count: 1 }" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppCounter />
  <AppCounter v-bind="{ title: 'Example' }" />
</template>
```

:::

Use [component-prop-types](./component-prop-types.md) alongside this rule to constrain values. For example, `:count="null"` satisfies presence but does not satisfy a `number` contract.

### Uncertain bindings

Unknown object spreads and dynamic argument names might supply a missing prop. By default, the rule reports `unverifiableRequiredProp` rather than incorrectly claiming that the prop is absent.

::: incorrect

```vue
<template>
  <AppCounter v-bind="extra" />
  <AppCounter :[key]="value" />
</template>
```

:::

Once a key is definitely provided, a later unknown spread can change its value but cannot remove its presence:

::: correct

```vue
<template>
  <AppCounter
    :count="1"
    v-bind="extra"
  />
  <AppCounter v-bind="{ count: 1, ...extra }" />
  <AppCounter v-bind="{ ...extra, count: 1 }" />
</template>
```

:::

## :wrench: Options

Defaults:

```js
{
  targets: [],
  unknownBindings: 'report',
}
```

### `targets`

Type: `{ components: string[], props: string[] }[]`. Default: `[]`.

Each entry requires nonempty, unique component and prop lists. An empty `targets` array disables checks. There are no built-in targets to extend. Overlapping targets merge their required props, including equivalent camelCase/kebab-case names, with at most one report per prop and element.

```js
{
  targets: [
    { components: ['AppPagination'], props: ['currentPage', 'pageSize'] },
    { components: ['AppInput', 'AppSelect'], props: ['modelValue'] },
  ],
}
```

### `unknownBindings`

Type: `'report' | 'ignore'`. Default: `'report'`.

`ignore` suppresses only uncertain presence. A known object without a required key still produces `missingProp`. This does not skip all checks on an element.

## Scope

- Checks SFC templates through `vue-eslint-parser`, including template-only files and files with ordinary scripts, setup scripts, or both. Standalone scripts and render functions are not checked.
- Matches explicit component names: `AppCounter` and `app-counter` match, while `appcounter` and an unconfigured import alias do not. No import resolution, regular expressions, glob patterns, or cross-file analysis is performed.
- Prop names use Vue-style camelization: `pageSize` and `page-size` match; `pagesize` and `page_size` do not.
- Skips native HTML, SVG, and MathML tags and `v-pre` subtrees. Custom-element compiler settings are not resolved; a custom tag explicitly listed in `targets` is checked.
- Supports `<component is="AppCounter">` and `<component :is="'AppCounter'">`. A dynamic component identity such as `:is="current"` is skipped. The `is` selector must be explicit, not supplied through an object binding.
- Recognizes static attributes, `v-bind:prop`, same-name `:prop`, object literal bindings, static computed string keys, and nested object literal spreads. Unknown spreads and computed names make the affected presence uncertain. Accessors and methods with known keys still provide those keys.
- Recognizes default `v-model` as `modelValue` and named `v-model:count` as `count`. Modifiers do not change this presence check; generated modifier props and update listeners are not inferred.
- Resolves string-valued dynamic arguments such as `:['count']`, and supports `.camel`. `.prop` and `.attr` bindings are uncertain for the named prop rather than assumed to supply ordinary component props.
- Rejects contracts for `class`, `style`, `key`, `ref`, `refFor`, `refKey`, `ref_for`, `ref_key`, `is`, and event listener keys such as `onClick`. Their merge or framework semantics are outside these contracts.
- Duplicate attributes and malformed directives remain the responsibility of Vue syntax rules. This rule does not add syntax diagnostics.

### Diagnostics and fixes

`missingProp` points to the component tag name. `unverifiableRequiredProp` points to a binding that prevents proving presence. Configured prop spelling is retained in messages.

This rule provides no automatic fixes or suggestions: it cannot choose a correct value for the missing prop. Component defaults do not satisfy a caller-side requirement.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-component-props.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-component-props.test.ts)
