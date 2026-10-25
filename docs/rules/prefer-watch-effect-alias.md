---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-watch-effect-alias
description: Prefer dedicated aliases for post and sync watch effects.
---

# vue-perfectionist/prefer-watch-effect-alias

> Prefer dedicated aliases for post and sync watch effects.

## Usage

Enable this rule alongside your existing parser configuration. Vue SFCs need
`vue-eslint-parser`; TypeScript additionally needs `@typescript-eslint/parser`
as the script parser.

```js
import { defineConfig } from 'eslint/config'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'

export default defineConfig([
  // Your existing Vue and TypeScript parser configurations go here.
  {
    files: ['**/*.{vue,js,ts}'],
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: {
      'vue-perfectionist/prefer-watch-effect-alias': 'error',
    },
  },
])
```

## :book: Rule Details

Vue provides [`watchPostEffect` and `watchSyncEffect`](https://vuejs.org/api/reactivity-core.html#watchposteffect)
as aliases for `watchEffect` with `flush: 'post'` and `flush: 'sync'` respectively.
Use these APIs to make the scheduling mode visible at the call site.

::: correct

```vue
<script setup lang="ts">
import { watchEffect, watchPostEffect, watchSyncEffect } from 'vue'

watchPostEffect(updateLayout)
watchSyncEffect(updateCache)
watchEffect(updateData)
watchEffect(updateData, { flush: 'pre' })
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
import { watchEffect } from 'vue'

watchEffect(updateLayout, { flush: 'post' })
watchEffect(updateCache, { flush: 'sync' })
</script>
```

:::

Named import aliases and non-computed namespace calls are checked. The callback
may be inline or a reference. Other options, such as debugging hooks, do not
prevent a report and must be retained when migrating manually.

::: incorrect

```ts
import { watchEffect as effect } from 'vue'
import * as Vue from 'vue'

effect(updateLayout, { flush: 'post', onTrack: debug })
Vue.watchEffect(updateCache, { flush: 'sync' })
```

:::

## :wrench: Options

The default configuration is:

```json
{
  "vue-perfectionist/prefer-watch-effect-alias": [
    "error",
    { "vueImportSources": ["vue"] }
  ]
}
```

### vueImportSources

- **Type**: `string[]`
- **Default**: `["vue"]`

Exact module specifiers exposing Vue's named APIs. The array replaces the
default; an empty array disables imported API recognition. For example, use
`["vue", "#imports"]` to include a module that re-exports the Vue APIs.
Default imports are not treated as Vue namespaces or named APIs.

### vueGlobals

- **Type**: `string[]`
- **Default**: selected by the shared `autoImport` setting, which defaults to `false`

Use `vueGlobals: ["watchEffect"]` to check an unbound, same-name `watchEffect`
provided by auto-import tooling. This overrides the shared setting;
`vueGlobals: []` disables global recognition for this rule.
Alternatively, enable `settings['vue-perfectionist'].autoImport: true`.
Only the supported `watchEffect` name is checked; this option does not define
custom aliases. Local declarations, parameters, type-only imports, and imports
from unsupported modules take precedence over global recognition.

Unknown option fields, non-array values, non-string elements, and duplicate
array entries are rejected.

## Scope

The rule checks Vue APIs in ordinary and setup SFC scripts, including nested
functions, and in standalone JavaScript and TypeScript files. It does not
inspect template expressions or require TypeScript type information.

Calls must have exactly two runtime arguments, without argument spreads, and an
inline options object. Parentheses, transparent TypeScript wrappers, quoted or
statically computed property keys, escaped strings, and substitution-free
template literals are supported. The last `flush` property determines the
mode when a key occurs more than once. Each matching call reports once on its
callee.

Options variables, calls producing options, spread properties, dynamic computed
keys, dynamic flush values, accessors, and methods used as `flush` are skipped.
Objects with any spread or unknown key are skipped even when a literal `flush`
appears later. Optional calls, computed namespace members, local API aliases
created through assignments or destructuring, and same-named non-Vue functions
are also skipped. `watch`, `watchPostEffect`, and `watchSyncEffect` calls are
outside this rule's checks.

::: correct

```ts
import { watchEffect } from 'vue'

watchEffect(updateLayout, options)
watchEffect(updateLayout, { flush: timing })
watchEffect(updateLayout, { flush: 'post', ...options })
```

:::

## Automatic fixes and formatting

There are no automatic fixes or suggestions. Migration may require a new import,
resolving a local name collision, or updating auto-import configuration. Remove
the `flush` property manually while preserving the remaining options, their
evaluation, comments, and the existing callback. The rule leaves source text
unchanged, including line endings. Accepted and reported examples illustrate
the convention, not automatic conversions.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-watch-effect-alias.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-watch-effect-alias.test.ts)
