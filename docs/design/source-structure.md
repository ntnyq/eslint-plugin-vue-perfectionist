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

| Location                              | Responsibility                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/rules/`                          | Rule metadata, schemas, visitor composition, diagnostic selection, and reports                                                           |
| `src/utils/ast/`                      | Expression unwrapping, value-shape evidence, function binding names, traversal, and exact scope reference lookup                         |
| `src/utils/vue/`                      | Parser service guards, script ranges, merged SFC scopes, runtime imports, component identity, names, callbacks, refs, and macro types    |
| `src/utils/component-props/`          | Prop bindings, configuration, concrete scalar analysis, Boolean casting, and value constraints                                           |
| `src/utils/sort-script-setup/`        | Setup defaults, compiler macro classification, option resolution, and schema composition                                                 |
| `src/utils/sort-composable-body/`     | Function-body defaults, macro-free selector policy, options, and schema composition                                                      |
| `src/utils/sort-statements/`          | Shared statement classification, groups, comparisons, dependencies, indexed partitions, reports, schema fragments, and internal models   |
| `src/utils/sort-composable/`          | Shared schema, compiled options, cached member classification, AST analysis, and reporting for composable return and destructuring rules |
| `src/utils/injection-key.ts`          | Injection key recognition and TypeScript symbol provenance for strict mode                                                               |
| `src/utils/vue-generic.ts`            | Generic directive matching and configured component exemptions                                                                           |
| `src/utils/composable-options.ts`     | Composable parameter shape analysis                                                                                                      |
| `src/utils/template-interpolation.ts` | Conservative template interpolation conversion                                                                                           |
| `src/types/eslint.ts`                 | Shared readonly ESLint source access, independent of rule context generics                                                               |
| `src/types/rules/`                    | Rule configuration and diagnostic types; public configuration exports remain explicit in `src/index.ts`                                  |
| `src/constants/`                      | Remaining finite values and schemas; established sorting domains own their constants and schemas locally                                 |

Import internal utilities from their explicit file paths. There is no root utility
or constants barrel. Keep sorting's `Statement`, `Group`, and `ResolvedOptions`
models beside their consumers in `utils/sort-statements/types.ts`. Setup and
composable-body containers own their defaults and schema composition; the shared
engine receives resolved options and a container classification policy without
reading script ranges or importing rule contexts. Public configuration types
remain in `src/types/rules/`. Composable member sorting retains separate semantics.

Within statement sorting, `options.ts` resolves defaults and option interactions, `groups.ts`
validates and resolves groups and prepares statement matchers, and `validation.ts`
compiles regular expressions once per rule instance. ESLint owns structural option
validation through the public schema, including safe integer bounds for newline
counts. The internal checks retain semantic constraints such as group conflicts,
locales, patterns, option interactions, and explicit `undefined` properties that
schema validation treats as absent. Compiled regexes reset `lastIndex`
before every match so global and sticky flags remain deterministic.

Component identity lives in `utils/vue/component.ts`; name normalization lives in
`utils/vue/names.ts`. Component prop consumers share these Vue boundaries with
slot, generic, and model rules. Callback API positions live in
`constants/callback-apis.ts`, independently of `constants/callback-schema.ts`.

Composable sorting compiles groups and member patterns in its own `options.ts`.
The classifier caches local function resolution, return-member indexes, and
property kinds per rule instance. Direct and awaited consumers retain separate
async and thenable safety policies; unsupported return branches remain unknown.

Statement dependency analysis indexes lexical references and variables once per
file, then maps declarations within each partition. Comment ownership and
protected-line checks advance through ordered indexes instead of rescanning the
whole document for each statement. Performance tests count operations rather
than depending on wall-clock timing.

Shared value-shape evidence lives in `utils/ast/value-analysis.ts`. Its
`ExpressionValueVariant` union ties concrete scalars to their runtime categories.
Prop constraints add bounded scalar arithmetic in `component-props/static-value.ts`;
Boolean casting and prop merging remain component-specific. Interpolation uses
only shared shape evidence and retains its own conservative conversion policy.

`utils/vue/setup-macros.ts` shares direct setup-call discovery. Macro type rules
retain their existing permissive `withDefaults` arity policy; model-contract
consumers require exactly two arguments. Both preserve original AST identity.
`getFunctionBindingName()` reads declaration or wrapped initializer names;
consumers retain their execution-boundary and composable-selection policies.

`utils/watch-effect-alias.ts` plans callee/import edits and flush removal, or
returns an internal reason for withholding a fix. The rule owns matching and
diagnostics and applies only complete safe plans.

## Test ownership

Statement sorting tests are split by responsibility under
`tests/rules/sort-script-setup/` and `tests/rules/sort-composable-body/`. Composable member sorting tests live together in
`tests/rules/sort-composable/`: `return.test.ts`, `destructure.test.ts`, and
`types.test.ts` exercise their respective rule surfaces, while `policy-cases.ts`
provides shared behavior cases invoked by the return and destructuring suites.
Keep runners, builders, and reusable assertions in `tests/helpers/`; shared
behavior cases belong with their rule suites. The statement sorting runner also
checks that report-only cases expose no fix or suggestion.

`tests/rules/require-injection-key/` separates `syntax.test.ts` from type-aware
`strict.test.ts`. Shared macro type source samples live in
`tests/fixtures/macro-types.ts`.

Integration suites follow the contract under test:

| Suite                                                | Responsibility                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `eslint-plugin.test.ts`                              | Package exports, the rule inventory, and user-composed configuration                      |
| `rule-registration.test.ts`                          | Individual rules through an aliased public plugin                                         |
| `rule-composition.test.ts`                           | Combined diagnostics across rules                                                         |
| `sort-composable.test.ts`                            | Return/destructuring composition, evaluation order, and formatter stability               |
| `model-composition.test.ts`                          | Interactions between model rules through the public plugin                                |
| `model-name-casing.test.ts`                          | Model naming fix output checked against Vue compilers, runtimes, and TypeScript semantics |
| `model-compilation.test.ts`                          | Compiled model props and defineModel conversion compatibility                             |
| `template-refs.test.ts` and `vue-api-scopes.test.ts` | Ref rule composition, scope recognition, and shared auto-import settings                  |

Keep detailed diagnostics and fix expectations in rule suites. When a case also
asserts compiler output, runtime behavior, or TypeScript semantics, keep the
complete case and its assertions in the corresponding integration suite. These
cases can use the shared rule tester to preserve fix-stability checks.

`tests/package/package.test.mjs` runs separately with Node's test runner after
`pnpm build`, using `pnpm test:package`. It loads the package through its public
export map, executes a rule from the built runtime, and checks every public type
with NodeNext and Bundler resolution. Source suites and docs development do not
require a build. CI runs both source and built-package checks.

## Documentation implementation

Keep user content under `guide/`, `rules/`, and `design/`, with matching paths
under `zh/`. The site entry `docs/.vitepress/config.ts` composes
`config/example-rules.ts` for default example rule options and
`config/examples.ts` for example profiles, Markdown container validation, and
diagnostic rendering. `pnpm docs:typecheck` uses `docs/tsconfig.json` to check
TypeScript and Vue components separately from the package TypeScript check.
Rule metadata and generated README links share the canonical origin in
`src/constants/documentation.ts`. The inferred internal registry in `src/plugin.ts`
keeps rule names precise for the catalog; the public plugin retains its existing
ESLint host type and exports.
Sorting demo implementation and its tests remain
colocated under `docs/.vitepress/components/demos/sort-script-setup/`.

## Shared contracts

- `unwrapExpression()` accepts script and template AST nodes, retaining the
  script AST return type for script callers. It removes the existing TypeScript
  wrappers only; it does not unwrap optional chains or evaluate expressions.
- `getStaticStringValue()` reads string literals and expression-free template
  literals. It does not resolve bindings or evaluate concatenations.
- `isFunctionNode()` narrows the three runtime function node kinds without
  classifying their binding names as composables.
- `resolveComponentName()` returns the normalized component identity and keeps
  native tags, slot outlets, and v-pre content outside component analysis.
- `ExpressionValueAnalysis.hasUnknownVariants` records unresolved possibilities independently
  of known variants; an analysis can contain both.
- `isRuntimeNode()` excludes erased type branches while retaining the value
  expression inside TypeScript wrappers for template complexity checks.
- `hasGlobalWrite()` in `utils/vue/global-writes.ts` detects direct writes and
  property write targets through unshadowed global objects. Watch-effect alias
  fixes and passive model recognition share this analysis, while retaining
  their separate policies for `eval`.
- `hasTemplateVisitor()` narrows the Vue parser service and infers node types for
  template entry, exit, and wildcard visitors. The script visitor is optional.
- `findScopeReference()` finds the exact node's reference through enclosing
  scopes. Consumers retain responsibility for type and declaration filtering.
- `getCallIdentity()` exposes the call-site `localName`, the imported
  `exportedName`, and the sorting `classificationName`. Sorting keeps default
  imports' local classification names; export-based targets use
  `exportedName ?? classificationName`.
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
