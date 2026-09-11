# eslint-plugin-vue-perfectionist

[![CI](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-vue-perfectionist.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/LICENSE)

ESLint rules for consistent, readable, and maintainable Vue 3 code.

Starting with configurable ordering for `<script setup>`, this plugin aims to provide a growing collection of Vue-specific rules for code organization, consistency, and maintainability. Sorting is the first area of focus, with more rules planned beyond ordering.

**Supports Vue 3 only. Vue 2 is not supported.**

## Status

This project is in early development. The first rule and flat ESLint configuration presets are implemented. The API may change before the first stable release.

## Scope

The first rule targets top-level statements inside Vue 3 `<script setup>` blocks, including JavaScript and TypeScript. It is intended to help organize compiler macros, type declarations, reactive state, computed values, functions, watchers, and lifecycle hooks.

Ordinary `<script>` blocks, Options API component options, and function bodies are outside the first rule's scope. Future rules may cover other aspects of Vue 3 code.

The plugin is intended to complement `eslint-plugin-vue` and `eslint-plugin-perfectionist`. Existing rules can continue to handle Vue correctness checks, import sorting, and ordering within objects or types.

## Rules

| Rule                                                                       | Description                                                                             | Status    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------- |
| [`vue-perfectionist/sort-script-setup`](./docs/rules/sort-script-setup.md) | Enforce configurable grouping and ordering of top-level statements in `<script setup>`. | Available |

### sort-script-setup

The sorting API is inspired by `eslint-plugin-perfectionist`, with Vue-specific statement groups:

- `groups` defines the order of statement categories.
- `customGroups` allows project-specific classification, such as custom composables.
- `type` and `order` control sorting within a group. The default, `type: 'unsorted'`, preserves the original order within groups while still enforcing group order.
- `newlinesBetween` and `newlinesInside` control spacing between groups and statements.
- `partitionByComment` and `partitionByNewLine` define separate sorting regions.

Execution dependencies take priority over the configured order. Automatic fixes apply only to changes that can be verified to preserve behavior; recognizing a Vue API call does not make it safe to move. Fixes cover independent type declarations, primitive constant declarations, ordinary function declarations, and spacing. Reordering runtime calls, watchers, or lifecycle registrations is reported without an automatic fix.

The rule keeps imports in place and leaves import sorting to `perfectionist/sort-imports`. Disable `perfectionist/sort-modules` and `vue/define-macros-order` for the same `.vue` files when this rule manages their declarations and macros.

See the [rule documentation](./docs/rules/sort-script-setup.md) for all options, matching semantics, and safety limits. Full compatibility with Perfectionist's options is not promised.

## Install

Requires ESLint 9.10+ or 10 and `vue-eslint-parser` 10. TypeScript SFCs also require `@typescript-eslint/parser`.

```shell
npm install -D eslint-plugin-vue-perfectionist
```

```shell
yarn add -D eslint-plugin-vue-perfectionist
```

```shell
pnpm add -D eslint-plugin-vue-perfectionist
```

## Usage

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
  },
  vuePerfectionist.configs.recommended,
]
```

For JavaScript-only SFCs, omit `parserOptions.parser`. Existing Vue configurations can supply the parsers instead. The plugin also exports `recommended-natural` and `recommended-alphabetical` presets through `configs`.

## Credits

- [eslint-plugin-perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for inspiring the sorting rule names, grouping model, and configuration API.
- [eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue) and [vue-eslint-parser](https://github.com/vuejs/vue-eslint-parser) for their work on Vue linting and single-file component parsing.

This is an independent project and is not an official extension of `eslint-plugin-perfectionist` or `eslint-plugin-vue`.

## License

[MIT](./LICENSE) License © 2026-PRESENT [ntnyq](https://github.com/ntnyq)
