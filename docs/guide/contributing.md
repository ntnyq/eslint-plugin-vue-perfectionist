---
description: Develop rules, run repository checks, and maintain the documentation site.
---

# Contributing

This repository contains the published ESLint plugin and a private VitePress
workspace in `docs/`. Read the repository's
[guidelines](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/AGENTS.md)
and [source structure](/design/source-structure) before changing implementation.

## Local Setup

Use the Node version selected by `.node-version` and the pnpm version pinned in
`package.json`'s `packageManager` field. From the repository root:

```shell
git clone https://github.com/ntnyq/eslint-plugin-vue-perfectionist.git
cd eslint-plugin-vue-perfectionist
pnpm install --frozen-lockfile
```

The workspace installs documentation dependencies too. No package build is
needed before running tests or serving the docs: both consume source files.

## Development Commands

Run these commands from the repository root:

| Command                                                   | Purpose                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                                                | Rebuild the plugin when source files change.                            |
| `pnpm build`                                              | Bundle the package and generate TypeScript declarations with tsdown.    |
| `pnpm test`                                               | Run Vitest once; watch mode is disabled in configuration.               |
| `pnpm exec vitest run tests/rules/callback-style.test.ts` | Run a focused rule suite.                                               |
| `pnpm typecheck`                                          | Check TypeScript without emitting files.                                |
| `pnpm lint`                                               | Run ESLint.                                                             |
| `pnpm format`                                             | Apply Oxfmt formatting.                                                 |
| `pnpm format:check`                                       | Check formatting.                                                       |
| `pnpm docs:dev`                                           | Serve the VitePress site locally.                                       |
| `pnpm docs:build`                                         | Build the documentation and check page links.                           |
| `pnpm docs:sync`                                          | Regenerate rule catalogs and rule-page summaries.                       |
| `pnpm docs:check`                                         | Check bilingual coverage, catalogs, example diagnostics, and rendering. |

`dist/` and `docs/.vitepress/dist/` are generated output. Edit their sources
instead. The pre-commit hook runs nano-staged lint and formatting fixes.

## Rule Changes

For new rules, follow the repository's
[add-eslint-rule skill](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/.agents/skills/add-eslint-rule/SKILL.md).
It covers rule metadata, options, registration, public types, tests, and docs.

Keep these surfaces synchronized:

- Implementation in `src/rules/` and configuration types in `src/types/rules/`.
- Registration in `src/plugin.ts` and public exports in `src/index.ts`.
- Rule behavior tests in `tests/rules/` and plugin contract tests.
- The English and Chinese README rule tables, [rules overview](/rules/), and Rules sidebar.
- The rule's English and Chinese pages, examples, and any affected composition or design guidance.

Use the same purpose groups in the README tables, rules overview, homepage
feature cards, and Rules sidebar. Keep rule names alphabetical within each group.

Rule behavior tests use `eslint-vitest-rule-tester` through `run` in
`tests/helpers/rule-tester.ts`. Assert diagnostics and expected output, using `output: null`
for reports without fixes. The shared runner checks repeated-fix stability and
verifies fixed code. Use `createRuleTester<unknown>` for invalid options, and
reserve ESLint's `Linter` for plugin integration tests.

Cover the rule's actual file scopes, parser variants, option combinations,
import identity, and local shadowing where relevant. Keep shared behavior cases
with their rule suites and reusable runners and assertions in `tests/helpers/`.
Compiler, runtime, and type-semantic comparisons belong in focused
`tests/integration/` suites; keep the complete case and its diagnostic and fix
assertions together. A fixer must preserve behavior; add regressions whenever
its safety boundary changes.

## Documentation Changes

Keep English documentation in `docs/` and Simplified Chinese translations in
`docs/zh/` synchronized. Separate setup and shared configuration from per-rule options. Use [design documents](/design/) to record implementation
contracts and tradeoffs.

Rule pages use `::: correct` for accepted code and `::: incorrect` for reported
code, including diagnostics without fixes. Keep positive and negative examples
separate, and leave configuration snippets in ordinary fences. Preserve code
formatting that intentionally triggers a diagnostic.

`docs/.vitepress/rules.ts` owns the bilingual catalog, scopes, defaults, and fix
capabilities. After editing it, run `pnpm docs:sync` to update marked sections
in the READMEs, rules overviews, standalone-script lists, and rule summaries,
then format the changed files. The sidebar reads the catalog directly. Prose
outside generated sections remains manually authored.

`docs/.vitepress/config/examples.ts` supplies the same parsers and rule options
to rendering and validation. Every fence inside a rule page's `correct` or
`incorrect` container is checked, including fences preceded by prose or formatter
comments. Correct examples must have no diagnostics; incorrect examples must
report their own rule. Parser errors fail validation. Show complete SFCs when
setup context is required and preserve imports when API recognition needs them.

Use an explicit named profile for non-default options, such as
`::: incorrect custom-callbacks`. Define the profile in `examples.ts`, apply it
to both sides of the example, and explain its options in the surrounding prose.
Typed examples run against a real TypeScript program. Unknown profiles and
profiles for another rule are errors. `<!-- prettier-ignore -->` preserves
intentional diagnostic-triggering formatting without skipping validation.

Run `pnpm docs:check` and `pnpm docs:build`. The former checks catalog consistency,
bilingual coverage, every rule example, and diagnostic rendering; the latter
also validates examples and checks page links. Inspect the actual page when
changing the container presentation.

The sorting demo reads source rules at build time, with supporting tests beside
its data loader in `docs/.vitepress/components/demos/sort-script-setup/`.
Documentation dependency patches and overrides are explained in
[patches/README.md](https://github.com/ntnyq/eslint-plugin-vue-perfectionist/blob/main/patches/README.md);
review that file when upgrading affected rendering dependencies.

## Before Opening a Pull Request

Run the repository checks and the documentation build:

```shell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm docs:check
pnpm docs:build
```

Describe the behavior change, link relevant issues, and report validation.
Update rule documentation whenever options or behavior change. Use concise
Conventional Commit prefixes such as `fix:` or `docs:`.

CI checks formatting, lint, and types, then builds and tests the package on Node
22, 24, and 26 across Linux, Windows, and macOS. A separate documentation CI job runs `pnpm docs:check` and `pnpm docs:build`.
