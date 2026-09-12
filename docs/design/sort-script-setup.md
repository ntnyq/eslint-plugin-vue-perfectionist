# sort-script-setup Design

Status: the initial implementation is available. This document records the
design contract for `vue-perfectionist/sort-script-setup`. See the
[rule documentation](../rules/sort-script-setup.md) for usage and supported
automatic fixes.

The rule targets Vue 3 `<script setup>` top-level statements. It preserves
order within groups by default and gives initialization dependencies and
execution behavior priority over style preferences.

## 1. Design Decisions

Use Perfectionist-style sorting options, Vue-specific semantic groups, and
conservative automatic fixes:

- `groups` determines category order; `type`, `order`, and `fallbackSort`
  determine order within each group.
- The default `type: 'unsorted'` still checks group order and configured
  whitespace.
- Classification covers macros, reactive declarations, composables, watchers,
  and lifecycle hooks. Successful classification does not imply safe movement.
- A complete top-level statement is the smallest movement unit. The rule does
  not split declarations, reorder arguments, or sort inside function bodies.
- There is no option to disable dependency protection or declare calls pure.
- The initial API supports a documented subset of upstream options and rejects
  unsupported rule options.

The rule and presets require an ESLint configuration with a Vue parser.

## 2. Perfectionist Compatibility Baseline

