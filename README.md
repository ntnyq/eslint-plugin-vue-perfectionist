# eslint-plugin-vue-perfectionist

[![CI](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/workflows/CI/badge.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/actions)
[![NPM VERSION](https://img.shields.io/npm/v/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/eslint-plugin-vue-perfectionist.svg)](https://www.npmjs.com/package/eslint-plugin-vue-perfectionist)
[![LICENSE](https://img.shields.io/github/license/ntnyq/eslint-plugin-vue-perfectionist.svg)](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/LICENSE)

ESLint rules for consistent, readable, and maintainable Vue 3 code.

Define conventions for callbacks and composables, macro types and layout,
ref and result naming, component usage contracts, template expressions, and
setup statement ordering. Each rule defines its own scope: Vue SFC templates,
script blocks, or standalone JavaScript and TypeScript files.

The plugin provides **rules only**, with no built-in configurations. Choose
rules explicitly and configure their options for your project.

> [!WARNING]
> This project is under active development. The API is unstable and may introduce breaking changes before the first stable release.

[Documentation](https://vue-perfectionist.vercel.app) · [Getting Started](https://vue-perfectionist.vercel.app/guide/) · [Rules](https://vue-perfectionist.vercel.app/rules/)

## Setup

This ESM package requires ESLint `^10.0.0` and `vue-eslint-parser` `^10.0.0`.

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
      'vue-perfectionist/consistent-template-ref-name': 'error',
      'vue-perfectionist/define-macros-newline': 'error',
      'vue-perfectionist/prefer-ref-pattern': 'error',
      'vue-perfectionist/sort-script-setup': 'error',
    },
  },
])
```

For JavaScript-only SFCs, omit the TypeScript parser import and `parserOptions.parser`.
If your Vue configuration already supplies the parsers, add the plugin and your chosen rules.

See the [setup guide](https://vue-perfectionist.vercel.app/guide/) for more configuration options.

## Configuration

- [File scopes and parsers](https://vue-perfectionist.vercel.app/guide/configuration): configure Vue SFCs and standalone JS/TS files.
- [Auto-imported APIs](https://vue-perfectionist.vercel.app/guide/configuration#auto-imported-vue-apis): enable `settings['vue-perfectionist'].autoImport` for supported unbound API names. It defaults to `false`; local bindings and rule-level overrides take precedence. Configure ESLint globals separately.
- [Rule composition](https://vue-perfectionist.vercel.app/guide/rule-composition): combine related checks and avoid overlapping sorting or padding rules.
- [Public types](https://vue-perfectionist.vercel.app/guide/configuration#public-typescript-api): import rule option types and `VuePerfectionistSettings` from the package root. The default export and named `plugin` export refer to the same plugin object.

## Rules

Component prop, slot, and generic-comment rules need explicit `targets`; they
check no components by default. `sort-script-setup` orders groups by default;
set `type: 'natural'` or another comparator to sort names within groups.

See the [rules overview](https://vue-perfectionist.vercel.app/rules/) for file
scopes and automatic fix availability. Only supported cases are fixed; naming,
type, and component contract diagnostics require manual changes.

| Rule                                                                                                                            | Description                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [callback-style](https://vue-perfectionist.vercel.app/rules/callback-style)                                                     | Enforce callback styles for Vue APIs.                                |
| [component-prop-types](https://vue-perfectionist.vercel.app/rules/component-prop-types)                                         | Enforce configured component prop value types.                       |
| [component-prop-values](https://vue-perfectionist.vercel.app/rules/component-prop-values)                                       | Enforce configured component prop value constraints.                 |
| [consistent-template-ref-name](https://vue-perfectionist.vercel.app/rules/consistent-template-ref-name)                         | Require template ref variable names to match their keys.             |
| [define-macros-newline](https://vue-perfectionist.vercel.app/rules/define-macros-newline)                                       | Require multiline inline Vue macro declarations.                     |
| [define-macros-type-style](https://vue-perfectionist.vercel.app/rules/define-macros-type-style)                                 | Enforce declaration styles for Vue macro types.                      |
| [max-lines-per-callback](https://vue-perfectionist.vercel.app/rules/max-lines-per-callback)                                     | Limit the length of inline callbacks for Vue APIs.                   |
| [no-complex-v-for-source](https://vue-perfectionist.vercel.app/rules/no-complex-v-for-source)                                   | Disallow complex expressions in Vue v-for sources.                   |
| [padding-line-between-tags](https://vue-perfectionist.vercel.app/rules/padding-line-between-tags)                               | Enforce blank-line counts between consecutive template tags.         |
| [prefer-composable-options](https://vue-perfectionist.vercel.app/rules/prefer-composable-options)                               | Prefer a final options object for composable parameters.             |
| [prefer-define-model](https://vue-perfectionist.vercel.app/rules/prefer-define-model)                                           | Prefer defineModel over matching prop and update event declarations. |
| [prefer-function-declaration](https://vue-perfectionist.vercel.app/rules/prefer-function-declaration)                           | Require function declarations in SFCs and composables.               |
| [prefer-function-result-pattern](https://vue-perfectionist.vercel.app/rules/prefer-function-result-pattern)                     | Enforce naming patterns for function result bindings.                |
| [prefer-ref-pattern](https://vue-perfectionist.vercel.app/rules/prefer-ref-pattern)                                             | Enforce naming patterns for template refs.                           |
| [prefer-simple-event-handler](https://vue-perfectionist.vercel.app/rules/prefer-simple-event-handler)                           | Require simple expressions in named template event handlers.         |
| [prefer-template-literal-in-interpolation](https://vue-perfectionist.vercel.app/rules/prefer-template-literal-in-interpolation) | Prefer a single template literal for mixed text and interpolation.   |
| [prefer-use-template-ref-inference](https://vue-perfectionist.vercel.app/rules/prefer-use-template-ref-inference)               | Prefer inferred types for static Vue template refs.                  |
| [require-component-props](https://vue-perfectionist.vercel.app/rules/require-component-props)                                   | Require configured props at component usage sites.                   |
| [require-component-slots](https://vue-perfectionist.vercel.app/rules/require-component-slots)                                   | Require configured slots at component usage sites.                   |
| [require-macro-type-name](https://vue-perfectionist.vercel.app/rules/require-macro-type-name)                                   | Require exact call-site names for Vue macro types.                   |
| [require-vue-generic](https://vue-perfectionist.vercel.app/rules/require-vue-generic)                                           | Require explicit generic comments on configured components.          |
| [sort-script-setup](https://vue-perfectionist.vercel.app/rules/sort-script-setup)                                               | Group and order top-level statements in `<script setup>`.            |

## Development

Use the Node version selected by `.node-version` and the pnpm version pinned in
`package.json`:

```shell
pnpm install --frozen-lockfile
pnpm test
pnpm docs:dev
```

See [Contributing](https://vue-perfectionist.vercel.app/guide/contributing) for
build, validation, testing, and documentation workflows, and
[Architecture and Design](https://vue-perfectionist.vercel.app/design/) for
repository structure and analysis boundaries. Package build output in `dist/`
is generated.

## Credits

- [eslint-plugin-perfectionist](https://github.com/azat-io/eslint-plugin-perfectionist) for inspiring the sorting rule names, grouping model, and configuration API.
- [eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue) and [vue-eslint-parser](https://github.com/vuejs/vue-eslint-parser) for their work on Vue linting and single-file component parsing.

This is an independent project and is not an official extension of `eslint-plugin-perfectionist` or `eslint-plugin-vue`.

## License

[MIT](./LICENSE) License © 2026-PRESENT [ntnyq](https://github.com/ntnyq)
