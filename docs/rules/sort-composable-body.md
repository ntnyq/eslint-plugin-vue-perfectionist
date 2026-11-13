---
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/sort-composable-body
description: Enforce configurable grouping and ordering of direct statements in named composable functions.
---

# vue-perfectionist/sort-composable-body

> Enforce configurable grouping and ordering of direct statements in named composable functions.

<!-- summary:start -->

::: info At a glance

| Concern          | Behavior                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| Scope            | Vue scripts and standalone JS/TS files                                                |
| Defaults         | Select ^use[A-Z] bindings; preserve within-group order; apply proven-safe fixes only. |
| Required options | None; enabling the rule uses its defaults.                                            |
| Automatic fixes  | Supported cases                                                                       |
| Type information | No TypeScript type services required.                                                 |

:::

<!-- summary:end -->

- :wrench: ESLint's `--fix` applies proven-safe statement moves and configured whitespace changes. Runtime-sensitive moves are reported without fixes or suggestions.

## Usage

Enable the rule for JavaScript, TypeScript, and Vue scripts. Configure
`@typescript-eslint/parser` for TypeScript and `vue-eslint-parser` for SFCs:

```js
import tsParser from '@typescript-eslint/parser'
import vuePerfectionist from 'eslint-plugin-vue-perfectionist'
import vueParser from 'vue-eslint-parser'

export default [
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: { parser: tsParser },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/sort-composable-body': 'error' },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser },
    },
    plugins: { 'vue-perfectionist': vuePerfectionist },
    rules: { 'vue-perfectionist/sort-composable-body': 'error' },
  },
]
```

For JavaScript-only modules, ESLint's default parser is sufficient. No
TypeScript type services are required. Use ESLint `files` overrides for
file-specific preferences.

## :book: Rule Details

The rule checks complete direct statements in functions whose binding names
match `^use[A-Z]`. It enforces group order, preserving source order inside each
group by default. Initialization dependencies take precedence over style.

::: correct

```ts
function useCounter() {
  const step = 1
  function reset() {}
  return { reset, step }
}
```

:::

::: incorrect

```ts
function useCounter() {
  function reset() {}
  const step = 1
  return { reset, step }
}
```

:::

The independent primitive constant and ordinary function declaration above can
be reordered safely. Runtime calls retain stricter permissions. The following
incorrect example reports `unsafeReorder` and offers no automatic movement:

::: correct

```ts
import { onMounted, ref } from 'vue'

function useCounter() {
  const count = ref(0)
  onMounted(() => {})
  return { count }
}
```

:::

::: incorrect

```ts
import { onMounted, ref } from 'vue'

function useCounter() {
  onMounted(() => {})
  const count = ref(0)
  return { count }
}
```

:::

## :wrench: Options

Accepts one options object. Defaults:

```json
{
  "functionPattern": "^use[A-Z]",
  "ignoreNames": [],
  "groups": [
    ["interface", "type"],
    "constant",
    "inject",
    "composable",
    "template-ref",
    ["ref", "reactive"],
    "computed",
    "variable",
    ["enum", "class"],
    "function",
    "watch",
    "lifecycle-hook",
    "provide"
  ],
  "customGroups": [],
  "type": "unsorted",
  "order": "asc",
  "fallbackSort": { "type": "unsorted" },
  "alphabet": "",
  "ignoreCase": true,
  "specialCharacters": "keep",
  "locales": "en-US",
  "partitionByComment": false,
  "partitionByNewLine": false,
  "newlinesBetween": "ignore",
  "newlinesInside": "ignore",
  "vueImportSources": ["vue"],
  "fix": "safe"
}
```