The recorded design baseline is upstream commit
[`c0b3b8e`](https://github.com/azat-io/eslint-plugin-perfectionist/tree/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc),
whose package version is `5.11.0`. This is a fixed reference, not a promise of
automatic compatibility with every upstream release.

The option shapes follow
[common-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-options.ts),
[common-groups-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-groups-options.ts),
and
[common-partition-options.ts](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/types/common-partition-options.ts).
Defaults and Vue extensions are local design decisions.

| Option               | Default                | Contract                                                          |
| -------------------- | ---------------------- | ----------------------------------------------------------------- |
| `type`               | `'unsorted'`           | `alphabetical`, `natural`, `line-length`, `custom`, or `unsorted` |
| `order`              | `'asc'`                | Affects comparisons within groups only                            |
| `fallbackSort`       | `{ type: 'unsorted' }` | Breaks primary ties; also supports `subgroup-order`               |
| `alphabet`           | `''`                   | A nonempty alphabet is required for effective custom comparators  |
| `ignoreCase`         | `true`                 | Affects names, not grouping regular expressions                   |
| `specialCharacters`  | `'keep'`               | `keep`, `trim`, or `remove`                                       |
| `locales`            | `'en-US'`              | A BCP 47 string or nonempty array of locale strings               |
| `groups`             | See section 5          | Names, merged arrays, group overrides, and newline separators     |
| `customGroups`       | `[]`                   | Ordered matching conditions, including `anyOf`                    |
| `partitionByComment` | `false`                | Boolean, regex options, or separate line/block options            |
| `partitionByNewLine` | `false`                | Existing blank lines create independent partitions                |
| `newlinesBetween`    | `'ignore'`             | A nonnegative integer or `ignore`                                 |
| `newlinesInside`     | `'ignore'`             | A nonnegative integer, `ignore`, or legacy `newlinesBetween`      |
| `vueImportSources`   | `['vue']`              | Exact import sources identifying Vue runtime APIs                 |
| `vueGlobals`         | `[]`                   | Explicit names of unbound, auto-imported Vue runtime APIs         |
| `fix`                | `'safe'`               | `safe` or `none`                                                  |

Intentional differences include preserved order within groups by default,
ignored blank-line counts by default, Vue-specific selectors, and a smaller
set of automatically movable statements.

Neither `type` nor `fallbackSort.type` accepts `usage`. Immediate reads,
deferred captures, and synchronous callbacks need separate dependency models;
dependency protection applies regardless of the comparator.

The rule does not accept `tsconfig`, `additionalModuleBlockTypes`,
`useExperimentalDependencyDetection`, `newlinesBetweenOverloadSignatures`,
`commentAbove`, or `useConfigurationIf`. It targets SFCs, preserves overloads,
and does not generate group headings. The schema rejects these rule fields.

## 3. Scope and Movement Units

| Source                                                           | Behavior                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| JavaScript or TypeScript Vue 3 `<script setup>`                  | Inspect top-level candidates                                        |
| Ordinary `<script>`, Options API, plain `.ts`/`.js`              | Skip                                                                |
| SFC with both script blocks                                      | Select setup by its SFC range; never cross blocks                   |
| Imports, including side-effect imports                           | Fixed boundaries                                                    |
| Control flow, including `if`, loops, `switch`, `try`, and blocks | Fixed boundaries; no recursive sorting                              |
| Top-level execution containing `await` or `for await`            | Fixed boundaries                                                    |
| Assignments, updates, and complex expression statements          | Fixed boundaries                                                    |
| Direct call expression statements                                | Classifiable candidates; movement requires separate safety analysis |
| Function and callback bodies                                     | Preserve text; inspect only for dependencies                        |
| Classes and enums                                                | Classifiable, with no automatic movement                            |
| Namespaces and unsupported declaration forms                     | Fixed boundaries                                                    |

Use SFC information from `vue-eslint-parser`, rather than relying on the file
extension or the combined `Program.body`. Skip files without SFC information.
TypeScript requires a TypeScript-capable inner parser.

A movement unit includes clearly attached leading and trailing comments.
Overload signatures and implementations, merging declarations, ambient
declarations, and protected directives remain fixed. A declaration such as
`const a = ref(0), b = computed(...)` is a boundary: it is neither split nor
assigned an arbitrary single category. Destructuring is one candidate, and
its members are never reordered.

## 4. Public Option Contract

The rule accepts one options object. Use ESLint's `files` configuration for
file-specific preferences rather than adding conditional routing to the rule.

The authoritative TypeScript contracts are in
[sort-script-setup.ts](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/types/rules/sort-script-setup.ts):

- `CommonSortOptions` contains shared comparison, partition, and spacing options.
- `SortScriptSetupOptions` adds `groups`, `customGroups`, `vueImportSources`,
  `vueGlobals`, and `fix`.
- `GroupEntry` accepts a name, a merged name array, an object combining `group`
  with `GroupOverrides`, or a `{ newlinesBetween }` separator.
- `GroupOverrides` contains `type`, `order`, `fallbackSort`, and `newlinesInside`.
- `RegexOption` accepts a string, `{ pattern, flags? }`, or an array of either.
- `CustomGroup` combines `groupName` and overrides with either direct matching
  fields or `anyOf` conditions.

Types describe the shape. Schema and semantic validation also enforce
nonempty arrays where required, legal group names, nonnegative integers,
valid regular expressions, and constraints between fields.

## 5. Built-in Groups

### Default Groups

```js
groups: [
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

This is a configurable reading order. Dependencies preserve required
initialization order when a composable consumes state or an expression reads
another binding. `define-expose` is a preference within the current partition,
not an instruction to move a call to the end of the file.

### Classification

| Selector            | Matches                                                                                         | Notes                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `interface`, `type` | TypeScript interfaces and aliases                                                               | Member order is unchanged                                                                     |
| `enum`, `class`     | Top-level enums and classes                                                                     | May perform runtime initialization                                                            |
| `define-options`    | `defineOptions(...)`                                                                            | Compiler macro                                                                                |
| `define-props`      | `defineProps(...)` and `withDefaults(defineProps(...), ...)`                                    | Includes destructuring; wrapper is one props candidate                                        |
| `define-emits`      | `defineEmits(...)`                                                                              | Bound or standalone calls                                                                     |
| `define-slots`      | `defineSlots(...)`                                                                              | Bound or standalone calls                                                                     |
| `define-model`      | `defineModel(...)`                                                                              | Includes destructured results                                                                 |
| `define-expose`     | `defineExpose(...)`                                                                             | Preserve argument dependencies and await boundaries                                           |
| `constant`          | Single `const` binding with a primitive literal or interpolation-free template                  | Excludes regexes, objects, arrays, calls, and property reads; signed numeric literals qualify |
| `inject`            | Vue `inject(...)`                                                                               | Default factories may execute                                                                 |
| `template-ref`      | Vue `useTemplateRef(...)`                                                                       | Do not infer from `ref(null)` or binding names                                                |
| `ref`               | Vue `ref`, `shallowRef`, `customRef`, `toRef`, `toRefs`                                         | A `customRef` factory may execute synchronously                                               |
| `reactive`          | Vue `reactive`, `shallowReactive`, `readonly`, `shallowReadonly`                                | One reactive-object family                                                                    |
| `computed`          | Vue `computed(...)`                                                                             | Deferred captures are distinct from immediate reads                                           |
| `composable`        | Direct statically imported calls whose exported name matches `^use[A-Z0-9]`                     | Dedicated Vue categories take precedence; the name does not prove purity                      |
| `variable`          | Other single-declarator variables                                                               | Includes objects, arrays, and other initializers                                              |
| `function`          | Named function declarations and single bindings initialized with arrows or function expressions | Excludes calls returning functions                                                            |
| `watch`             | Vue `watch`, `watchEffect`, `watchPostEffect`, `watchSyncEffect`                                | Includes declarations binding a stop handle                                                   |
| `lifecycle-hook`    | Explicit Vue lifecycle registration APIs                                                        | Does not match arbitrary `onXxx` names                                                        |
| `provide`           | Vue `provide(...)`                                                                              | Arguments may have dependencies                                                               |
| `call`              | Other direct call statements                                                                    | Available to custom groups; omitted from default groups                                       |

The lifecycle list is `onBeforeMount`, `onMounted`, `onBeforeUpdate`,
`onUpdated`, `onBeforeUnmount`, `onUnmounted`, `onActivated`, `onDeactivated`,
`onErrorCaptured`, `onRenderTracked`, `onRenderTriggered`, and
`onServerPrefetch`. Use custom groups for `onScopeDispose` or
`onWatcherCleanup` when needed.

There are no additional `macros`, `state`, or `effects` aliases. Express merged
categories directly, for example `['ref', 'reactive', 'computed']`.

### Classification Priority and Modifiers

Derive statement facts before choosing one base selector: compiler macro,
recognized Vue API, imported `useXxx`, function initializer, primitive
constant, then ordinary variable/call. Direct declarations use their AST kind.
For example, `const count = ref(0)` has selector `ref`.

Modifiers record independent facts: `declare`, `async`, `destructured`, and
the declaration kinds `const`, `let`, and `var`. Examples include `const-ref`,
`destructured-define-props`, and `async-function`.

Configured custom groups take precedence over built-in groups. Built-in
matches prefer more modifiers; ties use the order `declare`, `async`,
`destructured`, `const`, `let`, `var`. Plain selectors are considered last.
Modifiers may appear in any order before the selector. Normalize names before
checking duplicates, and reject invalid selector/modifier combinations.

`unknown` is a fallback group name, not an AST selector. Unmatched candidates
are fixed boundaries unless `unknown` is explicitly configured. Its members
retain their order even under a global comparator; use
`{ group: 'unknown', type: 'natural' }` to override this behavior. Hard
boundaries such as control flow remain fixed.

## 6. Group Sorting and Overrides

### Merged Arrays

```js
groups: [['interface', 'type'], ['ref', 'reactive'], 'computed']
```

Each nested array forms one group. Natural sorting interleaves its categories
by name; `unsorted` preserves their existing relative order.

`fallbackSort: { type: 'subgroup-order' }` uses positions within that array
only to break primary ties. It does not impose separate category order.
With `type: 'unsorted'`, all comparisons within the group, including the
fallback, are disabled. This follows the fixed upstream
[comparator baseline](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/compare/compute-comparators.ts).

### Override Priority

For a standalone custom group, higher-priority values are:

1. Explicit overrides on its `customGroups` definition.
2. Corresponding overrides on its `groups` object.
3. Resolved rule options and shared settings.

Inside a merged array, individual custom-group overrides do not apply. The
whole group needs one consistent comparator and spacing policy. Use
`{ group: ['a', 'b'], type: 'natural' }` for a shared override. This follows
the upstream
[group override baseline](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/compute-overridden-options-by-group-index.ts).

### Sorting Keys

| Statement                   | Name key                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Function, type, class, enum | Declaration identifier                                                                                     |
| Single variable binding     | Local binding name                                                                                         |
| Destructuring               | First local binding in source traversal order; empty patterns fall back to the call name or statement text |
| Unbound call                | Resolved call name                                                                                         |

For `const route = useRoute()`, sorting uses `route`; classification uses
`useRoute`. `line-length` measures the statement's source length excluding a
trailing semicolon and external attached comments. Internal comments and
newlines count; it is not the longest physical line's width.

If primary and fallback comparisons tie, preserve the original index.
Descending order never reverses dependency edges. Natural sorting negotiates
locale arrays in preference order. With case sensitivity enabled,
locale-sensitive case comparisons break natural ties while retaining numeric
precedence. Custom alphabets compare Unicode code points and reject duplicate
characters. Unlisted characters have equal priority, with code-point name
length breaking remaining prefix ties.

Comparator regressions cover case, numbers, leading `_`/`$`, punctuation,
Unicode, and characters missing from custom alphabets. Do not replace the
baseline's special-character handling with an unrelated `\W` expression or
assume a simplified numeric `localeCompare` is fully equivalent.

## 7. Custom Groups

### Matching Fields

| Field                 | Meaning                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `groupName`           | User-defined name, which must appear in `groups`                                               |
| `selector`            | Base selector from section 5                                                                   |
| `modifiers`           | All listed modifiers must be present                                                           |
| `elementNamePattern`  | Local declaration name; any destructuring binding may match; unbound calls use their call name |
| `callNamePattern`     | Canonical name of the direct initializer call or standalone call                               |
| `importSourcePattern` | Static import source of that direct call                                                       |
| `anyOf`               | Any complete condition may match                                                               |

Fields within one condition are ANDed; pattern arrays are ORed. The first
matching configured custom group wins. Require at least one nonempty matching
field; an explicit `elementNamePattern: '.*'` can serve as a fallback.
`anyOf` cannot coexist with top-level filters and is not recursive.

Patterns use strings or `{ pattern, flags }`, not `RegExp` instances. Do not
add implicit anchors. Reject invalid expressions and flags, and reset
`lastIndex` between matches so `g`/`y` flags remain deterministic. Patterns
match original names without `ignoreCase` or `specialCharacters` normalization.

Calls inside function bodies do not classify the containing declaration.
The canonical call name for `withDefaults(defineProps(...))` is `defineProps`.

### Project-specific Groups

```js
{
  groups: [
    ['interface', 'type'],
    'define-props',
    'define-emits',
    'router',
    'stores',
    'composable',
    ['ref', 'reactive'],
    'computed',
    { group: 'handlers', type: 'natural' },
    'function',
    'watch',
    'lifecycle-hook',
    'define-expose',
  ],
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
    {
      groupName: 'handlers',
      selector: 'function',
      elementNamePattern: '^(handle|on)[A-Z]',
    },
  ],
}
```

This replaces the complete group list. Omitted categories follow the unknown
group policy. Store composables commonly come from project files, so their
source should not be assumed to be `pinia`.

Calls such as Nuxt's `definePageMeta` can use a custom condition like
`{ selector: 'call', callNamePattern: '^definePageMeta$' }`. Classification
does not model framework-specific hoisting or authorize movement. Also use
custom groups to distinguish watcher or lifecycle APIs; there are no separate
`watchOrder`, `lifecycleOrder`, or `macrosOrder` options.

## 8. Vue Call Sources and Auto-imports

`vueImportSources` contains exact module names and replaces the default
array. For example, use `['vue', '@vue/reactivity']` to recognize both sources.
This identifies APIs without making a purity claim.

```ts
import { ref as createRef } from 'vue'
import * as Vue from 'vue'
import { ref } from './local-helper'

