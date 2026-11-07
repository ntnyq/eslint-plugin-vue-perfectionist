---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/no-template-type-assertion
description: Disallow as type assertions in Vue templates.
---

# vue-perfectionist/no-template-type-assertion

> Disallow `as` type assertions in Vue templates.

<!-- summary:start -->

::: info At a glance

| Concern          | Behavior                                                             |
| ---------------- | -------------------------------------------------------------------- |
| Scope            | Template                                                             |
| Defaults         | Report every as assertion, including as const; move it into scripts. |
| Required options | None; enabling the rule uses its defaults.                           |
| Automatic fixes  | —                                                                    |
| Type information | No TypeScript type services required.                                |

:::

<!-- summary:end -->

## Usage

Configure `vue-eslint-parser` with `@typescript-eslint/parser` to parse TypeScript
expressions in templates. No TypeScript type services are required.

```js
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
    rules: { 'vue-perfectionist/no-template-type-assertion': 'error' },
  },
]
```

## :book: Rule Details

Move type assertions into `<script>` to keep templates focused on rendering.
Prefer accurate source types or type guards when possible. When an assertion is
necessary, use a computed property to preserve reactivity, or a function that
accepts template-local values.

::: correct

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: unknown }>()
const label = computed(() => props.value as string)
</script>

<template>
  <AppLabel :value="label" />
  <span>{{ label }}</span>
</template>
```

:::

::: incorrect

```vue
<script setup lang="ts">
defineProps<{ value: unknown }>()
</script>

<template>
  <AppLabel :value="value as string" />
  <span>{{ value as string }}</span>
</template>
```

:::

Constant assertions and chained assertions are also reported. Each `as`
assertion receives its own diagnostic.

::: incorrect

```vue
<script setup lang="ts">
defineProps<{ value: unknown }>()
</script>

<template>
  <AppLabel :value="'ready' as const" />
  <span>{{ value as unknown as string }}</span>
</template>
```

:::

## :wrench: Options

This rule has no options.

## Scope

Checks every parsed `TSAsExpression` in Vue templates, including interpolations,
directive values, event handlers, `v-for` sources, slot defaults, and dynamic
directive arguments. Nested assertions in callbacks and other expressions are
also checked. Assertions referencing `v-for` or slot variables are reported;
move them into a function accepting those variables or into a child component.

Script blocks and standalone JavaScript/TypeScript files are not checked.
Static text, static attributes, comments, `v-pre` content, and expressions the
parser cannot parse are skipped. This rule does not prohibit `satisfies`,
non-null assertions (`value!`), or angle-bracket type assertions (`<Type>value`).

No automatic fix or suggestion is provided. Extraction requires choosing a name
and preserving reactivity and template-local scope.

## Alternative: vue/no-restricted-syntax

If you already use `eslint-plugin-vue`, you can use
[`vue/no-restricted-syntax`](https://eslint.vuejs.org/rules/no-restricted-syntax.html)
with the `TSAsExpression` selector instead. It checks template expressions and
supports a custom message:

```js
import tsParser from '@typescript-eslint/parser'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { vue },
    rules: {
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression',
          message: 'Move this type assertion into <script>.',
        },
      ],
    },
  },
]
```

Enable either this rule or the alternative to avoid duplicate diagnostics.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/no-template-type-assertion.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/no-template-type-assertion.test.ts)
