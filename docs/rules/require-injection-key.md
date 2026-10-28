---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/require-injection-key
description: Disallow string keys in Vue provide and inject calls.
---

# vue-perfectionist/require-injection-key

> Disallow string keys in Vue provide and inject calls.

## Usage

Configure the appropriate parser for your files; see [Getting Started](/guide/).

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/require-injection-key': 'error' },
  },
]
```

## :book: Rule Details

Prefer a shared symbol exported from a key module. In TypeScript, annotate it
with Vue's `InjectionKey<T>` to connect provider and consumer types.
Vue itself supports strings; this rule enforces a project convention.

::: correct

```ts
import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'

const formKey: InjectionKey<string> = Symbol('form')
provide(formKey, 'value')
const form = inject(formKey)
```

:::

::: incorrect

```ts
import { inject, provide } from 'vue'

provide('form', 'value')
const formKey = 'form'
const form = inject(formKey)
```

:::

## :wrench: Options

```json
{
  "strict": false,
  "allowStrings": [],
  "vueImportSources": ["vue"]
}
```

- `strict` (boolean, default `false`): require a Vue `InjectionKey<T>` type for
  every checked key, except allowed strings. Requires full TypeScript parser
  services. See [Strict mode](#strict-mode) for setup and type boundaries.
- `allowStrings` (`string[]`, default `[]`): exact, case-sensitive exceptions for
  third-party string contracts. Also applies to resolved local aliases. An empty
  array allows no strings; there are no implicit exceptions.
- `vueImportSources` (`string[]`, default `["vue"]`): replaces recognized module
  specifiers. `[]` disables import recognition.
- `vueGlobals` (`string[]`): replaces shared auto-import recognition. When omitted,
  `settings['vue-perfectionist'].autoImport: true` enables unbound `provide` and
  `inject`; otherwise neither is recognized. `[]` disables globals. Local and
  type-only bindings never become globals.

For a library that requires a string key:

```json
{ "allowStrings": ["legacy-form"] }
```

### Strict mode

Enable `strict: true` only for files parsed with TypeScript type information.
The following flat config supports both `.ts` and Vue SFC files in your TS project:

```js
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/require-injection-key': ['error', { strict: true }],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
  },
]
```

`parserOptions.project` is also supported. Include the files in your TS project
and use `strict: true` in `tsconfig.json` for reliable nullability information.
A missing program or node map produces a configuration error, even if a file
contains no checked calls. Strict mode never silently falls back to syntax checks.
For JavaScript, use `@typescript-eslint/parser`, `allowJs`, and JSDoc key types.
See [typed linting setup](https://typescript-eslint.io/getting-started/typed-linting/).

::: correct

With `strict: true` and type information:

```ts
import { inject } from 'vue'
import type { InjectionKey } from 'vue'

const formKey: InjectionKey<string> = Symbol('form')
const form = inject(formKey)
```

:::

::: incorrect

With `strict: true`, a plain symbol is reported:

```ts
import { inject } from 'vue'

const formKey = Symbol('form')
const form = inject(formKey)
```

:::

Strict mode follows TypeScript's call-site type, including imported keys, module
members, type aliases/re-exports, return types, constrained generics, and generic
indexed accesses such as `T['key']` or `T[K]`. Available constraints on deferred
conditional types are checked too; all possible branches must qualify.

The rule recognizes the actual `InjectionKey` declaration and marker in the installed
`@vue/runtime-core` package. A local or unrelated package's same-named type is
not sufficient, nor is structural assignability of an ordinary symbol.
`vueImportSources` changes API call recognition, not the trusted key type origin.

Every member of a union must be a recognized key or an allowed string literal.
Intersections may refine recognized keys. An extracted internal Vue marker alone
is not a key: its complete intersection must still be a primitive symbol.
This rejects objects, strings, numbers, and boxed `Symbol` values carrying only
the marker, while preserving Vue's earlier interface-based `InjectionKey` type.

`any`, `unknown`, `never`, plain
`symbol`/`unique symbol`, broad strings, unconstrained generics, and nullable keys
are reported. Narrow nullable keys before calling, or use an intentional non-null
assertion. The payload type parameter itself is not restricted.

`allowStrings` applies to the original syntax-resolved values and, in strict mode,
to string literal types from imports, parameters, and union constituents. A broad
`string` is never accepted just because the whitelist is nonempty.

Type assertions are trusted as TypeScript contracts; they are not runtime proof.
An assertion to `InjectionKey<T>` is accepted unless the existing syntax check
already identifies a forbidden string. `Symbol() satisfies InjectionKey<T>`
keeps its inferred symbol type and is reported: use a type annotation instead.
This rule does not validate payload compatibility, symbol sharing, or other
TypeScript compiler diagnostics. Strict examples above are verified by the typed
test suite; they do not display inline diagnostics in this documentation renderer.

## Scope

Checks Vue script blocks and standalone JS/TS files. Recognizes named imports,
aliases, and non-computed namespace calls from configured sources. TypeScript
expression wrappers are unwrapped. Reports the first argument only.

By default, checks string literals, substitution-free template literals, and chains of
local `const` identifier initializers, respecting lexical and dual-script SFC
scopes. Does not evaluate concatenation, interpolated templates, object members,
mutable variables, or imported key values. Unknown keys are accepted.

The default mode is a syntax-only string prohibition and does not require type
services. Strict mode additionally verifies the key's Vue type provenance.
Both modes skip optional calls, computed API members, default imports, spread keys,
Options API `provide`/`inject` declarations, `app.provide`, and template expressions.

No automatic fix or suggestion is provided: providers and consumers must adopt
the same symbol together. Creating a new symbol at each call breaks injection.

See [Vue's typed provide/inject guide](https://vuejs.org/guide/typescript/composition-api.html#typing-provide-inject).

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/require-injection-key.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-injection-key.test.ts)
- [Strict-mode tests](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/require-injection-key-strict.test.ts)
