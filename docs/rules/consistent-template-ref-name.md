---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/consistent-template-ref-name
description: Require template ref variable names to match their keys.
---

# vue-perfectionist/consistent-template-ref-name

> Require template ref variable names to match their keys.

The rule compares the receiving variable name with the static key passed to
Vue's `useTemplateRef()`. Mismatches are reported on the variable identifier,
without automatic fixes or suggestions.

## Usage

Add the rule to your existing parser and plugin configuration:

```js
{
  rules: {
    'vue-perfectionist/consistent-template-ref-name': 'error',
  },
}
```

See the [guide](../guide/index.md#basic-usage) for plugin registration and a
complete flat configuration. Vue SFCs require `vue-eslint-parser`; TypeScript
scripts also require a TypeScript parser. Standalone JavaScript and TypeScript
files use their usual ESLint parsers and matching configuration `files` patterns.

## :book: Rule Details

A directly initialized variable must have exactly the same name as the key.
These script examples also apply inside `<script setup>` and ordinary Vue
script blocks:

::: correct

```js
import { useTemplateRef } from 'vue'

const inputRef = useTemplateRef('inputRef')
const panelRef = useTemplateRef(`panelRef`)
```

:::

::: incorrect

```js
import { useTemplateRef } from 'vue'

const inputRef = useTemplateRef('fieldRef')
```

:::

String comparison is case-sensitive. Empty strings and kebab-case keys are
also checked; they cannot equal a JavaScript variable identifier.

The rule imposes no suffix or regular expression. Enable
[`prefer-ref-pattern`](./prefer-ref-pattern.md) separately if names must also
follow a convention such as ending in `Ref`:

::: correct

```js
import { useTemplateRef } from 'vue'

const input = useTemplateRef('input')
```

:::

The example above passes this rule alone. It does not pass the default
`prefer-ref-pattern` convention.

## :wrench: Options

This rule has no options.

## Scope

- Checks direct identifier declarations with `const`, `let`, or `var`, including
  declarations inside functions, exported declarations, and both script blocks
  in an SFC. Later reassignments do not suppress the initializer check.
- Recognizes explicit runtime imports from `vue`, including named import aliases,
  namespace imports, and static namespace property access such as
  `Vue['useTemplateRef']()`.
- Compares string literals and template literals without interpolation using their
  decoded string values. Parentheses, TypeScript type arguments, assertions,
  non-null assertions, and `satisfies` wrappers are supported.
- Skips dynamic keys, interpolated strings, constants holding keys, spread
  arguments, destructuring, assignments after declaration, and calls nested in
  other expressions or custom wrappers. Optional chains are skipped.
- Skips local functions, shadowed bindings, default imports, type-only imports,
  imports from other modules, aliases assigned to variables, and unimported
  auto-import globals.
- Does not inspect template attributes, ordinary `ref()` / `shallowRef()` state,
  or relationships between a key and a template element.

## Automatic fixes

Changing the key can break its template association. Renaming the variable
requires updating its references and checking for naming conflicts. The rule
therefore reports without an automatic fix or suggestion. Choose the intended
name and update the affected script and template references together.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/consistent-template-ref-name.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/consistent-template-ref-name.test.ts)
