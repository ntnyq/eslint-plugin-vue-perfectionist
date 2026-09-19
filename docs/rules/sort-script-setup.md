---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/sort-script-setup
description: Enforce configurable grouping and ordering of top-level statements in Vue 3 script setup blocks.
---

# vue-perfectionist/sort-script-setup

> Enforce configurable grouping and ordering of top-level statements in Vue 3 `<script setup>` blocks.

- :wrench: ESLint's `--fix` option can automatically fix some problems reported by this rule. Moves that may change execution behavior are reported without a fix.

## Why this rule?

Vue setup blocks mix compiler macros, state, computed values, functions, and
effects. A consistent group order makes these blocks easier to scan. This
rule combines Vue-aware classification with configurable sorting preferences
and conservative automatic fixes.

By default, the rule enforces group order while preserving the existing order
within each group. Initialization dependencies take precedence over both.

## Interactive Demo

Choose a sorting mode to animate the rule's safe fixes. Compare grouping,
sorting, and runtime safety, then use **Reset** to restore the original source.

<script setup>
import SortScriptSetupDemo from '../.vitepress/components/demos/sort-script-setup/index.vue'
</script>

<SortScriptSetupDemo />

## :book: Rule Details

The rule supports JavaScript and TypeScript through `vue-eslint-parser`. It leaves ordinary `<script>` blocks, imports, function bodies, and nested expressions unchanged. TypeScript requires a configured TypeScript parser.

The following examples use the default options. Types come before constants,
and constants come before functions:

::: correct

```vue
<script setup lang="ts">
interface Props {
  title: string
}
const z = 2
const a = 1
function run() {}
</script>
```

:::

::: incorrect

```vue
<script setup lang="ts">
function run() {}
const z = 2
const a = 1
interface Props {
  title: string
}
</script>
```

:::

The incorrect example can be safely fixed to the correct example. The
constants retain their relative order because the default `type` is
`unsorted`. With `type: 'natural'`, `a` would come before `z`.

Recognized Vue APIs can also produce diagnostics without a movement fix:

::: incorrect

```vue
<script setup>
import { computed, ref } from 'vue'

const doubled = computed(() => 2)
const count = ref(0)
</script>
```

:::

