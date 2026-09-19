---
name: add-eslint-rule
description: Add ESLint rules to eslint-plugin-vue-perfectionist following project conventions for implementation, types, tests, and documentation, including plugin registration, public exports, and rule listings. Use when adding a rule or completing its delivery requirements in this repository.
---

# Add an ESLint Rule

Work from the repository root. Read the applicable `AGENTS.md` first, then inspect the current source. This skill records project conventions; when file structures or interfaces change, follow the actual code.

## 1. Define behavior and choose a reference

Establish the rule name, scope, defaults, options, diagnostic locations, and which problems can be fixed automatically. Choose the closest existing implementation and read its tests and documentation alongside it:

| Scenario                                         | Reference file                       | Focus                                                                      |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------- |
| Setup macros and whitespace changes              | `src/rules/define-macros-newline.ts` | Setup boundaries, macro binding identity, comment and newline preservation |
| API calls in JS/TS and Vue scripts               | `src/rules/callback-style.ts`        | Import sources, aliases, scopes, callback positions, and safe fixes        |
| Template and script checks with diagnostics only | `src/rules/prefer-ref-pattern.ts`    | Template visitors, parser service narrowing, and no automatic renaming     |
| Declaration sorting                              | `src/rules/sort-script-setup.ts`     | Partitions, dependencies, execution order, and safe fragments              |

Do not restrict every rule to `<script setup>` or automatically inherit sorting options. Users explicitly compose rules; the plugin does not provide built-in `configs`.

## 2. File checklist and naming

The examples use `example-rule` for the rule name, `exampleRule` for its export, and `ExampleRule` as the type prefix. Replace them with the actual names during implementation.

| Action                    | File                               | Content and format                                                                                                                             |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Add                       | `src/rules/example-rule.ts`        | Named export `exampleRule`, constructed with `createRule`                                                                                      |
| Add                       | `src/types/rules/example-rule.ts`  | `ExampleRuleOptions`, `ExampleRuleMessageId`, and related types; document option meanings and defaults with JSDoc                              |
| Add                       | `tests/rules/example-rule.test.ts` | Shared `run({ valid, invalid })` cases covering behavior, options, diagnostics, and fixes                                                      |
| Add                       | `docs/rules/example-rule.md`       | English rule documentation with `correct` / `incorrect` examples, usage, options, scope, and fix boundaries                                    |
| Update                    | `src/plugin.ts`                    | Import `exampleRule` and register `'example-rule': exampleRule` in `rules`                                                                     |
| Update                    | `src/types/index.ts`               | Add `export type * from './rules/example-rule.ts'`                                                                                             |
| Update for the public API | `src/index.ts`                     | Explicitly export options and related user configuration types in the existing `export type { ... }`; keep internal MessageId types private    |
| Update                    | `tests/eslint-plugin.test.ts`      | Add the name to the exact rule list in registration order; preserve assertions for matching default/named exports and the absence of `configs` |
| Update                    | `README.md`                        | Add a Rules table entry linking to `https://vue-perfectionist.vercel.app/rules/example-rule`                                                   |
| Update                    | `docs/rules/index.md`              | Add a rule table entry with a `./example-rule.md` relative link and a short description                                                        |
| Update                    | `docs/.vitepress/config/theme.ts`  | Add `{ link: '/rules/example-rule', text: 'example-rule' }` to the Rules sidebar                                                               |
| Update                    | `docs/guide/index.md`              | Update the rule enumeration and related text under Choosing Rules                                                                              |

Registration, plugin contract tests, rule tables, and the Rules sidebar currently use alphabetical rule order. Keep them consistent, with Overview first in the sidebar.

Add or update the following only when needed; do not create empty modules merely to fill out the structure:

