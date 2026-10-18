---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/max-lines-per-callback
description: Limit the number of lines in inline callbacks for Vue APIs.
---

# vue-perfectionist/max-lines-per-callback

> Limit the number of lines in inline callbacks for Vue APIs.

Keep inline callbacks short by extracting their internal logic into separate
functions and calling those functions from the inline callbacks. This rule
reports excessive length without automatic fixes or suggestions.

## Usage

Enable the rule alongside your existing Vue and TypeScript parser configuration:

```js
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default [
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/callback-style': 'error',
      'vue-perfectionist/max-lines-per-callback': [
        'error',
        {
          max: 15,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
]
```

The two rules have independent options. `callback-style` requires inline
callbacks and controls their syntax. `max-lines-per-callback` checks only their
length. A function reference is outside this rule's scope and remains reported
by `callback-style` when both rules are enabled.

## :book: Rule Details

With `max: 3`, this callback exceeds the limit:

::: incorrect

<!-- eslint-skip -->

```ts eslint-check=vue-perfectionist/max-lines-per-callback
/* eslint vue-perfectionist/max-lines-per-callback: [error, { max: 3 }] */
import { watch } from 'vue'

watch(source, (value, oldValue, onCleanup) => {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
})
```

:::

Extract the internal logic while retaining a short inline callback:

::: correct

<!-- eslint-skip -->

```ts eslint-check=vue-perfectionist/max-lines-per-callback
/* eslint vue-perfectionist/max-lines-per-callback: [error, { max: 3 }] */
import { watch } from 'vue'

function handleChange(value, oldValue, onCleanup) {
  updateCache(value, oldValue)
  refreshView(value, onCleanup)
}

watch(source, (value, oldValue, onCleanup) => {
  return handleChange(value, oldValue, onCleanup)
})
```

:::

Forward the parameters your logic needs and preserve its return behavior.
Extracted functions are not subject to this rule's line limit.

### Counting lines

The rule counts physical source lines from the first token of the inline
function through its last token, inclusive. Its signature, multiline parameters,
braces, and nested functions all contribute. An empty one-line callback counts
as one line. The surrounding call, outer TypeScript assertions, and comments
outside the function are not counted.

Both arrow functions (including expression bodies) and ordinary function
expressions are checked, including async and generator functions. Nested API
callbacks are checked independently and also contribute to their enclosing
callback's length.

- `skipBlankLines` excludes whitespace-only lines.
- `skipComments` excludes lines containing only comments and whitespace,
  including lines inside block comments. Code with trailing or inline comments
  still counts. Text resembling comments inside strings or template literals
  still counts.
- The options are independent. With only `skipComments`, blank lines outside
  comments still count. With only `skipBlankLines`, nonblank comment lines still
  count. Whitespace-only lines in multiline strings also follow `skipBlankLines`.

For example, with `max: 3`, `skipBlankLines: true`, and `skipComments: true`:

::: correct

<!-- eslint-skip -->

```ts eslint-check=vue-perfectionist/max-lines-per-callback
/* eslint vue-perfectionist/max-lines-per-callback: [error, { max: 3, skipBlankLines: true, skipComments: true }] */
import { onMounted } from 'vue'

onMounted(() => {
  // Delegate initialization.

  initialize() // This line still counts.
})
```

:::

## :wrench: Options

```js
{
  'vue-perfectionist/max-lines-per-callback': ['error', {
    max: 20,
    skipBlankLines: false,
    skipComments: false,
    groups: ['lifecycle', 'watch'],
    exclude: [],
    customCallbacks: [],
    vueGlobals: [],
    vueImportSources: ['vue'],
  }],
}
```

| Option             | Type               | Default                        | Meaning                                                                                             |
| ------------------ | ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `max`              | integer ≥ 1        | `20`                           | Maximum counted lines per inline callback.                                                          |
| `skipBlankLines`   | boolean            | `false`                        | Exclude whitespace-only lines.                                                                      |
| `skipComments`     | boolean            | `false`                        | Exclude comment-only lines.                                                                         |
| `groups`           | `CallbackGroup[]`  | `['lifecycle', 'watch']`       | Built-in API groups. Replaces the defaults; `[]` disables built-ins.                                |
| `exclude`          | `string[]`         | `[]`                           | Original built-in export names to skip. Custom entries still apply.                                 |
| `customCallbacks`  | `CustomCallback[]` | `[]`                           | Additional callback positions matched by exact import source and export name.                       |
| `vueGlobals`       | `string[]`         | Shared setting, otherwise `[]` | Explicit unbound Vue API names. Overrides the shared setting; `[]` disables built-in globals.       |
| `vueImportSources` | `string[]`         | `['vue']`                      | Exact module specifiers exposing Vue APIs. Replaces the defaults; `[]` disables imported built-ins. |

