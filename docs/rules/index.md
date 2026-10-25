---
description: Browse all Vue Perfectionist rules by purpose, file scope, and automatic fix support.
---

# Rules

Enable the rules you need explicitly in your ESLint configuration. The plugin
has no built-in configurations; see [Getting Started](/guide/#basic-usage) for
registration and parser setup.

## Choose by Goal

| Goal                      | Rules                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Callbacks and composables | `callback-style`, `max-lines-per-callback`, `prefer-composable-options`, `prefer-function-declaration`                            |
| Macro layout and types    | `define-macros-newline`, `define-macros-type-style`, `require-macro-type-name`                                                    |
| Component models          | `prefer-define-model`                                                                                                             |
| Ref and result naming     | `consistent-template-ref-name`, `prefer-ref-pattern`, `prefer-function-result-pattern`                                            |
| Template ref types        | `prefer-use-template-ref-inference`                                                                                               |
| Component usage contracts | `require-component-props`, `component-prop-types`, `component-prop-values`, `require-component-slots`, `require-vue-generic`      |
| Template readability      | `no-complex-v-for-source`, `padding-line-between-tags`, `prefer-simple-event-handler`, `prefer-template-literal-in-interpolation` |
| Setup declaration order   | `sort-script-setup`                                                                                                               |

See [Rule Composition](/guide/rule-composition) for complementary checks,
configuration examples, and interactions with other plugins.

## Scope and Defaults

- **Template** means Vue SFC templates, parsed with `vue-eslint-parser`.
- **Setup** means the SFC's `<script setup>` block; **TS setup** additionally
  requires TypeScript syntax and its script parser.
- **Scripts** includes Vue script blocks and standalone JavaScript/TypeScript
  files. Individual rules still restrict which definitions or API calls they check.

Component prop, slot, and generic-comment rules need explicit `targets` and do
nothing with their default empty target lists. Other target-based rules may
have built-in targets; consult their option documentation before replacing them.

`sort-script-setup` orders groups by default while preserving name order inside
ordinary groups (`type: 'unsorted'`). Name sorting requires an explicit comparator.
Shared [auto-import settings](/guide/configuration#auto-imported-vue-apis) control
API recognition only.

## All Rules

Automatic fixes apply only to documented supported cases. A fixable rule can
also report problems that require manual changes. See
[Automatic Fixes](/guide/rule-composition#automatic-fixes) for the boundaries.

| Rule                                                                                      | Description                                                          | Scope               | Automatic fix   |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------- | --------------- |
| [callback-style](./callback-style.md)                                                     | Enforce callback styles for Vue APIs.                                | Scripts             | Supported cases |
| [component-prop-types](./component-prop-types.md)                                         | Enforce configured component prop value types.                       | Template            | —               |
| [component-prop-values](./component-prop-values.md)                                       | Enforce configured component prop value constraints.                 | Template            | —               |
| [consistent-template-ref-name](./consistent-template-ref-name.md)                         | Require template ref variable names to match their keys.             | Scripts             | —               |
| [define-macros-newline](./define-macros-newline.md)                                       | Require multiline inline Vue macro declarations.                     | Setup               | Supported cases |
| [define-macros-type-style](./define-macros-type-style.md)                                 | Enforce declaration styles for Vue macro types.                      | TS setup            | —               |
| [max-lines-per-callback](./max-lines-per-callback.md)                                     | Limit the length of inline callbacks for Vue APIs.                   | Scripts             | —               |
| [no-complex-v-for-source](./no-complex-v-for-source.md)                                   | Disallow complex expressions in Vue v-for sources.                   | Template            | —               |
| [padding-line-between-tags](./padding-line-between-tags.md)                               | Enforce blank-line counts between consecutive template tags.         | Template            | Supported cases |
| [prefer-composable-options](./prefer-composable-options.md)                               | Prefer a final options object for composable parameters.             | Scripts             | —               |
| [prefer-define-model](./prefer-define-model.md)                                           | Prefer defineModel over matching prop and update event declarations. | Setup               | —               |
| [prefer-function-declaration](./prefer-function-declaration.md)                           | Require function declarations in SFCs and composables.               | Scripts             | —               |
| [prefer-function-result-pattern](./prefer-function-result-pattern.md)                     | Enforce naming patterns for function result bindings.                | Scripts             | —               |
| [prefer-ref-pattern](./prefer-ref-pattern.md)                                             | Enforce naming patterns for template refs.                           | Template + scripts  | —               |
| [prefer-simple-event-handler](./prefer-simple-event-handler.md)                           | Require simple expressions in named template event handlers.         | Template            | —               |
| [prefer-template-literal-in-interpolation](./prefer-template-literal-in-interpolation.md) | Prefer a single template literal for mixed text and interpolation.   | Template            | Supported cases |
| [prefer-use-template-ref-inference](./prefer-use-template-ref-inference.md)               | Prefer inferred types for static Vue template refs.                  | TS setup + template | —               |
| [require-component-props](./require-component-props.md)                                   | Require configured props at component usage sites.                   | Template            | —               |
| [require-component-slots](./require-component-slots.md)                                   | Require configured slots at component usage sites.                   | Template            | —               |
| [require-macro-type-name](./require-macro-type-name.md)                                   | Require exact call-site names for Vue macro types.                   | TS setup            | —               |
| [require-vue-generic](./require-vue-generic.md)                                           | Require explicit generic comments on configured components.          | Template            | —               |
| [sort-script-setup](./sort-script-setup.md)                                               | Group and order top-level statements in `<script setup>`.            | Setup               | Supported cases |