- `src/constants/example-rule.ts`: Large or shared API tables, defaults, and similar constants. Use `UPPER_SNAKE_CASE`. Update `src/constants/index.ts` when importing through the barrel; direct imports do not require a re-export.
- `src/utils/example-rule.ts` or an existing utility file: Reusable AST, parsing, and option handling logic. Update `src/utils/index.ts` when importing through the barrel. The existing `src/constants/schema.ts` serves sorting options; keep unrelated schemas elsewhere.
- `tests/internal.ts`: Add helpers only when multiple tests need them. Prefer the existing `run`, `vueLanguageOptions`, and `$` helpers.
- `docs/.vitepress/config.ts`: Enable the new rule in the documentation's `eslintConfig` when its Vue examples need rendered diagnostics. Keep the existing `correct` / `incorrect` container renderer.
- `docs/design/example-rule.md`: Create this when complex semantics, sorting, or fix strategies need a discussion of tradeoffs, and register it in the Design sidebar.
- `docs/index.md` and documentation demos: Update only when homepage claims or interactive examples are affected. New rules do not require a demo.

Do not edit `dist/` manually. Adding a rule usually does not require changes to `src/meta.ts`, plugin host types, build entry points, dependencies, or the package version.

## 3. TypeScript and rule file format

Follow `.editorconfig`, `.oxfmtrc.jsonc`, and `eslint.config.mjs`: ESM, two-space indentation, LF, single quotes, no semicolons, trailing commas, an 80-column target, and a final newline. Use `.ts` extensions for relative source imports and `import type` for type dependencies. Use kebab-case filenames, camelCase variables and functions, and PascalCase types and interfaces. Keep code comments, diagnostics, test descriptions, and public documentation in English.

Rules with a single configuration object follow this structure. This is an outline; implement the actual checks in `create`:

```ts
import { createRule } from '../utils/create-rule.ts'
import type {
  ExampleRuleMessageId,
  ExampleRuleOptions,
} from '../types/index.ts'

export const exampleRule = createRule<
  [ExampleRuleOptions],
  ExampleRuleMessageId
>({
  name: 'example-rule',
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
      description: 'enforce the documented Vue convention.',
    },
    schema: [
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
    messages: {
      unexpectedExample: 'Expected "{{name}}" to follow the convention.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    // Implement the documented checks and return the relevant visitors.
    return {}
  },
})
```

- `name` is the rule name without a namespace; the user configuration key is `vue-perfectionist/example-rule`. `createRule` generates the documentation URL, so do not duplicate `meta.docs.url`.
- Choose `problem`, `suggestion`, or `layout` for `meta.type` according to the behavior. New rules normally use `recommended: false`; this field does not generate a recommended configuration.
- For rules with a configuration object, keep `defaultOptions` both in `meta` and at the rule's top level, following existing code. Implementation defaults, schema, types, and documentation must agree. Rules without options use an empty options tuple, `schema: []`, and corresponding empty defaults; do not invent configuration fields.
- Reject unknown fields at schema object levels. Set `enum`, `required`, `uniqueItems`, range constraints, and property `description` values as appropriate. Explain whether arrays replace or extend defaults and what an empty array means.
- Give the MessageId string union a type name prefixed by the rule name. Its camelCase string members must match `meta.messages` keys exactly. Report with `context.report({ node, messageId, data })`; template nodes may use the existing `loc` pattern.
- Use current APIs such as `context.sourceCode` and `sourceCode.getScope()`, avoiding legacy `context.getSourceCode()` or `context.getScope()`. Preserve the existing ESLint host type compatibility boundary in `src/plugin.ts` instead of duplicating casts in individual rules.

## 4. Scope and fix safety

