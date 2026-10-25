---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/prefer-watch-effect-alias
description: Prefer dedicated aliases for post and sync watch effects.
---

# vue-perfectionist/prefer-watch-effect-alias

> Prefer dedicated aliases for post and sync watch effects.

:wrench: Automatically fixes calls when the target API and options can be
changed safely. Other matching calls are reported without a fix.

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
prevent a report. Supported fixes retain those hooks and their evaluation order.

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
custom aliases. Explicitly include `watchPostEffect` or `watchSyncEffect` in
this list to authorize fixes to those globals. Shared `autoImport: true` alone
does not establish that the replacement global is available.
Local declarations, parameters, type-only imports, and imports
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

Safe cases are fixed by default, without a separate option. The fixer changes
the API and removes a single static `flush` property:

- Namespace calls use the corresponding member of the same namespace. The
  target export is known for `vue`, `@vue/runtime-core`, and `@vue/runtime-dom`.
  Other configured sources require an existing runtime named import of the
  target API from that source, since a custom module may export only
  `watchEffect`. This also applies when adding a named import.
- Direct calls reuse a visible runtime named import of the target API from the
  same source, including aliases. Auto-imported calls can reuse an import from
  any configured Vue source.
- Otherwise, a named import is added to the original import declaration only
  when the target name has no binding or unresolved reference anywhere in the
  file, including template references. Textual occurrences of the target name or
  its component tag forms in templates and styles also conservatively block
  adding an import. Unbound `eval` references also block new imports because
  evaluated code can access names absent from the AST. The original
  `watchEffect` import is retained for other script or template uses; a dedicated
  unused-import rule can clean it up afterward.
- An auto-imported call can use a target global explicitly listed in
  `vueGlobals`, provided that name is not shadowed or assigned to in the file.
  Assignments to the source global also prevent fixes, including when an alias
  import is available. Writes to local shadows do not count as global writes.
  Unbound `eval` references prevent global fixes because evaluated code may
  reassign these APIs.
  Other global calls remain report-only if a suitable import cannot be reused.

Fixes require an inline object without a TypeScript wrapper and with exactly one
`flush` property. Remaining properties must be ordinary data properties named
`onTrack` or `onTrigger`. Their values, including function calls, are kept in
their original order. Accessors, methods, unknown options, prototype overrides,
duplicate `flush` properties, and type-wrapped options remain report-only.

Explicit casts, `satisfies` expressions, and type arguments on the callee or its
namespace receiver also remain report-only: changing the API or removing an
argument could violate those type constraints. Non-null assertions are preserved
and do not prevent a fix.

Comments inside the removed property make the call report-only. Surrounding
comments are retained. If `flush` is the only property and removing the argument
would not discard comments, the options argument is removed; otherwise an empty
object may remain to preserve comments. Parenthesized options are supported;
the object and its parentheses are retained even when the object becomes empty.
Existing parentheses around callbacks and callees, trailing commas, and line
endings are preserved. A formatter can finish indentation and whitespace after
property removal.

For example, this call can be fixed while retaining the debug hook:

::: incorrect

```ts
import * as Vue from 'vue'

Vue.watchEffect(updateLayout, { flush: 'post', onTrack: createDebugger() })
```

:::

::: correct

```ts
import * as Vue from 'vue'

Vue.watchPostEffect(updateLayout, { onTrack: createDebugger() })
```

:::

This call is reported without a fix because removing the first `flush` would
discard an evaluation:

::: incorrect

```ts
import * as Vue from 'vue'

Vue.watchEffect(updateLayout, { flush: getTiming(), flush: 'post' })
```

:::

Explicit receiver types can also prevent a fix. For example, this type does
not expose `watchPostEffect`:

::: incorrect

```ts
import * as Vue from 'vue'

;(Vue as Pick<typeof Vue, 'watchEffect'>).watchEffect(() => {}, {
  flush: 'post',
})
```

:::

No suggestions are offered for report-only cases. Resolve imports, name
collisions, comments, and option semantics manually before migrating them.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/prefer-watch-effect-alias.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/prefer-watch-effect-alias.test.ts)
