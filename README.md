# eslint-plugin-vue-perfectionist

English | [简体中文](./README.zh-CN.md)

[![CI](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-vue-perfectionist.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/LICENSE)

ESLint rules for consistent, readable, and maintainable Vue 3 code.

Define conventions for composables, macros, naming, component usage,
templates, and statement ordering.

The plugin provides **rules only**, with no built-in configurations. Choose
rules explicitly and configure their options for your project.

> [!WARNING]
> This project is under active development. The API is unstable and may introduce breaking changes before the first stable release.

[Documentation](https://vue-perfectionist.ntnyq.dev) · [Getting Started](https://vue-perfectionist.ntnyq.dev/guide/) · [Rules](https://vue-perfectionist.ntnyq.dev/rules/)

## See a Rule in Action

With `callback-style` enabled, an expression callback is reported:

```ts
import { watchEffect } from 'vue'

watchEffect(() => refresh())
```

After running ESLint with `--fix`, the callback uses a block body and preserves its return value:

```ts
import { watchEffect } from 'vue'

watchEffect(() => {
  return refresh()
})
```

## Setup

This ESM package requires ESLint `^10.0.0` and `vue-eslint-parser` `^10.0.0`.

This plugin targets Vue `>=3.5.42 <4`, including the matching SFC compiler and
SSR renderer. Older Vue versions are outside the supported range. Vue is an
optional peer dependency: linting does not load the Vue runtime.

```shell
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

For TypeScript SFCs, also install the TypeScript parser:

```shell
pnpm add -D @typescript-eslint/parser typescript
```

Register the plugin and enable the rules you want in `eslint.config.mjs`:

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

For JavaScript-only SFCs, omit the TypeScript parser import and `parserOptions.parser`.
If your Vue configuration already supplies the parsers, add the plugin and your chosen rules.

Run the checks and apply supported automatic fixes when needed:

```shell
pnpm exec eslint .
pnpm exec eslint . --fix
```

Some diagnostics need manual changes, including naming changes and statement
moves whose safety cannot be established. `--fix` does not resolve every report;
see each rule's documented boundaries.

See the [setup guide](https://vue-perfectionist.ntnyq.dev/guide/) for more configuration options.

## Configuration

- [File scopes and parsers](https://vue-perfectionist.ntnyq.dev/guide/configuration): configure Vue SFCs and standalone JS/TS files.
- [Auto-imported APIs](https://vue-perfectionist.ntnyq.dev/guide/configuration#auto-imported-vue-apis): recognize Vue APIs supplied by auto-import tools.
- [Rule composition](https://vue-perfectionist.ntnyq.dev/guide/rule-composition): combine related checks and avoid overlapping sorting or padding rules.
- [Public types](https://vue-perfectionist.ntnyq.dev/guide/configuration#public-typescript-api): type your rule options and shared settings.
- [Troubleshooting](https://vue-perfectionist.ntnyq.dev/guide/troubleshooting): inactive rules, missing fixes, and type-service configuration.

## Rules

Browse rules by purpose below. See the
[rules overview](https://vue-perfectionist.ntnyq.dev/rules/) for file scopes
and automatic fix support, and individual rule pages for options and defaults.

<!-- rules:start -->

### Callbacks and Composables

| Rule                                                                                                 | Description                                               |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [callback-style](https://vue-perfectionist.ntnyq.dev/rules/callback-style)                           | Enforce callback styles for Vue APIs.                     |
| [max-lines-per-callback](https://vue-perfectionist.ntnyq.dev/rules/max-lines-per-callback)           | Limit the length of inline callbacks for Vue APIs.        |
| [prefer-composable-options](https://vue-perfectionist.ntnyq.dev/rules/prefer-composable-options)     | Prefer a final options object for composable parameters.  |
| [prefer-function-declaration](https://vue-perfectionist.ntnyq.dev/rules/prefer-function-declaration) | Require function declarations in SFCs and composables.    |
| [prefer-on-scope-dispose](https://vue-perfectionist.ntnyq.dev/rules/prefer-on-scope-dispose)         | Prefer scope-based cleanup in named Vue composables.      |
| [prefer-watch-effect-alias](https://vue-perfectionist.ntnyq.dev/rules/prefer-watch-effect-alias)     | Prefer dedicated aliases for post and sync watch effects. |
| [require-injection-key](https://vue-perfectionist.ntnyq.dev/rules/require-injection-key)             | Disallow string keys in Vue provide and inject calls.     |

### Macros and Component Models

| Rule                                                                                           | Description                                                          |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [define-macros-newline](https://vue-perfectionist.ntnyq.dev/rules/define-macros-newline)       | Require multiline inline Vue macro declarations.                     |
| [define-macros-type-style](https://vue-perfectionist.ntnyq.dev/rules/define-macros-type-style) | Enforce declaration styles for Vue macro types.                      |
| [define-model-name-casing](https://vue-perfectionist.ntnyq.dev/rules/define-model-name-casing) | Enforce casing for explicit defineModel names.                       |
| [prefer-define-model](https://vue-perfectionist.ntnyq.dev/rules/prefer-define-model)           | Prefer defineModel over matching prop and update event declarations. |
| [require-macro-type-name](https://vue-perfectionist.ntnyq.dev/rules/require-macro-type-name)   | Require exact call-site names for Vue macro types.                   |

### Refs and Result Names

| Rule                                                                                                             | Description                                              |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [consistent-template-ref-name](https://vue-perfectionist.ntnyq.dev/rules/consistent-template-ref-name)           | Require template ref variable names to match their keys. |
| [prefer-function-result-pattern](https://vue-perfectionist.ntnyq.dev/rules/prefer-function-result-pattern)       | Enforce naming patterns for function result bindings.    |
| [prefer-ref-pattern](https://vue-perfectionist.ntnyq.dev/rules/prefer-ref-pattern)                               | Enforce naming patterns for template refs.               |
| [prefer-use-template-ref-inference](https://vue-perfectionist.ntnyq.dev/rules/prefer-use-template-ref-inference) | Prefer inferred types for static Vue template refs.      |

### Component Usage Contracts

| Rule                                                                                         | Description                                                 |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [component-prop-types](https://vue-perfectionist.ntnyq.dev/rules/component-prop-types)       | Enforce configured component prop value types.              |
| [component-prop-values](https://vue-perfectionist.ntnyq.dev/rules/component-prop-values)     | Enforce configured component prop value constraints.        |
| [require-component-props](https://vue-perfectionist.ntnyq.dev/rules/require-component-props) | Require configured props at component usage sites.          |
| [require-component-slots](https://vue-perfectionist.ntnyq.dev/rules/require-component-slots) | Require configured slots at component usage sites.          |
| [require-vue-generic](https://vue-perfectionist.ntnyq.dev/rules/require-vue-generic)         | Require explicit generic comments on configured components. |

### Template Conventions

| Rule                                                                                                                           | Description                                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [no-complex-template-expression](https://vue-perfectionist.ntnyq.dev/rules/no-complex-template-expression)                     | Limit logical operators and conditional nesting in Vue templates.  |
| [no-complex-v-for-source](https://vue-perfectionist.ntnyq.dev/rules/no-complex-v-for-source)                                   | Disallow complex expressions in Vue v-for sources.                 |
| [no-restricted-html-elements](https://vue-perfectionist.ntnyq.dev/rules/no-restricted-html-elements)                           | Disallow specified native HTML elements in Vue templates.          |
| [no-template-type-assertion](https://vue-perfectionist.ntnyq.dev/rules/no-template-type-assertion)                             | Disallow as type assertions in Vue templates.                      |
| [padding-line-between-tags](https://vue-perfectionist.ntnyq.dev/rules/padding-line-between-tags)                               | Enforce blank-line counts between consecutive template tags.       |
| [prefer-simple-event-handler](https://vue-perfectionist.ntnyq.dev/rules/prefer-simple-event-handler)                           | Require simple expressions in named template event handlers.       |
| [prefer-template-literal-in-interpolation](https://vue-perfectionist.ntnyq.dev/rules/prefer-template-literal-in-interpolation) | Prefer a single template literal for mixed text and interpolation. |
| [require-props-prefix](https://vue-perfectionist.ntnyq.dev/rules/require-props-prefix)                                         | Require explicit props object prefixes in Vue templates.           |

### Statement Ordering

| Rule                                                                                                 | Description                                                |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [sort-composable-destructure](https://vue-perfectionist.ntnyq.dev/rules/sort-composable-destructure) | Group destructured composable members by state and method. |
| [sort-composable-return](https://vue-perfectionist.ntnyq.dev/rules/sort-composable-return)           | Group composable return members by state and method.       |
| [sort-script-setup](https://vue-perfectionist.ntnyq.dev/rules/sort-script-setup)                     | Group and order top-level statements in `<script setup>`.  |

<!-- rules:end -->

## Development

See [Contributing](https://vue-perfectionist.ntnyq.dev/guide/contributing) for
local setup, testing, and documentation workflows.

## Credits

- [eslint-plugin-perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for inspiring the sorting rule names, grouping model, and configuration API.
- [eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue) and [vue-eslint-parser](https://github.com/vuejs/vue-eslint-parser) for their work on Vue linting and single-file component parsing.

This is an independent project and is not an official extension of `eslint-plugin-perfectionist` or `eslint-plugin-vue`.

## License

[MIT](./LICENSE) License © 2026-PRESENT [ntnyq](https://github.com/ntnyq)