- For setup-only rules, reuse `getSetupRange()`, check the full node range, and handle SFCs containing both ordinary and setup scripts. Skip safely when required parser services are unavailable.
- For template checks, follow `prefer-ref-pattern` for `defineTemplateBodyVisitor` and service type guards. Ordinary script visitors do not inspect template expressions.
- Prefer `getCallIdentity()` for API identification and use `unwrapExpression()` where needed. Distinguish named imports, aliases, namespaces, default imports, type-only imports, same-named local variables, and shadowed bindings. Macros and runtime APIs have different identity rules; do not guess from identifier text alone.
- Add `vueGlobals` / `vueImportSources` only when required. Global names must not override local bindings. Define whether optional calls, computed properties, dynamic expressions, and spread arguments are supported or skipped.
- Declare `meta.fixable` only when a safe fixer exists: use `'whitespace'` for whitespace-only changes and `'code'` for code changes. Omit it for rules that only report. Declare `hasSuggestions` only when suggestions are actually provided.
- When semantic preservation cannot be established, report without an automatic fix or an equally unsafe suggestion. Sorting must respect execution dependencies and side-effect boundaries. Do not mechanically convert functions that depend on `this`, `arguments`, or similar semantics, or rename one occurrence while breaking its references.
- Preserve comments, parentheses, separators, ASI semantics, and existing line endings. Change only the necessary ranges. Whitespace rules should leave unrelated formatting, such as indentation, to the formatter.

## 5. Test format and coverage

Use `eslint-vitest-rule-tester` through the shared `run` helper for all new rule behavior tests. Read `tests/internal.ts` and the closest current rule test before writing cases; do not create another `Linter` / `verify` / `verifyAndFix` harness for rule behavior.

- Table-driven rule cases: Import `run` from `../internal.ts` and call top-level `await run<ExampleRuleOptions, ExampleRuleMessageId>({ name, rule, valid, invalid })`. Its options generic and each case's `options` are the individual options object, unlike the tuple passed to `createRule`. Give nontrivial cases an English `description`; use local `sfc()` or `$` helpers for readable fixtures and `.map()` / `.flatMap()` for related cases.
- Invalid cases: Declare `errors` with message IDs or diagnostic objects; include `data` and locations when they are part of the behavior. Assert complete `output` for fixes. Set `output: null` for reports without fixes; also assert `fixed: false` and absent `message.fix` / suggestions when none are designed. An unchanged output alone does not prove that no fix was offered.
- Complex assertions: Use case-level `errors`, `output`, and `after` callbacks for diagnostic details, token and comment preservation, runtime semantics, and formatter compatibility. Use suite-level `onResult(testcase, result)` for shared invariants, as in `callback-style` and `define-macros-newline`. Keep the runner's recursive fix, fix-change, and post-fix checks enabled; do not disable them to make a failing case pass.
- Invalid configuration: Use `createRuleTester<unknown>` with Vitest's `it.each` and `await expect(tester.valid({ code, options })).rejects.toThrow()`. The `unknown` options type deliberately allows invalid inputs to reach schema and runtime validation.
- Plugin integration: Keep Vitest and ESLint's `Linter` for tests that exercise actual plugin registration and user-composed flat configs, such as `tests/eslint-plugin.test.ts`.

The shared `run` helper defaults to `Test.vue` and selects parsers by filename: `vueLanguageOptions` for `.vue`, the TS parser for `.ts` / `.tsx`, and ESLint's default JS parser for `.js`. Set `filename` for individual cases or `defaultFilenames: { js: 'test.ts' }` for a standalone TypeScript suite. In Vue SFCs, `vue-eslint-parser` is the outer parser and `@typescript-eslint/parser` parses scripts. Test JS SFC behavior with `languageOptions: { parserOptions: { parser: null } }`; merely removing `lang` from a TS fixture is insufficient. Reuse `vueLanguageOptions` when creating a standalone Vue rule tester. Flat config `files` patterns must match test filenames to avoid false passes caused by unmatched configuration.

Use this existing rule as a minimal shape, replacing its imports and fixtures with the new rule's actual behavior:

