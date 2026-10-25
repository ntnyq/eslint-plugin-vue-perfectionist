---
description: Combine related rules, configure component contracts, and understand automatic fix boundaries.
---

# Rule Composition

Rules are enabled independently. Combine them when they describe different
parts of the same convention, and configure overlapping checks consistently.
The [rules overview](/rules/) lists every rule and its scope.

## Callbacks and Composables

Use [`callback-style`](/rules/callback-style) to require inline callbacks and
choose their function and body styles. Add
[`max-lines-per-callback`](/rules/max-lines-per-callback) to limit callback size.
When a callback grows too long, extract its internal logic into a function and
call it from a short inline callback. Passing the extracted function directly
would violate the default inline-callback convention.

[`prefer-composable-options`](/rules/prefer-composable-options) checks parameter
shape, while [`prefer-function-declaration`](/rules/prefer-function-declaration)
checks how functions are declared in selected SFC and composable scopes. These
rules check definitions, not how a composable is imported or called.

[`prefer-function-result-pattern`](/rules/prefer-function-result-pattern)
checks names bound to selected function results. Its defaults cover statically
boolean Vue refs, supported computed getters, and VueUse toggles. Configure
`targets` for other libraries or naming conventions; these targets replace the
defaults.

## Macro Types and Layout

Combine the macro rules according to your preferred declaration style:

| Concern                                | Rule                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| Line breaks in inline declarations     | [`define-macros-newline`](/rules/define-macros-newline)       |
| Inline, local, or imported macro types | [`define-macros-type-style`](/rules/define-macros-type-style) |
| Exact call-site type names             | [`require-macro-type-name`](/rules/require-macro-type-name)   |

`define-macros-type-style` defaults to local types for `defineProps`,
`defineEmits`, and `defineSlots`. `require-macro-type-name` defaults to `Props`,
`Emits`, and `Slots`. Disable a macro in the naming rule if you require its type
to be inline. `define-macros-newline` formats inline declarations; it does not
convert local or imported types into inline types.

## Template Refs

[`consistent-template-ref-name`](/rules/consistent-template-ref-name) requires a
`useTemplateRef()` variable name to match its key.
[`prefer-ref-pattern`](/rules/prefer-ref-pattern) adds a naming pattern for
selected ref usage sites. They are independent: matching names can still fail
a pattern, and matching a pattern does not ensure the variable and key agree.

