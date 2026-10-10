---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-function-result-pattern
description: Enforce naming patterns for function result bindings.
---

# vue-perfectionist/prefer-function-result-pattern

> Enforce naming patterns for function result bindings.

## Usage

Add the rule to your flat config. Configure the usual parsers for TypeScript
and Vue SFCs separately; JavaScript uses ESLint's default parser.

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  {
    files: ['**/*.{vue,js,jsx,ts,tsx}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-function-result-pattern': 'error',
    },
  },
]
```

## :book: Rule Details

Each target identifies functions by import source and original export names,
selects a result binding, and checks its name against a regular expression.
Methods in the same target share its options. Split them into separate targets
when they need different patterns or result positions.

By default, boolean state names must match `^(is|has|should|can)[A-Z]`.
`isOpen` and `hasPermission` pass; `is`, `island`, `is_open`, and `IsOpen` do not.
The default pattern does not constrain the rest of the identifier.

| Source         | Exports             | Checked binding                                                           |
| -------------- | ------------------- | ------------------------------------------------------------------------- |
| `vue`          | `ref`, `shallowRef` | Direct variable, for a boolean literal or explicit boolean type argument. |
| `@vueuse/core` | `useToggle`         | First array element, for no arguments or one boolean literal argument.    |

::: correct

```ts
import { useToggle } from '@vueuse/core'
import { ref, shallowRef } from 'vue'

const isLoading = ref(false)
const hasPermission = shallowRef<boolean>()
const [shouldRender, toggle] = useToggle(true)
const count = ref(0)
```

:::

::: incorrect

```ts
import { useToggle } from '@vueuse/core'
import { ref, shallowRef } from 'vue'

const loading = ref(false)
const permission = shallowRef<boolean>()
const [visible, toggle] = useToggle()
```

:::

Named import aliases and namespace imports are supported. These declarations
are reported without automatic renaming:

::: incorrect

```ts
import { ref as makeRef } from 'vue'
import * as VueUse from '@vueuse/core'

const ready = makeRef(false)
const [open] = VueUse.useToggle(false)
```

:::

## :wrench: Options

Omitting `targets` uses these defaults:

```js
{
  targets: [
    {
      source: 'vue',
      names: ['ref', 'shallowRef'],
      pattern: '^(is|has|should|can)[A-Z]',
      booleanOnly: true,
    },
    {
      source: '@vueuse/core',
      names: ['useToggle'],
      pattern: '^(is|has|should|can)[A-Z]',
      returnIndex: 0,
      booleanOnly: true,
    },
  ],
}
```

### `targets`

- Type: `PreferFunctionResultPatternTarget[]`
- Default: the two targets above

An explicit array **replaces** all defaults. `targets: []` disables checks.
To keep default behavior while adding custom methods, include the default
targets in your array.

| Property      | Type       | Meaning                                                                                                                                                                             |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`      | `string`   | Required, nonempty, exact import module specifier.                                                                                                                                  |
| `names`       | `string[]` | Required, nonempty array of unique, nonempty original export names. Use `default` for default imports.                                                                              |
| `pattern`     | `string`   | Required JavaScript regular expression source, without delimiters or flags. No implicit anchors. An empty pattern accepts every name. Invalid expressions are configuration errors. |
| `returnIndex` | `number`   | Optional nonnegative integer selecting an array destructuring element. Omit to check a direct variable.                                                                             |
| `booleanOnly` | `boolean`  | Defaults to `false`. Enable syntactic boolean filtering described below.                                                                                                            |
| `autoImport`  | `boolean`  | Defaults to the shared `settings['vue-perfectionist'].autoImport` setting, which defaults to `false`.                                                                               |

Patterns are compiled as `new RegExp(pattern)`. Include `^` and `$` explicitly
when needed. For example, `Ready` also matches `wasReadyBefore`.

### Grouping methods and overriding targets

This configuration gives Vue methods a shared pattern and overrides only `ref`:

```js
{
  targets: [
    { source: 'vue', names: ['ref', 'shallowRef'], pattern: '^is[A-Z]' },
    { source: 'vue', names: ['ref'], pattern: '^has[A-Z]' },
  ],
}
```

::: correct

With the configuration above:

```ts
import { ref, shallowRef } from 'vue'

const hasAccess = ref(false)
const isOpen = shallowRef(false)
```

:::

::: incorrect

With the configuration above:

```ts
import { ref, shallowRef } from 'vue'

const isReady = ref(false)
const hasAccess = shallowRef(false)
```

:::