The default groups place `ref` before `computed`, but these runtime calls are
not automatically moved. See [Partitions and automatic fixes](#partitions-and-automatic-fixes).

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
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'vue-perfectionist': vuePerfectionist,
    },
    rules: {
      'vue-perfectionist/sort-script-setup': [
        'error',
        {
          type: 'unsorted',
          newlinesBetween: 1,
          newlinesInside: 'ignore',
        },
      ],
    },
  },
]
```

For JavaScript-only SFCs, omit `parserOptions.parser`. If your existing Vue configuration already supplies the parsers, keep that configuration and add the plugin and rule.

The plugin provides no built-in configurations. Register it and enable this rule explicitly in your own configuration.

## :wrench: Options

| Option               | Default                | Behavior                                                                           |
| -------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `type`               | `'unsorted'`           | `alphabetical`, `natural`, `line-length`, `custom`, or `unsorted`                  |
| `order`              | `'asc'`                | Ascending or descending order within groups                                        |
| `fallbackSort`       | `{ type: 'unsorted' }` | Secondary comparator; also accepts `type: 'subgroup-order'`                        |
| `alphabet`           | `''`                   | Character order for custom sorting                                                 |
| `ignoreCase`         | `true`                 | Normalize case before comparing names                                              |
| `specialCharacters`  | `'keep'`               | `keep`, `trim` leading special characters, or `remove` special characters          |
| `locales`            | `'en-US'`              | Locale string or nonempty array of locale strings                                  |
| `groups`             | See below              | Complete group order, replacing the defaults                                       |
| `customGroups`       | `[]`                   | Ordered list of custom matching conditions                                         |
| `partitionByComment` | `false`                | Partition by comments or regular expression patterns                               |
| `partitionByNewLine` | `false`                | Treat existing empty lines as sorting boundaries                                   |
| `newlinesBetween`    | `'ignore'`             | Exact nonnegative number of empty lines between groups, or `ignore`                |
| `newlinesInside`     | `'ignore'`             | Exact nonnegative number of empty lines inside groups, or `ignore`                 |
| `vueImportSources`   | `['vue']`              | Exact module names providing Vue runtime APIs                                      |
| `vueGlobals`         | `[]`                   | Explicitly recognize unbound, auto-imported Vue runtime API names                  |
| `fix`                | `'safe'`               | `safe` enables conservative fixes; `none` disables all fixes, including whitespace |

`unsorted` preserves order within groups while still enforcing group order and configured whitespace. It also disables the fallback comparator. `order` never reverses groups or initialization dependencies.

Names come from local bindings, including the first binding of a destructuring declaration. Unbound call statements use their callee name. `line-length` measures the complete statement's source length, excluding a trailing semicolon and attached external comments; it does not measure the longest physical line.

Natural sorting negotiates locale arrays in preference order. With `ignoreCase: false`, names that differ only in case use locale-sensitive ordering to break natural-sort ties, before `fallbackSort`; numeric ordering remains unchanged. Custom alphabets compare Unicode code points, including characters outside the Basic Multilingual Plane. Unlisted characters have equal priority, with name length measured in code points.

`newlinesInside: 'newlinesBetween'` is accepted for compatibility: it resolves to `ignore` when global `newlinesBetween` is `ignore`, otherwise `0`. Prefer an explicit value in new configurations. Numeric whitespace options cannot be combined with `partitionByNewLine: true`, including numeric group overrides.

`usage`, `tsconfig`, `commentAbove`, `useConfigurationIf`, and other upstream-only rule options are not supported. This is a compatible subset of Perfectionist's sorting vocabulary, not a wrapper around its rules.

## Groups

The default groups are:

```js
;[
  ['interface', 'type'],
  'define-options',
  'define-props',
  'define-emits',
  'define-slots',
  'define-model',
  'constant',
  'inject',
  'composable',
  'template-ref',
  ['ref', 'reactive'],
  'computed',
  'variable',
  ['enum', 'class'],
  'function',
  'watch',
  'lifecycle-hook',
  'provide',
  'define-expose',
]
```

Nested arrays form one group: `['ref', 'reactive']` does not require refs to precede reactive objects. To require that order, use separate entries. An empty `groups` array disables ordering and whitespace diagnostics.

`withDefaults(defineProps(...))` belongs to `define-props`. `ref` includes `shallowRef`, `customRef`, `toRef`, and `toRefs`. `reactive` includes shallow and readonly variants. `watch` includes the watch-effect variants, even when the stop handle is assigned to a variable. `template-ref` recognizes `useTemplateRef`, without guessing from `ref(null)` or binding names.

`constant` means a single `const` binding initialized with a primitive literal or interpolation-free template. Objects, arrays, property reads, and calls do not qualify. `function` includes ordinary declarations and function-valued variables, but only ordinary declarations are eligible for movement fixes.

`composable` recognizes statically imported calls whose exported name matches `^use[A-Z0-9]`, after dedicated Vue API classification. `lifecycle-hook` uses an explicit list of Vue lifecycle registration functions; it does not match every `onXxx` name.

Applicable modifiers include `declare`, `async`, `destructured`, `const`, `let`, and `var`, followed by the selector: for example `async-function`, `const-ref`, or `destructured-define-props`. More-specific configured groups win over plain selectors. Ambient and merging declarations remain fixed regardless of their classification.

Candidates that do not match a configured group stay fixed and partition the surrounding statements. Add `unknown` to place these candidates explicitly. Unknown groups preserve their internal order unless their group object explicitly overrides `type`. Unsupported statements such as assignments, control flow, and multi-declarator declarations remain fixed even with `unknown` configured.

Group objects can override sorting and spacing:

```js
{
  groups: [
    'constant',
    { newlinesBetween: 1 },
    { group: 'function', type: 'natural', newlinesInside: 1 },
  ],
}
```

## Custom groups

```js
{
  groups: ['router', 'stores', ['ref', 'reactive'], 'computed', 'function'],
  customGroups: [
    {
      groupName: 'router',
      callNamePattern: '^use(Route|Router)$',
      importSourcePattern: '^vue-router$',
    },
    {
      groupName: 'stores',
      callNamePattern: '^use[A-Z].*Store$',
      importSourcePattern: '^(@/stores/|~/stores/)',
    },
  ],
}
```

Each custom group must be referenced in `groups`. This example replaces the default group list; omitted categories become fixed boundaries unless an `unknown` group is included.

Filters are `selector`, `modifiers`, `elementNamePattern`, `callNamePattern`, and `importSourcePattern`. Filters in one condition are ANDed, and all listed modifiers must be present. An `anyOf` array ORs multiple condition objects; it cannot coexist with top-level filters. Custom groups take precedence over built-in groups, with the first matching custom definition winning.

Patterns accept a string, `{ pattern, flags }`, or an array of either. Arrays mean OR. Patterns are not implicitly anchored and do not inherit `ignoreCase`. Invalid expressions are configuration errors. Destructured declarations match `elementNamePattern` if any local binding matches.

`callNamePattern` refers to the direct initializer or call statement, not calls nested in a function body. Named import aliases are normalized to exported names; default imports use their local binding name. `importSourcePattern` refers to the static source of that direct call, not arbitrary imports elsewhere in the statement. Unresolved auto-imports and type-only imports have no inferred runtime source.

For a standalone custom group, its sorting overrides win over its `groups` object overrides. Inside a nested group array, individual custom-group overrides do not apply; the entire group uses one comparator. This avoids contradictory comparisons between members of the same group.

## Configuration

Configure all preferences directly in the rule options. Explicit options override
the rule defaults; shared ESLint settings are not supported.
`settings.perfectionist` and `settings['vue-perfectionist']` are ignored,
including invalid or unknown values within those namespaces.

Arrays and `fallbackSort` replace their default values. Group overrides merge
fallback fields; an unspecified fallback order inherits the group's order.

## Partitions and automatic fixes

Imports, assignments, control flow, multi-declarator statements, top-level await, ambient declarations, and merging declarations are boundaries. No statement moves across them. A function's internal await does not itself partition surrounding declarations.

Comment partitions accept a boolean, regex patterns, or `{ line, block }` with separate boolean/pattern settings. Only comments between top-level statements act as partitions. Markers stay in place. Clearly attached documentation and trailing comments move with their declaration. Ambiguous comments and ESLint/TypeScript control directives prevent movement.

Initialization dependencies take precedence over style. For example, `const snapshot = count.value` will not be required to precede the declaration of `count`, even when its group appears first. Deferred function captures are distinguished from immediate reads, including directly invoked local functions and IIFEs. The rule does not perform whole-program effect analysis or repair pre-existing initialization errors.

For recognized Vue calls, dependency analysis follows inline and locally declared callbacks executed during registration: `watch` source getters (including inline source arrays), immediate `watch` callbacks, `watchEffect`, `watchSyncEffect`, and `customRef` factories. Ordinary `watch` callbacks, `watchPostEffect`, and `watchEffect` with `flush: 'post'` remain deferred. When options cannot be resolved statically, callbacks that may run immediately conservatively retain their dependencies. Calls nested in immediately invoked local functions use their own Vue import identity; unrelated functions with the same name are not treated as Vue APIs.

Movement fixes are limited to contiguous, proven-safe fragments of independent type/interface declarations, primitive constant declarations, and ordinary function declarations. Runtime calls, compiler macros, destructuring, property reads, class/enum initialization, and other uncertain moves produce an `unsafeReorder` diagnostic without a fix or suggestion. In particular, recognizing `ref`, `watchEffect`, a lifecycle hook, or a composable never grants permission to move it automatically.

Safe fixes preserve original statement text, attached comments, and line endings. Potential automatic-semicolon-insertion hazards suppress movement fixes. Whitespace fixes do not rewrite statement interiors or script tag padding.

## Other rules

Use `perfectionist/sort-imports` for imports. When this rule controls top-level declarations and macros, disable `perfectionist/sort-modules` and `vue/define-macros-order` for the same `.vue` files. Keep Vue correctness rules, including checks for lifecycle registration, watchers, and expose after await.

Align whitespace choices with formatting and padding rules to avoid competing fixes. The default whitespace settings are `ignore`.

See the [design specification](../design/sort-script-setup.md) for the full classification table and validation contract.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-script-setup.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/sort-script-setup.test.ts)