| Option               | Type and behavior                                                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `functionPattern`    | Case-sensitive regular expression source string, compiled once; invalid expressions are configuration errors. Matches the function's binding name.                                                        |
| `ignoreNames`        | Exact binding names to exclude; replaces the default empty list.                                                                                                                                          |
| `groups`             | Group entries replacing the defaults. Arrays merge selectors at equal priority; objects can override comparison and internal spacing. `[]` disables all reports.                                          |
| `customGroups`       | Named custom groups replacing the default empty list. First matching definition wins; every name must appear in `groups`.                                                                                 |
| `type`               | `alphabetical`, `natural`, `line-length`, `custom`, or `unsorted`. Affects within-group order only.                                                                                                       |
| `order`              | `asc` or `desc`; does not reverse group priorities.                                                                                                                                                       |
| `fallbackSort`       | `{ type, order? }`; accepts comparison types above plus `subgroup-order`. Ignored when the primary type is `unsorted`.                                                                                    |
| `alphabet`           | Character order for custom sorting; required and nonempty when custom comparison is active. Duplicate characters are rejected.                                                                            |
| `ignoreCase`         | Case folding for name comparison; does not affect regular expressions.                                                                                                                                    |
| `specialCharacters`  | `keep`, `trim`, or `remove`; name normalization before comparison.                                                                                                                                        |
| `locales`            | Locale string or nonempty array for name comparison.                                                                                                                                                      |
| `partitionByComment` | Boolean, regex option, or `{ line?, block? }`; matching leading comments start partitions.                                                                                                                |
| `partitionByNewLine` | Boolean; blank lines start partitions. Cannot be combined with numeric spacing policies.                                                                                                                  |
| `newlinesBetween`    | `ignore` or a nonnegative safe integer empty-line count between groups.                                                                                                                                   |
| `newlinesInside`     | Same, plus `newlinesBetween`, which requires zero internal empty lines when between-group spacing is numeric.                                                                                             |
| `vueImportSources`   | Exact runtime import sources; replaces `['vue']`.                                                                                                                                                         |
| `vueGlobals`         | Explicit recognized Vue API names, overriding shared `settings['vue-perfectionist'].autoImport`; `[]` disables globals. Without an override, shared settings apply. Local bindings always shadow globals. |
| `fix`                | `safe` or `none`; `none` disables movement and whitespace fixes while preserving diagnostic selection.                                                                                                    |