```ts
import { defineMacrosNewline } from '../../src/rules/define-macros-newline.ts'
import { run } from '../internal.ts'
import type {
  DefineMacrosNewlineMessageId,
  DefineMacrosNewlineOptions,
} from '../../src/types/index.ts'

await run<DefineMacrosNewlineOptions, DefineMacrosNewlineMessageId>({
  name: 'define-macros-newline',
  rule: defineMacrosNewline,
  valid: [{ code: '<script setup>defineExpose({\nopen\n})</script>' }],
  invalid: [
    {
      description: 'adds line breaks around an inline macro member',
      code: '<script setup>defineExpose({ open })</script>',
      options: { macros: ['defineExpose'] },
      errors: [
        { messageId: 'expectedNewlines', data: { name: 'defineExpose' } },
      ],
      output: '<script setup>defineExpose({\nopen\n})</script>',
    },
  ],
})
```

Cover the following behaviors where relevant:

1. Valid and invalid default input; assert diagnostic counts, `messageId`, interpolated values, and meaningful locations.
2. Every option, important combinations, defaults, and empty/null handling; use `createRuleTester<unknown>` to verify schema rejection of unknown options, invalid enum values, and invalid types.
3. Applicable JS / TS SFCs, dual scripts, templates, and standalone JS / TS files; assert no reports for cases outside the rule's scope.
4. Identification boundaries such as import sources, aliases, local shadowing, type-only imports, and syntax wrappers.
5. For fixable cases, assert the complete output. Keep the runner's recursive fix and post-fix checks enabled so output must stabilize and fixed code must parse without diagnostics. In plugin integration tests, a second `verifyAndFix` must return `fixed: false` with unchanged output.
6. For unsafe cases or rules that only report, assert that diagnostics exist, `message.fix` is absent, `fixed: false`, and output is unchanged. Also assert that suggestions are absent when none are designed.
7. For whitespace changes, cover comments, LF / CRLF, and subsequent formatter processing. For execution order or returned expression changes, add semantic regression coverage, referring to existing `node:vm` or Vue compiler tests as needed.

When changing shared AST or fix utilities, run the affected existing rule tests to protect other rules' safety boundaries.

## 6. Rule documentation format

Write `docs/rules/example-rule.md` in English. Use `docs/rules/sort-script-setup.md` as the reference for example presentation, and the closest rule page for scope-specific content. At the beginning of the file, enclose this frontmatter between two `---` lines:

```yaml
pageClass: rule-details
sidebarDepth: 0
title: vue-perfectionist/example-rule
description: A concise description of the actual rule behavior.
```

Follow the section order used by existing rules:

1. `# vue-perfectionist/example-rule`, followed by a blockquoted description. For fixable rules, add a `:wrench:` notice explaining the fix scope.
2. `## Usage`: Show flat config, plugin registration, and the full rule name. Match `files` to the actual supported scope. State that parser configuration is required or provide a complete configuration.
3. `## :book: Rule Details`: Use the existing `::: correct` / `::: incorrect` Markdown containers for accepted and reported examples, following the format below.
4. `## :wrench: Options`: Show default configuration and each option's type, default, and meaning. Give complex options their own subsections. State explicitly when there are no options.
5. `## Scope` and, when needed, `## Automatic fixes and formatting`: Explain checked, skipped, and report-only cases, including actual interactions with other rules or formatters.
6. `## :mag: Implementation`: Link to `src/rules/example-rule.ts` and `tests/rules/example-rule.test.ts` on GitHub's `main` branch using the repository base URL `https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/`.

Apply these example conventions throughout the page, including option, scope, and fix-boundary sections:

- Put accepted code in `::: correct` and code that produces diagnostics in `::: incorrect`. Split mixed positive and negative examples into separate containers. Use surrounding prose to state options and behavior; do not duplicate labels with `Valid` / `Invalid` headings, `// Valid` / `// Invalid` comments, or check/cross emoji.
- A diagnostic without an automatic fix still belongs in `incorrect`. Explain the fix boundary separately; a paired correct example must not imply an automatic conversion unless the rule actually provides one.
- Keep installation, flat config, option objects, group lists, and other reference snippets in ordinary code fences. A container describes rule input, not every code block on the page.
- Use language identifiers (`vue`, `ts`, `js`) matching the snippet. Show a complete SFC when script/template context is needed; explain the setup context for shortened macro examples. State non-default options before the examples and cover the same behavior in rule tests.

