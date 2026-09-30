---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-macro-type-name
description: Require exact call-site type names for Vue compiler macros.
---

# vue-perfectionist/require-macro-type-name

> Require exact call-site type names for Vue compiler macros.

## Usage

Enable the rule alongside your existing `vue-eslint-parser` configuration with
`@typescript-eslint/parser` as its script parser:

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-macro-type-name': 'error',
    },
  },
]
```

## :book: Rule Details

Type arguments must be direct references named `Props`, `Emits`, or `Slots` for
the corresponding macro. Local declarations, imported aliases, and unresolved
references are treated equally: the rule checks the name used at the call site.

::: correct

```vue
<script setup lang="ts">
interface Props {
  title: string
}

type Emits = {
  save: [value: string]
}

type Slots = {
  default(props: { title: string }): unknown
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const slots = defineSlots<Slots>()
</script>

<template>
  <button
    @click="emit('save', props.title)"
    type="button"
  >
    Save
  </button>
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
interface ButtonProps {
  title: string
}

const props = defineProps<ButtonProps>()
</script>
```

:::

Imported aliases are checked by their local name, not the exported name:

::: correct

```vue
<script setup lang="ts">
import type { ButtonProps as Props } from './types'

const props = defineProps<Props>()
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
import type { Props as ButtonProps } from './types'

const props = defineProps<ButtonProps>()
</script>
```

:::

Inline contracts are also reported, even when this rule is enabled alone:

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>
```

:::

`Props<T>` satisfies the name requirement. The contents of its generic arguments
are not checked. Parenthesized types and decoded escaped identifiers are accepted.
`Contracts.Props`, `import('./types').Props`, unions, and intersections require a
direct named reference and report `expectedNamedType` on the entire type argument.
`Partial<Props>` and other wrong identifiers report `unexpectedTypeName` on the
identifier only. At most one diagnostic is emitted per eligible macro call.

## :wrench: Options

The expanded defaults are:

```js
{
  'vue-perfectionist/require-macro-type-name': ['error', {
    macros: {
      defineProps: 'Props',
      defineEmits: 'Emits',
      defineSlots: 'Slots',
    },
  }],
}
```

Each macro accepts an exact, case-sensitive TypeScript type alias identifier or
`false` to disable its check. Valid Unicode identifiers are supported. Omitted
keys retain the defaults, including with `{}` or `{ macros: {} }`.

For component-specific props naming while keeping the default emits and slots checks:

```js
{
  macros: {
    defineProps: 'ButtonProps',
  },
}
```

Unknown fields/macros, `true`, `null`, arrays, empty names, whitespace, dotted
paths, patterns, and reserved type names are rejected. Identifier validation
runs when the rule is created, even if the file contains no eligible macro call.
There are no regex patterns, filename substitutions, or exported-name checks.

## Scope

Only `defineProps`, `defineEmits`, and `defineSlots` with exactly one explicit type
argument and no runtime arguments are checked in `.vue` setup scripts. Calls must
be top-level variable initializers (including destructuring) or expression
statements. Parentheses and transparent TypeScript expression wrappers are accepted.
An unshadowed `withDefaults` may wrap `defineProps` as its first argument in either
position; the inner type is checked once.

Imported or shadowed macros, aliases, member/optional calls, arbitrary outer
expressions, nested functions/blocks, ordinary script calls, template expressions,
and standalone JS/TS files are skipped. In dual-script SFCs, only setup calls are
checked. Missing parser services, runtime declarations, missing or extra type
arguments, and calls with runtime arguments are skipped. `defineModel`,
`defineExpose`, `defineOptions`, and custom macros are outside this rule's scope.

This rule does not require a macro or a missing type argument, establish that
Vue can compile the type, or check the receiving variable's name. No TypeScript
project or type checker is needed.

Combine it with [`define-macros-type-style`](./define-macros-type-style.md) to
control where types are declared. With both defaults, contracts must be local
and named `Props`, `Emits`, and `Slots`. To require an inline type for a macro,
set that macro to `false` in this rule: inline and direct named requirements
conflict. The two rules report independently and never suppress each other's
diagnostics.

## Automatic fixes and formatting

There are no automatic fixes or suggestions. Renaming can break other references
or collide with existing types. The examples show manual alternatives.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-macro-type-name.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-macro-type-name.test.ts)
