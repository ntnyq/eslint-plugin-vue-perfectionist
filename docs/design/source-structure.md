---
description: Repository layout, source ownership, shared analysis contracts, and behavior boundaries.
---

# Source Structure

The plugin keeps rule entry files flat and groups analysis by its narrowest owner.
Public configuration types are exported explicitly; internal analysis stays with
its consumers.

## Repository Layout

| Location                            | Responsibility                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `src/index.ts`                      | Default and named plugin exports and public configuration types.                 |
| `src/plugin.ts` and `src/meta.ts`   | Rule registration and metadata derived from `package.json`.                      |
| `src/`                              | Rule implementations, configuration types, constants, and analysis utilities.    |
| `tests/rules/`                      | Rule behavior, options, diagnostics, and fix regression suites.                  |
| `tests/integration/`                | Plugin contracts, rule composition, and Vue compiler/runtime comparisons.        |
| `tests/helpers/`                    | Shared rule tester, SFC builders, and common sorting safety assertions.          |
| `tests/utils/`                      | Focused algorithm contracts and performance regression checks.                   |
| `tests/fixtures/`                   | Version compatibility environments and static samples.                           |
| `docs/guide/` and `docs/rules/`     | Consumer setup, configuration, contributor workflows, and public rule reference. |
| `docs/design/`                      | Source ownership and detailed rule design contracts.                             |
| `docs/.vitepress/`                  | Site configuration, navigation, theme, diagnostic rendering, and sorting demo.   |
| `patches/`                          | Documentation dependency patches and compatibility notes.                        |
| `.github/workflows/`                | CI, autofix, and tag-triggered release workflows.                                |
| `dist/` and `docs/.vitepress/dist/` | Generated package and documentation output.                                      |

The root package is published; `docs/` is a private pnpm workspace. See
[Contributing](/guide/contributing) for commands and
[the package contract](/design/#package-contract) for supported entry points.

## Ownership

| Location                              | Responsibility                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/rules/`                          | Rule metadata, schemas, visitor composition, diagnostic selection, and reports                             |
| `src/utils/ast/`                      | Expression unwrapping, static strings, traversal, bindings, and exact scope reference lookup               |
| `src/utils/vue/`                      | Parser service guards, script ranges, merged SFC scopes, runtime imports, callbacks, refs, and macro types |
| `src/utils/component-props/`          | Component matching, bindings, configuration, conservative values, Boolean casting, and value constraints   |
| `src/utils/sort-script-setup/`        | Statement classification, grouping, comparisons, dependencies, partitions, reports, and internal models    |
| `src/utils/composable-options.ts`     | Composable parameter shape analysis                                                                        |
| `src/utils/template-interpolation.ts` | Conservative template interpolation conversion                                                             |
| `src/types/eslint.ts`                 | Shared readonly ESLint source access, independent of rule context generics                                 |
| `src/types/rules/`                    | Rule configuration and diagnostic types; public configuration exports remain explicit in `src/index.ts`    |
| `src/constants/`                      | Finite values and schemas, with sorting options in `sort-script-setup-schema.ts`                           |

Import internal utilities from their explicit file paths. There is no root utility
or constants barrel. Keep sorting's `Statement`, `Group`, and `ResolvedOptions`
models beside their consumers in `utils/sort-script-setup/types.ts`.

Within sorting, `options.ts` resolves defaults and option interactions, `groups.ts`
validates and resolves groups and prepares statement matchers, and `validation.ts`
compiles regular expressions once per rule instance. ESLint owns structural option
validation through the public schema, including safe integer bounds for newline
counts. The internal checks retain semantic constraints such as group conflicts,
locales, patterns, option interactions, and explicit `undefined` properties that
schema validation treats as absent. Compiled regexes reset `lastIndex`
before every match so global and sticky flags remain deterministic.

Sorting tests are split by responsibility under `tests/rules/sort-script-setup/`.
Keep detailed diagnostics and fixes in rule suites; use integration suites for
plugin registration, shared settings, compiler compatibility, and rule interactions.
The shared sorting runner also checks that report-only cases expose no fix or
suggestion.

## Shared contracts

- `unwrapExpression()` accepts script and template AST nodes, retaining the
  script AST return type for script callers. It removes the existing TypeScript
  wrappers only; it does not unwrap optional chains or evaluate expressions.
- `getStaticStringValue()` reads string literals and expression-free template
  literals. It does not resolve bindings or evaluate concatenations.
- `hasTemplateVisitor()` narrows the Vue parser service and infers node types for
  template entry, exit, and wildcard visitors. The script visitor is optional.
- `findScopeReference()` finds the exact node's reference through enclosing
  scopes. Consumers retain responsibility for type and declaration filtering.
- `getCallIdentity()` exposes the call-site `localName`, the imported
  `exportedName`, and the existing classification `name`. Sorting keeps default
  imports' local classification names; export-based targets use
  `exportedName ?? name`.
- `getRuntimeImportBinding()` handles runtime import metadata. Call identity
  and ref recognition share this import analysis but keep separate syntax
  policies: call identity excludes optional and computed calls; ref recognition
  retains its existing support for static computed members. Surrounding rule
  visitors continue to decide whether optional-chain expressions are eligible.
- `analyzePropTypes()` applies configured Boolean casting and returns actual and
  disallowed types. The rule chooses diagnostics using those results and the
  original value's uncertainty.

## Behavior boundaries

The runtime `getScriptVariableDefinitions()` policy preserves setup-local
shadowing, imports hoisted from either script, and type-only bindings. The
`filterScriptDefinitions()` policy used by composable analysis remains separate:
sharing range containment does not make those definition filters interchangeable.

Keep event-handler classification, simple-expression options, and Boolean return
inference with their current rule owners. Do not expand the conservative prop and
interpolation analysis into a general static evaluator. Promote sorting code to a
shared sorting module only when another rule has a real matching contract.

The rule suites and `tests/integration/vue-api-scopes.test.ts` cover dual scripts, shadowing,
default imports, type-only imports, composed rule matching, and fix stability.
`tests/integration/macro-types-integration.test.ts` protects macro composition. Run formatting,
lint, type checking, tests, package build, and documentation build after changes
that cross these ownership boundaries.
