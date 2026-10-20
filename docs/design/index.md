---
description: Repository architecture, analysis ownership, and rule design contracts.
---

# Architecture and Design

These pages describe how the plugin is organized and why complex rule behavior
has specific boundaries. For installation and user configuration, start with
the [guide](/guide/); public rule options live in the [rule reference](/rules/).

| Document                                          | Focus                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Source Structure](./source-structure.md)         | Package entry points, analysis ownership, shared contracts, and behavior boundaries.                  |
| [Macro Type Rules](./define-macros-types.md)      | The split between type declaration style and call-site naming, including composition and diagnostics. |
| [Setup Statement Sorting](./sort-script-setup.md) | Group classification, option resolution, dependency analysis, and safe movement.                      |

## Package Contract

`src/index.ts` is the package entry point. It exports the plugin as both the
default and named `plugin` export, together with explicit public configuration
types. `src/plugin.ts` registers the rules and package metadata. The plugin
has no built-in configurations.

tsdown bundles that entry into `dist/index.mjs` and generates
`dist/index.d.mts`. The package exposes the root entry and `package.json`;
internal source paths are not public entry points. The documentation workspace
is private and is not part of the published package.

## Analysis and Fixes

Shared utilities follow their narrowest domain owner. Parser-independent AST
helpers, Vue scope integration, component prop analysis, and sorting internals
have different contracts. See [Source Structure](./source-structure.md) before
reusing or extracting analysis.

Automatic fixes require evidence that the transformed code preserves behavior.
Dependencies, execution effects, shadowing, comments, and type semantics can
prevent an otherwise desirable style change from being fixed. Rule tests and
integration tests protect those boundaries. Design acceptance matrices describe
requirements; executable tests establish the cases currently covered.

See [Contributing](/guide/contributing) for development commands, test
conventions, documentation maintenance, and validation.
