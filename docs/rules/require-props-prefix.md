---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-props-prefix
description: Require explicit props object prefixes in Vue templates.
---

# vue-perfectionist/require-props-prefix

> Require explicit props object prefixes in Vue templates.

<!-- summary:start -->

::: info At a glance

| Concern          | Behavior                                                                      |
| ---------------- | ----------------------------------------------------------------------------- |
| Scope            | Template                                                                      |
| Defaults         | Report bare prop references in setup component templates; fixes are disabled. |
| Required options | None; enabling the rule uses its defaults.                                    |
| Automatic fixes  | Opt-in                                                                        |
| Type information | No TypeScript type services required.                                         |

:::

<!-- summary:end -->

:wrench: Safe automatic fixes are available with `autofix: true`; the default
`autofix: false` reports without changing code. No editor suggestions are provided.

## Usage

Enable the rule alongside your existing `vue-eslint-parser` configuration.
TypeScript scripts additionally need `@typescript-eslint/parser` as their script
parser.

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-props-prefix': 'error',
    },
  },
])
```

## :book: Rule Details

Use the props object to make the origin of a template value explicit. The rule
checks bare references to statically known props declared by `defineProps()` or
`withDefaults(defineProps(), …)` in `<script setup>`.

::: correct

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>

<template>
  <h1>{{ props.title }}</h1>
  <Card
    :title="props.title"
    :data="{ title: props.title }"
  />
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>

<template>
  <h1>{{ title }}</h1>
  <Card
    :title
    :data="{ title }"
  />
</template>
```

:::

Interpolation, directive values, event handlers, dynamic directive arguments, and
same-name `v-bind` shorthand are checked. Runtime object/array declarations,
inline types, and non-generic local aliases and interfaces (including extensions
and intersections) are supported.

Script bindings and template locals take precedence over props. For example, a
loop's source can be a prop while its loop variable is local. A declaration in
a separate inner function or block does not hide an outer prop reference.
Derived values are allowed without tracking their data flow:

::: correct

<!-- eslint-skip -->

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ title: string; titles: string[] }>()
const label = computed(() => props.title.toUpperCase())
</script>

<template>
  <h1>{{ label }}</h1>
  <span
    v-for="title in props.titles"
    :key="title"
    >{{ title }}</span
  >
  <Card #default="{ title }">{{ title }}</Card>
</template>
```

:::

This is a readability convention. Vue 3.5+ supports
[reactive props destructure](https://vuejs.org/api/sfc-script-setup.html#reactive-props-destructure);
the rule does not assume destructuring always loses reactivity.

### Combining declaration rules

With `eslint-plugin-vue` registered as `vue` and both plugins and the Vue parser
already configured, combine these rules:

```js
rules: {
  'vue/define-props-destructuring': ['error', {
    destructure: 'never',
  }],
  'vue/require-macro-variable-name': ['error', {
    defineProps: 'props',
  }],
  'vue-perfectionist/require-props-prefix': ['error', {
    autofix: false,
  }],
}
```

- [`vue/define-props-destructuring`](https://eslint.vuejs.org/rules/define-props-destructuring.html)
  requires storing the props object and forbids macro declaration destructuring
  with `destructure: 'never'`.
- [`vue/require-macro-variable-name`](https://eslint.vuejs.org/rules/require-macro-variable-name.html)
  enforces the binding name `props`.
- This rule checks bare prop references in the template.

The prefix is inferred from the actual macro binding. `componentProps.title` is
also accepted; the naming rule controls whether that binding must be called
`props`. This rule does not create bindings, rewrite destructuring declarations,
or prohibit every later destructure in scripts. Destructured script bindings
are treated as script locals; use the declaration rule to prevent them.

## :wrench: Options

The default configuration is:

```json
{
  "vue-perfectionist/require-props-prefix": ["error", { "autofix": false }]
}
```

### autofix

- **Type**: `boolean`
- **Default**: `false`

Set `autofix: true` to allow safe fixes through ESLint `--fix` or an editor fix
operation. Unsafe references are still reported without fixes. Unknown options
and non-boolean values are rejected.

With `autofix: true`, eligible bare references gain the actual binding prefix;
object shorthand preserves its key, and same-name bindings gain an explicit
value. The following pair illustrates a supported conversion:

::: incorrect props-prefix-autofix

```vue
<script setup>
const props = defineProps(['title'])
</script>

<template>
  <Card
    :title
    :data="{ title }"
    >{{ title }}</Card
  >
</template>
```

:::

::: correct props-prefix-autofix

```vue
<script setup>
const props = defineProps(['title'])
</script>

<template>
  <Card
    :title="props.title"
    :data="{ title: props.title }"
  >
    {{ props.title }}
  </Card>
</template>
```

:::

## Scope

Only `.vue` files with a complete `<script setup>` block and Vue template parser
services are checked, including JavaScript, TypeScript, and dual-script SFCs.
Macros must be unbound compiler macros in top-level variable initializers or
expression statements. Imported or locally shadowed macro names, optional calls,
nested calls, ordinary-script props, and standalone JS/TS files are skipped.

The analysis is syntactic and requires no TypeScript project. Imported types,
generic types, mapped/conditional/utility types, dynamic runtime declarations,
spreads, and unknown computed keys are not resolved. Known explicit keys in a
partially dynamic declaration are still checked. Multiple `defineProps()` calls
are skipped rather than guessing a component contract. Unknown template names,
type-only references, comments, static text, and `v-pre` content are ignored.

## Automatic fixes and formatting

A fix requires an existing, stable `const` identifier bound to the macro result.
The binding must be accessible at the reference, without template or
expression-local shadowing. Runtime TypeScript `enum` and `namespace` declarations
also participate in shadowing; declaration names are never treated as prop
references. Uncertain binding visibility remains report-only. Writes to the
binding anywhere in the script or template disable fixes.

The following references remain report-only even with `autofix: true`:

- Missing or destructured object bindings, mutable declarations, or the special
  event-handler name `$event` used as the props binding.
- Props bindings named after Vue template globals, such as `Math`, `undefined`,
  or `console`. Separately compiled templates can resolve these names to the
  global value instead of the setup binding.
- Assignments, updates, deletions, writes through members, and `v-model` targets.
- Direct calls of a prop function and tagged templates, to avoid changing
  receiver-sensitive behavior. Calls through a prop object's members retain
  their receiver and can be fixed.
- Object shorthand named `__proto__`, whose expansion could change object
  construction semantics.

For example, no declaration is inserted for this report:

::: incorrect props-prefix-autofix

```vue
<script setup>
defineProps(['title'])
</script>

<template>
  <h1>{{ title }}</h1>
</template>
```

:::

Fixes preserve surrounding comments and line endings. Other formatting remains
the formatter's responsibility. This rule does not make prop mutation safe; keep
Vue correctness rules such as `vue/no-mutating-props` enabled.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-props-prefix.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-props-prefix.test.ts)