Add [`prefer-use-template-ref-inference`](/rules/prefer-use-template-ref-inference)
when TypeScript setup refs should use template-derived types. It requires an
eligible static template ref and reports explicit generics without removing
them automatically. API recognition follows the
[auto-import configuration](/guide/configuration#auto-imported-vue-apis).

## Component Usage Contracts

These rules require explicit component `targets`; their default target lists
are empty:

| Concern                         | Rule                                                        | Uncertain input option                      |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Required props                  | [`require-component-props`](/rules/require-component-props) | `unknownBindings`                           |
| Supplied prop types             | [`component-prop-types`](/rules/component-prop-types)       | `unknownValues`                             |
| Supplied prop value constraints | [`component-prop-values`](/rules/component-prop-values)     | `unknownValues`                             |
| Required named or default slots | [`require-component-slots`](/rules/require-component-slots) | `unknownSlots`                              |
| Explicit generic comments       | [`require-vue-generic`](/rules/require-vue-generic)         | `unknownValues` for `ignoreWhen` exemptions |

A type or value constraint does not require the prop to be present. Combine it
with `require-component-props` when both presence and a supplied value matter.
For example, add these entries to the `rules` object of your Vue configuration:

```js
const rules = {
  'vue-perfectionist/require-component-props': [
    'error',
    { targets: [{ components: ['AppCounter'], props: ['count'] }] },
  ],
  'vue-perfectionist/component-prop-types': [
    'error',
    { targets: [{ components: ['AppCounter'], props: { count: 'number' } }] },
  ],
  'vue-perfectionist/component-prop-values': [
    'error',
    {
      targets: [
        { components: ['AppCounter'], props: { count: { minimum: 0 } } },
      ],
    },
  ],
}
```

These checks use syntax and conservative local analysis. They do not load
component definitions or run TypeScript's type checker. Each rule documents
how dynamic bindings and other unverifiable input are handled. Contract
violations are reported without changing values, adding slots, or inventing
generic types.

## Template Readability

Use [`no-complex-v-for-source`](/rules/no-complex-v-for-source) for iteration
sources, [`prefer-simple-event-handler`](/rules/prefer-simple-event-handler)
for named event handlers, and
[`prefer-template-literal-in-interpolation`](/rules/prefer-template-literal-in-interpolation)
for mixed text and interpolation. Each rule has its own syntax and safety
limits; enabling one does not enable the others.

[`padding-line-between-tags`](/rules/padding-line-between-tags) enforces exact
blank-line counts between consecutive template tags. If you also use
`vue/padding-line-between-tags`, disable that rule for pairs controlled here.
Align padding preferences with your formatter.

## Statement Ordering

[`sort-script-setup`](/rules/sort-script-setup) groups top-level setup statements.
The default `type: 'unsorted'` preserves name order within ordinary groups.
Choose `natural`, `alphabetical`, or another supported comparator to sort names.
Put all sorting preferences directly in rule options.

Continue using `perfectionist/sort-imports` for imports. Disable
`perfectionist/sort-modules` and `vue/define-macros-order` for the same Vue files
when this rule owns their declaration and macro order. The following override
assumes those plugins and the Vue parsers are already configured; place it
after their presets:

```js
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['**/*.vue'],
    rules: {
      'perfectionist/sort-modules': 'off',
      'vue/define-macros-order': 'off',
      'vue-perfectionist/sort-script-setup': [
        'error',
        {
          type: 'natural',
          fix: 'safe',
          newlinesBetween: 'ignore',
          newlinesInside: 'ignore',
        },
      ],
    },
  },
])
```

Keep Vue correctness rules for watchers, lifecycle registration, and expose
after `await`. Sorting preserves initialization dependencies and does not repair
pre-existing execution errors. Default whitespace settings are `ignore`;
coordinate any explicit spacing options with padding rules and formatters.

## Automatic Fixes

Only the following rules currently provide automatic fixes, and only within
their documented boundaries:

| Rule                                                                                                                         | Automatic changes                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`callback-style`](/rules/callback-style#diagnostics-and-fixes)                                                              | Convert arrow expression bodies to blocks while preserving return values.                                |
| [`define-macros-newline`](/rules/define-macros-newline#automatic-fixes-and-formatting)                                       | Insert line breaks without changing member order; a formatter finishes indentation.                      |
| [`define-model-name-casing`](/rules/define-model-name-casing#automatic-fixes-and-formatting)                                 | Rename model contracts only with `fix: true` (default `false`); consumers require review.                |
| [`padding-line-between-tags`](/rules/padding-line-between-tags#automatic-fixes-and-formatting)                               | Adjust blank lines between eligible tags already on separate lines.                                      |
| [`prefer-template-literal-in-interpolation`](/rules/prefer-template-literal-in-interpolation#automatic-fixes-and-formatting) | Combine statically safe primitive expressions and adjacent text while preserving nullish display values. |
| [`sort-script-setup`](/rules/sort-script-setup#partitions-and-automatic-fixes)                                               | Reorder eligible declarations within safe contiguous fragments and adjust supported spacing.             |

A fixable rule can still report cases without a fix. In particular,
`sort-script-setup` reports uncertain runtime movement without reordering it;
`fix: 'none'` disables all its fixes, including spacing. Model-name casing fixes
are separately opt-in because they change public component contracts. Other naming, type-style,
component contract, callback-length, and function-declaration diagnostics need
manual changes.
