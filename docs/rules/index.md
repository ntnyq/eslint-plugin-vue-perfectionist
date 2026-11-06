---
description: Browse all Vue Perfectionist rules by purpose, file scope, and automatic fix support.
---

# Rules

Enable the rules you need explicitly in your ESLint configuration. The plugin
has no built-in configurations; see [Getting Started](/guide/#basic-usage) for
registration and parser setup.

## Choose by Goal

- [Callbacks and Composables](#callbacks-and-composables)
- [Macros and Component Models](#macros-and-component-models)
- [Refs and Result Names](#refs-and-result-names)
- [Component Usage Contracts](#component-usage-contracts)
- [Template Conventions](#template-conventions)
- [Statement Ordering](#statement-ordering)

See [Rule Composition](/guide/rule-composition) for complementary checks,
configuration examples, and interactions with other plugins.

## Scope and Defaults

- **Template** means Vue SFC templates, parsed with `vue-eslint-parser`.
- **Setup** means the SFC's `<script setup>` block; **TS setup** additionally
  requires TypeScript syntax and its script parser.
- **Scripts** includes Vue script blocks and standalone JavaScript/TypeScript
  files. Individual rules still restrict which definitions or API calls they check.

Component prop, slot, and generic-comment rules need explicit `targets` and do
nothing with their default empty target lists. `no-restricted-html-elements`
also needs an explicit `elements` list. Other target-based rules may
have built-in targets; consult their option documentation before replacing them.

For auto-imported Vue APIs, see [auto-import configuration](/guide/configuration#auto-imported-vue-apis).
Individual rule pages document their options and defaults.

## All Rules

Automatic fixes apply only to documented supported cases. A fixable rule can
also report problems that require manual changes. See
[Automatic Fixes](/guide/rule-composition#automatic-fixes) for the boundaries.

<!-- rules:start -->

### Callbacks and Composables

| Rule                                                            | Description                                               | Scope   | Automatic fix   |
| --------------------------------------------------------------- | --------------------------------------------------------- | ------- | --------------- |
| [callback-style](./callback-style.md)                           | Enforce callback styles for Vue APIs.                     | Scripts | Supported cases |
| [max-lines-per-callback](./max-lines-per-callback.md)           | Limit the length of inline callbacks for Vue APIs.        | Scripts | —               |
| [prefer-composable-options](./prefer-composable-options.md)     | Prefer a final options object for composable parameters.  | Scripts | —               |
| [prefer-function-declaration](./prefer-function-declaration.md) | Require function declarations in SFCs and composables.    | Scripts | —               |
| [prefer-on-scope-dispose](./prefer-on-scope-dispose.md)         | Prefer scope-based cleanup in named Vue composables.      | Scripts | —               |
| [prefer-watch-effect-alias](./prefer-watch-effect-alias.md)     | Prefer dedicated aliases for post and sync watch effects. | Scripts | Supported cases |
| [require-injection-key](./require-injection-key.md)             | Disallow string keys in Vue provide and inject calls.     | Scripts | —               |

### Macros and Component Models

| Rule                                                      | Description                                                          | Scope    | Automatic fix   |
| --------------------------------------------------------- | -------------------------------------------------------------------- | -------- | --------------- |
| [define-macros-newline](./define-macros-newline.md)       | Require multiline inline Vue macro declarations.                     | Setup    | Supported cases |
| [define-macros-type-style](./define-macros-type-style.md) | Enforce declaration styles for Vue macro types.                      | TS setup | —               |
| [define-model-name-casing](./define-model-name-casing.md) | Enforce casing for explicit defineModel names.                       | Setup    | Opt-in          |
| [prefer-define-model](./prefer-define-model.md)           | Prefer defineModel over matching prop and update event declarations. | Setup    | —               |
| [require-macro-type-name](./require-macro-type-name.md)   | Require exact call-site names for Vue macro types.                   | TS setup | —               |

### Refs and Result Names

| Rule                                                                        | Description                                              | Scope               | Automatic fix |
| --------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------- | ------------- |
| [consistent-template-ref-name](./consistent-template-ref-name.md)           | Require template ref variable names to match their keys. | Scripts             | —             |
| [prefer-function-result-pattern](./prefer-function-result-pattern.md)       | Enforce naming patterns for function result bindings.    | Scripts             | —             |
| [prefer-ref-pattern](./prefer-ref-pattern.md)                               | Enforce naming patterns for template refs.               | Template + scripts  | —             |
| [prefer-use-template-ref-inference](./prefer-use-template-ref-inference.md) | Prefer inferred types for static Vue template refs.      | TS setup + template | —             |

### Component Usage Contracts

| Rule                                                    | Description                                                 | Scope    | Automatic fix |
| ------------------------------------------------------- | ----------------------------------------------------------- | -------- | ------------- |
| [component-prop-types](./component-prop-types.md)       | Enforce configured component prop value types.              | Template | —             |
| [component-prop-values](./component-prop-values.md)     | Enforce configured component prop value constraints.        | Template | —             |
| [require-component-props](./require-component-props.md) | Require configured props at component usage sites.          | Template | —             |
| [require-component-slots](./require-component-slots.md) | Require configured slots at component usage sites.          | Template | —             |
| [require-vue-generic](./require-vue-generic.md)         | Require explicit generic comments on configured components. | Template | —             |

### Template Conventions

| Rule                                                                                      | Description                                                        | Scope    | Automatic fix   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------- | --------------- |
| [no-complex-template-expression](./no-complex-template-expression.md)                     | Limit logical operators and conditional nesting in Vue templates.  | Template | —               |
| [no-complex-v-for-source](./no-complex-v-for-source.md)                                   | Disallow complex expressions in Vue v-for sources.                 | Template | —               |
| [no-restricted-html-elements](./no-restricted-html-elements.md)                           | Disallow specified native HTML elements in Vue templates.          | Template | —               |
| [padding-line-between-tags](./padding-line-between-tags.md)                               | Enforce blank-line counts between consecutive template tags.       | Template | Supported cases |
| [prefer-simple-event-handler](./prefer-simple-event-handler.md)                           | Require simple expressions in named template event handlers.       | Template | —               |
| [prefer-template-literal-in-interpolation](./prefer-template-literal-in-interpolation.md) | Prefer a single template literal for mixed text and interpolation. | Template | Supported cases |

### Statement Ordering

| Rule                                                            | Description                                                | Scope   | Automatic fix   |
| --------------------------------------------------------------- | ---------------------------------------------------------- | ------- | --------------- |
| [sort-composable-destructure](./sort-composable-destructure.md) | Group destructured composable members by state and method. | Scripts | Whitespace only |
| [sort-composable-return](./sort-composable-return.md)           | Group composable return members by state and method.       | Scripts | Whitespace only |
| [sort-script-setup](./sort-script-setup.md)                     | Group and order top-level statements in `<script setup>`.  | Setup   | Supported cases |

<!-- rules:end -->
