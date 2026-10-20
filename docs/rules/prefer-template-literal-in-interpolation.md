---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-template-literal-in-interpolation
description: Require a single template literal for mixed text and interpolation when conversion is safe.
---

# vue-perfectionist/prefer-template-literal-in-interpolation

> Require a single template literal for mixed text and interpolation when conversion is safe.

:wrench: Automatically fixes fragments whose expression results and text can be
converted safely. By default, uncertain fragments produce no diagnostics.

## Usage

This complete flat configuration supports JavaScript and TypeScript Vue SFCs:

```js
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-template-literal-in-interpolation': 'error',
    },
  },
])
```

## :book: Rule Details

A fragment consists of consecutive text and interpolation nodes under the same
parent. It must contain at least one interpolation and some non-whitespace text.
Each fragment receives at most one diagnostic. Elements and comments end a
fragment.

::: correct

```vue
<template>
  <span>{{ `${42}分` }}</span>
  <span>{{ `共 ${0}/${10} 项` }}</span>
  <span>{{ first }} {{ second }}</span>
  <span>Plain text</span>
</template>
```

:::

::: incorrect

```vue
<template>
  <span>{{ 42 }}分</span>
  <span>共 {{ 0 }}/{{ 10 }} 项</span>
  <span>{{ ok ? 0 : null }}分</span>
</template>
```

:::

The nullish example is fixed to a template substitution using `?? ''`. It keeps
`0` visible and displays `null` as an empty string:

::: correct

```vue
<template>
  <span>{{ `${(ok ? 0 : null) ?? ''}分` }}</span>
</template>
```

:::

## :wrench: Options

```json
{
  "vue-perfectionist/prefer-template-literal-in-interpolation": [
    "error",
    {
      "reportUnfixable": false
    }
  ]
}
```

### `reportUnfixable`

- Type: `boolean`
- Default: `false`

When `false`, only safely fixable fragments are reported. When `true`, all mixed
fragments in the supported scope are reported, including those whose types or
formatting prevent a safe fix. Such reports have no fix or editor suggestion;
they remain on subsequent lint runs until the code or configuration changes.

Unknown variables and member accesses are accepted by default:

::: correct

```vue
<template>
  <span>{{ area.score }}分</span>
  <span>共 {{ total }} 项</span>
</template>
```

:::

With `reportUnfixable: true`, the same expressions are reported without fixes.
The inline ESLint configuration makes this example use the non-default option:

::: incorrect

<!-- eslint-skip -->

```vue eslint-check=vue-perfectionist/prefer-template-literal-in-interpolation
<script setup>
/* eslint vue-perfectionist/prefer-template-literal-in-interpolation: [error, { reportUnfixable: true }] */
</script>

<template>
  <span>{{ area.score }}分</span>
  <span>共 {{ total }} 项</span>
</template>
```

:::

## Scope

- Checks HTML Vue SFC template children, including native elements, components,
  and template-local scopes. No script block or Vue import is required.
- Skips standalone scripts, JSX/TSX, attributes, directive values, pure text,
  single interpolations, and interpolations separated only by whitespace.
- Never combines fragments across elements or HTML comments. Leading and
  trailing whitespace-only nodes are left outside the replacement range.
- Skips `v-pre`, `v-text`, and `v-html` subtrees, non-HTML template languages,
  foreign namespaces (including SVG and MathML), and special text contexts:
  `pre`, `textarea`, `title`, `script`, `style`, `xmp`, `iframe`, `noembed`,
  `noframes`, `noscript`, `plaintext`, and `listing`, including descendants.
  These exclusions also apply with `reportUnfixable: true`.
- Requires the Vue parser's template visitor service. Unsupported parsers are
  skipped safely. Default double-brace interpolation delimiters are required for fixes.

## Automatic fixes and formatting

The rule uses **local syntactic inference**, not the TypeScript type checker:

| Expression result                                                    | Fix behavior                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| String, number, boolean, or bigint literal                           | Convert directly                                        |
| Existing template literal, `!value`, or `typeof value`               | Convert the already primitive result                    |
| Ternary with every result branch supported                           | Convert, preserving the condition and branch evaluation |
| `null`, `void expression`, or a supported ternary containing these   | Convert with `?? ''`                                    |
| Identifier, member access, function call, or another unproven result | Skip by default                                         |
| Object, array, function, regexp, or symbol                           | Skip by default                                         |

Supported numeric unary operations on known number/bigint expressions are also
inferred. TypeScript assertions, `satisfies`, and non-null assertions are unwrapped
for analysis; they do not prove a value's runtime type or remove nullish handling.
Even the identifier `undefined` is not assumed to be global: it could be a
component or template-local binding. `any`, `unknown`, and unresolved generics
cannot make a fragment fixable. Enabling typed linting does not expand this rule's
scope; template-to-script type mapping is not implemented in this version.

Vue's display conversion differs from JavaScript template substitution for some
values, especially nullish values, arrays, and objects. A fix must prove every
expression in the fragment safe. Expressions are evaluated once each in their
original order, and no partial fix is offered for an uncertain fragment.

Text entities are decoded once, then escaped for JavaScript and Vue interpolation.
Backslashes, backticks, literal `${...}` text, and closing braces are escaped.
Original expression source, parentheses, and block comments are retained.
Expressions containing line comments are conservatively left without fixes,
including comments whose delimiters are written as HTML entities.

Text containing tabs, newlines (including CRLF), form feeds, or repeated ASCII
spaces is not fixed, because Vue's `condense` and `preserve` whitespace modes can
render it differently. These fragments are reported only with
`reportUnfixable: true`. Outer indentation remains untouched. Run your formatter
after fixing to simplify parentheses and format the generated expression.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-template-literal-in-interpolation.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-template-literal-in-interpolation.test.ts)
