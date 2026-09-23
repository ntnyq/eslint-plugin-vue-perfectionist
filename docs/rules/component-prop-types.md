---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/component-prop-types
description: Enforce configured prop value types at Vue component usage sites.
---

# vue-perfectionist/component-prop-types

> Enforce configured prop value types at Vue component usage sites.

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
      'vue-perfectionist/component-prop-types': [
        'error',
        {
          targets: [{ components: ['AppStepper'], props: { count: 'number' } }],
          unknownValues: 'ignore',
        },
      ],
    },
  },
]
```

For TypeScript SFCs, also configure `@typescript-eslint/parser` as `languageOptions.parserOptions.parser`, as shown in the [guide](../guide/index.md).

## :book: Rule Details

These examples configure `count: 'number'` on `AppStepper`. Static attribute values are strings; a numeric prop requires an expression producing a number.

::: correct

```vue
<template>
  <AppStepper :count="20" />
  <AppStepper :count="-42" />
  <AppStepper :count="condition ? 1 : 2" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppStepper count="20" />
  <AppStepper count="20" />
  <AppStepper :count="null" />
  <AppStepper :count="condition ? 1 : '2'" />
</template>
```

:::

Missing props are not type errors. Use [require-component-props](./require-component-props.md) to require presence. Unknown expressions are ignored by default, which means no type conclusion was reached, not that the value passed validation.

### Effective values and binding order

The rule follows ordinary prop overwrite order for explicit attributes and object bindings:

::: correct

```vue
<template>
  <AppStepper
    count="wrong"
    v-bind="{ count: 1 }"
  />
  <AppStepper
    v-bind="extra"
    :count="1"
  />
  <AppStepper v-bind="{ ...extra, count: 1 }" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppStepper
    v-bind="{ count: 1 }"
    count="wrong"
  />
  <AppStepper v-bind="{ ...extra, count: 'wrong' }" />
</template>
```

:::

In `:count="1" v-bind="extra"` and `{ count: 1, ...extra }`, the key remains present but its final value is unknown. Mixed raw spellings such as `pageSize` and `page-size` also make the effective value unknown: Vue's raw-key merge and later prop normalization cannot be replaced by simply merging normalized names.

## :wrench: Options

Defaults:

```js
{
  targets: [],
  unknownValues: 'ignore',
}
```

### `targets`

Type: `{ components: string[], props: Record<string, Constraint> }[]`. Default: `[]`.

Each target requires a nonempty list of unique component names and a nonempty prop map. An empty `targets` array disables checks. There are no built-in targets. Each constraint accepts a single type, a nonempty union of unique types, or a descriptor:

```js
{
  targets: [{
    components: ['AppSelect'],
    props: {
      label: 'string',
      modelValue: ['string', 'number', 'null'],
      options: 'array',
      filter: 'function',
      disabled: { type: 'boolean', booleanCasting: true },
    },
  }],
}
```

| Type        | Meaning                                                                        |
| ----------- | ------------------------------------------------------------------------------ |
| `string`    | String values                                                                  |
| `number`    | Numbers, without integer, range, or finiteness restrictions                    |
| `boolean`   | Boolean values                                                                 |
| `array`     | Arrays, without checking element types                                         |
| `object`    | Objects excluding arrays and `null`, without checking fields                   |
| `function`  | Functions, without checking signatures                                         |
| `bigint`    | BigInt values                                                                  |
| `symbol`    | Symbol values; normal symbol-producing expressions are unknown in this version |
| `null`      | Explicit `null`                                                                |
| `undefined` | Explicit `undefined` or `void` expressions                                     |

Union order has no meaning. `null` and `undefined` must be explicitly allowed. Matching targets merge distinct prop constraints. Equivalent constraints are accepted; conflicting types or `booleanCasting` values for a normalized component/prop pair throw a configuration error, including conflicts within one prop map.

### `booleanCasting`

Descriptor field: `boolean`. Default: `false`.

Set this only when the actual component has Vue Boolean casting enabled for the prop, including empty-string casting. It models converting `''` or the hyphenated prop name to `true`. It applies to known bound strings and object binding values as well as static attributes.

With `disabled: { type: 'boolean', booleanCasting: true }` on `AppButton`:

::: correct

```vue
<template>
  <AppButton disabled />
  <AppButton disabled="" />
  <AppButton disabled="disabled" />
  <AppButton :disabled="false" />
  <AppButton disabled="" />
</template>
```

:::

::: incorrect

```vue
<template>
  <AppButton disabled="false" />
  <AppButton disabled="true" />
</template>
```

:::

Without `booleanCasting`, bare attributes are empty strings. The order in `type: ['boolean', 'string']` does not imply casting: actual Vue declarations using `[Boolean, String]` and `[String, Boolean]` differ. An inferred string without a known literal value may either cast to Boolean or remain a string, so a Boolean-only contract can report a possible mismatch.

### `unknownValues`

Type: `'ignore' | 'report'`. Default: `'ignore'`.

`report` emits `unverifiablePropType` for a definitely supplied prop whose type cannot be established. Presence that is itself unknown, such as a sole `v-bind="extra"`, is left to `require-component-props`. Known bad branches still produce diagnostics even if another branch is unknown and this option is `ignore`.

## Scope

Component matching, prop normalization, native-tag exclusions, `v-pre`, static dynamic components, directive support, and reserved prop restrictions are shared with [require-component-props](./require-component-props.md#scope). This rule checks SFC templates, not script declarations or render functions.

| Expression shape                                   | Inferred category                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| String, numeric, Boolean, BigInt, `null` literals  | Corresponding category                                              |
| Template literals                                  | `string`                                                            |
| Arrays, including unknown elements/spreads         | `array`                                                             |
| Object literals, including unknown fields          | `object`                                                            |
| Function and arrow expressions                     | `function`                                                          |
| RegExp literals                                    | `object`                                                            |
| `void expression`                                  | `undefined`                                                         |
| `undefined`                                        | `undefined` only when not shadowed by script or template bindings   |
| `!value`, `!!value`                                | `boolean`                                                           |
| `typeof value`                                     | `string`                                                            |
| Unary `+`, `-`, `~` on known numeric values        | Corresponding numeric category; unary `+` on BigInt remains unknown |
| Conditional expressions                            | Union of branch categories and any unknown branch                   |
| Identifiers, member access, calls, other operators | Unknown                                                             |

TypeScript assertions, `satisfies`, and non-null assertions are unwrapped rather than trusted as runtime evidence. No script initializer tracking, ref unwrapping, TypeScript type services, imported definitions, or function execution is used. Component defaults and custom transformations are not simulated. Use `vue-tsc` for full SFC type checking.

Default and named `v-model` supply their corresponding props, but `.number` and `.trim` do not establish the current parent expression's type. Object getter/setter values are unknown. Unsupported `.prop` and `.attr` bindings introduce uncertainty for the named prop.

### Diagnostics and fixes

- `invalidPropType`: one known category is not allowed.
- `possiblyInvalidPropType`: a possible branch/category is not allowed.
- `unverifiablePropType`: a supplied value remains unknown with `unknownValues: 'report'`.

Each configured prop produces at most one diagnostic per element, located at the effective attribute value, bound expression, object property value, or binding introducing uncertainty. The messages preserve configured prop spelling.

There are no automatic fixes or suggestions. Converting `count="20"` to `:count="20"` changes the value passed to the component and requires a user decision.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/component-prop-types.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/component-prop-types.test.ts)
