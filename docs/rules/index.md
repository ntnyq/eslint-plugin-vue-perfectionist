# Rules

All available rules are listed below. Enable the rules you need explicitly in
your ESLint configuration; the plugin does not include built-in configurations.
See the [setup guide](/guide/#basic-usage) for configuration instructions.

| Rule                                                                                      | Description                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [callback-style](./callback-style.md)                                                     | Enforce callback styles for Vue APIs.                              |
| [component-prop-types](./component-prop-types.md)                                         | Enforce configured component prop value types.                     |
| [component-prop-values](./component-prop-values.md)                                       | Enforce configured component prop value constraints.               |
| [consistent-template-ref-name](./consistent-template-ref-name.md)                         | Require template ref variable names to match their keys.           |
| [define-macros-newline](./define-macros-newline.md)                                       | Require multiline inline Vue macro declarations.                   |
| [define-macros-type-style](./define-macros-type-style.md)                                 | Enforce declaration styles for Vue macro types.                    |
| [max-lines-per-callback](./max-lines-per-callback.md)                                     | Limit the length of inline callbacks for Vue APIs.                 |
| [no-complex-v-for-source](./no-complex-v-for-source.md)                                   | Disallow complex expressions in Vue v-for sources.                 |
| [padding-line-between-tags](./padding-line-between-tags.md)                               | Enforce blank-line counts between consecutive template tags.       |
| [prefer-composable-options](./prefer-composable-options.md)                               | Prefer a final options object for composable parameters.           |
| [prefer-function-result-pattern](./prefer-function-result-pattern.md)                     | Enforce naming patterns for function result bindings.              |
| [prefer-ref-pattern](./prefer-ref-pattern.md)                                             | Enforce naming patterns for template refs.                         |
| [prefer-simple-event-handler](./prefer-simple-event-handler.md)                           | Require simple expressions in named template event handlers.       |
| [prefer-template-literal-in-interpolation](./prefer-template-literal-in-interpolation.md) | Prefer a single template literal for mixed text and interpolation. |
| [prefer-use-template-ref-inference](./prefer-use-template-ref-inference.md)               | Prefer inferred types for static Vue template refs.                |
| [require-component-props](./require-component-props.md)                                   | Require configured props at component usage sites.                 |
| [require-macro-type-name](./require-macro-type-name.md)                                   | Require exact call-site names for Vue macro types.                 |
| [require-vue-generic](./require-vue-generic.md)                                           | Require explicit generic comments on configured components.        |
| [sort-script-setup](./sort-script-setup.md)                                               | Group and order top-level statements in `<script setup>`.          |
