# Repository Guidelines

## Project Structure & Module Organization

This package provides ESLint rules for consistent, readable, and maintainable Vue 3 code, covering callback styles, macro declaration layout, template ref naming, and statement ordering. Each rule defines its own scope: rules may target Vue SFC templates, script blocks, or standalone JavaScript and TypeScript files.

- `src/index.ts` and `src/plugin.ts` expose the plugin and its rules. The plugin does not provide built-in configurations; users compose their own.
- `src/rules/` contains flat rule entry files. `src/utils/ast/` holds parser-independent AST helpers and shared value-shape evidence, `src/utils/vue/` holds Vue parser and scope integration, component identity, and name normalization, and `src/utils/component-props/` holds component prop analysis.
- `src/utils/sort-script-setup/` owns statement sorting internals, including its constants, schema, internal models, group matching, option resolution, and validation. `src/utils/sort-composable/` owns composable option compilation, cached member analysis, reporting, and its shared schema. Public rule options stay in `src/types/rules/`; shared ESLint source types live in `src/types/eslint.ts`.
- Use explicit utility imports rather than a root barrel. Keep single-purpose helpers such as `composable-options.ts` and `template-interpolation.ts` at `src/utils/` until a real multi-file domain emerges. See `docs/design/source-structure.md` for ownership and behavior boundaries.
- `tests/rules/` contains rule behavior suites; large rules and closely related rules may use a dedicated subdirectory. `sort-composable/` keeps return, destructuring, type-aware tests, and shared policy cases together; `require-injection-key/` separates syntax and strict mode.
- `tests/integration/` contains plugin contracts, rule composition, and Vue compiler/runtime comparisons, organized by the behavior being verified. Keep `eslint-plugin.test.ts` focused on package exports and user-composed configuration; compiler, runtime, and type-semantic model checks belong in `model-name-casing.test.ts`.
- `tests/package/` checks built runtime and public declarations through the package export map with Node's test runner; run `pnpm build` before `pnpm test:package`. Vitest source suites remain build-independent.
- `tests/helpers/` owns shared runners, builders, and assertions; shared behavior cases stay with their rule suites. `tests/utils/` covers algorithm contracts, and `tests/fixtures/` holds compatibility environments and static samples, including macro type cases.
- `docs/rules/` documents public options; `docs/design/` records design decisions. VitePress configuration lives in `docs/.vitepress/`; keep example rule configuration separate from Markdown diagnostic rendering. Demo tests stay beside their implementation.
- `dist/` is generated build output; do not edit it directly.

## Build, Test, and Development Commands

Use the pnpm version pinned in `package.json` and the Node version selected by `.node-version`.

- `pnpm install --frozen-lockfile`: install workspace dependencies reproducibly.
- `pnpm build`: bundle the plugin and generate TypeScript declarations with tsdown.
- `pnpm dev`: rebuild the plugin on changes.
- `pnpm test`: run Vitest once; watch mode is disabled by configuration.
- `pnpm test:package`: check the built package runtime and public declarations after `pnpm build`.
- `pnpm typecheck`: check types without emitting files.
- `pnpm lint`: run ESLint.
- `pnpm format` / `pnpm format:check`: apply or verify Oxfmt formatting.
- `pnpm docs:dev` / `pnpm docs:build`: serve or build the documentation.
- `pnpm docs:typecheck`: check documentation TypeScript and Vue components with vue-tsc.
- `pnpm docs:sync` / `pnpm docs:check`: regenerate rule catalogs and summaries, or validate documentation contracts.

## Coding Style & Naming Conventions

Write TypeScript with ESM imports. Use two-space indentation, LF endings, single quotes, no semicolons, and trailing commas; Oxfmt targets an 80-column width. Follow `@ntnyq/eslint-config` through `eslint.config.mjs`.

Use kebab-case filenames such as `sort-script-setup.ts`, camelCase functions and variables, and PascalCase types and interfaces. Use `import type` for type-only dependencies. The Husky pre-commit hook runs nano-staged lint and formatting fixes.

## Testing Guidelines

Add tests in `tests/rules/<rule-name>.test.ts` using `eslint-vitest-rule-tester` through the shared `run` helper in `tests/helpers/rule-tester.ts`. Declare `valid` and `invalid` cases with explicit diagnostics and expected output; use `output: null` for reports without fixes. The runner checks recursive fix stability and verifies fixed code. Use `createRuleTester<unknown>` with Vitest for invalid option validation, and reserve ESLint's `Linter` for plugin integration tests. Cover option combinations and JavaScript and TypeScript SFC cases where relevant. No numeric coverage threshold is configured.

Target Vue `>=3.5.42 <4`. Model naming integration tests cover the pinned minimum in `tests/fixtures/vue-minimum/` and the current development dependency with matching compilers and runtimes. Keep the minimum fixture pinned during dependency updates.

Preserve program behavior in automatic fixes. For sorting rules, unsafe runtime reordering must report without autofixing; other rules must respect their own documented fix boundaries. Add regression cases for any changes to these safety boundaries.

## Rule Documentation Guidelines

Use the repository's [add-eslint-rule skill](.agents/skills/add-eslint-rule/SKILL.md) when adding rules, including its test format, documentation format, and final checklist. Keep English rule pages in `docs/rules/` and Simplified Chinese translations in `docs/zh/rules/` synchronized. Follow `docs/rules/sort-script-setup.md` for example presentation: accepted code belongs in `::: correct`, and reported code belongs in `::: incorrect`, including reports without fixes. Keep positive and negative examples separate, omit duplicate Valid / Invalid labels, and leave configuration/reference snippets in ordinary code fences. Match examples to tested behavior and preserve diagnostic-triggering formatting. The shared catalog in `docs/.vitepress/rules.ts` drives the sidebar and generated README, overview, scope-list, and rule-summary sections. Update it and run `pnpm docs:sync` rather than editing generated sections by hand. Non-default examples use named profiles in `docs/.vitepress/config/examples.ts`; formatter comments do not skip validation. Check container rendering and run `pnpm docs:check` and `pnpm docs:build` when rule documentation changes.

## Commit & Pull Request Guidelines

Use Conventional Commits with concise messages such as `fix: preserve watcher order`. When committing a new rule, use `feat: add <rule-name> rule`, where `<rule-name>` is the unprefixed kebab-case rule name, for example `feat: add require-composable-return-bindings rule`.

Keep pull requests focused. Describe the behavior change, link relevant issues, and report validation commands. Update rule documentation when options or behavior change. Before submitting, run formatting checks, lint, typecheck, build, and tests; CI tests Node 22, 24, and 26 on Linux, Windows, and macOS.
