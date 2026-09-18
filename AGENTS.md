# Repository Guidelines

## Project Structure & Module Organization

This package provides ESLint rules for Vue 3, currently focused on ordering top-level statements in `<script setup>`.

- `src/index.ts` and `src/plugin.ts` expose the plugin and its rules. The plugin does not provide built-in configurations; users compose their own.
- `src/rules/` contains rule implementations; `src/utils/`, `src/constants/`, and `src/types/` hold shared logic, schemas, and types.
- `tests/rules/` contains rule and plugin contract tests.
- `docs/rules/` documents public options; `docs/design/` records design decisions. VitePress configuration lives in `docs/.vitepress/`.
- `dist/` is generated build output; do not edit it directly.

## Build, Test, and Development Commands

Use the pnpm version pinned in `package.json` and the Node version selected by `.node-version`.

- `pnpm install --frozen-lockfile`: install workspace dependencies reproducibly.
- `pnpm build`: bundle the plugin and generate TypeScript declarations with tsdown.
- `pnpm dev`: rebuild the plugin on changes.
- `pnpm test`: run Vitest once; watch mode is disabled by configuration.
- `pnpm typecheck`: check types without emitting files.
- `pnpm lint`: run ESLint.
- `pnpm format` / `pnpm format:check`: apply or verify Oxfmt formatting.
- `pnpm docs:dev` / `pnpm docs:build`: serve or build the documentation.

## Coding Style & Naming Conventions

Write TypeScript with ESM imports. Use two-space indentation, LF endings, single quotes, no semicolons, and trailing commas; Oxfmt targets an 80-column width. Follow `@ntnyq/eslint-config` through `eslint.config.mjs`.

Use kebab-case filenames such as `sort-script-setup.ts`, camelCase functions and variables, and PascalCase types and interfaces. Use `import type` for type-only dependencies. The Husky pre-commit hook runs nano-staged lint and formatting fixes.

## Testing Guidelines

Add tests in `tests/rules/<rule-name>.test.ts` using Vitest and ESLint's `Linter`. Cover valid input, diagnostics, option combinations, fixed output, and fix idempotence. Include JavaScript and TypeScript SFC cases where relevant. No numeric coverage threshold is configured.

Preserve execution dependencies: unsafe runtime reordering must report without autofixing. Add regression cases for any changes to this safety boundary.

## Commit & Pull Request Guidelines

History currently contains only `chore: init commit`; follow that conventional prefix style with concise messages such as `fix: preserve watcher order`.

Keep pull requests focused. Describe the behavior change, link relevant issues, and report validation commands. Update rule documentation when options or behavior change. Before submitting, run formatting checks, lint, typecheck, build, and tests; CI tests Node 22, 24, and 26 on Linux, Windows, and macOS.
