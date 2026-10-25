---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-define-model
description: Prefer defineModel over matching prop and update event declarations.
---

# vue-perfectionist/prefer-define-model

> Prefer defineModel over matching prop and update event declarations.

## Usage

Enable this rule for Vue 3.4+ components alongside your existing
`vue-eslint-parser` configuration. TypeScript scripts additionally need
`@typescript-eslint/parser` as their script parser.

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-define-model': 'error',
    },
  },
])
```

## :book: Rule Details

An explicit prop declaration and an exactly matching `update:propName` event
declaration form a candidate for `defineModel`. Both the default `modelValue`
contract and named models are checked, regardless of whether the event is used.
Each matching prop is reported once, on its declaration key.

::: correct

```vue
<script setup lang="ts">
const modelValue = defineModel<boolean>({ required: true })
const title = defineModel<string>('title')
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:title': [value: string]
}>()
</script>

<template>
  <button
    @click="emit('update:modelValue', !props.modelValue)"
    type="button"
  >
    Toggle
  </button>
  <button
    @click="emit('update:title', 'New title')"
    type="button"
  >
    Rename
  </button>
</template>
```

:::

Runtime arrays and objects, inline types, local aliases and interfaces,
intersections, inherited interface members, emits call signatures, and literal
event unions are supported. `withDefaults(defineProps(), defaults)` is supported.
Unrelated props and events are allowed and must be retained during migration.

::: incorrect

```vue
<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue', 'save'])
</script>

<template>
  <button
    @click="emit('update:modelValue', 'New value')"
    type="button"
  >
    Update
  </button>
  <button
    @click="emit('save')"
    type="button"
  >
    Save
  </button>
</template>
```

:::

Props without matching update events are accepted:

::: correct

```vue
<script setup>
const props = defineProps({ title: String })
const emit = defineEmits(['save'])
</script>

<template>
  <button
    @click="emit('save')"
    type="button"
  >
    Save
  </button>
</template>
```

:::

## :wrench: Options

This rule has no options.

## Scope

Only unshadowed, unimported `defineProps` and `defineEmits` calls in top-level
variable initializers or expression statements of `.vue` setup scripts are
checked. Parentheses and transparent TypeScript expression wrappers are accepted.
Both JavaScript and TypeScript SFCs are supported, including dual-script SFCs.
There must be exactly one eligible props call and one eligible emits call.

Imported macros (including aliases and namespaces), shadowed names, optional
calls, nested calls and functions, ordinary scripts, templates, and standalone
JS/TS files are skipped. The rule needs Vue parser services, but no TypeScript
project or type checker. It does not depend on auto-import settings.

Imported, unresolved, generic, ambient, mapped, conditional, and union prop types
are not resolved. Runtime declaration variables, spreads, and dynamic names are
not resolved; explicit members alongside them can still be checked. Local
non-generic type aliases and interfaces are followed with cycle protection.
Event-name unions in call signatures are supported, but broad `string` event
types are skipped. Names are matched exactly, without casing normalization.

## Automatic fixes and formatting

There are no automatic fixes or suggestions. Migrating changes bindings and can
affect default values, required options, event validators, modifiers, transformed
setters, and side effects. Review these semantics and all script/template uses
manually. A report identifies a declaration pair, not a proven equivalent rewrite.
The examples show manual alternatives.

Vue recommends `defineModel` starting in 3.4; see
[Component v-model](https://vuejs.org/guide/components/v-model.html).
For consuming template bindings, use `eslint-plugin-vue`'s
[`prefer-v-model`](https://eslint.vuejs.org/rules/prefer-v-model.html).

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-define-model.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-define-model.test.ts)
