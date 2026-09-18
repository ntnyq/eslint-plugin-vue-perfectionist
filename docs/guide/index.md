# Guide

`eslint-plugin-vue-perfectionist` provides configurable ESLint rules for
consistent, readable, and maintainable Vue 3 code. Rules cover callback styles,
macro declaration layout, template ref naming, and statement ordering.

Each rule has its own scope. Some check `<script setup>`, while others also
check templates, ordinary script blocks, or standalone JavaScript and TypeScript
files. See each rule's documentation for supported syntax and options.

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
supports both JavaScript and TypeScript Vue SFCs and shows how to combine the
available rules. Keep the rules that match your project's conventions:

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
      'vue-perfectionist/callback-style': 'error',
      'vue-perfectionist/define-macros-newline': 'error',
      'vue-perfectionist/prefer-ref-pattern': 'error',
      'vue-perfectionist/sort-script-setup': 'error',
    },
  },
])
```

For JavaScript-only SFCs, omit the TypeScript parser import and
`parserOptions.parser`. If an existing Vue configuration already supplies the
parsers, add the plugin and your chosen rules to that configuration.

To check standalone JavaScript and TypeScript files, enable `callback-style`
and the script targets of `prefer-ref-pattern` in configurations matching those
files, using their usual ESLint parsers. The example above matches `.vue` files
only.

## Choosing Rules

The plugin provides rules only and does not include built-in configurations.
Enable and combine rules explicitly in your own configuration. Each rule has
independent options; enabling one rule does not require enabling another.

Browse the [rules overview](/rules/) for all available rules and their descriptions.

### Configuring Statement Ordering

To sort names naturally, configure `sort-script-setup` with an explicit option:

```js
{
  rules: {
    'vue-perfectionist/sort-script-setup': ['error', { type: 'natural' }],
  },
}
```

Without explicit sorting options, the rule uses its defaults, including
`type: 'unsorted'`. Shared ESLint settings are not supported;
`settings.perfectionist` and `settings['vue-perfectionist']` are ignored.
Configure sorting preferences directly in the rule options.

## Automatic Fixes

Run ESLint with `--fix` to apply supported fixes. Fix behavior depends on the rule:

- [`callback-style`](../rules/callback-style.md#diagnostics-and-fixes) can convert
  arrow expression bodies to block bodies while preserving their return values.
  Callback references and ordinary function expressions are reported without fixes.
- [`define-macros-newline`](../rules/define-macros-newline.md#automatic-fixes-and-formatting)
  inserts line breaks while preserving member order. Run your formatter afterward
  to finish indentation.
- [`prefer-ref-pattern`](../rules/prefer-ref-pattern.md) reports naming mismatches
  without fixes or suggestions because a pattern cannot determine a unique name.
- [`sort-script-setup`](../rules/sort-script-setup.md#partitions-and-automatic-fixes)
  limits movement fixes to eligible declarations within safe contiguous fragments.
  Initialization dependencies take precedence over sorting preferences; unsafe
  runtime moves are reported without fixes.

## Using Other Sorting Rules

Continue using `perfectionist/sort-imports` for imports. If your existing
configuration enables `perfectionist/sort-modules` or
`vue/define-macros-order`, disable those rules for the same `.vue` files when
`sort-script-setup` controls declaration and macro order. Keep Vue correctness rules
such as checks for watchers and lifecycle registration after `await`.

Align any whitespace settings
with your formatter and padding rules; `sort-script-setup` ignores blank-line
counts by default. For other rules, follow their documented compatibility guidance.
