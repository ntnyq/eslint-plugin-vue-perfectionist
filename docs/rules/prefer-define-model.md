---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-define-model
description: Prefer defineModel over matching prop and update event declarations.
---

# vue-perfectionist/prefer-define-model

> Prefer defineModel over matching prop and update event declarations.

<!-- summary:start -->

::: info At a glance

| Concern          | Behavior                                                  |
| ---------------- | --------------------------------------------------------- |
| Scope            | Setup                                                     |
| Defaults         | Report matching model prop and update event declarations. |
| Required options | None; enabling the rule uses its defaults.                |
| Automatic fixes  | —                                                         |
| Type information | No TypeScript type services required.                     |

:::

<!-- summary:end -->

## Usage

Enable this rule for Vue `>=3.5.42 <4` components alongside your existing
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
event unions are supported. Method signatures are supported for both props and
emits, including `'update:modelValue'(value: string): void`.
`withDefaults(defineProps(), defaults)` is supported.
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

### `vueuse`

Boolean. Overrides `settings['vue-perfectionist'].vueuse`; when omitted, inherits
that setting, which defaults to `false`. An explicit rule value always wins:

| Shared `vueuse`   | Rule `vueuse` | Enabled |
| ----------------- | ------------- | ------- |
| Omitted / `false` | Omitted       | No      |
| `true`            | Omitted       | Yes     |
| Any               | `true`        | Yes     |
| Any               | `false`       | No      |

```js
{
  settings: {
    'vue-perfectionist': {
      vueuse: true,
      autoImport: true,
    },
  },
  rules: {
    'vue-perfectionist/prefer-define-model': ['error', { vueuse: true }],
  },
}
```

When enabled, the rule skips the corresponding model if a recognized
[`useVModel`](https://vueuse.org/core/useVModel/) call has `passive: true`.
Passive models retain local state and watcher-based synchronization, so a direct
replacement with `defineModel` need not preserve behavior. `defaultValue` is not
required for this exception.

Named imports from `@vueuse/core`, including aliases, and non-computed namespace
calls are recognized. An unbound `useVModel` also requires the shared
`autoImport: true` setting. Declaring an ESLint global alone is insufficient;
local values, other imports, and type-only bindings do not qualify as auto-imports.

For unbound calls, writes to `useVModel` or the same property on an unshadowed
`globalThis`, `window`, `self`, or `global` prevent the exception. This includes
assignment, update, deletion, destructuring targets, and loop targets anywhere in
the file, including ordinary scripts and nested functions. Computed writes with
unknown property names are conservative too. An unbound direct `eval` call also
prevents auto-import recognition because it can change runtime bindings. Plain
reads and shadowed local objects or `eval` do not affect recognition. These
global checks do not affect explicit VueUse imports. Global-object aliases and
mutation APIs such as `Object.assign` are not analyzed.

This global write keeps the declaration report even with both opt-ins enabled:

::: incorrect passive-vueuse-model

```vue
<script setup>
const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
globalThis.useVModel = customModel
const inputValue = useVModel(props, 'modelValue', emit, { passive: true })
</script>
```

:::

With VueUse support enabled, this imported passive model is accepted:

::: correct passive-vueuse-model

```vue
<script setup lang="ts">
import { useVModel } from '@vueuse/core'

const props = defineProps<{
  modelValue?: string
  defaultValue?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const inputValue = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input v-model="inputValue" />
</template>
```

:::

With both VueUse support and shared `autoImport` enabled, an automatically
imported call is accepted too:

::: correct passive-vueuse-model

```vue
<script setup>
const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
const inputValue = useVModel(props, 'modelValue', emit, { passive: true })
</script>

<template>
  <input v-model="inputValue" />
</template>
```

:::

Only the corresponding passive model is exempt. Here `title` is still reported:

::: incorrect passive-vueuse-model

```vue
<script setup>
import { useVModel } from '@vueuse/core'

const props = defineProps({ modelValue: String, title: String })
const emit = defineEmits(['update:modelValue', 'update:title'])
const inputValue = useVModel(props, 'modelValue', emit, { passive: true })
</script>
```

:::

The exception requires a direct top-level setup initializer or expression
statement with four arguments: the unreassigned binding of the current
`defineProps` (optionally wrapped in `withDefaults`), a static string or
substitution-free template for the model name, the unreassigned binding of the
current `defineEmits`, and an inline options object. Parentheses and transparent
TypeScript wrappers are accepted. Binding aliases, destructured props, nested or
conditional calls, optional calls, and external options variables are not followed.

The final `passive` value must be the literal `true`; `eventName` must be absent
or statically equal `update:modelName`. Spreads and unknown computed keys make
both values unknown until explicitly overwritten. For example,
`{ ...options, passive: true }` is insufficient because `eventName` remains
unknown; adding `eventName: 'update:modelValue'` confirms that model's event.
Any inline getter or setter prevents the exception, even on another option or
before later explicit values: VueUse reads `clone` before `passive`, and a getter
can mutate other options during that read. A non-computed `__proto__` prototype
setter is also rejected unless its value is literally `null`, because inherited
accessors have the same risk. A computed `['__proto__']` data property does not
change the prototype. Dynamic `passive` and `eventName` values do not establish
the exception. Unrecognized calls keep the usual declaration reports.

Inline accessors keep the declaration report, even alongside `passive: true`:

::: incorrect passive-vueuse-model

```vue
<script setup>
import { useVModel } from '@vueuse/core'

const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
const inputValue = useVModel(props, 'modelValue', emit, {
  get clone() {
    return false
  },
  passive: true,
})
</script>
```

:::

## Scope

Only unshadowed, unimported `defineProps` and `defineEmits` calls in top-level
variable initializers or expression statements of `.vue` setup scripts are
checked. Parentheses and transparent TypeScript expression wrappers are accepted.
Both JavaScript and TypeScript SFCs are supported, including dual-script SFCs.
There must be exactly one eligible props call and one eligible emits call.

Imported macros (including aliases and namespaces), shadowed names, optional
calls, nested calls and functions, ordinary scripts, templates, and standalone
JS/TS files are skipped. The rule needs Vue parser services, but no TypeScript
project or type checker. Macro recognition does not depend on auto-import
settings; the optional VueUse exception follows the settings described above.

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
