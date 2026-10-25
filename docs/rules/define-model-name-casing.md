---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/define-model-name-casing
description: Enforce casing for explicit defineModel names.
---

# vue-perfectionist/define-model-name-casing

> Enforce casing for explicit defineModel names.

:wrench: Automatic fixes are available only with `fix: true`. They change the
component's public contract; fixing is disabled by default.

## Usage

Enable the rule alongside your existing `vue-eslint-parser` configuration.
TypeScript scripts additionally need `@typescript-eslint/parser` as their
script parser.

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/define-model-name-casing': 'error',
    },
  },
])
```

## :book: Rule Details

Explicit model names use `camelCase` by default. The rule checks the name passed
to the macro, independently of the receiving variable and template arguments.

::: correct

```vue
<script setup lang="ts">
const fileList = defineModel<string[]>('fileList')
const modelValue = defineModel<string>()
</script>

<template>
  <FileUploader v-model:file-list="fileList" />
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
const fileList = defineModel<string[]>('file-list')
const userName = defineModel<string>('UserName')
</script>
```

:::

String literals and substitution-free template literals are checked, including
decoded escapes and transparent TypeScript wrappers. Each mismatching name
produces one diagnostic on the name expression.

::: incorrect

```vue
<script setup lang="ts">
const files = defineModel(`file-list`)
const user = defineModel('user_name' as const)
</script>
```

:::

## :wrench: Options

The default configuration is:

```json
{
  "vue-perfectionist/define-model-name-casing": [
    "error",
    { "casing": "camelCase", "fix": false }
  ]
}
```

### casing

- **Type**: `'camelCase' | 'PascalCase' | 'kebab-case' | 'snake_case'`
- **Default**: `'camelCase'`

Names must equal their normalization by
[`uncase`](https://github.com/ntnyq/uncase). For example, `URLValue` normalizes
to `urlValue` in camelCase. Unicode words are supported. This is a casing check,
not an identifier or non-empty-name validator: names unchanged by normalization,
including empty strings and numeric-only strings, are accepted.

| casing       | Accepted name |
| ------------ | ------------- |
| `camelCase`  | `fileList`    |
| `PascalCase` | `FileList`    |
| `kebab-case` | `file-list`   |
| `snake_case` | `file_list`   |

For example, to require snake_case:

```json
{ "casing": "snake_case" }
```

The implicit default model from `defineModel()` is never checked or renamed,
even when the configured casing differs from `modelValue`. An explicitly passed
`'modelValue'` is checked like any other name. Unknown fields and casing names,
including converter aliases such as `'pascalCase'`, are rejected.

### fix

- **Type**: `boolean`
- **Default**: `false`

Set `fix: true` to allow ESLint's `--fix` to rename explicit model names using
the configured casing:

```json
{
  "vue-perfectionist/define-model-name-casing": [
    "error",
    { "casing": "camelCase", "fix": true }
  ]
}
```

With these options, `defineModel('file-list')` becomes
`defineModel('fileList')`. With the default `fix: false`, mismatches are reported
without fixes. No editor suggestions are provided.
Fixes also follow the runtime compatibility and collision boundaries below;
`fix: true` does not make every casing conversion fixable.

::: warning Component contract changes

Enabling this option opts into changes to the component's public prop,
`update:` event, and modifiers prop names. The fixer cannot update consumers in
other files. Review and update parent bindings, event listeners, explicit prop
accesses, and tests together with the component.

:::

## Scope

Only unshadowed, unimported `defineModel` calls in top-level variable initializers
or expression statements of `.vue` setup scripts are checked. Destructured
bindings, parentheses, transparent TypeScript wrappers, and dual-script SFCs
are supported. The rule needs Vue parser services, but no TypeScript project
or type checker. It does not depend on auto-import settings.

Imported macros (including aliases and namespaces), shadowed names, optional
calls, nested functions/blocks, arbitrary outer expressions, ordinary scripts,
templates, and standalone JS/TS files are skipped. Calls with more than two
runtime arguments are skipped for naming diagnostics and fixes, but their static
model names still participate in collision checks. Missing names, options-only
calls, dynamic strings, concatenations, identifiers, and spread arguments are
not resolved.

This rule does not enforce variable names, require an explicit name, change
template `v-model` arguments, or inspect `defineProps` / `defineEmits` contracts.
Use [`prefer-define-model`](./prefer-define-model.md) to identify matching prop
and event declarations for manual migration.

## Automatic fixes and formatting

Automatic fixes require `fix: true` and replace only the explicit name literal.
They preserve its quote delimiter, surrounding comments, parentheses, TypeScript
wrappers, options, receiving variable names, template arguments, and line endings.
Escapes within the replaced name are normalized to the converted value.

The converted name must be unchanged by Vue's camelization. The rule does not
infer the consumer's Vue runtime version and has no version override, so it
applies this conservative boundary even with newer Vue versions. For example,
when requiring `kebab-case`, `fileList` is reported without a fix: changing it
to `file-list` makes the returned model lose its value on Vue 3.4.38, even after
updating the parent binding. Converting `FILE` to the single-word name `file`
remains fixable.

This also prevents conversion to `model-value`. Even on current Vue, the
compiler generates `model-valueModifiers` while `useModel` reads the special
`modelModifiers` prop, so a rename from `modelValue` would lose modifiers despite
updated parent bindings. Migrate names requiring runtime camelization manually
after checking both model values and modifiers with the target Vue runtime.

Name arguments containing `satisfies` are reported without fixes, including
constraints wrapped in assertions or non-null expressions. Renaming the literal
could violate a literal type, union, or type alias constraint. Without a type
checker, the rule conservatively treats even `satisfies string` and
`satisfies unknown` as report-only. A `satisfies` expression around the returned
model ref does not constrain the name and does not disable its fix.

::: incorrect

```vue
<script setup lang="ts">
type Name = 'file-list'
const files = defineModel('file-list' satisfies Name)
</script>
```

:::

Fixes also require the converted name to be stable after one conversion. Some
Unicode case mappings need multiple passes: in PascalCase, `ß` becomes `SS`,
which would then become `Ss`; in camelCase, `İ` first becomes `i` plus a
combining dot, which another pass removes. These names remain report-only,
including when a later result would collide with another model. This prevents
partial contract renames. Stable Unicode conversions remain fixable. Constrained
names, unstable names, and conversions blocked by runtime compatibility reserve
their existing generated props and runtime modifier lookups during collision
checks, rather than their hypothetical converted names.

For example, changing `'file-list'` to `'fileList'` changes the generated names
from `file-list`, `update:file-list`, and `file-listModifiers` to `fileList`,
`update:fileList`, and `fileListModifiers`. Consumer compatibility is not proven.

Empty conversion results, Vue reserved props such as `key`, `ref`, `ref_key`,
and vnode lifecycle hooks, and model or modifiers prop names that conflict with
another model's existing or converted names in the same setup script are
reported without fixes even with `fix: true`. Reserved-name and collision checks
use Vue's camelization for both value and modifiers props. For example, a
`'Foo1'` model cannot be renamed to `'foo1'` alongside an existing `'foo-1'`
model, because Vue normalizes both to `foo1`. This also includes conflicts with
an implicit `modelValue` model or a statically named model call that is otherwise
skipped for naming checks.
Existing names that camelize to `modelValue`, such as `model-value`, additionally
reserve `modelModifiers`, because Vue may read it as the model's modifiers even
though the compiler generates a different modifiers prop. This prevents an
independent rename from making that model read another model's modifiers.
These checks do not establish compatibility with other props or consumers.

Collision checks also reserve the original, camelized, and hyphenated modifier
lookups used by Vue runtimes. Distinct generated prop names alone do not make a
rename safe: `Foo` can fall back to `fooModifiers` when `FooModifiers` is absent.
For example, with `casing: 'PascalCase'`, a protected
`defineModel('foo' satisfies 'foo')` prevents renaming another model from `FOO`
to `Foo`. Otherwise, the renamed model could inherit the first model's `trim`
or `number` modifiers and change emitted values, even after parent bindings are
updated. This also blocks renaming a model value to a prop read by another
model's modifier fallback. Independent names remain fixable.

Template literal model names require
[Vue 3.5.31+](https://github.com/vuejs/core/blob/main/CHANGELOG.md#3531-2026-03-25).
Earlier compilers interpret the template literal as options for the default
`modelValue` model. The rule does not infer the consumer's compiler version, so
template literal names also reserve `modelValue` and `modelModifiers`, including
names constrained by `satisfies` or calls skipped for naming checks. Renames
that conflict with either compiler interpretation remain report-only.
Independent model fixes remain available.

Even with `fix: true`, both string literal names below are reported without
fixes, preventing default model and modifiers collisions in older compilers:

::: incorrect

```vue
<script setup>
const other = defineModel(`other`)
const value = defineModel('ModelValue')
const modifiers = defineModel('ModelModifiers')
</script>
```

:::

See Vue's [defineModel documentation](https://vuejs.org/api/sfc-script-setup.html#definemodel)
for the generated prop and event contract.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/define-model-name-casing.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/define-model-name-casing.test.ts)
