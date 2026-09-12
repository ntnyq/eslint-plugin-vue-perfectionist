# eslint-plugin-vue-perfectionist

[![CI](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-vue-perfectionist.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/LICENSE)

ESLint rules for consistent, readable, and maintainable Vue 3 code.

Vue 3 only. This project is in early development; the API may change before the first stable release.

[Documentation](https://vue-perfectionist.vercel.app) · [Getting Started](https://vue-perfectionist.vercel.app/guide/)

## Setup

Requires ESLint 9.10+ or 10 and `vue-eslint-parser` 10.

```shell
pnpm add -D eslint eslint-plugin-vue-perfectionist vue-eslint-parser
```

For TypeScript SFCs, also install the TypeScript parser:

```shell
pnpm add -D @typescript-eslint/parser typescript
```

Add the recommended preset to `eslint.config.mjs`:

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
  },
  vuePerfectionist.configs.recommended,
]
```

For JavaScript-only SFCs, omit the TypeScript parser import and `parserOptions.parser`.
If your Vue configuration already supplies the parsers, just add the preset.

The recommended preset enables `sort-script-setup`. Enable other rules explicitly;
see the [setup guide](https://vue-perfectionist.vercel.app/guide/) for more configuration options.

## Rules

| Rule                                                                                | Description                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [prefer-ref-pattern](https://vue-perfectionist.vercel.app/rules/prefer-ref-pattern) | Enforce naming patterns for template refs.                |
| [sort-script-setup](https://vue-perfectionist.vercel.app/rules/sort-script-setup)   | Group and order top-level statements in `<script setup>`. |

## Credits

- [eslint-plugin-perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for inspiring the sorting rule names, grouping model, and configuration API.
- [eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue) and [vue-eslint-parser](https://github.com/vuejs/vue-eslint-parser) for their work on Vue linting and single-file component parsing.

This is an independent project and is not an official extension of `eslint-plugin-perfectionist` or `eslint-plugin-vue`.

## License

[MIT](./LICENSE) License © 2026-PRESENT [ntnyq](https://github.com/ntnyq)