Omit `vueGlobals` to inherit `settings['vue-perfectionist'].autoImport`.
The explicit empty list in the configuration above disables that inheritance
for built-in APIs. Other options do not inherit from `callback-style` or
`sort-script-setup`.

### Built-in groups

Callback indices are zero-based and match those used by `callback-style`.

| Group       | APIs                                                                                                                                                                                                         | Callback index     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `lifecycle` | `onBeforeMount`, `onMounted`, `onBeforeUpdate`, `onUpdated`, `onBeforeUnmount`, `onUnmounted`, `onActivated`, `onDeactivated`, `onErrorCaptured`, `onRenderTracked`, `onRenderTriggered`, `onServerPrefetch` | `0`                |
| `watch`     | `watch`                                                                                                                                                                                                      | `1`                |
| `watch`     | `watchEffect`, `watchPostEffect`, `watchSyncEffect`                                                                                                                                                          | `0`                |
| `cleanup`   | `onScopeDispose`, `onWatcherCleanup`                                                                                                                                                                         | `0`                |
| `scheduler` | `nextTick`                                                                                                                                                                                                   | `0`, when supplied |

Enable `cleanup` and `scheduler` explicitly, for example with
`groups: ['lifecycle', 'watch', 'cleanup', 'scheduler']`. Only the second argument
of `watch` is checked; source getters and source arrays are left alone.
`computed`, `customRef`, and other APIs require custom configuration.

### Import identity and auto-imports

Named import aliases and namespace imports match their original export names.
TypeScript wrappers around namespace receivers, such as
`(Vue as typeof Vue).onMounted(...)`, preserve import and shadowing checks.
Local declarations, shadowed parameters, imports from other modules, and
type-only imports do not match. Default imports are not built-in Vue APIs.
For re-export modules, configure `vueImportSources: ['vue', '#imports']`.

To recognize unbound Vue API names, enable
`settings['vue-perfectionist'].autoImport: true`, or configure this rule's
`vueGlobals` list. Names declared in ESLint globals are also eligible, but
globals alone do not enable recognition. See the [shared setup](../guide/index.md#auto-imported-vue-apis).
An explicit `vueGlobals` list overrides the shared setting only for built-ins.

### Custom callbacks

```js
{
  customCallbacks: [
    {
      source: '@vueuse/core',
      name: 'watchDebounced',
      callbackIndices: [1],
      autoImport: true,
    },
    {
      source: 'vue-router',
      name: 'onBeforeRouteLeave',
      callbackIndices: [0],
    },
    {
      source: '@/composables/events',
      name: 'subscribe',
      callbackIndices: [1, 2],
    },
  ],
}
```

`source` and `name` must be exact, nonempty strings. `name` is the original export
name; `'default'` matches an explicit default import regardless of its local
name. Aliases and namespace calls are supported. Each `callbackIndices` list
must contain at least one unique nonnegative integer.

Custom entries apply independently of `groups`, `exclude`, and `vueGlobals`.
Matching indices are combined and each argument is reported at most once.

Each entry's optional `autoImport` inherits
`settings['vue-perfectionist'].autoImport` (default `false`). Set it to `true`
or `false` to override the shared setting for that entry. Explicit imports
continue to match regardless of this flag. Matching an auto-import uses the
configured `name` only when it has no local binding. The rule does not read
auto-import manifests, infer aliases or namespace objects, or auto-import
`name: 'default'`.

## Scope

The rule checks JavaScript and TypeScript files and both ordinary and setup
scripts in Vue SFCs, including calls inside composables and other functions.
Template expressions are outside its scope.

TypeScript `as`, `satisfies`, type assertions, non-null assertions, and
instantiation wrappers are unwrapped before checking. Non-function arguments
such as references, factories, and conditional expressions are skipped; their
implementations are not followed. Missing arguments, optional calls, optional
member access, and computed member access are also skipped.

An argument at or after a spread is skipped because its position cannot be
established. Known arguments before a spread are still checked. The rule does
not validate callback types or API signatures.

The `exceededMaxLines` diagnostic includes the API's original export name,
counted lines, and maximum. It highlights the inline function and asks you to
extract its logic and call the extracted function from that inline callback.
There are no automatic fixes or suggestions: extraction needs manual review
of closures, arguments, `this`, and return behavior.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/max-lines-per-callback.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/max-lines-per-callback.test.ts)