const first = createRef(0) // ref
const second = Vue.ref(0) // ref
const third = ref(0) // variable
```

Resolve bindings through ESLint scopes. Named imports use their exported
names; default imports use local binding names. Type-only imports provide no
runtime source. Recognize static namespace members, while leaving dynamic
members, optional calls, additional variable aliases, and cross-module
re-exports unresolved. Custom groups may match an unresolved member callee
such as `api.useThing`, but it has no inferred import source.

`vueGlobals` recognizes only unbound runtime names from the built-in Vue API
table, for example `['ref', 'computed', 'watch', 'onMounted']`. Local or
imported bindings take precedence. Compiler macros need no entry and are
recognized only without conflicting local or external imported bindings.

Use name conditions for auto-imported business composables. Without a static
import, `importSourcePattern` cannot match an invented module source. No
Nuxt-specific mode is required.

## 9. Partitions, Blank Lines, and Comments

Partition options determine which statements can be compared together;
`groups` determines ordering within a partition.

```js
{
  partitionByComment: {
    line: '^\\s*#region\\b',
    block: false,
  },
  newlinesBetween: 1,
  newlinesInside: 'ignore',
}
```

Only comments between top-level statements create partitions. A trailing
comment belongs to the preceding statement. A standalone partition marker
stays at the boundary. Clearly attached leading comments move with the next
statement; ambiguous ownership suppresses movement fixes.

Blank-line counts refer to empty physical lines. `1` means exactly one empty
line between statements. The legacy `newlinesInside: 'newlinesBetween'`
resolves to `ignore` when global `newlinesBetween` is `ignore`, otherwise `0`.
Prefer explicit numbers or `ignore` in new configurations.

```js
groups: [
  'define-props',
  { newlinesBetween: 0 },
  'define-emits',
  { newlinesBetween: 1 },
  ['ref', 'reactive'],
]
```

When intermediate groups are absent, combine the crossed boundaries between
the actual neighboring groups: use the largest positive count, otherwise
`ignore` if present, otherwise `0`. Unspecified boundaries inherit the global
value. This follows the upstream
[newline boundary baseline](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/get-newlines-between-option.ts).

With `partitionByNewLine: true`, effective global and group spacing options
must be `ignore` or unset. Normalize legacy values first, then reject
conflicts, including inherited ones. Otherwise newly inserted blank lines
could change partitioning on the next lint pass.

Whitespace fixes apply only between actual neighboring candidates within a
partition. They do not cross imports, control flow, await, or unmatched
candidates, and do not format statement interiors or script-tag padding.

ESLint disable/enable directives protect affected statements and boundaries.
TypeScript directives such as `@ts-expect-error` and `@ts-ignore`, and other
tool directives, also remain fixed with their affected statements. Clearly
attached JSDoc may move.

## 10. Shared Settings and Presets

Supported common preferences use the following precedence:

```text
rule options
  > settings['vue-perfectionist']
  > supported settings.perfectionist fields
  > rule defaults
