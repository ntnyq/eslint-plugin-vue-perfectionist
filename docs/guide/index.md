---
description: Install Vue Perfectionist and enable your first rules in an ESLint flat configuration.
---

# Getting Started

`eslint-plugin-vue-perfectionist` provides configurable ESLint rules for Vue 3
scripts and templates. Follow these steps to register the plugin, enable rules,
and run your first checks.

::: warning Development status
The API may change before the first stable release. Review
[release notes](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/releases)
when upgrading.
:::

## Install

The package declares ESLint `^10.0.0` and `vue-eslint-parser` `^10.0.0` as peer
dependencies and ships as ESM. Install them together:

::: code-group

```shell [pnpm]
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [npm]
npm i -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

```shell [yarn]
yarn add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

:::

For TypeScript SFCs, also install the script parser and TypeScript:

::: code-group

```shell [pnpm]
pnpm add -D @typescript-eslint/parser typescript@6
```

```shell [npm]
npm i -D @typescript-eslint/parser typescript@6
```

```shell [yarn]
yarn add -D @typescript-eslint/parser typescript@6
```

:::

## Basic Usage

Register the plugin and enable the rules you want in `eslint.config.mjs`.
The plugin provides rules only; there are no built-in configurations.
This example supports JavaScript and TypeScript Vue SFCs:

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
      },
    },
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/callback-style': 'error',
      'vue-perfectionist/define-macros-newline': 'error',
      'vue-perfectionist/no-complex-template-expression': 'error',
    },
  },
])
```

For JavaScript-only SFCs, omit the TypeScript parser import and
`parserOptions.parser`. If your Vue configuration already supplies the parsers,
add the plugin and your chosen rules to it.

## Run ESLint

Run ESLint against your source files, adding `--fix` to apply supported fixes:

```shell
pnpm exec eslint .
pnpm exec eslint . --fix
```

## Next Steps

- [Choose rules](/rules/): browse by purpose and check file scopes, defaults, and automatic fix support.
- [Configuration](/guide/configuration): configure standalone JS/TS files, auto-imported Vue APIs, and public types.
- [Rule Composition](/guide/rule-composition): combine related checks and understand fix boundaries and interactions with other plugins.
