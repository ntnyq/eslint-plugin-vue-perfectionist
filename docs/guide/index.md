---
description: Install Vue Perfectionist and enable your first rules in an ESLint flat configuration.
---

# Getting Started

`eslint-plugin-vue-perfectionist` provides configurable ESLint rules for Vue 3
scripts and templates. It covers callbacks, composable definitions, macro types
and layout, naming, component usage contracts, template expressions, and
statement ordering.

Each rule defines its own scope. Some require `<script setup>`, some inspect
templates, and others also work in ordinary scripts and standalone JavaScript
or TypeScript files. The [rules overview](/rules/) lists these scopes.

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
      'vue-perfectionist/consistent-template-ref-name': 'error',
      'vue-perfectionist/define-macros-newline': 'error',
      'vue-perfectionist/prefer-ref-pattern': 'error',
      'vue-perfectionist/sort-script-setup': 'error',
    },
  },
])
```

For JavaScript-only SFCs, omit the TypeScript parser import and
`parserOptions.parser`. If your Vue configuration already supplies the parsers,
add the plugin and your chosen rules to it. See
[Configuration](/guide/configuration) for standalone JS/TS files and public types.

Run ESLint against your source files, adding `--fix` to apply supported fixes:

```shell
pnpm exec eslint .
pnpm exec eslint . --fix
```

## Choosing Rules

Start with the [rules overview](/rules/) to find checks for your code. Rules are
independent and can be combined to enforce complementary conventions; see
[Rule Composition](/guide/rule-composition) for examples.

Component prop, slot, and generic-comment rules have no built-in component
targets. Configure their `targets` before expecting diagnostics. Rule pages
document defaults, options, supported syntax, and uncertainty handling.

Use [`prefer-define-model`](/rules/prefer-define-model) to identify matching
prop and update-event declarations that can be migrated manually to Vue 3.4+
`defineModel`. Use [`define-model-name-casing`](/rules/define-model-name-casing)
to enforce the casing of explicit model names independently of template arguments.

Use [`prefer-watch-effect-alias`](/rules/prefer-watch-effect-alias) to prefer
`watchPostEffect` and `watchSyncEffect` over static `watchEffect` flush options.

Use [`require-injection-key`](/rules/require-injection-key) to disallow string keys in Vue provide and inject calls.

## Auto-imported Vue APIs

For auto-import tooling, opt into
`settings['vue-perfectionist'].autoImport: true`. It defaults to `false`.
See [auto-import configuration](/guide/configuration#auto-imported-vue-apis)
for supported rules, rule-level overrides, local shadowing, and ESLint globals.

## Automatic Fixes

Seven rules offer automatic fixes for supported cases: callback body style,
macro line breaks, template tag padding, mixed text interpolation, watch effect
aliases, and setup statement ordering, plus model-name casing when explicitly enabled with
`fix: true`. Model renames change the component contract. Remaining diagnostics
need manual changes.
See [fix boundaries](/guide/rule-composition#automatic-fixes) before applying
fixes across a project.

## Using Other Sorting Rules

When `sort-script-setup` owns declaration and macro order, disable overlapping
sorting rules for the same `.vue` files. Continue using dedicated import and
Vue correctness rules. See
[statement ordering](/guide/rule-composition#statement-ordering) for an override.
