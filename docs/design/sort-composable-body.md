---
description: Composable body sorting scope, Perfectionist-style options, and conservative fix contract.
---

# sort-composable-body Design

Status: implemented. See the [rule documentation](../rules/sort-composable-body.md)
for the available configuration and examples.

`vue-perfectionist/sort-composable-body` orders the direct statements inside a
named composable function. It follows [sort-script-setup](./sort-script-setup.md)
for grouping, comparison, dependencies, comments, and safe fixes, while giving
function selection and execution boundaries their own policy.

## 1. Decisions

- Keep `sort-script-setup` limited to SFC setup statements. Introduce a separate
  rule for composable bodies in JavaScript, TypeScript, and either SFC script.
- Use the same Perfectionist-style `groups`, `customGroups`, comparators,
  partitions, and spacing options. Default to `type: 'unsorted'` and ignored
  spacing, preserving source order within each group.
- Select functions using `functionPattern` and `ignoreNames`, matching the
  existing composable rules. A name match selects a convention, not proof that
  a function uses Vue or returns an object.
- Sort complete direct statements only. Keep parameters, return values,
  callback bodies, and nested control flow under their existing owners.
- Dependencies take precedence over group order. Classification never proves
  purity; runtime calls do not gain movement fixes.
- Exclude compiler macro selectors. There is no `return` selector, unsafe fix
  mode, purity annotation option, or option to disable dependency protection.

