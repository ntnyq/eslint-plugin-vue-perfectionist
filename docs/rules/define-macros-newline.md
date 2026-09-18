---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/define-macros-newline
description: Require line breaks inside braces and between top-level members of inline Vue compiler macro declarations.
---

# vue-perfectionist/define-macros-newline

> Require line breaks inside braces and between top-level members of inline Vue compiler macro declarations.

- :wrench: ESLint's `--fix` option can automatically fix problems reported by this rule.

This is an autofixable `layout` rule for `.vue` files with `<script setup>`. Enable it explicitly in your ESLint configuration.

## Usage

Enable it alongside your existing Vue parser configuration:

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.vue'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/define-macros-newline': 'error',
    },
  },
]
```

## :book: Rule Details

Even declarations with a single member must use multiple lines:

```ts
// Invalid
defineProps<{ name: string }>()
defineEmits<{ change: [value: string] }>()
defineSlots<{ default(props: { name: string }): unknown }>()
defineExpose({ open, close })

// Valid
defineProps<{
  name: string
}>()
defineEmits<{
  change: [value: string]
}>()
defineSlots<{
  default(props: { name: string }): unknown
}>()
defineExpose({
  open,
  close,
})
```

Each member must start on a later line than the previous member ends. Members themselves may span multiple lines. Adding line breaks around the braces alone is insufficient:

<!-- prettier-ignore -->
```ts
// Invalid
defineProps<{
  name: string; age: number
}>()

// Valid
defineProps<{
  name: string
  age: number
}>()
```

## :wrench: Options

```js
{
  'vue-perfectionist/define-macros-newline': ['error', {
    macros: ['defineProps', 'defineEmits', 'defineSlots', 'defineExpose'],
  }],
}
```

`macros` replaces the default list. An empty array disables the rule. Only the five macro names below are accepted; duplicates are rejected.

| Macro           | Checked declaration                                | Enabled by default |
| --------------- | -------------------------------------------------- | ------------------ |
| `defineProps`   | First inline type literal or first object argument | Yes                |
| `defineEmits`   | First inline type literal or first object argument | Yes                |
| `defineSlots`   | First inline type literal                          | Yes                |
| `defineExpose`  | First object argument                              | Yes                |
| `defineOptions` | First object argument                              | No                 |

For example, check only exposed APIs and component options:

```js
{
  macros: ['defineExpose', 'defineOptions'],
}
```

## Scope

The rule checks direct, non-optional identifier calls within `<script setup>`. Locally declared or imported bindings, aliases, and member calls such as `Vue.defineProps()` are skipped. Compiler macros normally require no imports; global declarations supplied by an ESLint configuration are supported.

Ordinary `<script>` blocks, template expressions, and standalone JavaScript or TypeScript files are skipped. In an SFC with both script blocks, only the setup block is checked.

Only direct, nonempty type literals and object arguments are checked:

```ts
// The props type is checked; the defaults object is not.
withDefaults(
  defineProps<{
    name?: string
  }>(),
  { name: 'test' },
)

// Nested types, objects, tuples, and callback parameters stay unchanged.
defineProps<{
  options: { immediate: boolean; once: boolean }
}>()
defineProps({
  name: { type: String, required: true },
})
defineEmits<{
  (event: 'change', value: { name: string }): void
  (event: 'close'): void
}>()

// Skipped: references, empty declarations, and arrays.
defineProps<Props>()
defineExpose(exposed)
defineProps<{}>()
defineExpose({})
defineExpose()
defineProps(['name'])
defineEmits(['change'])

// Skipped: composed or wrapped types and expressions.
defineProps<Props & { name: string }>()
defineProps<Partial<{ name: string }>>()
defineExpose({ open } satisfies Exposed)
```

The rule does not follow variable or type declarations, recursively expand nested members, or validate macro signatures. `defineModel` is not supported because its type and option arguments have different roles.

## Automatic fixes and formatting

The `expectedNewlines` diagnostic is reported once per affected declaration. Its fix changes only whitespace, retaining member order, comments, commas, semicolons, and existing line breaks. CRLF files retain CRLF in inserted line breaks. Comments immediately inside either brace are also separated from that brace by a line break.

Indentation, semicolons, trailing commas, and blank-line counts remain the formatter's responsibility. Run your formatter after ESLint fixes to finish indentation. With Oxfmt's `objectWrap: 'preserve'`, fixed declarations retain their multiline layout. Avoid formatter settings or other rules that collapse these declarations back onto one line.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/define-macros-newline.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/define-macros-newline.test.ts)
