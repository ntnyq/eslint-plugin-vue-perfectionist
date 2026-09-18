# Guide

`eslint-plugin-vue-perfectionist` provides configurable grouping and ordering
for top-level statements in Vue 3 `<script setup>` blocks.

## Install

Install the plugin together with its ESLint and Vue parser peer dependencies:

::: code-group

```shell [npm]
npm i -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [yarn]
yarn add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [pnpm]
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

:::

The plugin supports ESLint `^9.10.0 || ^10.0.0` and `vue-eslint-parser`
`^10.0.0`. For `<script setup lang="ts">`, also install
`@typescript-eslint/parser` and `typescript` as development dependencies.

## Basic Usage

Use an `eslint.config.mjs` flat configuration file. The following configuration
supports both JavaScript and TypeScript Vue SFCs:

```js [eslint.config.mjs]
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default defineConfig([
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/sort-script-setup': 'error',
    },
  },
])
```

For JavaScript-only SFCs, omit the TypeScript parser import and
`parserOptions.parser`. If an existing Vue configuration already supplies the
parsers, add the plugin and rule to that configuration.

## Choosing Rules

The plugin provides rules only and does not include built-in configurations.
Enable and combine rules explicitly in your own configuration. Alongside
[`sort-script-setup`](../rules/sort-script-setup.md), you can enable
[`callback-style`](../rules/callback-style.md),
[`define-macros-newline`](../rules/define-macros-newline.md), and
[`prefer-ref-pattern`](../rules/prefer-ref-pattern.md).

To sort names naturally, configure `sort-script-setup` with an explicit option:

```js
{
  rules: {
    'vue-perfectionist/sort-script-setup': ['error', { type: 'natural' }],
  },
}
```

Without explicit sorting options, the rule inherits supported preferences from
`settings.perfectionist` and `settings['vue-perfectionist']`, falling back to
`unsorted`. Explicit rule options take precedence over shared settings.

## Automatic Fixes

Run ESLint with `--fix` to apply safe fixes. Movement fixes are limited to
independent type/interface declarations, primitive constants, and ordinary
function declarations within safe contiguous fragments. Runtime calls,
compiler macros, watchers, and lifecycle registrations may be reported
without an automatic fix. Initialization dependencies always take precedence
over sorting preferences.

See [sort-script-setup](../rules/sort-script-setup.md) for examples, all options,
and the full fix contract.

## Using Other Sorting Rules

Continue using `perfectionist/sort-imports` for imports. If your existing
configuration enables `perfectionist/sort-modules` or
`vue/define-macros-order`, disable those rules for the same `.vue` files when
this plugin controls declaration and macro order. Keep Vue correctness rules
such as checks for watchers and lifecycle registration after `await`.

Align any whitespace settings
with your formatter and padding rules; this plugin ignores blank-line counts
by default.