For example, this pair follows the default `sort-script-setup` behavior; adapt the code to the new rule:

````md
::: correct

```vue
<script setup>
const answer = 42
function run() {}
</script>
```

:::

::: incorrect

```vue
<script setup>
function run() {}
const answer = 42
</script>
```

:::
````

The containers are registered in `docs/.vitepress/config.ts` and rendered by `docs/.vitepress/components/CustomWrapper.vue`. Normally put the code fence first inside the container: the renderer adds `eslint-check` only to a directly following fence, so duplicating that metadata is unnecessary. The current ESLint transformer handles only `vue` fences and uses its configured rules/options; it does not infer options from page prose. A successful documentation build does not prove that every example has the intended diagnostics. Verify examples against rule tests and check rendered diagnostics where used.

Leave blank lines around container delimiters, Markdown tables, lists, and code blocks. Preserve formatting that intentionally triggers diagnostics. When needed, place `<!-- prettier-ignore -->` immediately before the affected fence inside the container, following `define-macros-newline.md`; this comment interrupts automatic `eslint-check` injection, so check any required rendered diagnostics explicitly. Verify that examples remain meaningful after formatting.

## 7. Final checks

Use the Node version selected by `.node-version` and the `packageManager` from `package.json`; do not hard-code versions that may become outdated in this skill. Under the current RTK convention, prefix shell commands with `rtk`, except `pnpm typecheck`. Use `rtk proxy` for commands that should run without filtering.

During implementation, run targeted checks with the actual rule filename:

```sh
rtk proxy pnpm exec vitest run tests/rules/example-rule.test.ts tests/eslint-plugin.test.ts
```

Before delivering a new rule, run the repository's required checks. If dependencies are missing, first run `rtk proxy pnpm install --frozen-lockfile`:

```sh
rtk proxy pnpm format:check
rtk proxy pnpm lint
pnpm typecheck
rtk proxy pnpm build
rtk proxy pnpm test
rtk proxy pnpm docs:build
rtk git diff --check
rtk git status --short
```

If formatting fails, format only files changed for the task, then check again. Avoid bulk fixes to unrelated files. Refer to `.github/workflows/ci.yml` for the current platform and Node matrix; passing locally does not mean the entire CI matrix has run.

- [ ] Rule names agree across filenames, `createRule.name`, registration, tests, documentation paths, and links.
- [ ] Implementation, types, public exports, plugin contract tests, all rule listings, and sidebar entries are synchronized.
- [ ] Option types, schema, defaults, behavior, tests, and documentation agree; no unintended public exports or built-in configurations were added.
- [ ] Rule behavior uses the shared typed `run({ valid, invalid })` format, with explicit diagnostics and fixed output or `output: null`; schema rejection uses `createRuleTester<unknown>`, and runtime `Linter` use is limited to integration tests.
- [ ] Positive and negative cases verify the actual scope; API identification does not mistake same-named local bindings for supported APIs.
- [ ] Safe fixes, report-only boundaries, fix idempotence, and necessary semantic regressions are verified.
- [ ] Rule examples use separate `correct` / `incorrect` containers without duplicate labels; configuration/reference snippets remain ordinary fences, and report-only examples explain their fix boundaries.
- [ ] Documentation examples match tested behavior under the stated options and retain their meaning after formatting; source links are correct, containers render, and the VitePress build passes. Check rendered diagnostics separately where used.
- [ ] Formatting, lint, type checking, build, and the full test suite pass. Clearly record any checks blocked by the environment and why.
- [ ] The diff contains only task-related changes, with no manually edited generated output or unintended dependency or version changes.

When delivering, briefly describe the rule's behavior, options, fix limitations, changed files, and validation results. Adding a rule does not include releasing a version or pushing changes.
