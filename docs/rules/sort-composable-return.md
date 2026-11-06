---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/sort-composable-return
description: Group composable return members by state and method.
---

# vue-perfectionist/sort-composable-return

> Group composable return members by state and method.

By default, state precedes methods, groups have exactly one blank line between
them, and members retain their original order within each group. Both rules can
share a grouping policy without requiring consumers to copy the return order.

:wrench: Automatic fixes change whitespace only. Group and within-group ordering
violations are reported without moving members.

## Usage

Configure the appropriate parsers and register the rule for the desired files:

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/sort-composable-return': 'error' },
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

The default uses syntax and local scopes without a TypeScript project. For
cross-file consumers, enable `typeInformation` as described below.

## :book: Rule Details

::: correct

```ts
import { ref } from 'vue'

function usePage() {
  const z = ref(0)
  const a = ref('')
  function submit() {}
  function reset() {}

  return {
    z,
    a,

    submit,
    reset,
  }
}
```

:::

This ordering violation requires a manual change:

::: incorrect

```ts
function usePage() {
  return {
    submit() {},
    state: 1,
  }
}
```

:::

When ordering is correct, missing group spacing can be fixed automatically:

::: incorrect

```ts
function usePage() {
  return {
    state: 1,
    submit() {},
  }
}
```

:::

### Member classification

`state` means a confirmed non-callable value, including ordinary data,
configuration, instances, and reactive state. `method` means the member itself
is callable. `Ref<() => void>` is state; `() => Ref<string>` is a method.
Name prefixes are never evidence of a member's category.

Classification proceeds through local syntax and reliable bindings, explicitly
enabled type information, then `memberKinds`. Configuration never overrides a
confirmed kind.

- Direct functions, function declarations (including overloads), and object methods are methods. Literals, arrays, objects, and template strings are state.
- Immutable `const` identifier aliases are followed when there are no subsequent writes. Mutable assignment flow is not analyzed.
- Vue imports of `ref`, `shallowRef`, `computed`, `customRef`, `toRef`, and `useTemplateRef` are recognized, including aliases and namespace imports.
- `reactive`, `shallowReactive`, `readonly`, and `shallowReadonly` preserve a confirmed argument's outer category; unknown arguments need type information.
- Unbound Vue APIs require `settings: { 'vue-perfectionist': { autoImport: true } }`. Local shadowing and type-only imports do not opt into Vue recognition.
- Enabled type analysis classifies imported values and instantiated call results. Built-in `Function` / `CallableFunction` types are methods, and nullish-only unions are state. Optional functions remain methods after excluding `null` / `undefined`. Mixed function/data unions, `any`, `unknown`, `never`, and unresolved generics remain unknown, as do broad `object` and `{}` types.
- Getters/setters remain unknown on the return side; their accessor functions are not public methods.

Both rules group and compare public property names: `{ values: formValues }`
and `{ values: localValues }` both use `values`. A destructuring default does
not establish the source property's kind.

## :wrench: Options

Defaults:

```json
{
  "functionPattern": "^use[A-Z]",
  "ignoreNames": [],
  "typeInformation": false,
  "memberKinds": [],
  "unknownMembers": "ignore",
  "groups": ["state", "method"],
  "customGroups": [],
  "type": "unsorted",
  "order": "asc",
  "newlinesBetween": 1,
  "newlinesInside": 0,
  "fix": "safe"
}
```

| Option            | Type / default                                                              | Meaning                                                                                        |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `functionPattern` | String / `'^use[A-Z]'`                                                      | Regular expression source matching the normalized function name.                               |
| `ignoreNames`     | String array / `[]`                                                         | Exact normalized names to exclude; empty excludes nothing.                                     |
| `typeInformation` | Boolean / `false`                                                           | Require complete TypeScript services when enabled; missing services are a configuration error. |
| `memberKinds`     | Array / `[]`                                                                | First-match fallback classification for unknown members.                                       |
| `unknownMembers`  | `'ignore'` or `'report'` / `'ignore'`                                       | Whether to report unclassified members.                                                        |
| `groups`          | Group entry array / `['state', 'method']`                                   | Replace the entire group order; empty disables order and spacing checks.                       |
| `customGroups`    | Array / `[]`                                                                | First-match subdivisions of known categories.                                                  |
| `type`            | `'unsorted'`, `'alphabetical'`, `'natural'`, `'name-length'` / `'unsorted'` | Within-group comparison strategy.                                                              |
| `order`           | `'asc'` or `'desc'` / `'asc'`                                               | Within-group direction; never reverses group precedence.                                       |
| `newlinesBetween` | Nonnegative integer or `'ignore'` / `1`                                     | Blank lines between groups.                                                                    |
| `newlinesInside`  | Nonnegative integer or `'ignore'` / `0`                                     | Blank lines inside groups; zero does not force members onto one line.                          |
| `fix`             | `'safe'` or `'none'` / `'safe'`                                             | Safe whitespace fixes, or diagnostics only.                                                    |

All patterns are case-sensitive JavaScript regular expression sources without
flags or delimiters, with no added anchors. Invalid regexes, duplicate names,
unknown groups, and unknown options are configuration errors. Arrays replace
their corresponding defaults. `alphabetical` uses English locale comparison;
`natural` uses English natural sorting (numeric chunks compare numerically,
case is folded). `name-length` counts Unicode code points in the public name.
Ties retain source order.

