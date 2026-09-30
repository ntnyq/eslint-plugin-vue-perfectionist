---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/define-macros-type-style
description: Enforce inline, local, or imported type arguments in Vue compiler macros.
---

# vue-perfectionist/define-macros-type-style

> Enforce inline, local, or imported type arguments in Vue compiler macros.

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
      'vue-perfectionist/define-macros-type-style': 'error',
    },
  },
]
```

## :book: Rule Details

By default, each macro must reference a local `interface` or `type` declaration.
Names are unrestricted. The directly referenced declaration determines the style;
local aliases and interfaces extending imported types still count as local.

::: correct

```vue
<script setup lang="ts">
interface ButtonProps {
  title: string
}

const props = defineProps<ButtonProps>()
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
const props = defineProps<{ title: string }>()
</script>
```

:::

Imported types also produce a diagnostic under the default local policy:

::: incorrect

```vue
<script setup lang="ts">
import type { Props } from './types'

const props = defineProps<Props>()
</script>
```

:::

## :wrench: Options

The expanded defaults are:

```js
{
  'vue-perfectionist/define-macros-type-style': ['error', {
    macros: {
      defineProps: 'local',
      defineEmits: 'local',
      defineSlots: 'local',
    },
  }],
}
```

Each `macros` value accepts `'inline'`, `'local'`, `'imported'`, a nonempty unique
array of those styles, or `false` to disable that macro. Arrays replace the
macro's default. Omitted keys retain their defaults, including with `{}` or
`{ macros: {} }`. Unknown fields and macro names are rejected.

To accept both local declarations and imports for props, while skipping the other macros:

```js
{
  macros: {
    defineProps: ['local', 'imported'],
    defineEmits: false,
    defineSlots: false,
  },
}
```

| Outer type form                                                                               | Classification             |
| --------------------------------------------------------------------------------------------- | -------------------------- |
| Direct type literal or function type                                                          | `inline`                   |
| Reference to a top-level, non-ambient local interface or type alias                           | `local`                    |
| Reference to a named or default ES import, including type-only imports                        | `imported`                 |
| Qualified name rooted in an ES namespace import                                               | `imported`                 |
| Qualified `import('./types').Props`, including generic arguments                              | `imported`                 |
| Unresolved, ambient, built-in, generic parameter, bare namespace import, or ambiguous binding | Unknown source; reported   |
| Union, intersection, mapped, conditional, indexed-access, keyword, or `typeof` type           | Unsupported form; reported |

Generic arguments do not affect the outer classification. `Props<T>` follows the
binding of `Props`. Nested imported property types do not change an inline literal.
Local namespaces and qualified named/default imports are unsupported. Compatible
interface merging remains local, and same-named value bindings do not replace
resolved type bindings. Declarations can appear after the call or in the ordinary
script block. Alias chains are never followed and other files are never loaded.

Unknown sources are reported even when all three styles are allowed. Supported
but disallowed styles report `unexpectedTypeStyle`; unsupported outer syntax
reports `unsupportedTypeForm`; unresolved or ambiguous sources report
`unknownTypeSource`. Each diagnostic covers the complete type argument.

## Scope

Only `defineProps`, `defineEmits`, and `defineSlots` with exactly one explicit type
argument and no runtime arguments are checked in `.vue` setup scripts. Calls must
be top-level variable initializers (including destructuring) or expression
statements. Parentheses and transparent TypeScript expression wrappers are accepted.
An unshadowed `withDefaults` can wrap `defineProps` as its first argument in either
position; the inner type is checked once.

Imported or shadowed macros, aliases, member/optional calls, arbitrary outer
expressions, nested functions/blocks, ordinary script calls, template expressions,
and standalone JS/TS files are skipped. Accessible types from either script block
can establish a source. Missing parser services, runtime declarations, missing or
extra type arguments, and calls with runtime arguments are skipped. `defineModel`,
`defineExpose`, `defineOptions`, and custom macros are outside this rule's scope.

This rule needs no TypeScript project or type checker. It enforces a declaration
convention and does not establish that Vue can compile the type. It neither
requires a macro to exist nor requires a missing generic argument.

Combine this rule with [`require-macro-type-name`](./require-macro-type-name.md)
to require specific call-site names. With both defaults, contracts must be local
and named `Props`, `Emits`, and `Slots`. Disable the corresponding naming check
when requiring inline types, since those policies conflict.

## Automatic fixes and formatting

There are no automatic fixes or suggestions. Extracting or moving a type requires
scope, comment, and file-boundary decisions. The examples show manual alternatives.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/define-macros-type-style.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/define-macros-type-style.test.ts)
