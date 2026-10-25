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
runtime arguments are skipped. Missing names, options-only calls, dynamic
strings, concatenations, identifiers, and spread arguments are not resolved.

This rule does not enforce variable names, require an explicit name, change
template `v-model` arguments, or inspect `defineProps` / `defineEmits` contracts.
Use [`prefer-define-model`](./prefer-define-model.md) to identify matching prop
and event declarations for manual migration.

## Automatic fixes and formatting

Automatic fixes require `fix: true` and replace only the explicit name literal.
They preserve its quote delimiter, surrounding comments, parentheses, TypeScript
wrappers, options, receiving variable names, template arguments, and line endings.
Escapes within the replaced name are normalized to the converted value.

For example, changing `'file-list'` to `'fileList'` changes the generated names
from `file-list`, `update:file-list`, and `file-listModifiers` to `fileList`,
`update:fileList`, and `fileListModifiers`. Consumer compatibility is not proven.

Empty conversion results and model or modifiers prop names that conflict with
another model's existing or converted names in the same setup script are
reported without fixes even with `fix: true`. This includes conflicts with an
implicit `modelValue` model.
These checks do not establish compatibility with other props or consumers.

See Vue's [defineModel documentation](https://vuejs.org/api/sfc-script-setup.html#definemodel)
for the generated prop and event contract.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/define-model-name-casing.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/define-model-name-casing.test.ts)
