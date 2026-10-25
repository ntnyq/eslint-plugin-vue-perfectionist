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

| Command                                                   | Purpose                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                                                | Rebuild the plugin when source files change.                         |
| `pnpm build`                                              | Bundle the package and generate TypeScript declarations with tsdown. |
| `pnpm test`                                               | Run Vitest once; watch mode is disabled in configuration.            |
| `pnpm exec vitest run tests/rules/callback-style.test.ts` | Run a focused rule suite.                                            |
| `pnpm typecheck`                                          | Check TypeScript without emitting files.                             |
| `pnpm lint`                                               | Run ESLint.                                                          |
| `pnpm format`                                             | Apply Oxfmt formatting.                                              |
| `pnpm format:check`                                       | Check formatting.                                                    |
| `pnpm docs:dev`                                           | Serve the VitePress site locally.                                    |
| `pnpm docs:build`                                         | Build the documentation and check page links.                        |

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
- The README rule table, [rules overview](/rules/), and Rules sidebar.
- The rule's page, examples, and any affected composition or design guidance.

Rule behavior tests use `eslint-vitest-rule-tester` through `run` in
`tests/helpers/rule-tester.ts`. Assert diagnostics and expected output, using `output: null`
for reports without fixes. The shared runner checks repeated-fix stability and
verifies fixed code. Use `createRuleTester<unknown>` for invalid options, and
reserve ESLint's `Linter` for plugin integration tests.

Cover the rule's actual file scopes, parser variants, option combinations,
import identity, and local shadowing where relevant. A fixer must preserve
behavior; add regressions whenever its safety boundary changes.

## Documentation Changes

Keep public documentation in English. Separate setup and shared configuration
from per-rule options. Use [design documents](/design/) to record implementation
contracts and tradeoffs.

Rule pages use `::: correct` for accepted code and `::: incorrect` for reported
code, including diagnostics without fixes. Keep positive and negative examples
separate, and leave configuration snippets in ordinary fences. Preserve code
formatting that intentionally triggers a diagnostic.

The VitePress configuration in `docs/.vitepress/config.ts` registers those
containers and per-rule ESLint examples. Rendered diagnostics use the configured
example options, not options inferred from prose. Check examples against tests
and inspect the rendered page when changing containers or diagnostic examples.
A successful build alone does not prove that an example reports the intended
problem.

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
pnpm docs:build
```

Describe the behavior change, link relevant issues, and report validation.
Update rule documentation whenever options or behavior change. Use concise
Conventional Commit prefixes such as `fix:` or `docs:`.

CI checks formatting, lint, and types, then builds and tests the package on Node
22, 24, and 26 across Linux, Windows, and macOS. The documentation build is a
separate local check; it is not part of the current CI workflow.