### Custom subgroups

`selector` and `elementNamePattern` combine with AND; omitting the pattern
matches every member of that category. The first matching custom group wins,
before the base group. Custom groups cannot infer unknown kinds. `groupName`
must be unique and cannot reuse the built-in `state` / `method` names.

```js
const composableSortOptions = {
  type: 'unsorted',
  newlinesBetween: 0,
  groups: [
    'form-state',
    'state',
    { newlinesBetween: 1 },
    'request',
    { group: 'method', type: 'name-length', order: 'asc' },
  ],
  customGroups: [
    {
      groupName: 'form-state',
      selector: 'state',
      elementNamePattern: '^form(Rules|Values)$',
    },
    {
      groupName: 'request',
      selector: 'method',
      elementNamePattern: '^(fetch|refresh|reload)[A-Z]',
    },
  ],
}
```

This subdivides state and methods with one blank line between the two categories,
while checking ordinary methods by name length.

`groups` entries accept strings, equal-priority merged arrays such as
`['request', 'method']`, override objects
`{ group: string | string[], type?, order?, newlinesInside? }`, or
`{ newlinesBetween }` separators. Merged groups share a comparator without
requiring subgroup order. Separators must occur between group entries and cannot
be adjacent. Omitted categories/custom groups become partition boundaries.
Empty groups add no spacing by themselves. Across empty groups, the largest
positive spacing requirement wins, then `'ignore'`, then `0`.

### Supplementing unknown kinds

```js
const memberKinds = [
  {
    functionPattern: '^useLegacyForm$',
    elementNamePattern: '^(formValues|isSubmitting)$',
    kind: 'state',
  },
  {
    functionPattern: '^useLegacyForm$',
    elementNamePattern: '^(submit|reset)$',
    kind: 'method',
  },
]
```

Both patterns must match; the first matching entry supplies an unknown kind
only. `unknownMembers: 'report'` asks for type information or configuration,
without placing unknown members into a default group.

### TypeScript type information

`typeInformation: false` ignores available parser services to keep default
behavior stable. When set to `true`, configure a complete project for the
TypeScript parser, for example:

```js
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: import.meta.dirname,
    extraFileExtensions: ['.vue'],
  },
}
```

Vue files still need `vue-eslint-parser` as the outer parser and
`parser: tsParser` in its parser options. Type analysis queries the source
property on the call result, not the binding/default, without manually parsing
other files. Missing services throw instead of silently falling back. See
[typescript-eslint typed rules](https://typescript-eslint.io/developers/custom-rules/#typed-rules).

## Scope

Supports standalone JS/TS and both ordinary `<script>` and `<script setup>` in
Vue SFCs. Template expressions are not checked. Use ESLint `files` / `ignores`
to choose file scope.

Checks matching function declarations and arrow/function expressions directly
assigned to identifier variables. Variable names take precedence over internal
function-expression names. Named default exports, async functions, nested
definitions, separate direct-return branches, and TypeScript wrappers are supported.

Only object literals directly returned by that function are checked, including
arrow expression bodies. Nested callback returns do not belong to the outer
function. Indirect variable returns, `reactive({...})` wrappers, conditional
return expressions, anonymous default exports, object/class methods, generators,
and higher-order wrappers are outside scope.

## Automatic fixes and formatting

Unknown members, spreads/rest, dynamic computed keys, prototype setters, and nested destructuring
partition checks. A non-computed, non-shorthand, non-method `__proto__: value` sets the prototype instead of declaring a public member and prevents local consumer inference for that object. Computed `['__proto__']` and shorthand members are still checked. No ordering or spacing crosses these boundaries. Return
objects with duplicate static keys are skipped entirely, including number, bigint, boolean, null, and string keys that coincide after property-key coercion. Spacing beside unknown
members is preserved. Gaps containing comments on either side of the comma are excluded from spacing
checks; comments do not suppress ordering diagnostics for known members.

An incorrectly ordered partition reports ordering only, without changing its
spacing. Correctly ordered partitions change only pure whitespace around the separating
comma, moving required blank lines after it and removing excess blank lines before it.
Expressions, comments, existing indentation (including Unicode horizontal whitespace), and LF/CRLF are preserved. Inline members from different groups can gain line breaks. A single
group does not require between-group spacing.

Blank-line counts must be nonnegative safe integers (at most
`Number.MAX_SAFE_INTEGER`). If the replacement whitespace after a comma would
exceed 65,536 UTF-16 code units, including line endings and indentation, the rule
reports the spacing violation without fixing either side of that comma.

The rules never change key enumeration order, getter/Proxy reads, or evaluation
of destructuring defaults. `fix: 'none'` disables every fix. There are no reorder
suggestions or `fix: 'unsafe'`. Leave indentation to the formatter. The default `0/1` spacing policy is compatible with Oxfmt. Counts greater than `1` are collapsed by Oxfmt and will trigger diagnostics again; use `fix: 'none'` for report-only checks or avoid formatting the same gap with Oxfmt. Avoid combining rules that demand conflicting
member order or spacing.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-composable-return.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/sort-composable-return.test.ts)
