---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-vue-generic
description: Require explicit @vue-generic comments on configured components.
---

# vue-perfectionist/require-vue-generic

> Require explicit `@vue-generic` comments on configured components.

## Usage

Configure the Vue parser and list the components to check. No components are
checked by default. Exemptions are opt-in; no component library contracts are
built in.

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-vue-generic': [
        'error',
        {
          targets: [
            {
              components: ['ElTableColumn'],
              ignoreWhen: [{ props: { type: { enum: ['index'] } } }],
            },
            { components: ['BusinessSelect', 'BusinessTreeSelect'] },
          ],
          unknownValues: 'report',
        },
      ],
    },
  },
]
```

For TypeScript SFCs, also configure `@typescript-eslint/parser` as
`languageOptions.parserOptions.parser`, as shown in the [guide](../guide/index.md).

## :book: Rule Details

The following examples target `ElTableColumn`, exempting usages whose `type`
is definitely `'index'`. A usage without an exemption requires a preceding
comment with nonempty `@vue-generic {...}` content.

::: correct

```vue
<template>
  <!-- @vue-generic {import('#types').IAiCourse} -->
  <ElTableColumn label="Actions">
    <template #default="{ row }">
      <TableActionList :row />
    </template>
  </ElTableColumn>
  <ElTableColumn type="index" />
</template>
```

:::

Both `type="index"` and `:type="'index'"` satisfy this exemption.

::: incorrect

```vue
<template>
  <ElTableColumn label="Actions" />
  <ElTableColumn type="selection" />
  <!-- @vue-generic {} -->
  <ElTableColumn />
</template>
```

:::

### Comment content and association

Imported type names, inline types, `import()` types, and multiple generic
arguments are accepted. The rule checks nonempty braced content, leaving type
syntax, resolution, arity, and component compatibility to `vue-tsc`.

Whitespace and ordinary comments may separate the directive from its component.
Within a preceding comment group, the last braced `@vue-generic` directive
wins. An empty final directive does not satisfy the rule. Directives lacking
outer braces are ignored.

::: correct

```vue
<script setup lang="ts">
import type { IAiCourse } from '#types'
</script>

<template>
  <!-- @vue-generic {IAiCourse} -->
  <!-- Render row actions. -->
  <ElTableColumn />
  <!-- @vue-generic {{ id: number }, string} -->
  <ElTableColumn />
</template>
```

:::

The comment must precede the usage within the same parent. Other elements,
non-whitespace text, and interpolations interrupt association. A parent
component's generic does not satisfy its children, and a comment is not reused
for the next sibling. Whitespace within `<pre>` also interrupts association.

::: incorrect

```vue
<template>
  <!-- @vue-generic {Course} -->
  <OtherComponent />
  <ElTableColumn />

  <!-- @vue-generic {Course} -->
  <ElTableColumn>
    <ElTableColumn />
  </ElTableColumn>
</template>
```

:::

### Uncertain exemptions

Dynamic values and spreads that might overwrite an exemption prop cannot
establish a definite exemption. The default `unknownValues: 'report'` still
requires a generic comment:

::: incorrect

```vue
<template>
  <ElTableColumn :type="columnType" />
  <ElTableColumn
    type="index"
    v-bind="extra"
  />
</template>
```

:::

With `unknownValues: 'ignore'`, these uncertain usages are accepted. A prop
that is definitely absent or definitely fails a condition still requires a
comment. Unknown unrelated props do not exempt the entire component.

## :wrench: Options

Defaults:

```js
{
  targets: [],
  unknownValues: 'report',
}
```

### `targets`

Type: `RequireVueGenericTarget[]`. Default: `[]`.

An empty array disables checks; there are no built-in targets to extend.
Each target has:

| Field        | Type                                                        | Default  | Meaning                                    |
| ------------ | ----------------------------------------------------------- | -------- | ------------------------------------------ |
| `components` | `string[]`                                                  | Required | Nonempty list of explicit component names. |
| `ignoreWhen` | `{ props: Record<string, ComponentPropValueConstraint> }[]` | `[]`     | Alternative exemption conditions.          |

PascalCase and kebab-case are equivalent. Normalized component names must be
unique across all targets, including aliases within one target. Overlapping
targets are rejected instead of silently merging exemptions.

### `targets[].ignoreWhen`

Any definitely matching condition exempts the usage. Within one condition,
every listed prop must be present and satisfy all its constraints. An empty
`ignoreWhen` list provides no exemptions; empty `props` or constraint objects
are rejected. CamelCase and kebab-case prop names are equivalent; duplicate
normalized prop names within a condition are rejected.

The constraint format is shared with
[`component-prop-values`](./component-prop-values.md): `enum`, `pattern`,
`minLength`, `maxLength`, `minimum`, `maximum`, and `multipleOf`. Enum values
are scalar strings, finite numbers, booleans, or `null`, compared without
coercion. Patterns are Unicode regular expression sources without implicit
anchors. Lengths count Unicode code points. Numeric and string constraints
cannot be mixed, bounds must be ordered, and `multipleOf` must be a positive
safe integer. Unsupported prop names such as `class`, `ref`, `is`, and event
listener keys are rejected, as with the component prop rules.

For example, this exempts either an index column or a column whose field starts
with `internal` and whose count is an even number between 2 and 4:

```js
{
  targets: [
    {
      components: ['AppColumn'],
      ignoreWhen: [
        { props: { type: { enum: ['index'] } } },
        {
          props: {
            fieldName: { pattern: '^internal' },
            count: { minimum: 2, maximum: 4, multipleOf: 2 },
          },
        },
      ],
    },
  ],
}
```

The rule resolves scalar literals, supported numeric constant operations,
template literals without substitutions, conditional expression variants, and
object literal bindings with nested spreads. It does not execute code, follow
script variables, trust asserted types, or apply child prop defaults.
Binding order matters: a known write after an unknown spread can establish a
value; a later unknown spread can invalidate it. Dynamic argument names and
`.prop` / `.attr` bindings introduce uncertainty for affected props.

### `unknownValues`

Type: `'report' | 'ignore'`. Default: `'report'`.

- `report`: require a comment unless an exemption is definitely satisfied.
- `ignore`: also skip usages that might satisfy an exemption. A definite
  mismatch in any prop defeats that condition, even if another prop is unknown.

If a conditional expression has both matching and failing variants, its
condition is uncertain. Alternative conditions are evaluated independently;
the rule does not prove correlations between different props or combine
partial matches from different conditions. With no exemption conditions,
`ignore` has no effect.

## Scope

- Checks Vue SFC templates, including template-only files and files with
  ordinary scripts, setup scripts, or both. Skips native tags and `v-pre`
  subtrees. Standalone scripts, render functions, and TSX are outside its scope.
- Matches explicit component spellings without resolving imports or aliases.
  Supports static `<component is="ElTableColumn">` and
  `<component :is="'ElTableColumn'">` selectors through the shared component
  matcher. Unresolved dynamic component identities are skipped.
- Requires an explicit comment even if props could infer the generic or a
  script binding specializes the component. Configure only the component names
  that should follow this convention.
- A current component's `<script setup generic="T">` declaration, `generic`
  attributes, and `:generic` bindings do not satisfy the rule.
- This rule does not verify whether the configured component actually supports
  generics. See [Vue's generic component documentation](https://vuejs.org/api/sfc-script-setup.html#generics)
  for the language feature.

### Diagnostics and fixes

`missingVueGeneric` points to the component's opening tag name for missing,
misplaced, or empty comments. This rule provides no automatic fixes or
suggestions: the correct generic type must be chosen by the author.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-vue-generic.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-vue-generic.test.ts)