For the same method and binding position, the **last matching target wins**.
The entire target is replaced, including `booleanOnly` and `autoImport`;
fields are not merged. Selection happens before boolean filtering or the
auto-import opt-in. If the winning target skips a call, an earlier target is
not used as a fallback. Different `returnIndex` values remain independent.
A direct binding and array element zero are different positions.

### Custom functions and tuple results

Custom functions use the same target format. They need no boolean evidence
unless `booleanOnly: true` is configured:

```js
{
  targets: [
    { source: '@vueuse/core', names: ['useDark', 'useOnline'], pattern: '^is[A-Z]' },
    { source: './state', names: ['useFlag'], pattern: '^(is|has|should|can)[A-Z]', returnIndex: 1 },
    { source: './default', names: ['default'], pattern: '^(is|has|should|can)[A-Z]' },
  ],
}
```

::: correct

With the configuration above:

```ts
import { useDark, useOnline } from '@vueuse/core'
import makeFlag from './default'
import { useFlag } from './state'

const isDark = useDark()
const isOnline = useOnline()
const [toggle, hasAccess = false] = useFlag()
const isReady = makeFlag()
```

:::

::: incorrect

With the configuration above:

```ts
import { useDark, useOnline } from '@vueuse/core'
import makeFlag from './default'
import { useFlag } from './state'

const dark = useDark()
const online = useOnline()
const [toggle, access = false] = useFlag()
const ready = makeFlag()
```

:::

Only the selected tuple position is checked. Holes, rest elements, object
patterns, and nested patterns are skipped. A default value such as
`[toggle, access = false]` still checks the identifier `access`.

### Boolean filtering

`booleanOnly: true` uses syntax, not TypeScript type services or return type
inference. For Vue `ref` / `shallowRef` and custom methods:

- An explicit first type argument takes precedence. It must be `boolean`,
  a boolean literal type, or a union containing only boolean types.
- Otherwise, the first argument must be `true` or `false`, including
  parenthesized or TypeScript-wrapped forms.
- Unknown initial values, comparisons, negation, aliases, and mixed types
  such as `boolean | string` are skipped. Later arguments and type arguments
  are not used as evidence.

For `useToggle` from `@vueuse/core`, boolean filtering instead requires no
arguments or one boolean literal argument, and no type arguments. Calls with
options, custom truthy/falsy values, or unknown initial values are skipped.
The default target checks only array element zero, so a direct function binding
such as `const toggle = useToggle(isOpen)` is outside its scope.
Setting `booleanOnly: false` removes this filter, including for `useToggle`.
A custom export named `useToggle` from another source uses the generic filter.

### Auto-imports

For `unplugin-auto-import`, enable the shared setting:

```js
{
  settings: {
    'vue-perfectionist': { autoImport: true },
  },
  rules: {
    'vue-perfectionist/prefer-function-result-pattern': 'error',
  },
}
```

This enables unbound names from **all configured targets**, including custom
methods and names declared in ESLint's `languageOptions.globals`. Each target
can override the setting independently:

```js
{
  targets: [
    { source: 'vue', names: ['ref', 'shallowRef'], pattern: '^is[A-Z]', autoImport: false },
    { source: '@vueuse/core', names: ['useDark', 'useOnline'], pattern: '^is[A-Z]', autoImport: true },
  ],
}
```

`autoImport: false` affects unbound calls only; explicit imports still match.
Local declarations, parameters, imports from other sources, and type-only
imports are never treated as auto-imports. Custom auto-import aliases are not
inferred. The rule does not read Vite configuration, generated declarations,
or auto-import manifests.

An unbound name has no source information. The target declares its identity;
if multiple sources configure the same unbound name and result position,
the last target wins. Use explicit imports to disambiguate those sources.
ESLint globals alone do not opt into matching or configure `no-undef`; load
your generated globals separately when using that rule.

## Scope

Checks variable declarations in ordinary and setup Vue scripts, and standalone
JavaScript/TypeScript files, including nested functions and exported bindings.
The initializer must be a direct call, optionally wrapped in parentheses or
TypeScript syntax. Diagnostics point to the selected binding identifier.

Imports match the exact module specifier and original export name, supporting
named aliases, namespaces, and explicitly configured `default` exports.
The default targets do not include default exports.

Assignments after declaration, awaited or indirect results, indirect function
aliases, optional calls, computed member calls, `require()` imports, and
Vue template expressions are skipped.

## Automatic fixes and formatting

This rule reports without automatic fixes or suggestions. Choosing a meaningful
name requires context, and renaming a binding can affect script references,
template usage, and public exports.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-function-result-pattern.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-function-result-pattern.test.ts)
