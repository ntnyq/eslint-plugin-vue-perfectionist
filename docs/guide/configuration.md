---
description: Configure parsers, file scopes, auto-import recognition, and public TypeScript options.
---

# Configuration

The plugin exports the same plugin object as its default export and the named
`plugin` export. Register it in ESLint's flat configuration and enable rules
explicitly. There are no built-in configurations or recommended presets.

## Vue SFC Parsers

Use `vue-eslint-parser` as the outer parser for `.vue` files. For TypeScript
scripts, pass `@typescript-eslint/parser` through `parserOptions.parser` as shown
in [Getting Started](/guide/#basic-usage). Replacing the outer Vue parser with the
TypeScript parser prevents template checks from running.

If an existing Vue configuration already sets up these parsers, add the plugin
and rules after that configuration. Rule selection does not configure parsers,
TypeScript project services, or ESLint globals.

## Standalone JavaScript and TypeScript

The following rules also work in standalone scripts:

- [`prefer-watch-effect-alias`](/rules/prefer-watch-effect-alias).
- [`callback-style`](/rules/callback-style) and
  [`max-lines-per-callback`](/rules/max-lines-per-callback).
- [`prefer-composable-options`](/rules/prefer-composable-options) and
  [`prefer-function-declaration`](/rules/prefer-function-declaration).
- [`prefer-function-result-pattern`](/rules/prefer-function-result-pattern).
- [`consistent-template-ref-name`](/rules/consistent-template-ref-name) and the
  `useTemplateRef` and `render` targets of
  [`prefer-ref-pattern`](/rules/prefer-ref-pattern).

Match those files in a separate configuration. Standalone scripts use ESLint's
usual JavaScript parser or the TypeScript parser directly:

```js [eslint.config.mjs]
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/callback-style': 'error',
      'vue-perfectionist/max-lines-per-callback': 'error',
      'vue-perfectionist/prefer-composable-options': 'error',
      'vue-perfectionist/prefer-function-declaration': 'error',
      'vue-perfectionist/prefer-function-result-pattern': 'error',
    },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      parser: tsParser,
    },
  },
])
```

These rules retain their individual scopes. For example,
`prefer-function-declaration` checks matching composable bodies in standalone
files; enabling it does not require every module-level function binding to use
a declaration. Template-only and setup-only rules need the corresponding Vue
SFC context.

## Auto-imported Vue APIs

When using `unplugin-auto-import` with Vue APIs, enable the shared opt-in in
`eslint.config.mjs`:

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    settings: {
      'vue-perfectionist': {
        autoImport: true,
      },
    },
  },
])
```

`autoImport` is a boolean and defaults to `false`. It enables recognition of
unbound, same-name Vue APIs already supported by `sort-script-setup`,
`callback-style`, `max-lines-per-callback`, `consistent-template-ref-name`,
`prefer-ref-pattern`, `prefer-use-template-ref-inference`,
`prefer-watch-effect-alias`, `require-injection-key`, and `prefer-on-scope-dispose`.
`callback-style` and `max-lines-per-callback` also recognize configured `customCallbacks` names.
`prefer-function-result-pattern` recognizes all configured target names under this
setting, including `ref`, `shallowRef`, `computed`, and VueUse's `useToggle` by default.
This includes unbound names declared in ESLint's `languageOptions.globals`,
but declaring globals alone does not enable API recognition.
Local declarations, parameters, imports from other modules, and type-only
imports still take precedence and are not treated as auto-imports.

For `sort-script-setup`, `callback-style`, `max-lines-per-callback`,
`prefer-watch-effect-alias`, `require-injection-key`, and `prefer-on-scope-dispose`, an explicit `vueGlobals` option
replaces the shared selection of built-in Vue APIs, including `vueGlobals: []`
to disable it for one rule. Callback `groups` and `exclude` continue to control
which built-in APIs are checked. Each `customCallbacks` entry in either callback rule has an
`autoImport` boolean that overrides the shared setting independently of `vueGlobals`.
For `prefer-function-result-pattern`, each target's `autoImport` boolean overrides
the shared setting for that group of functions.
Macros and component prop rules do not require this setting. Literal template
refs are also checked independently of API imports.

This setting declares that the unbound names come from their supported libraries; it does not read
Vite configuration, generated declarations, or auto-import manifests. Custom
auto-import aliases and APIs from other libraries are not inferred. Use explicit
imports for aliases, or configure `customCallbacks` in either callback rule or
`prefer-function-result-pattern` targets for additional APIs with auto-import
recognition enabled. Sorting still preserves its existing fix safety boundaries.
The settings namespace remains `vue-perfectionist` even if the plugin is
registered under another name.

This does not configure ESLint's `no-undef` rule. If you use that rule, load the
globals generated by `unplugin-auto-import` separately; see its
[ESLint integration](https://github.com/unplugin/unplugin-auto-import#eslint).
Generated globals alone do not identify an API as belonging to Vue.

## Rule Options and Shared Settings

Put rule preferences in the rule's options object. The shared
`settings['vue-perfectionist']` contract contains only `autoImport`.
Sorting preferences in shared settings are ignored.

`sort-script-setup` defaults to `type: 'unsorted'`: it orders groups but preserves
name order within ordinary groups. Set `type: 'natural'` or another supported
comparator when names should also be sorted. See
[rule composition](/guide/rule-composition#statement-ordering) for interactions
with other sorting rules.

Array replacement and empty-array behavior belong to each rule's contract.
For example, component contract rules start with no `targets`, while
`prefer-function-result-pattern` starts with built-in targets and a supplied
`targets` array replaces them. Check the rule page before overriding defaults.

## Public TypeScript API

Import the plugin and configuration types from the package root:

```ts
import vuePerfectionist, { plugin } from 'eslint-plugin-vue-perfectionist'
import type {
  SortScriptSetupOptions,
  VuePerfectionistSettings,
} from 'eslint-plugin-vue-perfectionist'

const sorting = {
  type: 'natural',
  fix: 'safe',
} satisfies SortScriptSetupOptions

const settings = {
  autoImport: true,
} satisfies VuePerfectionistSettings
```

`vuePerfectionist` and `plugin` refer to the same object, with `meta` and `rules`.
The root also exports rule option and supporting configuration types, including
`CallbackStyleOptions`, `ComponentPropTypesOptions`, and
`VuePerfectionistPlugin`. See the
[public export list](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/index.ts)
for the complete API. Internal rule files and analysis utilities are not package
entry points.