Group overrides, regex descriptors and arrays, modifier specificity, partition
comments, newline separators, and comparison details follow
[sort-script-setup](./sort-script-setup.md#options). `line-length` compares the
complete statement's source size excluding a terminal semicolon, including its
interior text. It does not compare binding-name lengths.

### Selectors and custom groups

Supported selectors are `call`, `class`, `composable`, `computed`, `constant`,
`enum`, `function`, `inject`, `interface`, `lifecycle-hook`, `provide`, `reactive`,
`ref`, `template-ref`, `type`, `variable`, and `watch`. Modifiers are `async`,
`const`, `declare`, `destructured`, `let`, and `var`, with the same valid
combinations as setup sorting. Ambient declarations are fixed boundaries.
Compiler macro selectors are rejected. An unbound `defineProps()` call is an
ordinary call or variable initializer inside a function.

Custom conditions accept `selector`, `modifiers`, `elementNamePattern`,
`callNamePattern`, and `importSourcePattern`. Conditions are ANDed; `anyOf`
combines conditions with OR. Patterns accept strings, `{ pattern, flags? }`, or
arrays meaning OR. Destructuring matches any binding name but sorts by the
first binding, and always moves as one statement.

`callNamePattern` uses a direct call's resolved import identity: named aliases
use the export name, default imports use the local name. Import-source filters
require a runtime import; they do not infer sources for local calls or search
inside callbacks. Non-computed namespace calls and transparent TypeScript
wrappers are supported; computed and optional calls do not gain Vue identity.

For example, configure a router group with:

```js
export default {
  rules: {
    'vue-perfectionist/sort-composable-body': [
      'error',
      {
        groups: ['constant', 'router', 'composable', 'ref', 'function'],
        customGroups: [
          {
            groupName: 'router',
            callNamePattern: '^useRouter$',
            importSourcePattern: '^vue-router$',
          },
        ],
      },
    ],
  },
}
```

Standalone custom-group overrides win over group-object overrides. Overrides
inside a merged group do not create separate per-member comparators. Omitted
categories become boundaries; `unknown` includes otherwise ungrouped supported
statements, preserving internal order unless its group object overrides `type`.
It does not make unsupported statements sortable. Vue API recognition is shared
with setup sorting; APIs such as `onScopeDispose` need a custom group when they
are absent from that table. Classification never proves purity.

## Scope

Checks block-bodied function declarations, arrows, and function expressions
bound directly to a variable. Exports are optional; named default declarations
are supported. A variable binding wins over a function expression's internal
name. Transparent TypeScript initializer wrappers are unwrapped.

Skips generators, async generators, expression-bodied arrows, anonymous default
exports, object/class methods, callbacks, assignments, returned functions, and
wrapper-factory callbacks without a supported direct binding. A name match does
not require Vue imports, an object return, or an export.

Each selected nested composable is checked independently. Ordinary helpers,
callbacks, and nested control-flow bodies are not partitions of their parent.
Only `fn.body.body` is sorted; parameters, return members, and caller
destructuring remain under their existing rules.

Direct `return`, `throw`, control flow, explicit blocks, assignments, updates,
directive prologues, multi-declarator statements, `using`, overloads, merging,
and unsupported statements form fixed boundaries. Execution-level `await`
fixes its containing statement and separates surrounding regions, including in
initializers and awaited loops. Nested-function awaits do not split the parent.
Unreachable statements after a return can form a separate partition.

Dependencies use lexical variable identity. Parameters, self bindings, and
outer variables are external inputs. A direct `var` declaration that redeclares
a parameter is a fixed boundary: its initializer overwrites an existing input.
Immediate local calls, IIFEs, watch source
getters, immediate watch callbacks, synchronous effects, and `customRef`
factories retain initialization dependencies. Deferred captures retain the
setup policy; unresolved callback options are conservative. Cyclic leftovers
keep source order. The rule does not offer repairs for existing initialization
errors or move dependencies across partitions.

## Automatic fixes and formatting

Movement requires a contiguous replacement containing only independent type or
interface declarations, primitive constants, and ordinary function declarations.
Function-valued variables, destructuring, runtime calls, property reads,
classes, and enums do not gain movement fixes. Comments, directives, ambiguous
separators, and automatic semicolon insertion can prevent an otherwise safe fix.
Comments on the function body opening-brace line remain fixed; documentation
attached to a declaration can move with that declaration.

Whitespace fixes only affect gaps between adjacent classified statements.
They preserve indentation, line endings, attached comments, and statement
interiors; they do not pad braces or return boundaries. Each whitespace
replacement is limited to 65,536 characters. Ordering diagnostics suppress
spacing diagnostics for affected pairs in the same pass.

Oxfmt can collapse multiple empty lines. Prefer counts of zero or one when
combining automatic spacing with formatting, or use `fix: 'none'` for a
report-only policy. Nested fixes and fixes from other rules converge over
subsequent ESLint passes.

Use with [sort-script-setup](./sort-script-setup.md),
[sort-composable-return](./sort-composable-return.md), and
[sort-composable-destructure](./sort-composable-destructure.md) to configure the
outer script, body statements, public return members, and consumer destructuring
independently. The rule provides no unsafe fix mode or dependency opt-out.
`typeInformation`, `memberKinds`, `unknownMembers`, `usage`, `tsconfig`, and
`useConfigurationIf` are not supported options.

## :mag: Implementation

- [Rule source](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/src/rules/sort-composable-body.ts)
- [Rule tests](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/tests/rules/sort-composable-body/selection.test.ts)
- [Design](../design/sort-composable-body.md)
