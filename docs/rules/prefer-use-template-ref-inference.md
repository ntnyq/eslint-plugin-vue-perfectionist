---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-use-template-ref-inference
description: Prefer inferred types for static Vue template refs.
---

# vue-perfectionist/prefer-use-template-ref-inference

> Prefer inferred types for static Vue template refs.

Vue 3.5+ with `@vue/language-tools` 2.1+ can infer template ref types from
matching static refs in the same SFC, including DOM elements and component
instances. See [Vue's template ref typing guide](https://vuejs.org/guide/typescript/composition-api.html#typing-template-refs).
Use compatible Vue language tooling in your editor and `vue-tsc` for command-line
type checking. This rule does not inspect your tooling versions or TypeScript
configuration.

This is a style preference. The rule cannot prove that an explicit type is
equivalent to the inferred type. It reports without automatic fixes or
suggestions, so removing a generic remains a deliberate type-checking change.

## Usage

Add the rule to a flat configuration for TypeScript Vue SFCs:

```js [eslint.config.mjs]
import tsParser from '@typescript-eslint/parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-use-template-ref-inference': 'error',
    },
  },
]
```

The rule recognizes direct, same-name runtime imports from `vue`. For
auto-imported `useTemplateRef`, enable the shared setting, which defaults to
`false`:

```json
{
  "settings": {
    "vue-perfectionist": {
      "autoImport": true
    }
  }
}
```

The setting also recognizes names declared in ESLint's `languageOptions.globals`.
Local bindings, imports from other modules, and type-only imports take precedence.
It does not configure auto-importing or enable type inference itself.

## :book: Rule Details

A call with one explicit type argument is reported when its literal key uniquely
matches a static `ref="key"` on an element or static component in the same SFC.
The diagnostic covers the full type argument list, including `<` and `>`.

::: correct

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const videoRef = useTemplateRef('videoRef')
const playerRef = useTemplateRef('playerRef')
</script>

<template>
  <video ref="videoRef" />
  <VideoPlayer ref="playerRef" />
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')
const playerRef = useTemplateRef<PlayerInstance>('playerRef')
</script>

<template>
  <video ref="videoRef" />
  <VideoPlayer ref="playerRef" />
</template>
```

:::

The binding name does not need to match the key. Keys can be string literals or
template literals without substitutions. `v-if` and `v-for` do not exempt a
unique static ref:

::: incorrect

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const element = useTemplateRef<HTMLVideoElement>('videoRef')
</script>

<template>
  <video
    v-if="visible"
    ref="videoRef"
  />
</template>
```

:::

## :wrench: Options

Default configuration:

```json
{
  "vue-perfectionist/prefer-use-template-ref-inference": [
    "error",
    {
      "ignoreRefs": []
    }
  ]
}
```

### ignoreRefs

Type: `string[]`. Default: `[]`.

Allow listed template ref **keys** to retain explicit types. Matching is exact
and case-sensitive; entries are not variable names or regular expressions.
The array replaces the default empty list. An empty array exempts no keys.

Use this for intentional public interfaces, extended DOM types, or language
tooling inference limitations. It exempts every matching key within the ESLint
configuration's scope. A local ESLint disable comment with a reason is another
way to document an isolated exception.

With `{ ignoreRefs: ['editorRef'] }`, the following is accepted:

::: correct

<!-- prettier-ignore -->
```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const editor = useTemplateRef<EditorInterface>('editorRef')
</script>

<template>
  <Editor ref="editorRef" />
</template>
```

:::

## Scope

Checks are limited to `<script setup lang="ts">` and direct top-level calls
used as variable initializers or expression statements. Parentheses and
`as`, `satisfies`, or non-null wrappers around the resulting call are accepted.
Both ordinary and setup scripts can supply the import; only setup calls are
checked.

The rule skips:

- Ordinary scripts, JavaScript or TSX setup blocks, standalone files, template
  expressions, render functions, JSX, nested blocks, functions, and callbacks.
- Import aliases with a different local name, namespace calls, optional calls,
  and wrapped callees. Custom import sources and language-tool composable name
  settings are not supported.
- Calls with zero or multiple type arguments, anything other than one argument,
  spread arguments, dynamic keys, or TypeScript wrappers around keys.
- Missing refs, bound refs such as `:ref="key"` or `:ref="'key'"`, and duplicate
  static keys, including keys repeated across conditional branches. A bound
  string literal with the same key also makes a static ref ambiguous.
- Dynamic `<component>` elements, elements with `is` or `:is`, `<template>` and
  `<slot>` refs, `v-pre` content, and elements with object-form `v-bind`, dynamic
  binding arguments, or a competing bound `ref`.
- Elements and descendants excluded by a `<!-- @vue-skip -->` language-tooling
  directive. A directive before `v-if` also excludes its `v-else-if` and `v-else`
  branches; it does not exclude unrelated following siblings.
- Static ref attributes whose raw value differs from the decoded key, such as
  `ref="video&#82;ef"`. Language tooling can retain the entity text in inferred
  keys. These refs still count when checking for duplicate decoded keys.

Dynamic components can legitimately need an explicit union type:

::: correct

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const playerRef = useTemplateRef<AudioPlayer | VideoPlayer>('playerRef')
</script>

<template>
  <component
    ref="playerRef"
    :is="currentPlayer"
  />
</template>
```

:::

Static components, including generic components, are checked without resolving
their declarations. Preserve a necessary explicit type through `ignoreRefs` or
a local disable comment. The rule performs no TypeScript type-equivalence check.

Enable [`consistent-template-ref-name`](./consistent-template-ref-name.md) or
[`prefer-ref-pattern`](./prefer-ref-pattern.md) separately to enforce ref naming.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-use-template-ref-inference.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-use-template-ref-inference.test.ts)
