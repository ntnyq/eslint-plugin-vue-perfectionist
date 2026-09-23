---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/component-prop-values
description: Enforce configured prop value constraints at Vue component usage sites.
---

# vue-perfectionist/component-prop-values

> Enforce configured prop value constraints at Vue component usage sites.

Use this rule to require values such as multiples of ten, bounded numbers,
allowed variants, or strings with a particular length or pattern. These are
lightweight constraints implemented by the rule, not a JSON Schema dialect.
No additional validation dependency is required.

The rule reports without automatic fixes or suggestions. Choosing another prop
value can change application behavior.

## Usage

Register the plugin with the Vue parser in your flat configuration:

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: { parser: vueParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/component-prop-values': [
        'error',
        {
          targets: [
            {
              components: ['AppStepCounter'],
              props: { count: { multipleOf: 10 } },
            },
          ],
          unknownValues: 'report',
        },
      ],
    },
  },
]
```

For TypeScript SFCs, configure `@typescript-eslint/parser` as the Vue parser's
`parserOptions.parser`. See the [setup guide](../guide/index.md#basic-usage).

## :book: Rule Details

These examples use the configuration above. Every known candidate must satisfy
the configured constraints. Numeric constraints require finite numbers and do
not convert strings.

::: correct

```vue
<template>
  <AppStepCounter :count="20" />
  <AppStepCounter :count="0" />
  <AppStepCounter :count="-10" />
  <AppStepCounter :count="10 * 3" />
  <AppStepCounter :count="enabled ? 20 : 30" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppStepCounter :count="25" />
  <AppStepCounter count="20" />
  <AppStepCounter :count="enabled ? 20 : 25" />
</template>
```

:::

A known invalid branch is reported even when another branch is unknown and
`unknownValues` is `'ignore'`. Multiple failed constraints produce one diagnostic
per supplied prop. The diagnostic lists the failed constraints and invalid values.

With `unknownValues: 'report'`, an unresolved value produces a separate kind of
diagnostic explaining that it cannot be verified:

::: incorrect

```vue
<template>
  <AppStepCounter :count="currentCount" />
  <AppStepCounter :count="getCount()" />
  <AppStepCounter :count="value * 10" />
  <AppStepCounter
    :count="20"
    v-bind="extra"
  />
</template>
```

:::

An unknown later binding may overwrite a known value. A known later binding
can establish it again:

::: correct

```vue
<template>
  <AppStepCounter
    v-bind="extra"
    :count="20"
  />
  <AppStepCounter v-bind="{ ...extra, count: 20 }" />
</template>
```

:::

## :wrench: Options

The defaults perform no checks until targets are configured:

```js
{
  targets: [],
  unknownValues: 'ignore',
}
```

### targets

`targets` is an array of `{ components: string[], props: Record<string, Constraint> }`.
Each entry requires at least one component and one prop constraint. The list
replaces the empty default; `[]` disables checking.

Component names match explicitly: `AppStepCounter` and `app-step-counter` are equivalent,
but `appstepcounter` is a different name. Prop names match camelCase and kebab-case.
There is no import resolution, wildcard matching, or component declaration lookup.
Equivalent repeated contracts merge; different constraints for the same normalized
component and prop are configuration errors. Enum order and constraint key order
do not matter when comparing contracts.

### Prop constraints

| Constraint                | Configuration                                                         | Meaning                                                              |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `enum`                    | Nonempty array of unique strings, finite numbers, booleans, or `null` | The value must equal one candidate without coercion.                 |
| `multipleOf`              | Positive safe integer                                                 | A finite number must be an exact multiple of this divisor.           |
| `minimum` / `maximum`     | Finite numbers                                                        | Inclusive numeric bounds.                                            |
| `minLength` / `maxLength` | Nonnegative safe integers                                             | Inclusive string length bounds, counted in Unicode code points.      |
| `pattern`                 | Regular expression source string                                      | A string must match the expression, compiled once with the `u` flag. |

Each constraint object must contain at least one supported key. Unknown keys,
invalid regular expressions, reversed bounds, and mixed numeric/string constraints
are configuration errors. These constraints imply their value category; no `type`
field is needed or accepted. All constraints for one prop must hold, including
`enum` when combined with numeric or string constraints.

For example:

```js
{
  targets: [
    {
      components: ['AppStepCounter'],
      props: {
        count: { multipleOf: 10, minimum: 0, maximum: 100 },
        label: { minLength: 1, maxLength: 20, pattern: '^\\S' },
        variant: { enum: ['primary', 'secondary', 'danger'] },
      },
    },
  ],
}
```

`multipleOf` does not support decimal divisors. Numeric operations use JavaScript
number semantics, with no rounding tolerance. Zero and negative multiples are
allowed unless bounds exclude them. `NaN` and infinities never satisfy numeric
constraints.

Lengths count code points, not UTF-16 code units or user-perceived grapheme clusters:
`'😀'` has length one, while a combining sequence may have length greater than one.
`pattern` takes source text without slash delimiters or flags. It does not add
anchors; use `^` and `$` when the entire string must match. An empty pattern matches
all strings. Escape backslashes for the surrounding JavaScript configuration string.

Static valueless attributes provide `''`. Boolean casting from a component's prop
declaration is not inferred or applied. Arrays, objects, functions, bigint,
`undefined`, and symbols are outside the supported scalar value domain; known
incompatible categories are reported. No object deep comparison, custom functions,
remote references, array constraints, or nested schemas are supported.

### unknownValues

- `'ignore'` (default): skip unresolved values; this does not establish validity.
- `'report'`: report when a supplied value cannot be verified statically.

This option concerns values of definitely supplied props. Missing props and bindings
whose presence itself is uncertain are handled separately by
[`require-component-props`](./require-component-props.md). For example, an isolated
`v-bind="extra"` does not establish that `count` is supplied, so this rule skips it.
Combine the two rules for required props with strict value checking.

## Scope

- Checks Vue SFC templates, including files with JavaScript, TypeScript, ordinary
  scripts, setup scripts, dual scripts, or no script. Standalone JS/TS, JSX, and
  render functions are outside the scope.
- Native HTML/SVG/MathML tags and `v-pre` subtrees are skipped. Static dynamic
  component identities such as `<component is="AppStepCounter">` and
  `<component :is="'AppStepCounter'">` are recognized; variable identities are skipped.
- Static attributes, named `v-bind`, inline object spreads with known keys,
  static computed arguments, and `v-model` are supported. Default `v-model` supplies
  `modelValue`; modifiers do not imply value coercion.
- Unknown spreads, computed keys, `.prop`/`.attr`, or mixed raw spellings for one
  normalized prop leave affected values uncertain. Raw keys follow source order;
  getters are never executed. Reserved attributes and event listener names cannot
  be configured as prop contracts.
- Recognizes scalar literals, interpolation-free template strings, conditional
  branches, numeric unary `+`, `-`, `~`, and numeric binary `+`, `-`, `*`, `/`, `%`,
  `**`. Both conditional branches are checked conservatively. TypeScript assertions,
  non-null assertions, and `satisfies` preserve the underlying expression.
- Does not evaluate script constants, identifiers, member access, function calls,
  interpolated strings, logical expressions, or coercing arithmetic. Known types
  may still establish a mismatch when the exact value is unavailable. Expression
  analysis is bounded to 32 recursive levels and 64 candidates; expressions beyond
  these limits are treated as unknown.

The rule is independent of [`component-prop-types`](./component-prop-types.md).
Numeric and string constraints already enforce their own categories, so a separate
type constraint is unnecessary when only these value restrictions are desired.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/component-prop-values.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/component-prop-values.test.ts)
