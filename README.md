# eslint-plugin-vue-perfectionist

[![CI](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-vue-perfectionist.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/LICENSE)

ESLint rules for consistent, readable, and maintainable Vue 3 code.

Configure callback styles, macro declaration layout, template ref naming, component prop
contracts, and statement ordering. Depending on the rule, checks apply to Vue SFC templates,
script blocks, or standalone JavaScript and TypeScript files.

> [!WARNING]
> This project is under active development. The API is unstable and may introduce breaking changes before the first stable release.

[Documentation](https://vue-perfectionist.vercel.app) · [Getting Started](https://vue-perfectionist.vercel.app/guide/) · [Rules](https://vue-perfectionist.vercel.app/rules/)

## Setup

Requires ESLint 9.10+ or 10 and `vue-eslint-parser` 10.

```shell
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

For TypeScript SFCs, also install the TypeScript parser:

```shell
pnpm add -D @typescript-eslint/parser typescript
```

Register the plugin and enable the rules you want in `eslint.config.mjs`.
The plugin provides rules only, with no built-in configurations:

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
]
```

For JavaScript-only SFCs, omit the TypeScript parser import and `parserOptions.parser`.
If your Vue configuration already supplies the parsers, add the plugin and your chosen rules.

See the [setup guide](https://vue-perfectionist.vercel.app/guide/) for more configuration options.

## Vue Auto-imports

For `unplugin-auto-import` with Vue APIs, add this shared setting to your ESLint
configuration:

```js
{
  settings: {
    'vue-perfectionist': { autoImport: true },
  },
}
```

It defaults to `false` and enables same-name Vue API recognition across the
sorting, callback, and ref rules. Local bindings still take precedence.
Explicit rule-level `vueGlobals` override it, including an empty list.
See the [auto-import guide](https://vue-perfectionist.vercel.app/guide/#auto-imported-vue-apis)
for scope, limitations, and ESLint globals.

## Rules

| Rule                                                                                                    | Description                                               |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [callback-style](https://vue-perfectionist.vercel.app/rules/callback-style)                             | Enforce callback styles for Vue APIs.                     |
| [component-prop-types](https://vue-perfectionist.vercel.app/rules/component-prop-types)                 | Enforce configured component prop value types.            |
| [component-prop-values](https://vue-perfectionist.vercel.app/rules/component-prop-values)               | Enforce configured component prop value constraints.      |
| [consistent-template-ref-name](https://vue-perfectionist.vercel.app/rules/consistent-template-ref-name) | Require template ref variable names to match their keys.  |
| [define-macros-newline](https://vue-perfectionist.vercel.app/rules/define-macros-newline)               | Require multiline inline Vue macro declarations.          |
| [define-macros-type-style](https://vue-perfectionist.vercel.app/rules/define-macros-type-style)         | Enforce declaration styles for Vue macro types.           |
| [prefer-ref-pattern](https://vue-perfectionist.vercel.app/rules/prefer-ref-pattern)                     | Enforce naming patterns for template refs.                |
| [require-component-props](https://vue-perfectionist.vercel.app/rules/require-component-props)           | Require configured props at component usage sites.        |
| [require-macro-type-name](https://vue-perfectionist.vercel.app/rules/require-macro-type-name)           | Require exact call-site names for Vue macro types.        |
| [sort-script-setup](https://vue-perfectionist.vercel.app/rules/sort-script-setup)                       | Group and order top-level statements in `<script setup>`. |

## Credits

- [eslint-plugin-perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for inspiring the sorting rule names, grouping model, and configuration API.
- [eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue) and [vue-eslint-parser](https://github.com/vuejs/vue-eslint-parser) for their work on Vue linting and single-file component parsing.

This is an independent project and is not an official extension of `eslint-plugin-perfectionist` or `eslint-plugin-vue`.

## License

[MIT](./LICENSE) License © 2026-PRESENT [ntnyq](https://github.com/ntnyq)
