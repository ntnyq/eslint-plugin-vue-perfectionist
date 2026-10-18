---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-composable-options
description: Prefer a final options object for composable parameters.
---

# vue-perfectionist/prefer-composable-options

> Prefer a final options object for composable parameters.

Keep composable inputs in named fields, with an optional allowance for leading
positional parameters. This is an opt-in project API convention. It does not
claim that Vue requires every composable to use an options object.

## Usage

Register the plugin and enable the rule for the files you want to check:

```js
import tsParser from '@typescript-eslint/parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.{js,ts,vue}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/prefer-composable-options': 'error' },
  },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
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

This rule uses syntax and local scope information only. It does not require a
TypeScript project, `parserOptions.project`, or `projectService`.

## :book: Rule Details

By default, a matching function may have no parameters or a single options
parameter. Object destructuring is optional:

::: correct

```ts
interface UseCommentsOptions {
  id: string
  canReply: () => boolean
  thread?: string
}

export function useComments({
  id,
  canReply,
  thread = '',
}: UseCommentsOptions) {}

const useCommentList = (options: UseCommentsOptions) => options

function useCurrentUser() {}
```

:::

::: incorrect

```ts
export function useComments(id: string, canReply: () => boolean, thread = '') {}

function useCurrentUser(id: string) {}
```

:::

Only the final parameter can be the options container. Every preceding
parameter counts as positional, including objects, refs, arrays, callbacks,
optional parameters, and parameters with defaults. TypeScript's `this`
parameter is excluded because callers do not pass it as an argument.

Whenever there is more than one ordinary parameter, the final parameter must
be a confirmed options object, even when all parameters fit within the
positional allowance. Zero-parameter functions are always allowed.

### Recognizing options

| Parameter form                                                                                                                            | Result                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Object destructuring, including `{}`, defaults, and object rest                                                                           | Options container                                                          |
| Untyped identifier with a direct object literal default, such as `config = {}`                                                            | Options container                                                          |
| Type literal with at least one named property or method and no call or construct signature                                                | Options container                                                          |
| Local, non-generic type aliases and interfaces without `extends`                                                                          | Resolve the outer shape; aliases may reference other supported local types |
| Merged local interfaces without generics or `extends`                                                                                     | Inspect all members together                                               |
| Union of supported options shapes and optionally `undefined`                                                                              | Options container                                                          |
| Intersection whose every constituent is a supported options shape                                                                         | Options container                                                          |
| Primitive, function, array, or tuple syntax; call or construct signatures                                                                 | Positional parameter                                                       |
| A union containing a primitive, `null`, function, array, or tuple shape                                                                   | Positional parameter                                                       |
| Bare `options`, `any`, `unknown`, `object`, `{}`, or an index-signature-only type                                                         | Cannot confirm                                                             |
| Imported or qualified types, generic types or type parameters, inherited interfaces, mapped/conditional types, classes, or cyclic aliases | Cannot confirm                                                             |

Names are not type evidence: `options: string` and a local
`type UseCommentsOptions = string` remain positional. The parameter does not
have to be named `options`, and a type does not have to end with `Options`.

Object destructuring itself establishes a named-field container; its annotation
does not need to be resolved. For an identifier parameter, an explicit type
takes precedence over its default value. For example, `options: unknown = {}`
is unconfirmed. A default reference such as `options = defaults` and an
asserted default such as `options = {} as Options` are not inferred.

Local type resolution respects lexical scope and separates ordinary-script
bindings from shadowing `<script setup>` bindings. It inspects the container,
not its field types: callback, imported, generic, and recursive types are
allowed inside options fields. A structurally matching business entity can
also qualify; syntax cannot determine whether its author intended an options
container. Computed keys alone do not provide named-field evidence unless
their keys are literals. Index signatures may accompany named fields.

::: correct

```js
function useComments({ id, canReply, thread = '', ...rest }) {}

function useCommentList(config = {}) {}
```

:::

::: incorrect

```ts
import type { UseCommentsOptions } from './options'

function useComments(options: UseCommentsOptions) {}