The compatibility baseline remains the subset recorded by `sort-script-setup`,
including its fixed upstream reference. Upstream
[group options](https://perfectionist.dev/rules/sort-modules#groups) inform the
configuration shape; they do not determine local defaults or fix permissions.

## 2. Function Selection and Scope

| Source or function form                                                                           | Behavior                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Plain JS/TS module or either SFC script block                                                     | Check eligible functions; Vue parser services are required only for SFCs             |
| `function useCounter() {}`                                                                        | Select by declaration binding name                                                   |
| `const useCounter = () => {}`                                                                     | Select by variable binding name                                                      |
| `const useCounter = function internal() {}`                                                       | Select `useCounter`, not `internal`                                                  |
| Exported declarations, including named default declarations                                       | Same binding-name policy; export is not required                                     |
| Transparent TypeScript wrappers around a function initializer                                     | Unwrap using `getFunctionBindingName()`                                              |
| Async function with a block body                                                                  | Check independent regions separated by execution-level `await`                       |
| Generator or async generator                                                                      | Skip the whole function                                                              |
| Expression-bodied arrow, anonymous default export, object/class method, callback, wrapper factory | Skip when there is no supported direct function binding with a block body            |
| Nested named composable                                                                           | Check its own direct body independently when its binding matches                     |
| Nonmatching function                                                                              | Do not sort its body; independently eligible nested composables may still be checked |

Reuse `getFunctionBindingName()` without inventing object property, assignment,
returned-function, or wrapper-factory name inference. For example,
`const useCounter = factory(() => {})` does not select the callback. Do not
require an object return, a Vue import, export status, or TypeScript services.

The default `functionPattern: '^use[A-Z]'` and exact `ignoreNames` exclusions
match existing composable rule options. `functionPattern` is a case-sensitive
regular expression source string, compiled once; invalid patterns are
configuration errors. It does not change how statements inside the function
are classified. The existing imported-call classifier still uses `^use[A-Z0-9]`;
changing that difference across rules is outside this proposal.

Each body is an independent sorting container. A nested function declaration
can be classified as a `function` statement in its parent, but its interior is
not another partition of the parent. Independently selected nested composables
may produce overlapping fixes; subsequent ESLint passes must converge.

## 3. Public Options

Accept one options object. Use ESLint `files` overrides for file-specific
preferences. The following is a proposed public type sketch; shared types retain
the exact `sort-script-setup` semantics.

```ts
export interface SortComposableBodyOptions extends CommonSortOptions {
  customGroups?: SortComposableBodyCustomGroup[]
  fix?: 'none' | 'safe'
  functionPattern?: string
  groups?: GroupEntry[]
  ignoreNames?: string[]
  vueGlobals?: string[]
  vueImportSources?: string[]
}

export type SortComposableBodySelector =
  | 'call'
  | 'class'
  | 'composable'
  | 'computed'
  | 'constant'
  | 'enum'
  | 'function'
  | 'inject'
  | 'interface'
  | 'lifecycle-hook'
  | 'provide'
  | 'reactive'
  | 'ref'
  | 'template-ref'
  | 'type'
  | 'variable'
  | 'watch'

export interface SortComposableBodyMatchCondition {
  callNamePattern?: RegexOption
  elementNamePattern?: RegexOption
  importSourcePattern?: RegexOption
  modifiers?: Modifier[]
  selector?: SortComposableBodySelector
}

export type SortComposableBodyCustomGroup = GroupOverrides & {
  groupName: string
} & (
    | (SortComposableBodyMatchCondition & { anyOf?: never })
    | { anyOf: SortComposableBodyMatchCondition[] }
  )

export type SortComposableBodyRuleOptions = [SortComposableBodyOptions]
```

| Options                                                  | Defaults and behavior                                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `functionPattern`, `ignoreNames`                         | `'^use[A-Z]'`, `[]`; select the owning function                                                                                                         |
| `groups`, `customGroups`                                 | Default groups below, `[]`; arrays replace defaults                                                                                                     |
| `type`, `order`, `fallbackSort`                          | `'unsorted'`, `'asc'`, `{ type: 'unsorted' }`; within-group comparison only                                                                             |
| `alphabet`, `ignoreCase`, `specialCharacters`, `locales` | `''`, `true`, `'keep'`, `'en-US'`                                                                                                                       |
| `partitionByComment`, `partitionByNewLine`               | `false`, `false`; same comment and blank-line partition policy as setup                                                                                 |
| `newlinesBetween`, `newlinesInside`                      | `'ignore'`, `'ignore'`; no default spacing enforcement                                                                                                  |
| `vueImportSources`                                       | `['vue']`; exact runtime import sources                                                                                                                 |
| `vueGlobals`                                             | Explicit names replace shared auto-import selection, including `[]` to disable it; otherwise use `settings['vue-perfectionist'].autoImport` as in setup |
| `fix`                                                    | `'safe'`; `'none'` disables movement and whitespace fixes                                                                                               |

Comparison types remain `alphabetical`, `natural`, `line-length`, `custom`, and
`unsorted`; fallback sorting also accepts `subgroup-order`. `line-length` uses
the existing complete-statement source size contract, excluding a terminal
semicolon, rather than binding-name length or indentation. This rule does not
inherit the return/destructuring rules' `name-length` comparison.

Keep the existing validation of duplicate/conflicting groups, modifier
combinations, locales, regex flags, custom alphabets, safe integer newline
counts, and spacing/partition conflicts. Reject unknown fields and macro group
selectors, including in custom conditions. Reject `typeInformation`,
`memberKinds`, `unknownMembers`, `usage`, `tsconfig`, callback dependency
opt-outs, and `useConfigurationIf`. No TypeScript type checker is required.

## 4. Groups and Classification

Default groups are the setup defaults with compiler macros removed:

```json
{
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
  ]
}
```

These are reading preferences inside each partition. For example, a composable
that immediately consumes a ref must retain that initialization dependency even
though `composable` precedes `ref` in the default groups.

Classification retains the setup contract for primitive `constant` bindings,
types, functions, Vue API families, runtime import aliases, namespace calls,
shadowing, and TypeScript wrappers. A stop-handle declaration initialized by
`watch` still belongs to `watch`. Destructuring is one statement, not multiple
sortable bindings. Arrow/function-valued variables belong to `function` but do
not acquire ordinary function declaration hoisting or movement permissions.

Disable macro recognition in this container. An unbound `defineProps(...)` is
an ordinary `call` or `variable` candidate, never a compiler macro. The rule
does not validate whether such code is legal. `onScopeDispose` and other APIs
outside the existing Vue table are not silently added to `lifecycle-hook`;
users may classify their calls using custom groups.

- `groups` order controls group priority; `order: 'desc'` affects only the
  comparator inside a group.
- `['ref', 'reactive']` merges two categories at equal priority. Use separate
  entries to require refs before reactive objects.
- Group objects override `type`, `order`, `fallbackSort`, and `newlinesInside`;
  `{ newlinesBetween }` entries control separators.
- Custom groups precede built-in matching; the first matching custom definition
  wins. Filters in a condition are ANDed; `anyOf` ORs conditions. Custom groups
  must be referenced in `groups`.
- Patterns accept strings, `{ pattern, flags? }`, or arrays meaning OR.
  Name comparison's `ignoreCase` does not affect regex matching. Preserve the
  existing first-binding sort key and any-binding destructuring match policy.
- `callNamePattern` matches the direct call's normalized import identity;
  `importSourcePattern` requires a resolved runtime import source. Neither
  searches arbitrary calls in a callback. Local calls have no inferred import
  source. Named import aliases use exported names; default imports use local names.
- Standalone custom-group overrides win over a group object's overrides;
  custom overrides inside a merged array do not create per-member comparators.
- Omitted categories become fixed partition boundaries. `unknown` explicitly
  includes otherwise ungrouped supported candidates; it preserves internal order
  unless its group object sets `type`. It never enables unsupported statements.
- `groups: []` disables ordering and whitespace reports for this rule.

Example configuration:

```js
export default {
  rules: {
    'vue-perfectionist/sort-composable-body': [
      'error',
      {
        functionPattern: '^use[A-Z]',
        ignoreNames: ['useLegacyCounter'],
        type: 'unsorted',
        groups: [
          ['interface', 'type'],
          'constant',
          'inject',
          'router',
          'stores',
          'composable',
          'template-ref',
          ['ref', 'reactive'],
          'computed',
          'variable',
          ['enum', 'class'],
          { group: 'function', type: 'natural' },
          'watch',
          'lifecycle-hook',
          'provide',
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
        ],
        newlinesBetween: 1,
        fix: 'safe',
      },
    ],
  },
}
```

## 5. Execution Boundaries and Dependencies

Collect only `fn.body.body`. Every partition stays inside its owning function
and original execution region.

Fixed boundaries include returns and throws, control flow, explicit blocks,
assignments and updates, directive prologues, multi-declarator statements,
`using` declarations, ambient/merging declarations, and unsupported syntax.
Preserve overload signatures with their implementation. An execution-level
`await` (including in an initializer or `for await`) fixes the containing
statement and separates the statements on either side. An `await` inside a
nested function does not partition its parent's body.

A direct `return` is a boundary, not an item to push to the end. An early
`if (...) return ...` makes the entire `if` a boundary. Statements after a
return may form their own unreachable partition but never move before it.
Do not inspect or rewrite the return argument's members here.

Resolve dependencies by lexical variable identity, not spelling. Parameters,
destructured parameters, the function's self binding, and outer bindings are
external inputs, not sortable statements. Their default expressions and
initialization order remain untouched. Direct `var` redeclarations of parameters
are fixed boundaries because their initializers overwrite existing inputs.
Parameters shadow imports normally, so
`function useThing(ref) { const value = ref(0) }` does not classify that call as
Vue `ref`.

Within each partition, retain the existing distinction between immediate reads
and deferred captures. Follow directly invoked local functions, IIFEs, watch
source getters, immediate watch callbacks, synchronous watch effects, and
`customRef` factories using resolved Vue identity. Deferred callbacks remain
deferred under the existing setup policy; unresolved callback options retain
potential immediate dependencies conservatively.

Compute a stable dependency-respecting order, then apply style only among
available statements. Preserve cyclic leftovers in source order. A group
preference blocked by initialization dependencies is not itself an ordering
violation. Do not repair pre-existing temporal dead zone or cross-partition
initialization errors, infer whole-program effects, or move across a boundary
to satisfy a dependency.

## 6. Fixes and Diagnostics

Movement fixes require a contiguous replacement containing only proven-safe,
independent type/interface declarations, primitive constant declarations, and
ordinary function declarations. Keep setup's protections for comments,
directives, merging, automatic semicolon insertion, and source separators.
Do not expand fix permissions for function-valued variables, destructuring,
runtime calls, property reads, classes, or enums.

For example, with `groups: ['constant', 'function']`, moving `const step = 1`
before an independent `function reset() {}` can be fixed. In contrast, placing
an imported Vue `ref(0)` before a preceding lifecycle registration may report
an ordering violation, but the requested movement has no fix or suggestion.

Whitespace fixes affect safe gaps between adjacent classified statements only.
Preserve body indentation, line endings, attached comments, and all statement
interiors. Keep comments on the body opening-brace line fixed. Never change
function braces, directive prologues, parameters, or
padding around boundaries such as `return`. Retain the 65,536-character limit
per whitespace replacement. Do not add spacing reports for pairs already
covered by an ordering report in the same pass.

Reuse the setup diagnostic IDs and selection contract:

| Message ID                  | Condition                                                    |
| --------------------------- | ------------------------------------------------------------ |
| `unexpectedGroupOrder`      | Dependency-respecting group movement is proven safe          |
| `unexpectedOrder`           | Dependency-respecting within-group movement is proven safe   |
| `unsafeReorder`             | Desired movement cannot be proven safe; no fix or suggestion |
| `unexpectedNewlinesBetween` | Incorrect configured spacing between groups                  |
| `unexpectedNewlinesInside`  | Incorrect configured spacing inside a group                  |

`fix: 'none'` keeps these diagnostics and disables all automatic edits; it does
not make otherwise safe movements use `unsafeReorder`.

## 7. Implementation Ownership

The implementation keeps container policy separate from the shared statement engine.

- Add `src/rules/sort-composable-body.ts` for metadata, function visitors,
  selection, and container collection. Set `meta.docs.recommended: false` and
  `meta.fixable: 'code'`; rules remain user-composed with no built-in config.
- Add `src/types/rules/sort-composable-body.ts` for public options and diagnostic
  types, with explicit exports through the existing package entry points.
- Extract the genuinely shared statement engine from
  `src/utils/sort-script-setup/` into `src/utils/sort-statements/`: group matching,
  comparison, dependency indexing, partitions, comments, reporting, and shared
  option schema fragments. Accept parser-supported direct statements rather
  than requiring `ProgramStatement` or an SFC range.
- Keep setup-specific defaults, macro classification, SFC range collection, and
  schema composition with `sort-script-setup`. Keep function selection,
  macro-free selectors/defaults, and schema composition with
  `src/utils/sort-composable-body/`.
- The shared module receives resolved options and a classification policy;
  it must not import either rule's context or obtain setup ranges internally.
  Build lexical-reference and comment indexes once per file, sharing them
  across body containers without mixing declaration maps between partitions.
- Preserve existing public setup types and behavior during extraction. Do not
  widen its selectors or function scope. Keep the member analysis in
  `src/utils/sort-composable/` separate: it sorts public object members, with
  different evidence and fix permissions.

Implement in reviewable steps: extract without behavior changes, add body
selection and classification, connect reporting/fixes, then complete package
registration, documentation, and rule composition coverage.

## 8. Acceptance and Delivery

These are required implementation tests, not claims of current coverage.
Use shared rule runners and explicit diagnostics/output, with `output: null`
and no suggestions for unsafe movement.

| Area           | Required cases                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection      | JS/TS, both SFC scripts, named exports/defaults, functions/arrows/expressions, TS wrappers, async, custom pattern, exact ignores, negative forms, generators                    |
| Containment    | Ordinary nested helpers, independently selected nested composables, callbacks, control flow, early/multiple returns, throws, unreachable regions                                |
| Identity       | Named aliases, namespaces, wrappers, type-only imports, local/parameter shadowing, dual-script SFCs, shared auto-import settings and explicit overrides                         |
| Classification | Every supported selector/modifier, no macro selectors, local/imported calls, stop handles, primitive versus runtime initializers, destructuring, multi-declarators              |
| Options        | Merged groups, overrides, `anyOf`, regex arrays/flags, stable ties, fallback comparators, unknown/omitted/empty groups, invalid fields and semantic conflicts                   |
| Dependencies   | Parameters/defaults, self/outer bindings, same-spelled shadowed bindings, immediate reads, deferred closures, local calls/IIFEs, sync Vue callbacks, unresolved options, cycles |
| Safety         | `return`/throw/await partitions, nested await, directives/overloads/merging, comments, ASI, LF/CRLF, indentation, report-only runtime calls, `fix: 'none'`                      |
| Convergence    | Recursive fix stability, nested overlapping fixes, formatter stability, no edits to return members or caller destructuring                                                      |
| Composition    | Enable with `sort-script-setup`, `sort-composable-return`, and `sort-composable-destructure`; each retains its own ranges and fix contract                                      |
| Performance    | Index scopes/comments once per file; count operations across many composables and nested functions rather than relying on timing                                                |
| Package        | Rule registration, public runtime exports, option declarations via NodeNext and Bundler resolution                                                                              |

At implementation time, follow the repository's add-rule workflow: register the
rule and public types, add bilingual rule pages and tested examples, update the
shared catalog, and run `pnpm docs:sync`. Validate formatting, lint, type checks,
source tests, package build/tests, and documentation checks/build.

The rule is registered in the shared catalog with bilingual pages and generated rule lists.