```

Only `CommonSortOptions` fields are shared. `groups`, `customGroups`,
`vueGlobals`, `vueImportSources`, and `fix` belong in rule options. Installing
the upstream plugin is not required to use shared settings.

Project only supported fields from `settings.perfectionist`; ignore unrelated
upstream fields such as `tsconfig`. Reject unsupported values of selected
fields unless a higher layer replaces them. The plugin's own namespace
rejects unknown fields. Fully overridden values do not participate in final
semantic validation.

Configuration layers use shallow field replacement, including whole arrays
and `fallbackSort` objects, following the upstream
[completion baseline](https://github.com/azat-io/eslint-plugin-perfectionist/blob/c0b3b8eb20b0eedd8229ffa456f8a10c85bf83fc/utils/complete.ts).
Group-level fallback overrides inherit individual fields; a missing fallback
order uses the group's order.

```js
{
  settings: {
    perfectionist: { type: 'natural', order: 'asc', ignoreCase: true },
    'vue-perfectionist': { type: 'unsorted' },
  },
  rules: {
    'vue-perfectionist/sort-script-setup': ['error', {
      newlinesBetween: 1,
      newlinesInside: 'ignore',
      groups: [
        ['interface', 'type'],
        'define-props',
        'define-emits',
        ['ref', 'reactive'],
        'computed',
        { group: 'function', type: 'natural' },
        'watch',
        'lifecycle-hook',
        'define-expose',
      ],
    }],
  },
}
```

This preserves order within ordinary groups and naturally sorts functions.
Omitting the plugin-specific `type` allows upstream shared `natural` to
override the rule's default `unsorted`.

`recommended` enables the rule without explicit options.
`recommended-natural` and `recommended-alphabetical` explicitly set their
comparison type and therefore override shared settings for that field. There
is no `recommended-custom` because no alphabet is suitable for every project.
Presets register the plugin for `**/*.vue`; parser setup remains with the user.

## 11. Dependencies and Fix Contract

### Separate Checking from Fixing

Compute a stable target order using category preferences and immediate-read
dependencies, then evaluate the safety of the required movement:

- Never compare or fix across hard boundaries.
- Initialization dependencies take precedence over group and name order.
- Report style differences requiring uncertain execution changes without a
  fix or an unverified suggestion.
- Do not report a reversal already ruled out by a dependency constraint.

Dependency-adjusted order may repeat categories. Calculate spacing using the
actual adjacent categories rather than forcing every category to be contiguous.

```ts
const count = ref(0)
const snapshot = count.value
```

Preserve `count` before `snapshot`, even if `variable` precedes `ref` in the
configured groups.

```ts
const result = computed(() => input.value)
const input = ref(0)
```

Creating a closure does not immediately read `input`. Deferred captures are
not automatically initialization dependencies, although later computed reads
or synchronously executed callbacks may trigger evaluation.

```ts
const initial = readLater()
const later = 1

function readLater() {
  return later
}
```

Function hoisting does not eliminate reads made by immediate calls. The rule
does not repair pre-existing initialization errors or perform whole-program
effect analysis. Unresolved execution paths do not justify movement fixes.

For recognized Vue calls, follow inline and locally declared callbacks that
may execute during registration: watch source getters and source arrays,
immediate watch callbacks, `watchEffect`, `watchSyncEffect`, and `customRef`
factories. Ordinary watch callbacks, `watchPostEffect`, and `watchEffect`
with `flush: 'post'` remain deferred. Unknown options conservatively retain
possible immediate dependencies. Nested calls use their own import identity;
foreign functions sharing Vue API names do not gain Vue callback semantics.

### Safe Fixes

`fix: 'safe'` permits only proven-safe movement within contiguous fragments:

- Independent type/interface declarations without declaration merging.
- Independent single-identifier primitive constant declarations without
  decorators or protected directives.
- Ordinary top-level function declarations without overload ambiguity or
  conflicting names; their bodies remain unchanged.
- Whitespace adjustments that preserve directive meaning and parsing.

These units cannot cross runtime calls. Arrow-function variables and other
unproven forms are not automatically included. Type erasure alone does not
prove safety because declaration merging and overload order can affect types.

Vue runtime APIs, business composables, watchers/effects, lifecycle
registrations, provide/inject, property reads, destructuring, `new`,
class/enum initialization, compiler macros, and macro wrappers receive no
movement fix merely because no explicit dependency was found. The initial
fixer mainly organizes types, simple declarations, and whitespace.

`fix: 'none'` preserves diagnostics and disables every fix, including spacing.
It differs from `type: 'unsorted'`, which disables comparisons within groups.

### Await and Side Effects

Setup executes during instance creation; macros involve compiler processing
and hoisting, and top-level await introduces asynchronous boundaries.

```ts
const count = ref(0)
watchEffect(() => console.log(count.value))
count.value = 1
```

Watcher registration is executable behavior, including when its result is
assigned to a `const` stop handle.

```ts
const data = await loadData()
defineExpose({ data })
```

Do not move expose across await in either direction. Dedicated Vue rules
handle existing expose-after-await problems.

Retain cycle members in their original order without movement fixes involving
the cycle. Independent fragments can still be checked. Stable topological
selection uses group order, the group comparator, and original index.
Uncertain side effects participate in diagnostics but prevent unsafe fixes.

Choose independently validated contiguous fragments with nonoverlapping fix
ranges. Preserve source text, comments, and line endings. Validate ASI,
semicolons, comment ownership, and parsing; formatting the whole script must
not mask a change in meaning. Repeated fixing must converge without changes
on the next pass.

## 12. Validation and Diagnostics

Beyond basic schema validation, reject:

- Duplicate or unknown group names, including normalized modifier duplicates
  and undefined custom groups.
- Empty, duplicate, built-in-conflicting, or unreferenced custom-group names.
- Deeply nested or empty merged arrays; normalize single-element arrays.
- Leading, trailing, or consecutive newline separators, or separators mixed
  with a `group` field.
- Nonfinite, negative, or fractional newline counts, and numeric spacing
  combined with blank-line partitioning.
- Effective custom comparators without valid alphabets, including fallbacks
  and group overrides.
- Duplicate, incompatible, or selector-inapplicable modifiers.
- Empty regex arrays, unconditional `anyOf` branches, invalid expressions,
  flags or locales, and unknown Vue global names.
- Unknown object fields, except unrelated upstream settings projected out
  according to section 10.

`groups: []` disables ordering and spacing diagnostics without restoring
defaults. `customGroups: []` clears custom matching.

| Message ID                  | Meaning                                         | Fix                     |
| --------------------------- | ----------------------------------------------- | ----------------------- |
| `unexpectedGroupOrder`      | A category should precede another category      | When safety is proven   |
| `unexpectedOrder`           | A name or length is out of order within a group | When safety is proven   |
| `unexpectedNewlinesBetween` | Incorrect blank-line count between groups       | When independently safe |
| `unexpectedNewlinesInside`  | Incorrect blank-line count inside a group       | When independently safe |
| `unsafeReorder`             | Preferred movement cannot be proven safe        | None                    |

Report each discrepancy once. Do not issue both a fixable and unsafe report
for the same move. `fix: 'none'` does not rename a safe discrepancy to
`unsafeReorder`. Throw configuration errors as configuration errors, rather
than reporting them as source diagnostics.

## 13. Cooperation with Other Rules

- Leave imports to `perfectionist/sort-imports`, including moving scattered
  imports to the top of a file.
- Disable `perfectionist/sort-modules` in `.vue` files where this rule owns
  top-level type/interface/function ordering.
- Disable `vue/define-macros-order` where this rule owns macro ordering.
- Keep correctness rules such as `vue/no-expose-after-await`,
  `vue/no-watch-after-await`, and `vue/no-lifecycle-after-await`.
- Leave object keys, parameters, and destructuring members to dedicated rules.
- Align whitespace preferences with padding rules and formatters. Default
  `ignore` values reduce competing fixes.

The following override assumes the corresponding plugins and parsers have
already been configured. Place it after related presets:

```js
{
  files: ['**/*.vue'],
  rules: {
    'perfectionist/sort-modules': 'off',
    'vue/define-macros-order': 'off',
    'vue-perfectionist/sort-script-setup': ['error', {
      type: 'unsorted',
      newlinesBetween: 'ignore',
      newlinesInside: 'ignore',
      fix: 'safe',
    }],
  },
}
```

## 14. Acceptance Matrix

This matrix records acceptance requirements rather than claiming that every
combination has a dedicated test. Executable cases live in
[the rule tests](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/sort-script-setup.test.ts).

| Area           | Required behavior                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Scope          | JS/TS setup, ordinary script skip, dual-script isolation, missing SFC services                   |
| Groups         | Defaults, partial/empty lists, merged arrays, explicit/omitted unknown                           |
| Macros         | Standalone/bound calls, withDefaults, props destructuring, multiple models, shadowing            |
| Call sources   | Import aliases, namespaces, foreign names, globals, dynamic callees                              |
| Custom groups  | First match, AND/OR, static sources, unreferenced groups, name conflicts                         |
| Comparators    | Five types, fallback, subgroup order, descending order, stable ties, Unicode                     |
| Settings       | Upstream/plugin/rule/group/custom priority and array replacement                                 |
| Whitespace     | Inside/between, absent groups, partition conflicts, comments, CRLF                               |
| Dependencies   | Initialization order, cross-group reads, immediate calls, captures, callbacks, cycles, overloads |
| Side effects   | Immediate effects, unknown watch options, composables, inject factories                          |
| Fix boundaries | Await, assignments, control flow, multiple declarators, disable/directive comments               |
| Safe cases     | Independent types/interfaces, primitive constants, ordinary functions, spacing                   |
| Stability      | Idempotent fixes, unchanged unsafe input, nonoverlapping fix ranges                              |
| Integration    | Parser and presets, import sorting coexistence, disabled overlapping rules, formatter stability  |

Implementation proceeds from option resolution and classification to grouping
and diagnostics, then dependency protection and conservative fixing, followed
by shared settings, presets, and documentation. Any expansion of movement
safety requires semantic regressions before broadening the allowed forms.

## Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-script-setup.ts)
- [Test source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/sort-script-setup.test.ts)
- [Plugin integration tests](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/eslint-plugin.test.ts)