function useCommentList(options) {}
```

:::

An unconfirmed final parameter produces a dedicated diagnostic when an options
object is required. It does not silently pass or rely on a type-name suffix.
Use destructuring or a supported local object type to make the shape explicit.
With a positive positional allowance, a single unconfirmed parameter may use
one positional slot; it is not treated as confirmed options.

## :wrench: Options

Defaults:

```json
{
  "maxPositionalParams": 0,
  "functionPattern": "^use[A-Z]",
  "ignoreNames": []
}
```

| Option                | Type                              | Default       | Meaning                                                                      |
| --------------------- | --------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `maxPositionalParams` | Nonnegative integer               | `0`           | Maximum number of parameters before the final options object.                |
| `functionPattern`     | String                            | `'^use[A-Z]'` | JavaScript regular expression source matched against function binding names. |
| `ignoreNames`         | Array of unique, nonempty strings | `[]`          | Exact binding names excluded from checks. An empty array excludes nothing.   |

### maxPositionalParams

Use `1` to allow a primary input followed by options. A single positional input
also fits this allowance:

::: correct

```ts
/* eslint vue-perfectionist/prefer-composable-options: [error, { maxPositionalParams: 1 }] */
interface UseCommentsOptions {
  canReply: () => boolean
  thread?: string
}

function useComments(id: string, options: UseCommentsOptions) {}

function useCurrentUser(id: string) {}
```

:::

Even `maxPositionalParams: 2` does not allow two positional parameters with no
options object:

::: incorrect

```ts
/* eslint vue-perfectionist/prefer-composable-options: [error, { maxPositionalParams: 2 }] */
function useComments(id: string, thread: string) {}
```

:::

The same allowance permits two leading inputs when followed by options:

::: correct

```ts
/* eslint vue-perfectionist/prefer-composable-options: [error, { maxPositionalParams: 2 }] */
function useComments(
  id: string,
  thread: string,
  options: { canReply: () => boolean },
) {}
```

:::

There is no separate callback prohibition or `requireOptions` mode in this
version. A callback can use an allowed positional slot, like any other input.

### functionPattern and ignoreNames

The pattern is a JavaScript regular expression source without delimiters or
flags. Matching is case-sensitive, with no added anchors. The default matches
`use` followed by an uppercase ASCII letter. Invalid patterns are configuration
errors. `ignoreNames` takes precedence over a pattern match.

For a different convention and one explicit exception:

```json
{
  "functionPattern": "^create[A-Z]",
  "ignoreNames": ["createLegacyComments"]
}
```

Use ESLint flat config `files` and `ignores` to apply different conventions by
directory.

## Scope

The rule checks named function declarations, named default-exported function
declarations, and arrow/function expressions directly assigned to identifier
variable declarations. Variable binding names take precedence over a function
expression's internal name. Parentheses and TypeScript expression wrappers
around an initializer are supported. Nested definitions, async functions, and
generic functions are included. Vue imports and auto-import settings are not
required.

Checks apply in standalone JavaScript/TypeScript and in both Vue SFC script
blocks. Public overload signatures with a same-scope implementation are checked
individually; the implementation signature is skipped to avoid duplicate
reports. A regular function with no overloads is checked normally.

Anonymous default exports, object/class methods, function properties, later
assignments, conditional initializers, and factory wrappers such as
`createComposable(...)` are outside the first version's scope. Calls, template
expressions, standalone function types, ambient signatures without an
implementation, and declaration files (`.d.ts`, `.d.mts`, `.d.cts`) are skipped.

Top-level rest parameters are always reported because they bypass the positional
limit, including typed rest tuples. Object rest inside destructuring is allowed.

::: incorrect

```ts
function useComments(...args: unknown[]) {}
```

:::

## Automatic fixes and formatting

This rule only reports. It provides neither automatic fixes nor suggestions:
moving inputs into an object requires coordinated changes to callers, overloads,
and related types, possibly in other files. Defaults, `arguments`, and reactive
destructuring can also change behavior.

Each checked signature produces at most one diagnostic: top-level rest takes
precedence, then excess positional parameters before confirmed options, or a
missing/unconfirmed final options object. Excess-parameter diagnostics point to
the first parameter beyond the allowance; other diagnostics point to the rest
or final parameter. Formatting does not change these checks.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-composable-options.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-composable-options.test.ts)
